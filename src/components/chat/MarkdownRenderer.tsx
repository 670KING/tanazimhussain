/**
 * ============================================================================
 * TanoAI - High-Performance Markdown Renderer
 * ============================================================================
 * 
 * ARCHITECTURE:
 *   Raw Content -> Math-Aware Splitter -> Text Parts (instant) + Math Parts (deferred)
 *   Math blocks are rendered via requestAnimationFrame, batched per frame.
 *   Incomplete math blocks during streaming are shown as skeletons.
 *   CSS containment isolates each message block reflow.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { preprocessLatex } from '@/lib/math-utils';
import { renderKatex, isMathHeavy } from '@/lib/katex-fast';
import { hasIncompleteMath } from '@/lib/render-scheduler';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
  messageId?: string;
}

interface MathPlaceholder {
  id: string;
  latex: string;
  displayMode: boolean;
  rendered: boolean;
  html: string;
}

function extractAndReplaceMath(content: string): {
  segments: Array<{ type: 'text' | 'math'; content: string; displayMode?: boolean }>;
  mathPlaceholders: MathPlaceholder[];
} {
  const segments: Array<{ type: 'text' | 'math'; content: string; displayMode?: boolean }> = [];
  const mathPlaceholders: MathPlaceholder[] = [];
  // Match display math ($$...$$) or inline math ($...$)
  const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let mathIndex = 0;

  while ((match = mathRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    const isDisplay = match[1] !== undefined;
    const latex = (isDisplay ? match[1] : match[2]) ?? '';
    const placeholderId = '__MATH_' + mathIndex + '__';
    mathPlaceholders.push({ id: placeholderId, latex: latex.trim(), displayMode: isDisplay, rendered: false, html: '' });
    segments.push({ type: 'math', content: placeholderId, displayMode: isDisplay });
    mathIndex++;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return { segments, mathPlaceholders };
}

export function MarkdownRenderer({ content, className = '', isStreaming = false }: MarkdownRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const mathCacheRef = useRef<Map<string, string>>(new Map());
  const [mathBlocks, setMathBlocks] = useState<Map<string, MathPlaceholder>>(new Map());
  const [renderVersion, setRenderVersion] = useState(0);

  const processedContent = useMemo(() => {
    return preprocessLatex(content);
  }, [content]);

  const { segments, mathPlaceholders } = useMemo(() => extractAndReplaceMath(processedContent), [processedContent]);

  const finalContent = useMemo(() => {
    return segments.map(segment => {
      if (segment.type === 'math') {
        const block = mathBlocks.get(segment.content);
        if (block?.rendered) {
          return segment.displayMode
            ? '\n\n<div class="katex-container katex-display">' + block.html + '</div>\n\n'
            : '<span class="katex-container katex-inline">' + block.html + '</span>';
        }
        return segment.displayMode
          ? '\n\n<div class="math-placeholder" style="width:100%;height:3em;"></div>\n\n'
          : '<span class="math-placeholder" style="width:3em;height:1.2em;"></span>';
      }
      return segment.content;
    }).join('');
  }, [segments, mathBlocks, renderVersion]);

  useEffect(() => {
    if (mathPlaceholders.length === 0) return;
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    const incomplete = isStreaming && hasIncompleteMath(content);

    rafIdRef.current = requestAnimationFrame(() => {
      const newBlocks = new Map<string, MathPlaceholder>();
      let hasChanges = false;
      for (const placeholder of mathPlaceholders) {
        if (incomplete && placeholder.id === mathPlaceholders[mathPlaceholders.length - 1]?.id) {
          newBlocks.set(placeholder.id, { ...placeholder, rendered: false, html: '' });
          continue;
        }
        const cacheKey = (placeholder.displayMode ? 'D' : 'I') + ':' + placeholder.latex;
        const cached = mathCacheRef.current.get(cacheKey);
        if (cached) {
          newBlocks.set(placeholder.id, { ...placeholder, rendered: true, html: cached });
          continue;
        }
        try {
          const html = renderKatex(placeholder.latex, { displayMode: placeholder.displayMode, throwOnError: false, trust: true });
          mathCacheRef.current.set(cacheKey, html);
          newBlocks.set(placeholder.id, { ...placeholder, rendered: true, html });
          hasChanges = true;
        } catch {
          newBlocks.set(placeholder.id, { ...placeholder, rendered: true, html: '<span class="katex-error">' + placeholder.latex + '</span>' });
          hasChanges = true;
        }
      }
      if (hasChanges) { setMathBlocks(newBlocks); setRenderVersion(v => v + 1); }
      rafIdRef.current = null;
    });
    return () => { if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current); };
  }, [mathPlaceholders, isStreaming, content]);

  const mathHeavyClass = isMathHeavy(content) ? 'math-heavy' : '';

  return (
    <div ref={containerRef} className={'prose-ai break-words overflow-hidden min-w-0 max-w-full message-block ' + (isStreaming ? 'streaming ' : '') + mathHeavyClass + ' ' + className} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
        h1: ({ children }) => <h1 className="text-lg sm:text-xl md:text-2xl font-bold mt-4 sm:mt-6 mb-2 sm:mb-4 text-foreground border-b border-border pb-2 break-words">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base sm:text-lg md:text-xl font-semibold mt-3 sm:mt-5 mb-2 sm:mb-3 text-foreground break-words">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm sm:text-base md:text-lg font-semibold mt-2 sm:mt-4 mb-1 sm:mb-2 text-foreground break-words">{children}</h3>,
        h4: ({ children }) => <h4 className="text-sm sm:text-base font-semibold mt-2 sm:mt-3 mb-1 sm:mb-2 text-foreground break-words">{children}</h4>,
        p: ({ children }) => <p className="mb-2 sm:mb-3 last:mb-0 leading-relaxed text-foreground text-xs sm:text-sm md:text-base break-words overflow-hidden">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-outside ml-4 sm:ml-5 mb-2 sm:mb-4 space-y-1 sm:space-y-1.5 text-xs sm:text-sm md:text-base">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-4 sm:ml-5 mb-2 sm:mb-4 space-y-1 sm:space-y-1.5 text-xs sm:text-sm md:text-base">{children}</ol>,
        li: ({ children }) => <li className="text-foreground leading-relaxed pl-1 break-words">{children}</li>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-3 sm:pl-4 py-2 sm:py-3 my-2 sm:my-4 bg-muted/50 rounded-r-lg italic text-xs sm:text-sm md:text-base overflow-hidden">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto my-3 sm:my-4 -mx-2 sm:mx-0 rounded-lg border border-border"><table className="min-w-full divide-y divide-border text-xs sm:text-sm">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
        th: ({ children }) => <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">{children}</th>,
        td: ({ children }) => <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground border-t border-border break-words">{children}</td>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium break-all">{children}</a>,
        hr: () => <hr className="my-4 sm:my-6 border-border" />,
        code: ({ className: codeClassName, children }) => {
          const match = /language-(\w+)/.exec(codeClassName || '');
          const text = String(children);
          const isInline = !match && !text.includes('\n');
          if (isInline) {
            return (
              <code className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-sm font-mono text-primary break-words">
                {children}
              </code>
            );
          }
          return (
            <CodeBlock language={match ? match[1] : ''} isDark={isDark}>
              {text.replace(/\n$/, '')}
            </CodeBlock>
          );
        },
        pre: ({ children }) => <>{children}</>,
        img: ({ src, alt }) => <img src={src} alt={alt || 'Image'} className="max-w-full h-auto rounded-lg my-2 sm:my-4 border border-border" loading="lazy" />,
      }}>
        {finalContent}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps { children: string; language: string; isDark: boolean; }

function CodeBlock({ children, language, isDark }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(children).catch(() => { const t = document.createElement('textarea'); t.value = children; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); });
    setCopied(true); toast.success('Code copied!'); setTimeout(() => setCopied(false), 2000);
  }, [children]);
  const downloadCode = useCallback(() => { const b = new Blob([children], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'code.' + (language || 'txt'); a.click(); URL.revokeObjectURL(u); toast.success('Code downloaded!'); }, [children, language]);
  const lineCount = children.split('\n').length;
  const shouldTruncate = !expanded && lineCount > 30;
  const displayContent = shouldTruncate
    ? children.split('\n').slice(0, 30).join('\n') + '\n// ...'
    : children;
  return (
    <div className="code-block-container relative group my-2 sm:my-4 rounded-lg overflow-hidden border border-border w-full max-w-full">
      <div className="sticky top-0 flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/80 border-b border-border z-10 flex-wrap gap-1 sm:flex-nowrap">
        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase truncate flex-1 min-w-0">{language || 'code'}</span>
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {lineCount > 30 && (
            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" onClick={downloadCode} title="Download"><Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0" onClick={copyCode} title="Copy">{copied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}</Button>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-[250px] sm:max-h-[350px] md:max-h-[450px] w-full max-w-full" style={{ WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
        <SyntaxHighlighter style={isDark ? oneDark : oneLight} language={language} PreTag="div" customStyle={{ margin: 0, padding: '12px 16px', fontSize: 'clamp(11px, 2vw, 14px)', lineHeight: '1.4', borderRadius: '0', background: 'transparent', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} showLineNumbers={lineCount > 5} wrapLines={true} wrapLongLines={true}>{displayContent}</SyntaxHighlighter>
      </div>
    </div>
  );
}
