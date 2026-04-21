import { toast } from 'sonner';

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

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Could not access iframe document');

    // Inject @page title hint via <title> for default PDF filename
    const titledHtml = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${filename.replace(/\.pdf$/i, '')}</title>`
    );

    doc.open();
    doc.write(titledHtml);
    doc.close();

    // Wait for layout to settle
    await new Promise<void>((resolve) => {
      if (doc.readyState === 'complete') {
        setTimeout(resolve, 300);
      } else {
        iframe.onload = () => setTimeout(resolve, 300);
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
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
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