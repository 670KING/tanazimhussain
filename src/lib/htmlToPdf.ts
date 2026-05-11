import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Render a self-contained HTML document into a paginated PDF that snaps
 * page breaks to block-element boundaries — never slicing through a line
 * or paragraph. Returns the jsPDF instance so callers can either save it
 * or hand it to a preview iframe via dataurlstring.
 */
export interface RenderOptions {
  /** Pixel width of the rendered iframe; A4 ≈ 794px @ 96dpi. */
  pageWidthPx?: number;
  /** html2canvas scale (2 = retina-quality). */
  scale?: number;
}

export async function renderHtmlToPdf(
  html: string,
  opts: RenderOptions = {}
): Promise<jsPDF> {
  const pageWidthPx = opts.pageWidthPx ?? 794;
  const scale = opts.scale ?? 2;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    `position:fixed;left:-99999px;top:0;width:${pageWidthPx}px;height:1123px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe doc unavailable');

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for load + fonts.
    await new Promise<void>((resolve) => {
      const w = iframe.contentWindow;
      if (!w) return resolve();
      const done = () => setTimeout(resolve, 200);
      if (doc.readyState === 'complete') done();
      else w.addEventListener('load', done, { once: true });
    });
    try { await (doc as any).fonts?.ready; } catch { /* ignore */ }

    const body = doc.body;
    iframe.style.height = `${body.scrollHeight + 80}px`;

    // Capture full body once at high scale.
    const canvas = await html2canvas(body, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: pageWidthPx,
      windowHeight: body.scrollHeight,
      logging: false,
    });

    // ----- Compute "safe" page break offsets in canvas pixels -----
    // A4 aspect ratio: 210x297mm → use that ratio against the canvas width.
    const A4_RATIO = 297 / 210;
    const pagePxHeight = Math.floor(canvas.width * A4_RATIO);

    // Collect bottom-edges of every block element relative to body, in
    // canvas pixels (multiplied by scale).
    const blockSelector =
      'h1,h2,h3,h4,p,ul,ol,li,section,div,blockquote,pre,figure,table,img';
    const nodes = Array.from(body.querySelectorAll<HTMLElement>(blockSelector));
    const bodyTop = body.getBoundingClientRect().top;
    const breakpoints = new Set<number>([0]);
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      // top of each block is a candidate "safe" cut point
      const top = Math.round((r.top - bodyTop) * scale);
      if (top > 0 && top < canvas.height) breakpoints.add(top);
    }
    breakpoints.add(canvas.height);
    const sortedBreaks = Array.from(breakpoints).sort((a, b) => a - b);

    // Greedy: pack pages by walking break points up to pagePxHeight.
    const slices: Array<{ y: number; h: number }> = [];
    let cursor = 0;
    while (cursor < canvas.height) {
      const maxEnd = cursor + pagePxHeight;
      // largest break that fits, strictly greater than cursor
      let chosen = -1;
      for (const b of sortedBreaks) {
        if (b > cursor && b <= maxEnd) chosen = b;
        if (b > maxEnd) break;
      }
      if (chosen === -1) {
        // No friendly break fits — element is taller than a page.
        // Fall back to a hard cut at pagePxHeight to avoid an infinite loop.
        chosen = Math.min(canvas.height, maxEnd);
      }
      slices.push({ y: cursor, h: chosen - cursor });
      cursor = chosen;
    }

    // ----- Render each slice onto its own A4 page -----
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageMmW = pdf.internal.pageSize.getWidth();
    const pageMmH = pdf.internal.pageSize.getHeight();

    const tmp = document.createElement('canvas');
    const ctx = tmp.getContext('2d')!;

    slices.forEach((slice, i) => {
      tmp.width = canvas.width;
      tmp.height = slice.h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(
        canvas,
        0, slice.y, canvas.width, slice.h,
        0, 0, canvas.width, slice.h,
      );
      const imgData = tmp.toDataURL('image/jpeg', 0.92);
      const sliceMmH = (slice.h / canvas.width) * pageMmW;
      if (i > 0) pdf.addPage();
      // Top-align — leaves blank space at the bottom of short pages
      // (better than scaling text up and breaking layout).
      pdf.addImage(imgData, 'JPEG', 0, 0, pageMmW, Math.min(sliceMmH, pageMmH), undefined, 'FAST');
    });

    return pdf;
  } finally {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 300);
  }
}

export async function htmlToPdfDownload(html: string, filename = 'Document.pdf'): Promise<void> {
  const pdf = await renderHtmlToPdf(html);
  const safe = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safe);
}

/** Returns a `data:application/pdf;base64,...` string for inline preview. */
export async function htmlToPdfDataUrl(html: string): Promise<string> {
  const pdf = await renderHtmlToPdf(html);
  return pdf.output('datauristring');
}