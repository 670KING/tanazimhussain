import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Loader2, 
  Sparkles,
  Eye,
  Settings2,
  Palette,
  BookOpen,
  FileCode,
  FileType,
  QrCode,
  List,
  FileCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PDF_THEMES, PDFTheme, ThemeConfig } from './PDFThemes';
import { 
  generateUltraPDF, 
  exportAsMarkdown, 
  exportAsLaTeX, 
  exportAsText, 
  downloadFile,
  ExportOptions 
} from './PDFExporter';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { parseStructuredDocument, structuredToMarkdown } from '@/lib/math-utils';
import { printHTMLToPDF, downloadHTMLFile, sanitizeHTMLOutput } from './HTMLPDFExporter';

interface UltraPDFGeneratorProps {
  onGenerateWithAI: (prompt: string, options: PDFOptions) => Promise<string>;
  isLoading?: boolean;
}

export interface PDFOptions {
  title: string;
  type: 'assignment' | 'report' | 'notes' | 'essay' | 'research' | 'cheatsheet';
  style: 'academic' | 'professional' | 'casual';
  length: 'short' | 'medium' | 'long';
}

const DOCUMENT_TYPES = [
  { value: 'assignment', label: 'Assignment', icon: FileCheck },
  { value: 'report', label: 'Report', icon: FileText },
  { value: 'notes', label: 'Study Notes', icon: BookOpen },
  { value: 'essay', label: 'Essay', icon: FileType },
  { value: 'research', label: 'Research Paper', icon: FileCode },
  { value: 'cheatsheet', label: 'Cheat Sheet', icon: List },
];

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: FileText, extension: '.pdf' },
  { id: 'html', name: 'HTML', icon: FileCode, extension: '.html' },
  { id: 'markdown', name: 'Markdown', icon: FileCode, extension: '.md' },
  { id: 'latex', name: 'LaTeX', icon: FileType, extension: '.tex' },
  { id: 'text', name: 'Plain Text', icon: FileText, extension: '.txt' },
];

export function UltraPDFGenerator({ onGenerateWithAI, isLoading }: UltraPDFGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<PDFOptions>({
    title: '',
    type: 'assignment',
    style: 'academic',
    length: 'medium',
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Theme & Export options
  const [selectedTheme, setSelectedTheme] = useState<PDFTheme>('modern');
  const [includeToC, setIncludeToC] = useState(true);
  const [includeQR, setIncludeQR] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'html' | 'markdown' | 'latex' | 'text'>('pdf');

  const currentTheme = PDF_THEMES[selectedTheme];

  // Auto-set theme based on document type
  useEffect(() => {
    if (options.type === 'cheatsheet') {
      setSelectedTheme('cheatsheet');
    } else if (options.type === 'research' || options.type === 'essay') {
      setSelectedTheme('academic');
    }
  }, [options.type]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a topic or prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await onGenerateWithAI(prompt, options);
      setGeneratedContent(content);
      setActiveTab('preview');
      toast.success('Content generated! Preview and customize before downloading.');
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!generatedContent) {
      toast.error('Generate content first');
      return;
    }

    setIsExporting(true);
    const sanitizedTitle = (options.title || 'Document').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    
    try {
      const exportOptions: ExportOptions = {
        title: options.title || 'Generated Document',
        content: generatedContent,
        theme: selectedTheme,
        includeToC,
        includeQR,
        includeSummary,
        qrUrl: window.location.origin,
      };

      switch (selectedFormat) {
        case 'pdf': {
          // New: model returns complete self-contained HTML.
          // Print via hidden iframe → native browser "Save as PDF".
          // This is far more reliable than jsPDF for math, Unicode, page breaks.
          if (/<html[\s>]/i.test(generatedContent) || /<!DOCTYPE/i.test(generatedContent)) {
            await printHTMLToPDF(generatedContent, `${sanitizedTitle}.pdf`);
          } else {
            // Fallback for legacy markdown content
            const pdfBlob = await generateUltraPDF(exportOptions);
            downloadFile(pdfBlob, `${sanitizedTitle}.pdf`, 'application/pdf');
          }
          break;
        }
        case 'markdown': {
          const md = exportAsMarkdown(exportOptions);
          downloadFile(md, `${sanitizedTitle}.md`, 'text/markdown');
          break;
        }
        case 'latex': {
          const tex = exportAsLaTeX(exportOptions);
          downloadFile(tex, `${sanitizedTitle}.tex`, 'application/x-latex');
          break;
        }
        case 'text': {
          const txt = exportAsText(exportOptions);
          downloadFile(txt, `${sanitizedTitle}.txt`, 'text/plain');
          break;
        }
        case 'html': {
          downloadHTMLFile(generatedContent, `${sanitizedTitle}.html`);
          break;
        }
      }
      
      toast.success(`${selectedFormat.toUpperCase()} downloaded successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setGeneratedContent('');
    setOptions({
      title: '',
      type: 'assignment',
      style: 'academic',
      length: 'medium',
    });
    setActiveTab('generate');
    setSelectedTheme('modern');
    setSelectedFormat('pdf');
  };

  const wordCount = generatedContent.split(/\s+/).filter(Boolean).length;
  const pageEstimate = Math.max(1, Math.ceil(wordCount / 400));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/5">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Generate PDF</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            Ultra PDF Generator
            <Badge variant="secondary" className="ml-2 text-xs">Pro</Badge>
          </DialogTitle>
          <DialogDescription>
            Generate professional documents with themes, auto-ToC, QR codes, and multiple export formats.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="generate" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedContent} className="gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="export" disabled={!generatedContent} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="flex-1 overflow-y-auto mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document Title</Label>
                  <Input
                    placeholder="e.g., Matrix Theory Study Guide"
                    value={options.title}
                    onChange={(e) => setOptions({ ...options, title: e.target.value })}
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DOCUMENT_TYPES.map((type) => (
                      <Button
                        key={type.value}
                        variant={options.type === type.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOptions({ ...options, type: type.value as PDFOptions['type'] })}
                        className={cn(
                          "h-auto py-2 flex-col gap-1",
                          options.type === type.value && "ring-2 ring-primary/50"
                        )}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Style</Label>
                    <Select 
                      value={options.style} 
                      onValueChange={(v) => setOptions({ ...options, style: v as PDFOptions['style'] })}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Length</Label>
                    <Select 
                      value={options.length} 
                      onValueChange={(v) => setOptions({ ...options, length: v as PDFOptions['length'] })}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (1-2 pages)</SelectItem>
                        <SelectItem value="medium">Medium (3-5 pages)</SelectItem>
                        <SelectItem value="long">Long (6+ pages)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Topic / Instructions</Label>
                  <Textarea
                    placeholder="Describe what you want in detail. Include any specific topics, formulas, examples, or requirements..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    className="bg-background/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Mention specific topics, equations, or sections you want included.
                  </p>
                </div>
              </div>

              {/* Right Column - Quick Templates */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Quick Templates</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { title: 'Matrix Theory Cheat Sheet', prompt: 'Create a comprehensive cheat sheet for Matrix Theory including: eigenvalues, eigenvectors, matrix operations, determinants, inverses, and key theorems with examples', type: 'cheatsheet' as const },
                    { title: 'Research Summary', prompt: 'Write a research paper summary on the given topic with abstract, methodology, findings, and conclusion sections', type: 'research' as const },
                    { title: 'Study Notes', prompt: 'Create detailed study notes with key concepts, definitions, examples, and practice problems', type: 'notes' as const },
                    { title: 'Lab Report', prompt: 'Generate a formal lab report with introduction, methodology, results, analysis, and conclusion', type: 'report' as const },
                  ].map((template) => (
                    <Button
                      key={template.title}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOptions({ ...options, title: template.title, type: template.type });
                        setPrompt(template.prompt);
                      }}
                      className="justify-start text-left h-auto py-2.5 px-3 hover:bg-primary/5"
                    >
                      <ChevronRight className="w-4 h-4 mr-2 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{template.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{template.prompt.slice(0, 60)}...</p>
                      </div>
                    </Button>
                  ))}
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Smart Features
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• LaTeX math rendering (e.g., \frac{"{a}"}{"{b}"})</li>
                    <li>• Auto Table of Contents for long docs</li>
                    <li>• QR code linking to source</li>
                    <li>• Multiple theme options</li>
                    <li>• Export as PDF, Markdown, LaTeX, or Text</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t mt-6">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
                className="gap-2 min-w-32"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Preview Pane */}
              <div className="lg:col-span-2 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Preview
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>~{pageEstimate} page{pageEstimate > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div 
                  className={cn(
                    "flex-1 rounded-lg border overflow-hidden",
                    selectedTheme === 'dark' ? 'bg-[#1e1e23]' : 'bg-white'
                  )}
                >
                  <ScrollArea className="h-[400px]">
                    <div className={cn(
                      "p-6",
                      selectedTheme === 'dark' && 'text-gray-200'
                    )}>
                      {/* Title Preview */}
                      <h1 className={cn(
                        "text-2xl font-bold mb-2",
                        selectedTheme === 'academic' && 'font-serif',
                        selectedTheme === 'dark' && 'text-white'
                      )}>
                        {options.title || 'Untitled Document'}
                      </h1>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generated by TanoAI • {new Date().toLocaleDateString()}
                      </p>
                      <Separator className={cn(selectedTheme === 'dark' && 'bg-gray-700')} />
                      
                      {/* Content Preview - handles both structured JSON and markdown */}
                      <div className="mt-4 prose-ai">
                        <MarkdownRenderer content={(() => {
                          const structured = parseStructuredDocument(generatedContent);
                          if (structured) return structuredToMarkdown(structured);
                          return generatedContent;
                        })()} />
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Theme & Options Panel */}
              <div className="space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Theme
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.values(PDF_THEMES).map((theme) => (
                      <Button
                        key={theme.id}
                        variant={selectedTheme === theme.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={cn(
                          "justify-start h-auto py-2 px-3",
                          selectedTheme === theme.id && "ring-2 ring-primary/50"
                        )}
                      >
                        <div 
                          className="w-4 h-4 rounded mr-2 border"
                          style={{ 
                            backgroundColor: `rgb(${theme.colors.background.join(',')})`,
                            borderColor: `rgb(${theme.colors.primary.join(',')})`
                          }} 
                        />
                        <div className="text-left">
                          <p className="font-medium text-xs">{theme.name}</p>
                          <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Options
                  </Label>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Table of Contents</span>
                    </div>
                    <Switch checked={includeToC} onCheckedChange={setIncludeToC} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">QR Code Link</span>
                    </div>
                    <Switch checked={includeQR} onCheckedChange={setIncludeQR} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Executive Summary</span>
                    </div>
                    <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
                  </div>
                </div>

                <Button 
                  onClick={() => setActiveTab('export')} 
                  className="w-full gap-2"
                  size="lg"
                >
                  <Download className="w-4 h-4" />
                  Continue to Export
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-y-auto mt-4">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Choose Export Format</h3>
                <p className="text-sm text-muted-foreground">
                  Select your preferred format and download your document.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {EXPORT_FORMATS.map((format) => (
                  <Button
                    key={format.id}
                    variant={selectedFormat === format.id ? "default" : "outline"}
                    size="lg"
                    onClick={() => setSelectedFormat(format.id as typeof selectedFormat)}
                    className={cn(
                      "h-auto py-4 flex-col gap-2",
                      selectedFormat === format.id && "ring-2 ring-primary/50"
                    )}
                  >
                    <format.icon className="w-6 h-6" />
                    <div>
                      <p className="font-medium">{format.name}</p>
                      <p className="text-xs text-muted-foreground">{format.extension}</p>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Summary of selections */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <h4 className="font-medium text-sm">Export Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Document:</span>
                  <span className="font-medium">{options.title || 'Untitled'}</span>
                  
                  <span className="text-muted-foreground">Theme:</span>
                  <span className="font-medium">{currentTheme.name}</span>
                  
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{selectedFormat.toUpperCase()}</span>
                  
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{wordCount} words (~{pageEstimate} pages)</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  {includeToC && <Badge variant="secondary" className="text-xs">Table of Contents</Badge>}
                  {includeSummary && <Badge variant="secondary" className="text-xs">Summary</Badge>}
                  {includeQR && selectedFormat === 'pdf' && <Badge variant="secondary" className="text-xs">QR Code</Badge>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('preview')}
                  className="flex-1"
                >
                  Back to Preview
                </Button>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download {selectedFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Quick download function for message actions
export async function quickDownloadPDF(content: string, title: string = 'Document', theme: PDFTheme = 'modern') {
  try {
    const pdfBlob = await generateUltraPDF({
      title,
      content,
      theme,
      includeToC: true,
      includeQR: false,
      includeSummary: false,
    });
    
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    downloadFile(pdfBlob, `${sanitizedTitle}.pdf`, 'application/pdf');
    
    return true;
  } catch (error) {
    console.error('Quick PDF download failed:', error);
    throw error;
  }
}
