import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  FileUser, Download, Loader2, Sparkles, Eye, Edit, 
  Palette, Layout, Settings2, RefreshCw, FileText,
  Briefcase, GraduationCap, Wand2, Send, Save, FolderOpen,
  Plus, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResumeEditor } from './ResumeEditor';
import { ResumePreview } from './ResumePreview';
import { 
  ResumeData, ResumeConfig, ResumeTemplate,
  DEFAULT_RESUME_DATA, DEFAULT_RESUME_CONFIG, generateId
} from './types';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useResumeStorage } from '@/hooks/useResumeStorage';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { user } = useAuth();
  const {
    resumes,
    currentResumeId,
    isSaving,
    saveResume,
    loadResume,
    deleteResume,
    createNewResume,
  } = useResumeStorage();

  const [data, setData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
  const [config, setConfig] = useState<ResumeConfig>(DEFAULT_RESUME_CONFIG);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'preview' | 'ai'>('editor');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('My Resume');
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
          model: 'gpt-oss-120b',
          stream: false,
          type: 'resume',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance content');
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || content;
    } catch (error) {
      console.error('AI enhance error:', error);
      toast.error('Failed to enhance content. Please try again.');
      return content;
    } finally {
      setIsEnhancing(false);
    }
  }, []);

  // One-prompt AI resume generation
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe your background and target role');
      return;
    }

    setIsAiGenerating(true);
    toast.info('AI is generating your resume...', { duration: 3000 });

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
            content: `You are an expert resume writer. Based on the following description, generate a complete professional resume in JSON format.

User's background and target role:
${aiPrompt}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks, just pure JSON):
{
  "personalInfo": {
    "fullName": "Full Name",
    "email": "email@example.com",
    "phone": "+1 (555) 123-4567",
    "location": "City, State",
    "linkedin": "linkedin.com/in/username",
    "website": "",
    "summary": "Professional summary paragraph..."
  },
  "experience": [
    {
      "id": "1",
      "company": "Company Name",
      "position": "Job Title",
      "location": "City, State",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "description": "• Achievement 1 with metrics\\n• Achievement 2 with impact\\n• Achievement 3"
    }
  ],
  "education": [
    {
      "id": "1",
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "startDate": "2018",
      "endDate": "2022",
      "gpa": "3.8"
    }
  ],
  "skills": {
    "technical": ["Skill 1", "Skill 2", "Skill 3"],
    "soft": ["Communication", "Leadership"],
    "languages": ["English (Native)"],
    "certifications": ["Certification 1"]
  }
}

Make the resume ATS-friendly with strong action verbs and quantified achievements.`
          }],
          model: 'gpt-oss-120b',
          stream: false,
          type: 'resume',
          maxTokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate resume');
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';
      
      // Try to parse the JSON from the response
      try {
        // Remove any markdown code blocks if present
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }

        // Try to extract a JSON object even if surrounded by stray text
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
        }

        const raw = JSON.parse(jsonStr);

        // ----- Normalize to our ResumeData shape -----
        const experience: ResumeData['experience'] = (raw.experience || []).map((e: any) => ({
          id: e.id || generateId(),
          company: e.company || '',
          position: e.position || e.title || '',
          location: e.location || '',
          startDate: e.startDate || '',
          endDate: e.endDate || '',
          current: typeof e.current === 'boolean'
            ? e.current
            : /present|current/i.test(String(e.endDate || '')),
          description: e.description || '',
          achievements: Array.isArray(e.achievements) ? e.achievements : [],
        }));

        const education: ResumeData['education'] = (raw.education || []).map((ed: any) => ({
          id: ed.id || generateId(),
          institution: ed.institution || ed.school || '',
          degree: ed.degree || '',
          field: ed.field || ed.fieldOfStudy || '',
          location: ed.location || '',
          startDate: ed.startDate || '',
          endDate: ed.endDate || '',
          gpa: ed.gpa || '',
          achievements: Array.isArray(ed.achievements) ? ed.achievements : [],
        }));

        // Skills can come as an array OR an object with categories — flatten safely
        const skills: ResumeData['skills'] = [];
        if (Array.isArray(raw.skills)) {
          raw.skills.forEach((s: any) => {
            if (typeof s === 'string') {
              skills.push({ id: generateId(), name: s, level: 'intermediate', category: 'General' });
            } else if (s && typeof s === 'object') {
              skills.push({
                id: s.id || generateId(),
                name: s.name || '',
                level: s.level || 'intermediate',
                category: s.category || 'General',
              });
            }
          });
        } else if (raw.skills && typeof raw.skills === 'object') {
          const categoryMap: Record<string, string> = {
            technical: 'Technical',
            soft: 'Soft Skills',
            languages: 'Languages',
            certifications: 'Certifications',
          };
          Object.entries(raw.skills).forEach(([key, list]) => {
            const category = categoryMap[key] || key;
            (Array.isArray(list) ? list : []).forEach((name: any) => {
              if (typeof name === 'string' && name.trim()) {
                skills.push({
                  id: generateId(),
                  name,
                  level: 'intermediate',
                  category,
                });
              }
            });
          });
        }

        const projects: ResumeData['projects'] = (raw.projects || []).map((p: any) => ({
          id: p.id || generateId(),
          name: p.name || '',
          description: p.description || '',
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
          url: p.url || '',
          startDate: p.startDate || '',
          endDate: p.endDate || '',
        }));

        const certifications: ResumeData['certifications'] = (raw.certifications || []).map((c: any) => ({
          id: c.id || generateId(),
          name: c.name || '',
          issuer: c.issuer || '',
          date: c.date || '',
          expiryDate: c.expiryDate || '',
          credentialId: c.credentialId || '',
          url: c.url || '',
        }));

        setData({
          personalInfo: {
            ...DEFAULT_RESUME_DATA.personalInfo,
            ...(raw.personalInfo || {}),
            photo: data.personalInfo.photo, // Keep existing photo
          },
          experience,
          education,
          skills,
          projects,
          certifications,
        });
        
        toast.success('Resume generated successfully! Review and customize as needed.');
        setActiveView('editor');
      } catch (parseError) {
        console.error('JSON parse error:', parseError, content);
        toast.error('AI response format error. Please try again.');
      }
    } catch (error) {
      console.error('AI generate error:', error);
      toast.error('Failed to generate resume. Please try again.');
    } finally {
      setIsAiGenerating(false);
    }
  }, [aiPrompt, data.personalInfo.photo]);

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

      // Create canvas from the resume content with higher quality
      const canvas = await html2canvas(resumeContent, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: resumeContent.scrollWidth,
        height: resumeContent.scrollHeight,
        windowWidth: resumeContent.scrollWidth,
        windowHeight: resumeContent.scrollHeight,
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

      // Add image to PDF with high quality
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Handle multi-page if content is taller than A4
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
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

  const handleSave = useCallback(async () => {
    const title = data.personalInfo.fullName 
      ? `${data.personalInfo.fullName}'s Resume`
      : resumeTitle;
    await saveResume(data, config, title);
  }, [data, config, resumeTitle, saveResume]);

  const handleLoadResume = useCallback(async (id: string) => {
    const result = await loadResume(id);
    if (result) {
      setData(result.data);
      setConfig(result.config);
      setActiveView('editor');
    }
  }, [loadResume]);

  const handleNewResume = useCallback(() => {
    const { data: newData, config: newConfig } = createNewResume();
    setData(newData);
    setConfig(newConfig);
    setAiPrompt('');
    setActiveView('ai');
  }, [createNewResume]);

  const resetResume = () => {
    if (window.confirm('Are you sure you want to reset? All unsaved changes will be lost.')) {
      setData(DEFAULT_RESUME_DATA);
      setConfig(DEFAULT_RESUME_CONFIG);
      setAiPrompt('');
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
            {/* View Toggle */}
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'editor' | 'preview' | 'ai')} className="flex-1 sm:flex-none">
              <TabsList className="h-8 w-full sm:w-auto grid grid-cols-3">
                <TabsTrigger value="ai" className="text-xs gap-1 px-2 sm:px-3">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI</span>
                </TabsTrigger>
                <TabsTrigger value="editor" className="text-xs gap-1 px-2 sm:px-3">
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1 px-2 sm:px-3">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Save Button */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5 text-xs"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Save</span>
              </Button>
            )}

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
          {/* AI Generator Panel */}
          {activeView === 'ai' && (
            <div className="flex-1 p-4 sm:p-6 overflow-auto">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    One-Prompt Resume Generator
                  </CardTitle>
                  <CardDescription>
                    Describe your background and target role, and AI will generate a complete professional resume for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Describe Your Background</Label>
                    <Textarea
                      placeholder="Example: I'm a software engineer with 5 years of experience in Python and JavaScript. I've worked at a startup building e-commerce platforms and led a team of 3 developers. I have a BS in Computer Science from MIT. I'm looking for a senior engineering role at a tech company focused on AI/ML."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={8}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include: job history, skills, education, achievements, and target role
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAIGenerate}
                      disabled={isAiGenerating || !aiPrompt.trim()}
                      className="flex-1 gap-2"
                    >
                      {isAiGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Resume...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate My Resume
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2 text-sm">Quick Examples:</h4>
                    <div className="grid gap-2">
                      {[
                        "Marketing manager with 7 years experience in digital marketing, SEO, and content strategy. Led campaigns that generated $2M in revenue. MBA from Columbia. Looking for Director role.",
                        "Recent CS graduate from Stanford with internships at Google and Meta. Strong in algorithms, machine learning, and full-stack development. Looking for entry-level SWE role.",
                        "HR professional with 10 years experience in talent acquisition and employee development. SHRM certified. Looking for HR Director position at a Fortune 500 company."
                      ].map((example, i) => (
                        <button
                          key={i}
                          onClick={() => setAiPrompt(example)}
                          className="text-left text-xs p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                        >
                          {example.slice(0, 100)}...
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Editor Panel */}
          {activeView === 'editor' && (
            <div className="flex-1 lg:w-1/2 border-r border-border/50 flex flex-col overflow-hidden">
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
          )}

          {/* Preview Panel - Always visible on desktop when in editor mode */}
          <div className={cn(
            "lg:w-1/2 flex-1 overflow-hidden bg-muted/20",
            activeView === 'ai' && "hidden lg:hidden",
            activeView === 'editor' && "hidden lg:block",
            activeView === 'preview' && "block"
          )}>
            <ResumePreview ref={previewRef} data={data} config={config} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
