/**
 * ============================================================================
 * TanoAI — Render-Once Calculation Cache
 * ============================================================================
 * 
 * Stores compiled Markdown/KaTeX HTML strings tied to message IDs.
 * This prevents main-thread blockages when re-rendering message history.
 */

export const renderCache = new Map<string, string>();

/**
 * Clears the message render cache (e.g., when the user logs out or clear chat history).
 */
export function clearRenderCache(): void {
  renderCache.clear();
}
