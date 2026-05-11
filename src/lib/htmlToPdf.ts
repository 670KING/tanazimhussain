import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Render a self-contained HTML document into a real, paginated PDF
 * and trigger a download. Uses an off-screen iframe so the document's
 * own <style> (template CSS) applies, then html2canvas captures the
 * laid-out body and slices it into A4 pages.
 */
export async function htmlToPdfDownload(
  html: string,
  filename = 'Document.pdf'
): Promise<void> {
  const iframe = document.createElement('iframe');
  // Render at A4 width (~794px @96dpi) so layout matches paper.
  iframe.style.cssText =
    'position:fixed;left:-99999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe doc unavailable');

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for fonts/layout to settle.
    await new Promise<void>((resolve) => {
      const w = iframe.contentWindow;
      if (!w) return resolve();
      const done = () => setTimeout(resolve, 250);
      if (doc.readyState === 'complete') done();
      else w.addEventListener('load', done, { once: true });
    });
    // Try font readiness
    try {
      // @ts-expect-error fonts API may not exist
      await iframe.contentDocument?.fonts?.ready;
    } catch { /* ignore */ }

    const target = doc.body;
    // Make iframe tall enough to capture full content
    iframe.style.height = `${target.scrollHeight + 40}px`;

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      windowHeight: target.scrollHeight,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH, undefined, 'FAST');
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH, undefined, 'FAST');
      heightLeft -= pageH;
    }

    const safe = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safe);
  } finally {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  }
}