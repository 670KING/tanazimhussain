import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import { htmlToPdfDataUrl, htmlToPdfDownload } from '@/lib/htmlToPdf';
import { toast } from 'sonner';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  title: string;
}

/**
 * Two-stage preview:
 *  1. Live HTML iframe (instant) — shows the organised layout exactly
 *     as it will be rasterised.
 *  2. "Download" runs the smart paginator and saves a real PDF.
 */
export function PDFPreviewDialog({ open, onOpenChange, html, title }: PDFPreviewDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [renderingPdf, setRenderingPdf] = useState(false);

  // Reset PDF preview when html changes / dialog reopens.
  useEffect(() => {
    if (!open) {
      setPdfDataUrl(null);
      setRenderingPdf(false);
    }
  }, [open, html]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const safe = (title || 'Document')
        .replace(/[^a-z0-9-_ ]+/gi, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 60) || 'Document';
      await htmlToPdfDownload(html, `${safe}.pdf`);
      toast.success('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleRenderPdf = async () => {
    if (renderingPdf || pdfDataUrl) return;
    setRenderingPdf(true);
    try {
      const url = await htmlToPdfDataUrl(html);
      setPdfDataUrl(url);
    } catch (e) {
      console.error(e);
      toast.error('PDF rendering failed');
    } finally {
      setRenderingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 sm:px-6 py-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <DialogTitle className="text-sm sm:text-base truncate">
              {title || 'Document Preview'}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRenderPdf}
              disabled={renderingPdf || !!pdfDataUrl}
            >
              {renderingPdf ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Rendering…</>
              ) : pdfDataUrl ? 'PDF rendered' : 'Render PDF'}
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
              ) : (
                <><Download className="w-3.5 h-3.5 mr-1.5" /> Download</>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 overflow-hidden">
          {pdfDataUrl ? (
            <iframe
              src={pdfDataUrl}
              title="PDF preview"
              className="w-full h-full bg-white"
            />
          ) : (
            <iframe
              srcDoc={html}
              title="HTML preview"
              className="w-full h-full bg-white"
              sandbox="allow-same-origin"
            />
          )}
        </div>

        <div className="px-4 sm:px-6 py-2 border-t text-[11px] text-muted-foreground shrink-0">
          {pdfDataUrl
            ? 'Showing rendered PDF · downloads the same file.'
            : 'Showing live layout. Click "Render PDF" to preview pagination, or "Download" to save.'}
        </div>
      </DialogContent>
    </Dialog>
  );
}