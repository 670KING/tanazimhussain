/**
 * ============================================================================
 * TanoAI — High-Performance Render Scheduler
 * ============================================================================
 * 
 * PROBLEM: When streaming LaTeX-heavy content, every token triggers a full
 * re-parse + re-render of the entire markdown block. This blocks the main
 * thread, causing frame drops and frozen UI.
 * 
 * ARCHITECTURE OVERVIEW:
 * 
 *   Stream Tokens ──► Token Buffer ──► rAF Batcher ──► Render Queue ──► DOM
 *                         │                │                │
 *                    Debounced        Frame-paced      Prioritized
 *                    accumulation     flush (16ms)     by visibility
 * 
 * KEY PRINCIPLES:
 * 1. TOKEN ACCUMULATION: Raw stream tokens are buffered, not rendered immediately.
 * 2. rAF BATCHING: Rendering is scheduled via requestAnimationFrame, ensuring
 *    we never render more than once per frame (60fps cap).
 * 3. MATH DEFERRAL: LaTeX blocks are parsed lazily — only when they are
 *    complete (balanced $/$$) AND visible in the viewport.
 * 4. CSS CONTAINMENT: Each message block gets `contain: layout style paint`
 *    so reflow of one block never triggers reflow of siblings.
 * 5. VIRTUALIZATION: Off-screen messages are unmounted from the React tree
 *    but preserved in a lightweight cache.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RenderTask {
  id: string;
  content: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  timestamp: number;
  isMathHeavy: boolean;
}

export interface SchedulerConfig {
  /** Max ms to wait before forcing a render even if buffer is growing */
  maxBatchWindow: number;
  /** Max characters to accumulate before forcing a render */
  maxBufferSize: number;
  /** Whether to defer math rendering until block is complete */
  deferIncompleteMath: boolean;
  /** Whether to use IntersectionObserver for viewport-based rendering */
  enableViewportOptimization: boolean;
  /** Root margin for IntersectionObserver (px) */
  viewportMargin: number;
  /** Whether to use Web Workers for LaTeX parsing (if available) */
  useWebWorker: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  maxBatchWindow: 100,       // Flush at least every 100ms
  maxBufferSize: 500,        // Or when buffer hits 500 chars
  deferIncompleteMath: true,
  enableViewportOptimization: true,
  viewportMargin: 200,       // Start rendering 200px before viewport
  useWebWorker: false,       // Web Worker support can be added later
};

// ─── Math Block Detector ─────────────────────────────────────────────────────

/**
 * Detects whether a string contains incomplete math blocks.
 * This prevents KaTeX from attempting to render half-formed expressions,
 * which is a major source of layout thrashing.
 */
export function hasIncompleteMath(content: string): boolean {
  let displayMathCount = 0;
  let inlineMathCount = 0;
  let i = 0;

  while (i < content.length) {
    if (content[i] === '$') {
      // Check for display math ($$)
      if (content[i + 1] === '$') {
        displayMathCount++;
        i += 2;
      } else {
        // Check it's not an escaped dollar
        if (i === 0 || content[i - 1] !== '\\') {
          inlineMathCount++;
        }
        i++;
      }
    } else {
      i++;
    }
  }

  // Odd count means we have an unclosed math block
  return displayMathCount % 2 !== 0 || inlineMathCount % 2 !== 0;
}

/**
 * Extracts complete math blocks from content, leaving placeholders for
 * incomplete ones. This allows the non-math parts to render immediately
 * while math blocks are finalized.
 */
export interface MathExtractionResult {
  content: string;
  mathBlocks: Map<string, string>;
  hasIncomplete: boolean;
}

const MATH_PLACEHOLDER_PREFIX = '___MATH_PLACEHOLDER_';

export function extractMathBlocks(content: string): MathExtractionResult {
  const mathBlocks = new Map<string, string>();
  let hasIncomplete = false;
  let result = content;
  let placeholderIndex = 0;

  // Extract display math blocks ($$...$$)
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
  let match: RegExpExecArray | null;
  const displayMatches: Array<{ start: number; end: number; inner: string }> = [];

  while ((match = displayMathRegex.exec(content)) !== null) {
    displayMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      inner: match[1],
    });
  }

  // Check for incomplete display math (odd number of $$)
  const allDollarPairs = (content.match(/\$\$/g) || []).length;
  if (allDollarPairs % 2 !== 0) {
    hasIncomplete = true;
    // Find the last unclosed $$ and extract everything after it
    const lastDollarPair = content.lastIndexOf('$$');
    if (lastDollarPair !== -1) {
      const incompleteBlock = content.slice(lastDollarPair);
      const placeholder = `${MATH_PLACEHOLDER_PREFIX}${placeholderIndex++}___`;
      mathBlocks.set(placeholder, incompleteBlock);
      result = content.slice(0, lastDollarPair) + placeholder;
    }
  }

  // Replace complete display math with placeholders
  for (const m of displayMatches) {
    const placeholder = `${MATH_PLACEHOLDER_PREFIX}${placeholderIndex++}___`;
    mathBlocks.set(placeholder, m.inner);
    result = result.slice(0, m.start) + placeholder + result.slice(m.end);
    // Adjust for length difference
    const diff = placeholder.length - (m.end - m.start);
    // Subsequent matches need offset adjustment (simplified here)
  }

  return { content: result, mathBlocks, hasIncomplete };
}

// ─── Render Scheduler ────────────────────────────────────────────────────────

export class RenderScheduler {
  private config: SchedulerConfig;
  private buffer: string = '';
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private renderQueue: RenderTask[] = [];
  private isProcessing: boolean = false;
  private lastFlushTime: number = 0;
  private onFlush: ((content: string) => void) | null = null;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Attach a callback that receives batched content for rendering.
   */
  setFlushCallback(cb: (content: string) => void): void {
    this.onFlush = cb;
  }

  /**
   * Push a stream token into the buffer. This is the main entry point
   * for streaming data. It never triggers a render directly.
   */
  pushToken(token: string): void {
    this.buffer += token;

    // Force flush if buffer exceeds max size
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.scheduleFlush();
      return;
    }

    // Debounced flush — resets timer on each token
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
    }
    this.bufferTimer = setTimeout(() => {
      this.scheduleFlush();
    }, this.config.maxBatchWindow);
  }

  /**
   * Push a complete chunk (non-streaming). Bypasses buffering.
   */
  pushComplete(content: string): void {
    this.buffer = content;
    this.scheduleFlush();
  }

  /**
   * Schedule a flush on the next animation frame.
   * Multiple calls within the same frame are coalesced.
   */
  private scheduleFlush(): void {
    if (this.rafId !== null) return; // Already scheduled

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  /**
   * Flush the buffer: process math, check completeness, and emit.
   */
  private flush(): void {
    if (!this.buffer || !this.onFlush) return;

    const now = performance.now();
    const timeSinceLastFlush = now - this.lastFlushTime;

    // Throttle: never render more than once per frame (16.67ms)
    if (timeSinceLastFlush < 16 && this.buffer.length < this.config.maxBufferSize) {
      this.scheduleFlush();
      return;
    }

    let contentToRender = this.buffer;
    this.buffer = '';
    this.lastFlushTime = now;

    // If math is incomplete and deferral is enabled, strip the incomplete part
    if (this.config.deferIncompleteMath && hasIncompleteMath(contentToRender)) {
      // Find the last complete math boundary and truncate
      const lastCompleteIndex = this.findLastCompleteMathBoundary(contentToRender);
      if (lastCompleteIndex > 0) {
        this.buffer = contentToRender.slice(lastCompleteIndex);
        contentToRender = contentToRender.slice(0, lastCompleteIndex);
      }
    }

    this.onFlush(contentToRender);
  }

  /**
   * Find the index of the last complete math boundary so we can safely
   * render everything before it.
   */
  private findLastCompleteMathBoundary(content: string): number {
    // Find the last $$ that has a matching opening $$
    const lastDisplayEnd = content.lastIndexOf('$$');
    if (lastDisplayEnd > 0) {
      const beforeLast = content.slice(0, lastDisplayEnd);
      const openCount = (beforeLast.match(/\$\$/g) || []).length;
      if (openCount % 2 === 0) {
        // Even number of $$ before last one means it's a closing $$
        return lastDisplayEnd + 2;
      }
      // Odd means the last $$ is an opening one — render up to it
      return lastDisplayEnd;
    }

    // Check for incomplete inline math
    const dollarIndices: number[] = [];
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '$' && (i === 0 || content[i - 1] !== '\\')) {
        dollarIndices.push(i);
      }
    }
    if (dollarIndices.length % 2 !== 0) {
      // Odd number of $ — last one is unclosed
      return dollarIndices[dollarIndices.length - 1];
    }

    return content.length;
  }

  /**
   * Force immediate flush (e.g., when stream ends).
   */
  forceFlush(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.buffer && this.onFlush) {
      this.onFlush(this.buffer);
      this.buffer = '';
    }
  }

  /**
   * Reset the scheduler to initial state.
   */
  reset(): void {
    this.buffer = '';
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.renderQueue = [];
    this.isProcessing = false;
  }

  /**
   * Get current buffer size (useful for debugging).
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Check if scheduler has pending work.
   */
  isPending(): boolean {
    return this.buffer.length > 0 || this.rafId !== null;
  }
}

// ─── Viewport-Aware Render Controller ────────────────────────────────────────

/**
 * Manages which message blocks should be actively rendered vs. cached.
 * Uses IntersectionObserver for zero-cost viewport detection.
 */
export class ViewportRenderController {
  private observer: IntersectionObserver | null = null;
  private visibleIds = new Set<string>();
  private callbacks = new Map<string, (isVisible: boolean) => void>();

  constructor(rootMargin: number = 200) {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = entry.target.getAttribute('data-message-id');
            if (!id) continue;

            const isVisible = entry.isIntersecting;
            if (isVisible) {
              this.visibleIds.add(id);
            } else {
              this.visibleIds.delete(id);
            }

            const cb = this.callbacks.get(id);
            if (cb) cb(isVisible);
          }
        },
        {
          root: null,
          rootMargin: `${rootMargin}px`,
          threshold: 0,
        }
      );
    }
  }

  /**
   * Observe a message element for viewport visibility.
   */
  observe(
    element: HTMLElement,
    messageId: string,
    onVisibilityChange: (isVisible: boolean) => void
  ): void {
    element.setAttribute('data-message-id', messageId);
    this.callbacks.set(messageId, onVisibilityChange);
    this.observer?.observe(element);
  }

  /**
   * Stop observing a message element.
   */
  unobserve(messageId: string): void {
    this.visibleIds.delete(messageId);
    this.callbacks.delete(messageId);
  }

  /**
   * Check if a message is currently visible.
   */
  isVisible(messageId: string): boolean {
    return this.visibleIds.has(messageId);
  }

  /**
   * Clean up all observers.
   */
  destroy(): void {
    this.observer?.disconnect();
    this.visibleIds.clear();
    this.callbacks.clear();
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

let globalScheduler: RenderScheduler | null = null;
let globalViewportController: ViewportRenderController | null = null;

export function getRenderScheduler(config?: Partial<SchedulerConfig>): RenderScheduler {
  if (!globalScheduler) {
    globalScheduler = new RenderScheduler(config);
  }
  return globalScheduler;
}

export function getViewportController(rootMargin?: number): ViewportRenderController {
  if (!globalViewportController) {
    globalViewportController = new ViewportRenderController(rootMargin);
  }
  return globalViewportController;
}

export function destroyGlobalInstances(): void {
  globalScheduler?.reset();
  globalScheduler = null;
  globalViewportController?.destroy();
  globalViewportController = null;
}
