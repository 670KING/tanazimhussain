/**
 * PDF-safe HTML sanitiser for AI-generated documents.
 * Pure functions — no Deno-only deps — so they're trivially unit-testable.
 */

/** Strip wrappers, code fences, LaTeX, markdown leftovers. */
export function sanitizeBodyHtml(raw: string): string {
  let html = (raw || '').trim();

  // Strip leading/trailing markdown fences (```html ... ```)
  html = html
    .replace(/^```(?:html|HTML)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '');

  // Strip wrappers
  html = html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?(?:html|body|head)\b[^>]*>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  // Strip LaTeX delimiters/commands
  html = html
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '')
    .replace(/\\begin\{[^}]*\}[\s\S]*?\\end\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+\s*\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+/g, '');

  // Strip stray markdown
  html = html
    .replace(/```[\s\S]*?```/g, '')
    .replace(/(^|\n)\s{0,3}#{1,6}\s+([^\n]+)/g, '$1<h3>$2</h3>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  // Wrap orphan text lines (text not inside any block tag) into <p>.
  // Splits on blank lines so paragraph grouping is preserved.
  html = html
    .split(/\n{2,}/)
    .map((chunk) => {
      const t = chunk.trim();
      if (!t) return '';
      // Already starts with a block-level tag? leave it.
      if (/^<(h[1-6]|p|ul|ol|li|section|div|blockquote|pre|figure|table)\b/i.test(t)) return t;
      // Mixed: contains some block tags — leave as-is to avoid double wrap.
      if (/<(h[1-6]|p|section|ul|ol|div|blockquote|pre)\b/i.test(t)) return t;
      return `<p>${t.replace(/\n/g, ' ')}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return html.trim();
}

/** Ensure exactly one <h1> at the top, prepend fallback if missing. */
export function ensureSingleH1(html: string, fallbackTitle: string): string {
  const safe = (fallbackTitle || 'Document').replace(/[<>&]/g, '').slice(0, 120);
  const h1Matches = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  if (h1Matches.length === 0) {
    return `<h1>${safe}</h1>${html}`;
  }
  if (h1Matches.length > 1) {
    // Demote extras to <h2>
    let seen = 0;
    return html.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (_m, attrs, inner) => {
      seen += 1;
      if (seen === 1) return `<h1${attrs}>${inner}</h1>`;
      return `<h2${attrs}>${inner}</h2>`;
    });
  }
  return html;
}

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
  stats: {
    h1: number;
    h2: number;
    sections: number;
    paragraphs: number;
    lists: number;
  };
}

/** Verify the sanitised HTML conforms to the PDF-safe contract. */
export function validatePdfHtml(html: string): ValidationResult {
  const reasons: string[] = [];
  const count = (re: RegExp) => (html.match(re) || []).length;

  const h1 = count(/<h1\b/gi);
  const h2 = count(/<h2\b/gi);
  const sections = count(/<section\b/gi);
  const paragraphs = count(/<p\b/gi);
  const lists = count(/<(ul|ol)\b/gi);

  if (h1 !== 1) reasons.push(`expected 1 <h1>, got ${h1}`);
  if (paragraphs < 1) reasons.push('no <p> paragraphs');

  // Forbidden artifacts
  if (/```/.test(html)) reasons.push('markdown-fence');
  if (/\$\$[\s\S]*?\$\$/.test(html)) reasons.push('block-math');
  if (/(^|[^\\])\$[^$\n]+\$/.test(html)) reasons.push('inline-math');
  if (/\\begin\{|\\frac|\\sqrt|\\sum/.test(html)) reasons.push('latex-cmd');
  if (/<!doctype|<html\b|<head\b|<body\b|<style\b|<script\b/i.test(html))
    reasons.push('wrapper-tags');

  return {
    ok: reasons.length === 0,
    reasons,
    stats: { h1, h2, sections, paragraphs, lists },
  };
}

/** Full pipeline: sanitise + ensure h1 + validate. */
export function processPdfHtml(raw: string, fallbackTitle: string): {
  html: string;
  validation: ValidationResult;
} {
  const cleaned = sanitizeBodyHtml(raw);
  const withH1 = ensureSingleH1(cleaned, fallbackTitle);
  return { html: withH1, validation: validatePdfHtml(withH1) };
}