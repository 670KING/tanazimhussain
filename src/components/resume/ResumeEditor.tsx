import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, Briefcase, GraduationCap, Code, Award, FolderOpen, 
  Plus, Trash2, Sparkles, Loader2, Camera, X, Wand2,
  Mail, Phone, MapPin, Globe, Linkedin, Github
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  ResumeData, Experience, Education, Skill, Project, Certification,
  generateId 
} from './types';

interface ResumeEditorProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  onAIEnhance: (field: string, content: string) => Promise<string>;
  isEnhancing: boolean;
}

export function ResumeEditor({ data, onChange, onAIEnhance, isEnhancing }: ResumeEditorProps) {
  const [activeTab, setActiveTab] = useState('personal');
  const [enhancingField, setEnhancingField] = useState<string | null>(null);

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updatePersonalInfo('photo', event.target?.result as string);
      toast.success('Photo uploaded successfully');
    };
    reader.readAsDataURL(file);
  }, [data, onChange]);

  const enhanceField = async (fieldName: string, content: string, updateFn: (enhanced: string) => void) => {
    if (!content.trim()) {
      toast.error('Please add some content first');
      return;
    }
    
    setEnhancingField(fieldName);
    try {
      const enhanced = await onAIEnhance(fieldName, content);
      updateFn(enhanced);
      toast.success('Content enhanced with AI');
    } catch (error) {
      toast.error('Failed to enhance content');
    } finally {
      setEnhancingField(null);
    }
  };

  // Experience helpers
  const addExperience = () => {
    onChange({
      ...data,
      experience: [
        ...data.experience,
        {
          id: generateId(),
          company: '',
          position: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
          achievements: ['']
        }
      ]
    });
  };

  const updateExperience = (id: string, field: string, value: any) => {
    onChange({
      ...data,
      experience: data.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const removeExperience = (id: string) => {
    onChange({
      ...data,
      experience: data.experience.filter(exp => exp.id !== id)
    });
  };

  // Education helpers
  const addEducation = () => {
    onChange({
      ...data,
      education: [
        ...data.education,
        {
          id: generateId(),
          institution: '',
          degree: '',
          field: '',
          location: '',
          startDate: '',
          endDate: '',
          achievements: []
        }
      ]
    });
  };

  const updateEducation = (id: string, field: string, value: any) => {
    onChange({
      ...data,
      education: data.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const removeEducation = (id: string) => {
    onChange({
      ...data,
      education: data.education.filter(edu => edu.id !== id)
    });
  };

  // Skills helpers
  const addSkill = () => {
    onChange({
      ...data,
      skills: [
        ...data.skills,
        { id: generateId(), name: '', level: 'intermediate', category: 'Technical' }
      ]
    });
  };

  const updateSkill = (id: string, field: string, value: any) => {
    onChange({
      ...data,
      skills: data.skills.map(skill =>
        skill.id === id ? { ...skill, [field]: value } : skill
      )
    });
  };

  const removeSkill = (id: string) => {
    onChange({
      ...data,
      skills: data.skills.filter(skill => skill.id !== id)
    });
  };

  // Projects helpers
  const addProject = () => {
    onChange({
      ...data,
      projects: [
        ...data.projects,
        {
          id: generateId(),
          name: '',
          description: '',
          technologies: [],
          startDate: '',
        }
      ]
    });
  };

  const updateProject = (id: string, field: string, value: any) => {
    onChange({
      ...data,
      projects: data.projects.map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    });
  };

  const removeProject = (id: string) => {
    onChange({
      ...data,
      projects: data.projects.filter(proj => proj.id !== id)
    });
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Code },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
  ];

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-4">
          {/* Navigation Tabs - Horizontal scrollable on mobile */}
          <div className="flex gap-1 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "gap-1.5 shrink-0 text-xs",
                  activeTab === tab.id && "gradient-primary"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* Personal Info */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center">
                    {data.personalInfo.photo ? (
                      <img
                        src={data.personalInfo.photo}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/50 rounded-full flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  {data.personalInfo.photo && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-1 -right-1 w-6 h-6"
                      onClick={() => updatePersonalInfo('photo', '')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <Input
                    placeholder="Full Name"
                    value={data.personalInfo.fullName}
                    onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <Input
                    placeholder="Professional Title (e.g., Software Engineer)"
                    value={data.personalInfo.title}
                    onChange={(e) => updatePersonalInfo('title', e.target.value)}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Phone"
                    type="tel"
                    value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Location (City, Country)"
                    value={data.personalInfo.location}
                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Website (optional)"
                    value={data.personalInfo.website || ''}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="LinkedIn URL (optional)"
                    value={data.personalInfo.linkedin || ''}
                    onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="GitHub URL (optional)"
                    value={data.personalInfo.github || ''}
                    onChange={(e) => updatePersonalInfo('github', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Summary with AI Enhance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Professional Summary</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => enhanceField(
                      'summary',
                      data.personalInfo.summary,
                      (enhanced) => updatePersonalInfo('summary', enhanced)
                    )}
                    disabled={isEnhancing || enhancingField === 'summary'}
                  >
                    {enhancingField === 'summary' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  placeholder="A brief professional summary highlighting your key achievements and career objectives..."
                  value={data.personalInfo.summary}
                  onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Experience */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              {data.experience.map((exp, index) => (
                <Card key={exp.id} className="border-border/50">
                  <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">
                      {exp.position || exp.company || `Experience ${index + 1}`}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeExperience(exp.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Job Title"
                        value={exp.position}
                        onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                      />
                      <Input
                        placeholder="Company Name"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                      />
                      <Input
                        placeholder="Location"
                        value={exp.location}
                        onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="month"
                          placeholder="Start"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                        />
                        <Input
                          type="month"
                          placeholder="End"
                          value={exp.current ? '' : exp.endDate}
                          onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                          disabled={exp.current}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`current-${exp.id}`}
                        checked={exp.current}
                        onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                        className="rounded border-border"
                      />
                      <label htmlFor={`current-${exp.id}`} className="text-sm">
                        I currently work here
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Description & Achievements</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-6"
                          onClick={() => enhanceField(
                            `experience-${exp.id}`,
                            exp.description,
                            (enhanced) => updateExperience(exp.id, 'description', enhanced)
                          )}
                          disabled={isEnhancing || enhancingField === `experience-${exp.id}`}
                        >
                          {enhancingField === `experience-${exp.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3" />
                          )}
                          Enhance
                        </Button>
                      </div>
                      <Textarea
                        placeholder="• Describe your responsibilities and achievements&#10;• Use bullet points for clarity&#10;• Include metrics when possible"
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={addExperience}
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </Button>
            </div>
          )}

          {/* Education */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              {data.education.map((edu, index) => (
                <Card key={edu.id} className="border-border/50">
                  <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">
                      {edu.institution || edu.degree || `Education ${index + 1}`}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeEducation(edu.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Institution Name"
                        value={edu.institution}
                        onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                      />
                      <Input
                        placeholder="Degree (e.g., Bachelor of Science)"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                      />
                      <Input
                        placeholder="Field of Study"
                        value={edu.field}
                        onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                      />
                      <Input
                        placeholder="Location"
                        value={edu.location}
                        onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="Start Date"
                        value={edu.startDate}
                        onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                      />
                      <Input
                        type="month"
                        placeholder="End Date"
                        value={edu.endDate}
                        onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                      />
                      <Input
                        placeholder="GPA (optional)"
                        value={edu.gpa || ''}
                        onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={addEducation}
              >
                <Plus className="w-4 h-4" />
                Add Education
              </Button>
            </div>
          )}

          {/* Skills */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="grid gap-2">
                {data.skills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Input
                      placeholder="Skill name"
                      value={skill.name}
                      onChange={(e) => updateSkill(skill.id, 'name', e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={skill.level}
                      onValueChange={(value) => updateSkill(skill.id, 'level', value)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Category"
                      value={skill.category}
                      onChange={(e) => updateSkill(skill.id, 'category', e.target.value)}
                      className="w-24 h-8 text-xs hidden sm:block"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => removeSkill(skill.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={addSkill}
              >
                <Plus className="w-4 h-4" />
                Add Skill
              </Button>
            </div>
          )}

          {/* Projects */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {data.projects.map((project, index) => (
                <Card key={project.id} className="border-border/50">
                  <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">
                      {project.name || `Project ${index + 1}`}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeProject(project.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Project Name"
                        value={project.name}
                        onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Project URL (optional)"
                        value={project.url || ''}
                        onChange={(e) => updateProject(project.id, 'url', e.target.value)}
                      />
                    </div>
                    <Textarea
                      placeholder="Describe the project, your role, and key achievements..."
                      value={project.description}
                      onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                      rows={3}
                    />
                    <Input
                      placeholder="Technologies (comma-separated)"
                      value={project.technologies.join(', ')}
                      onChange={(e) => updateProject(project.id, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={addProject}
              >
                <Plus className="w-4 h-4" />
                Add Project
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
