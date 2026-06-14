import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Loader2, 
  FileText, 
  Palette, 
  Settings2, 
  BookOpen, 
  FileCheck, 
  QrCode, 
  Printer, 
  Zap 
} from 'lucide-react';
import { buildPrintableHTMLFromMarkdown, printHTMLToPDF, getThemePrintCSS, autoDetectTheme } from '@/components/pdf/HTMLPDFExporter';
import { generateUltraPDF, downloadFile } from '@/components/pdf/PDFExporter';
import { PDFTheme, PDF_THEMES } from '@/components/pdf/PDFThemes';
import { toast } from 'sonner';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string; // fallback original html
  markdown?: string; // raw markdown to compile
  title: string;
}

export function PDFPreviewDialog({ open, onOpenChange, html, markdown, title: initialTitle }: PDFPreviewDialogProps) {
  const [downloading, setDownloading] = useState(false);
  
  // Customization states
  const [docTitle, setDocTitle] = useState(initialTitle || 'Document');
  const [selectedTheme, setSelectedTheme] = useState<PDFTheme>('modern');
  const [includeToC, setIncludeToC] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [includeQR, setIncludeQR] = useState(false);
  const [downloadType, setDownloadType] = useState<'direct' | 'print'>('direct');

  // Reset states when dialog is re-opened or title changes
  useEffect(() => {
    if (open) {
      setDocTitle(initialTitle || 'Document');
      setDownloading(false);
      setDownloadType('print'); // Always default to the high-fidelity Print Layout!
      if (markdown) {
        const detectedTheme = autoDetectTheme(markdown);
        setSelectedTheme(detectedTheme);
      }
    }
  }, [open, initialTitle, markdown]);

  // Dynamically compile the printable HTML block as customizations change
  const compiledHtml = useMemo(() => {
    if (!markdown) {
      // Apply theme overrides to the pre-compiled HTML head dynamically
      const themeCss = getThemePrintCSS(selectedTheme);
      let styledHtml = html;
      if (styledHtml.includes('</head>')) {
        styledHtml = styledHtml.replace('</head>', `<style>${themeCss}</style>\n</head>`);
      } else {
        styledHtml = styledHtml + `<style>${themeCss}</style>`;
      }
      return styledHtml;
    }
    return buildPrintableHTMLFromMarkdown(markdown, docTitle, selectedTheme, {
      includeToC,
      includeSummary,
      includeQR,
      qrUrl: window.location.href, // Link QR code back to the active page context
    });
  }, [markdown, html, docTitle, selectedTheme, includeToC, includeSummary, includeQR]);

  // Debounce preview HTML updates to prevent layout thrashing and high memory usage
  const [previewHtml, setPreviewHtml] = useState(compiledHtml);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewHtml(compiledHtml);
    }, 300);
    return () => clearTimeout(timer);
  }, [compiledHtml]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    const safeTitle = docTitle
      .replace(/[^a-z0-9-_ ]+/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'Document';

    try {
      if (downloadType === 'print') {
        // High fidelity vector browser print dialog
        await printHTMLToPDF(compiledHtml, `${safeTitle}.pdf`);
      } else {
        // Direct programmatically compiled vector PDF download
        toast.info('Compiling direct vector PDF...');
        const exportOptions = {
          title: docTitle,
          content: markdown || '',
          theme: selectedTheme,
          includeToC,
          includeQR,
          includeSummary,
          qrUrl: window.location.href,
        };
        try {
          const blob = await generateUltraPDF(exportOptions);
          downloadFile(blob, `${safeTitle}.pdf`, 'application/pdf');
          toast.success('Vector PDF downloaded directly!');
        } catch (pdfErr) {
          console.warn('Direct PDF compilation failed, falling back to Print Setup:', pdfErr);
          toast.info('Direct compilation had encoding issues. Opening high-fidelity Print Setup instead...');
          await printHTMLToPDF(compiledHtml, `${safeTitle}.pdf`);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold truncate">
                {docTitle || 'Document Designer'}
              </DialogTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                Beautify, preview, and customize your documents on-the-fly.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Workspace Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-muted/10">
          {/* Real-time PDF Vector Live Preview */}
          <div className="flex-1 min-h-[300px] md:min-h-0 bg-muted/20 border-b md:border-b-0 md:border-r overflow-hidden relative">
            <iframe
              srcDoc={previewHtml}
              title="HTML preview"
              className="w-full h-full bg-white border-0"
              sandbox="allow-same-origin"
            />
          </div>

          {/* Customization Settings Sidebar */}
          <div className="w-full md:w-80 bg-card p-4 sm:p-5 overflow-y-auto flex flex-col justify-between shrink-0 border-t md:border-t-0 space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                <Settings2 className="w-3.5 h-3.5" />
                <span>Customize Document</span>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <Label htmlFor="pdf-title" className="text-xs font-medium">Document Title</Label>
                <Input
                  id="pdf-title"
                  size="sm"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="h-8 text-xs bg-background/50"
                  placeholder="Enter custom title..."
                />
              </div>

              <Separator />

              {/* Theme Settings Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  Visual Theme
                </Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {Object.values(PDF_THEMES).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      className={`flex items-center justify-between text-left p-2 rounded-lg border text-xs transition-all ${
                        selectedTheme === t.id 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3.5 h-3.5 rounded border shadow-sm shrink-0" 
                          style={{ 
                            backgroundColor: `rgb(${t.colors.background.join(',')})`,
                            borderColor: `rgb(${t.colors.primary.join(',')})`
                          }} 
                        />
                        <div>
                          <p className="font-semibold text-foreground">{t.name}</p>
                          <p className="text-[9px] text-muted-foreground leading-normal">{t.description.split(',')[0]}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Document Add-on Switches */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="toc-toggle" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    Table of Contents
                  </Label>
                  <Switch
                    id="toc-toggle"
                    checked={includeToC}
                    onCheckedChange={setIncludeToC}
                    disabled={!markdown}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="summary-toggle" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                    <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    Executive Summary
                  </Label>
                  <Switch
                    id="summary-toggle"
                    checked={includeSummary}
                    onCheckedChange={setIncludeSummary}
                    disabled={!markdown}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="qr-toggle" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                    <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                    QR Link to Source
                  </Label>
                  <Switch
                    id="qr-toggle"
                    checked={includeQR}
                    onCheckedChange={setIncludeQR}
                    disabled={!markdown}
                  />
                </div>
              </div>

              {markdown && (
                <>
                  <Separator />
                  {/* Download Option Selectors */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                      Export Mode
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5 bg-muted/30 p-1 rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setDownloadType('direct')}
                        className={`py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${
                          downloadType === 'direct' 
                            ? 'bg-background shadow text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Direct Download
                      </button>
                      <button
                        type="button"
                        onClick={() => setDownloadType('print')}
                        className={`py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${
                          downloadType === 'print' 
                            ? 'bg-background shadow text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Print Layout
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground italic leading-normal px-1">
                      {downloadType === 'direct' 
                        ? 'Generates PDF instantly in background. Selectable text and formatting.' 
                        : 'Opens browser print layout. Offers premium styling options & margins.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Actions Panel */}
            <div className="pt-4 border-t space-y-2 shrink-0">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full gap-2 text-xs h-9 font-semibold"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : downloadType === 'print' ? (
                  <>
                    <Printer className="w-4 h-4" />
                    Open Print Setup
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full text-[11px] text-muted-foreground h-8"
              >
                Close Editor
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}