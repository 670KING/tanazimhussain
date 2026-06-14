import { toast } from 'sonner';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { PDFTheme } from './PDFThemes';

/**
 * Premium print stylesheet — produces a real text PDF (selectable, searchable),
 * NOT an image. Uses serif typography for academic feel + clean code blocks.
 */
const PREMIUM_PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  @page { 
    size: A4; 
    margin: 22mm 18mm 20mm 18mm;
  }
  
  * { box-sizing: border-box; }
  
  html, body {
    margin: 0; padding: 0; background: #fff; color: #1f2937;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 10.5pt; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  .doc { max-width: 174mm; margin: 0 auto; }
  .doc-header-main { border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px; }
  .doc-title { font-size: 24pt; font-weight: 700; color: #111827; margin: 0 0 6px; letter-spacing: -.025em; }
  .doc-meta { font-size: 9pt; color: #6b7280; font-weight: 500; }
  
  h1, h2, h3, h4, h5, h6 { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
    color: #111827; 
    font-weight: 700;
    page-break-after: avoid; 
    break-after: avoid;
  }
  
  h1 { font-size: 18pt; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h2 { font-size: 14pt; margin: 18px 0 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
  h3 { font-size: 11.5pt; margin: 14px 0 6px; }
  
  p { margin: 0 0 10px; text-align: justify; hyphens: auto; color: #374151; }
  ul, ol { margin: 0 0 12px 24px; padding: 0; color: #374151; }
  li { margin: 3px 0; page-break-inside: avoid; break-inside: avoid; }
  
  blockquote {
    border-left: 4px solid #6366f1; margin: 12px 0; padding: 6px 16px;
    color: #4b5563; background: #f9fafb; font-style: italic;
    border-top-right-radius: 4px; border-bottom-right-radius: 4px;
    page-break-inside: avoid; break-inside: avoid;
  }
  
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background: #f3f4f6; padding: 2px 5px; border-radius: 4px;
    font-size: 9pt; color: #db2777;
    word-break: break-word;
  }
  
  pre, pre > div, pre > div > code {
    background: #1f2937 !important; color: #f9fafb !important;
    border: 1px solid #374151;
    border-radius: 8px; padding: 12px 16px !important;
    font-size: 9pt !important; line-height: 1.5;
    overflow-x: auto; page-break-inside: avoid; break-inside: avoid;
    white-space: pre-wrap !important; word-break: break-word;
  }
  
  table { 
    width: 100%; border-collapse: collapse; margin: 16px 0; 
    font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;
    border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb;
    table-layout: auto;
  }
  
  th, td { 
    border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top;
    word-break: break-word; overflow-wrap: break-word;
  }
  th { background: #f9fafb; font-weight: 600; color: #111827; }
  tr:nth-child(even) { background: #f9fafb/50; }
  
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 18px 0; }
  a { color: #4f46e5; text-decoration: none; font-weight: 500; word-break: break-all; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  
  .katex { font-size: 1.05em !important; }
  .katex-display { margin: 12px 0 !important; overflow-x: auto; page-break-inside: avoid; break-inside: avoid; }
  
  /* Running headers and footers for screen (hidden/minimal layout) */
  .doc-header {
    display: none;
  }
  .doc-footer {
    margin-top: 24px; padding-top: 10px; border-top: 1px solid #f3f4f6;
    font-size: 8pt; color: #9ca3af; text-align: center; font-weight: 500;
  }

  /* Running headers and footers for print (repeats on every page) */
  @media print {
    .doc-header {
      position: fixed;
      top: -14mm;
      left: 0;
      right: 0;
      height: 8mm;
      border-bottom: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      display: flex !important;
      justify-content: space-between;
      align-items: center;
      font-family: 'Inter', sans-serif;
    }
    
    .doc-footer {
      position: fixed;
      bottom: -12mm;
      left: 0;
      right: 0;
      height: 8mm;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      display: flex !important;
      justify-content: space-between;
      align-items: center;
      font-family: 'Inter', sans-serif;
      text-align: left;
      margin-top: 0;
    }
    
    .page-number::after {
      content: "Page " counter(page);
    }
  }
`;

/**
 * Compile a React element to an HTML string synchronously inside the browser DOM.
 * This runs all context hooks and lifecycle updates exactly like standard rendering,
 * avoiding SSR crashes.
 */
function renderToStaticMarkupDOM(element: React.ReactElement): string {
  if (typeof document === 'undefined') {
    throw new Error('document is not defined (not in browser)');
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  
  try {
    flushSync(() => {
      root.render(element);
    });
    return container.innerHTML;
  } finally {
    try {
      root.unmount();
    } catch {
      // ignore unmount errors
    }
  }
}

/**
 * Automatically detects the best layout theme for the document based on
 * keywords in the markdown and prompt context, or explicit formatting tags.
 */
export function autoDetectTheme(markdown: string): PDFTheme {
  const content = markdown.toLowerCase();

  // 1. Scan for explicit HTML comments from the AI
  const commentMatch = markdown.match(/<!--\s*theme:\s*(\w+)\s*-->/i);
  if (commentMatch && commentMatch[1]) {
    const val = commentMatch[1].toLowerCase();
    if (['academic', 'modern', 'cheatsheet', 'dark', 'minimal'].includes(val)) {
      return val as PDFTheme;
    }
  }

  // 2. Scan for explicit styling markdown instructions
  if (content.includes('style: academic') || content.includes('theme: academic') || content.includes('academic format')) {
    return 'academic';
  }
  if (content.includes('style: cheatsheet') || content.includes('theme: cheatsheet') || content.includes('cheat sheet format')) {
    return 'cheatsheet';
  }
  if (content.includes('style: dark') || content.includes('theme: dark') || content.includes('dark layout')) {
    return 'dark';
  }
  if (content.includes('style: minimal') || content.includes('theme: minimal') || content.includes('minimal formatting')) {
    return 'minimal';
  }
  if (content.includes('style: modern') || content.includes('theme: modern') || content.includes('stylish layout') || content.includes('stylish style')) {
    return 'modern';
  }

  // 3. Scan for keywords and context triggers
  if (
    content.includes('research paper') || 
    content.includes('academic journal') || 
    content.includes('bibliography') || 
    content.includes('references') || 
    content.includes('thesis') || 
    content.includes('dissertation') ||
    content.includes('formal assignment') ||
    content.includes('scientific report') ||
    content.includes('mathematics') ||
    content.includes('physics derivation')
  ) {
    return 'academic';
  }

  if (
    content.includes('quick reference') || 
    content.includes('commands guide') || 
    content.includes('cheat sheet') || 
    content.includes('cheatsheet') || 
    content.includes('syntax chart')
  ) {
    return 'cheatsheet';
  }

  if (
    content.includes('minimalist') || 
    content.includes('clean layout') || 
    content.includes('cv outline') || 
    content.includes('resume outline')
  ) {
    return 'minimal';
  }

  // 4. Structural density checks
  // If equations/formulas are numerous, choose Academic
  const mathBlocks = (markdown.match(/\$\$/g) || []).length + (markdown.match(/\\begin{/g) || []).length;
  if (mathBlocks >= 2) {
    return 'academic';
  }

  // If code fences are numerous, choose Cheat Sheet
  const codeBlocks = (markdown.match(/```/g) || []).length;
  if (codeBlocks >= 4) {
    return 'cheatsheet';
  }

  // 5. Default
  return 'modern';
}

/**
 * Build a complete, premium, print-ready HTML document from markdown/plain text.
 * Renders the same MarkdownRenderer (with KaTeX math) used in chat — guaranteeing
 * a TEXT-BASED PDF (selectable & searchable) with compiled math, not an image.
 */
export function buildPrintableHTMLFromMarkdown(
  markdown: string,
  title = 'Document',
  theme: PDFTheme = 'modern',
  options: {
    includeToC?: boolean;
    includeQR?: boolean;
    includeSummary?: boolean;
    qrUrl?: string;
  } = {}
): string {
  // 1. Build Table of Contents Html if selected
  let tocHtml = '';
  if (options.includeToC) {
    tocHtml = buildToCHtml(markdown);
  }

  // 2. Build Executive Summary Html if selected
  let summaryHtml = '';
  if (options.includeSummary) {
    summaryHtml = buildSummaryHtml(markdown);
  }

  // 3. Render the markdown to static HTML (server-side render of the same component
  // used in chat → math is compiled to KaTeX HTML, code blocks themed, etc.)
  let bodyHtml = '';
  try {
    bodyHtml = renderToStaticMarkupDOM(
      React.createElement(MarkdownRenderer, { content: markdown })
    );
  } catch (err) {
    console.warn('Markdown DOM render failed, falling back to ReactDOMServer', err);
    try {
      bodyHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MarkdownRenderer, { content: markdown })
      );
    } catch (ssrErr) {
      console.warn('Markdown SSR failed, falling back to <pre>', ssrErr);
      bodyHtml = `<pre>${escapeHtml(markdown)}</pre>`;
    }
  }

  let fullBodyHtml = '';
  if (summaryHtml) fullBodyHtml += summaryHtml;
  if (tocHtml) fullBodyHtml += tocHtml;
  fullBodyHtml += bodyHtml;

  // 4. Build QR code Html if selected and URL is present
  if (options.includeQR && options.qrUrl) {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(options.qrUrl)}`;
    fullBodyHtml += `
      <div class="doc-qrcode" style="page-break-inside: avoid; break-inside: avoid; margin-top: 32px; padding-top: 16px; border-top: 1px solid #f3f4f6; display: flex; align-items: center; gap: 16px;">
        <img src="${qrSrc}" style="width: 60px; height: 60px; border: 1px solid #e5e7eb; border-radius: 6px;" alt="QR Code" />
        <div style="font-size: 8.5pt; color: #6b7280; line-height: 1.45;">
          <strong>Scan to Access Source</strong><br/>
          Scan this QR code with your mobile device to view and interact with the original content online.
        </div>
      </div>
    `;
  }

  // 5. Fetch theme styles override
  const themeCss = getThemePrintCSS(theme);

  // Link the official KaTeX stylesheet directly so math renders perfectly in the print preview
  const katexLink = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />`;

  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
${katexLink}
<style>${PREMIUM_PRINT_CSS}</style>
<style>${themeCss}</style>
</head>
<body>
  <!-- Running header and footer elements positioned in margin bounds when printing -->
  <header class="doc-header">
    <span>${escapeHtml(title)}</span>
    <span>Tanoedu AI Document</span>
  </header>
  <footer class="doc-footer">
    <span>Generated via Tanoedu AI • ${date}</span>
    <span class="page-number"></span>
  </footer>

  <div class="doc">
    <header class="doc-header-main">
      <h1 class="doc-title">${escapeHtml(title)}</h1>
      <div class="doc-meta">Generated by Tanoedu AI • ${date}</div>
    </header>
    <main class="doc-body">${fullBodyHtml}</main>
  </div>
</body>
</html>`;
}

function buildToCHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const headings: string[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[\*_`]/g, '').trim();
      const indent = (level - 1) * 16;
      headings.push(`<li style="padding-left: ${indent}px; margin-bottom: 5px;">• ${text}</li>`);
    }
  }
  if (headings.length < 2) return '';
  return `<div class="doc-toc" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
    <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563;">Table of Contents</h3>
    <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 13px; line-height: 1.8; color: #374151;">
      ${headings.join('\n')}
    </ul>
  </div>`;
}

function buildSummaryHtml(markdown: string): string {
  const lines = markdown.split('\n');
  let summaryText = '';
  let paragraphCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```') || trimmed.startsWith('$$') || trimmed.startsWith('|')) {
      continue;
    }
    summaryText += trimmed + ' ';
    paragraphCount++;
    if (paragraphCount >= 2 || summaryText.length > 400) {
      break;
    }
  }
  if (summaryText.length < 50) return '';
  return `<div class="doc-summary" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; padding: 16px; border-left: 4px solid #6366f1; background: #f5f3ff; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">
    <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #4f46e5;">Executive Summary</h3>
    <p style="margin: 0; font-size: 13px; line-height: 1.6; text-align: justify; color: #4b5563;">${summaryText.trim()}</p>
  </div>`;
}

export function getThemePrintCSS(theme: PDFTheme): string {
  switch (theme) {
    case 'academic':
      return `
        html, body {
          font-family: 'Times New Roman', Times, Georgia, serif;
          font-size: 10.5pt;
          line-height: 1.6;
          color: #111827;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .doc-title {
          font-family: 'Times New Roman', Times, Georgia, serif;
          font-size: 26pt;
          font-weight: bold;
          text-align: center;
          border-bottom: 2px solid #111827;
          padding-bottom: 8px;
          margin-bottom: 20px;
          color: #111827;
        }
        h1, h2, h3 {
          font-family: 'Times New Roman', Times, Georgia, serif;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
        }
        p {
          text-align: justify;
        }
      `;
    case 'minimal':
      return `
        html, body {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10pt;
          line-height: 1.8;
          color: #374151;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .doc-title {
          font-size: 28pt;
          font-weight: 300;
          color: #111827;
          letter-spacing: -0.05em;
          border: 0;
          margin-bottom: 30px;
          padding: 0;
        }
        h1, h2, h3 {
          font-weight: 600;
          letter-spacing: -0.02em;
          border: 0;
        }
      `;
    case 'dark':
      return `
        html, body {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10.5pt;
          line-height: 1.6;
          color: #f3f4f6;
          background: #111827;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .doc-title {
          color: #ffffff;
          border-bottom: 2px solid #374151;
        }
        h1, h2, h3 {
          color: #f3f4f6;
          border-bottom: 1px solid #374151;
        }
        p, li {
          color: #d1d5db;
        }
        blockquote {
          background: #1f2937;
          color: #9ca3af;
          border-left-color: #6366f1;
        }
        code {
          background: #1f2937;
          color: #f472b6;
        }
        pre, pre > div, pre > div > code {
          background: #0f172a !important;
          border-color: #1e293b;
        }
        table {
          border-color: #374151;
        }
        th, td {
          border-color: #374151;
        }
        th {
          background: #1f2937;
          color: #ffffff;
        }
      `;
    case 'cheatsheet':
      return `
        html, body {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 8.5pt;
          line-height: 1.35;
          color: #1f2937;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .doc-title {
          font-size: 18pt;
          color: #dc503c;
          border-bottom: 2px solid #dc503c;
          margin-bottom: 15px;
        }
        .doc-body {
          column-count: 2;
          column-gap: 16px;
        }
        /* Keep sections together */
        h1, h2, h3, p, ul, ol, blockquote, pre, table {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        h1 {
          font-size: 12pt;
          background: #dc503c;
          color: #ffffff;
          padding: 3px 6px;
          border-radius: 4px;
          margin-top: 10px;
          margin-bottom: 5px;
          border: 0;
        }
        h2 {
          font-size: 10.5pt;
          color: #dc503c;
          border-bottom: 1px solid #dc503c;
          margin-top: 8px;
          margin-bottom: 4px;
        }
        p, li {
          font-size: 8.5pt;
        }
        pre, pre > div, pre > div > code {
          padding: 6px 8px !important;
          font-size: 8pt !important;
        }
      `;
    case 'modern':
    default:
      return `
        html, body {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10.5pt;
          line-height: 1.6;
          color: #1f2937;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .doc-title {
          font-size: 24pt;
          font-weight: 700;
          color: #6366f1;
          border-bottom: 2px solid #e5e7eb;
        }
        h1, h2, h3 {
          color: #111827;
        }
        h1 {
          border-bottom: 1px solid #e5e7eb;
        }
        blockquote {
          border-left-color: #6366f1;
          background: #f5f3ff;
        }
      `;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Strip any stray markdown fences or commentary the model might add,
 * leaving only the HTML document.
 */
export function sanitizeHTMLOutput(raw: string): string {
  let html = raw.trim();
  // Strip ```html ... ``` fences
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '');
  // If there's preamble before <!DOCTYPE or <html, trim it
  const doctypeIdx = html.search(/<!DOCTYPE\s+html/i);
  const htmlIdx = html.search(/<html[\s>]/i);
  const start = doctypeIdx >= 0 ? doctypeIdx : (htmlIdx >= 0 ? htmlIdx : 0);
  if (start > 0) html = html.slice(start);
  // Trim trailing junk after </html>
  const endIdx = html.lastIndexOf('</html>');
  if (endIdx >= 0) html = html.slice(0, endIdx + '</html>'.length);
  // If the model returned partial/no doctype, wrap minimally
  if (!/<html[\s>]/i.test(html)) {
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title></head><body>${html}</body></html>`;
  }
  return html;
}

/**
 * Print an HTML string to PDF using a hidden iframe + the browser's
 * native print pipeline. This is dramatically more reliable than
 * jsPDF/html2canvas for text fidelity, page breaks, and Unicode math.
 *
 * The user gets the standard "Save as PDF" dialog from their browser.
 */
export async function printHTMLToPDF(rawHtml: string, filename = 'Document.pdf'): Promise<void> {
  const html = sanitizeHTMLOutput(rawHtml);

  // Set opacity: 0.01 instead of visibility: hidden / 0 width & height to force
  // Google Chrome and other WebKit engines to fully trigger stylesheet/font evaluations.
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:0;opacity:0.01;pointer-events:none;';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Could not access iframe document');

    // Inject @page title hint via <title> for default PDF filename
    let titledHtml = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${filename.replace(/\.pdf$/i, '')}</title>`
    );

    // Inject <base> tag to correctly resolve relative assets
    const baseTag = `<base href="${window.location.origin}${window.location.pathname}" />`;
    if (titledHtml.includes('</head>')) {
      titledHtml = titledHtml.replace('</head>', `${baseTag}\n</head>`);
    } else {
      titledHtml = `<head>${baseTag}</head>${titledHtml}`;
    }

    doc.open();
    doc.write(titledHtml);
    doc.close();

    // Robust resource loading waiter: halts print execution until images are loaded
    // and fonts are verified and rendered in the print iframe's window.
    await new Promise<void>((resolve) => {
      const checkLoaded = () => {
        const images = Array.from(doc.images);
        const imagePromises = images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(r => {
            img.onload = r;
            img.onerror = r;
          });
        });

        const fontPromise = (doc as any).fonts ? (doc as any).fonts.ready : Promise.resolve();

        Promise.all([...imagePromises, fontPromise]).then(() => {
          // Extra buffer delay to allow the layout paint pipeline to settle
          setTimeout(resolve, 300);
        });
      };

      if (doc.readyState === 'complete') {
        checkLoaded();
      } else {
        iframe.onload = checkLoaded;
      }
    });

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    toast.success('Print dialog opened — choose "Save as PDF".');
  } catch (err) {
    console.error('printHTMLToPDF failed:', err);
    toast.error('Failed to open print dialog');
    throw err;
  } finally {
    // Keep iframe around briefly so the print dialog can capture it
    setTimeout(() => {
      try {
        if (iframe) {
          iframe.src = 'about:blank';
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {
        console.warn('Error during print iframe cleanup:', e);
      }
    }, 2000);
  }
}

/**
 * Print a compiled resume HTML string using a hidden iframe + native browser printing.
 * Injects all stylesheet links + custom @media print rules to fit A4 perfectly,
 * preserve background colors/graphics, and handle pagination.
 */
export async function printResumeHTMLToPDF(resumeHtml: string, filename = 'Resume.pdf'): Promise<void> {
  // Set opacity: 0.01 instead of visibility: hidden / 0 width & height to force
  // Chrome and WebKit engines to trigger stylesheet/font evaluations.
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:0;opacity:0.01;pointer-events:none;';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Could not access iframe document');

    // Collect all head stylesheets and style tags from parent head
    const styles = typeof document !== 'undefined'
      ? Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
          .map(el => el.outerHTML)
          .join('\n')
      : '';

    // Custom print overrides specifically for resumes to look perfect
    const resumePrintStyles = `
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #1f2937 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Remove shadow and max-width bounds during print for full page layout */
          .shadow-lg, [class*="shadow"] {
            box-shadow: none !important;
          }
          .mx-auto {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          /* Set premium vector fonts on templates */
          .resume-modern, .resume-creative {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
          .resume-academic {
            font-family: 'Lora', 'Georgia', 'Times New Roman', serif !important;
          }
          /* Ensure headers do not orphan */
          h1, h2, h3 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          /* Prevent page breaks inside entries */
          section, .resume-section, .experience-item, .education-item, .project-item, [key] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
        }
      </style>
    `;

    const baseTag = `<base href="${window.location.origin}${window.location.pathname}" />`;

    // Premium typography Google Fonts links to build standard look
    const fontsLink = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${filename.replace(/\.pdf$/i, '')}</title>
${baseTag}
${fontsLink}
${styles}
${resumePrintStyles}
</head>
<body>
  ${resumeHtml}
</body>
</html>`;

    doc.open();
    doc.write(html);
    doc.close();

    // Robust resource loading waiter: halts print execution until images are loaded
    // and fonts are verified and rendered in the print iframe's window.
    await new Promise<void>((resolve) => {
      const checkLoaded = () => {
        const images = Array.from(doc.images);
        const imagePromises = images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(r => {
            img.onload = r;
            img.onerror = r;
          });
        });

        const fontPromise = (doc as any).fonts ? (doc as any).fonts.ready : Promise.resolve();

        Promise.all([...imagePromises, fontPromise]).then(() => {
          // Extra buffer delay to allow layout painting to settle
          setTimeout(resolve, 300);
        });
      };

      if (doc.readyState === 'complete') {
        checkLoaded();
      } else {
        iframe.onload = checkLoaded;
      }
    });

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    toast.success('Print dialog opened — choose "Save as PDF".');
  } catch (err) {
    console.error('printResumeHTMLToPDF failed:', err);
    toast.error('Failed to open print dialog');
    throw err;
  } finally {
    // Keep iframe around briefly so the print dialog can capture it
    setTimeout(() => {
      try {
        if (iframe) {
          iframe.src = 'about:blank';
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {
        console.warn('Error during print resume iframe cleanup:', e);
      }
    }, 2000);
  }
}

/** Download the raw HTML as a .html file (always works as a fallback). */
export function downloadHTMLFile(rawHtml: string, filename = 'Document.html'): void {
  const html = sanitizeHTMLOutput(rawHtml);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success('HTML downloaded');
}