import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  FileUser, Download, Loader2, Sparkles, Eye, Edit, 
  Palette, Layout, Settings2, RefreshCw, FileText,
  Briefcase, GraduationCap, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResumeEditor } from './ResumeEditor';
import { ResumePreview } from './ResumePreview';
import { 
  ResumeData, ResumeConfig, ResumeTemplate,
  DEFAULT_RESUME_DATA, DEFAULT_RESUME_CONFIG 
} from './types';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const TEMPLATE_OPTIONS: { value: ResumeTemplate; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'modern', label: 'Modern Corporate', description: 'Clean, sans-serif, accent colors', icon: Briefcase },
  { value: 'academic', label: 'Academic/CV', description: 'Dense text, serif fonts, research-focused', icon: GraduationCap },
  { value: 'creative', label: 'Creative', description: 'Sidebar layout, bold headers, photo-centric', icon: Palette },
];

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Slate', value: '#475569' },
  { name: 'Teal', value: '#14b8a6' },
];

export function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
  const [config, setConfig] = useState<ResumeConfig>(DEFAULT_RESUME_CONFIG);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleAIEnhance = useCallback(async (field: string, content: string): Promise<string> => {
    setIsEnhancing(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a professional resume writer. Enhance the following ${field} content to be more professional, impactful, and suitable for a resume. Use action verbs, quantify achievements where possible, and keep it concise. Only return the improved text, nothing else.

Original content:
${content}`
          }],
          model: 'gemini-flash',
          stream: false,
          type: 'chat',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance content');
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || content;
    } finally {
      setIsEnhancing(false);
    }
  }, []);

  const exportToPDF = useCallback(async () => {
    if (!previewRef.current) {
      toast.error('Preview not ready');
      return;
    }

    setIsExporting(true);
    toast.info('Generating PDF...', { duration: 2000 });

    try {
      // Find the actual resume content
      const resumeContent = previewRef.current.querySelector('.bg-white') as HTMLElement;
      if (!resumeContent) {
        throw new Error('Resume content not found');
      }

      // Create canvas from the resume content
      const canvas = await html2canvas(resumeContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: resumeContent.scrollWidth,
        height: resumeContent.scrollHeight,
      });

      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Handle multi-page if content is taller than A4
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Generate filename
      const fileName = data.personalInfo.fullName
        ? `${data.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`
        : 'Resume.pdf';

      pdf.save(fileName);
      toast.success('Resume exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [data.personalInfo.fullName]);

  const resetResume = () => {
    if (window.confirm('Are you sure you want to reset? All data will be lost.')) {
      setData(DEFAULT_RESUME_DATA);
      setConfig(DEFAULT_RESUME_CONFIG);
      toast.success('Resume reset to defaults');
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-[calc(100dvh-4rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-b border-border/50 bg-card/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <FileUser className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">AI Resume Architect</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Build professional resumes with AI assistance</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Mobile View Toggle */}
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'editor' | 'preview')} className="lg:hidden">
              <TabsList className="h-8">
                <TabsTrigger value="editor" className="text-xs gap-1.5 px-3">
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1.5 px-3">
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              onClick={resetResume}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>

            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              size="sm"
              className="gradient-primary shadow-glow gap-1.5 text-xs"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Editor Panel */}
          <div className={cn(
            "lg:w-1/2 border-r border-border/50 flex flex-col overflow-hidden",
            activeView !== 'editor' && "hidden lg:flex"
          )}>
            {/* Template & Color Settings */}
            <div className="p-3 border-b border-border/50 bg-muted/30 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Template Selector */}
                <Select
                  value={config.template}
                  onValueChange={(v) => setConfig({ ...config, template: v as ResumeTemplate })}
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <Layout className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Color Picker */}
                <div className="flex items-center gap-1">
                  {COLOR_PRESETS.slice(0, 6).map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                        config.primaryColor === color.value ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setConfig({ ...config, primaryColor: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>

                {/* Show Photo Toggle */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <Label htmlFor="show-photo" className="text-xs">Photo</Label>
                  <Switch
                    id="show-photo"
                    checked={config.showPhoto}
                    onCheckedChange={(checked) => setConfig({ ...config, showPhoto: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <ResumeEditor
                data={data}
                onChange={setData}
                onAIEnhance={handleAIEnhance}
                isEnhancing={isEnhancing}
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className={cn(
            "lg:w-1/2 flex-1 overflow-hidden bg-muted/20",
            activeView !== 'preview' && "hidden lg:block"
          )}>
            <ResumePreview ref={previewRef} data={data} config={config} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
