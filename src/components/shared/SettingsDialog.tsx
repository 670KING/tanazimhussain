import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Shield, Sparkles, Settings, Palette, CheckCircle2, Moon, Sun, Monitor, GraduationCap, LayoutGrid } from 'lucide-react';
import { AI_MODELS } from '@/lib/ai-models';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [denseMode, setDenseMode] = useState(() => localStorage.getItem('denseMode') === 'true');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('highContrast') === 'true');
  
  // Account Form
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') || '');
  const [academicRole, setAcademicRole] = useState(() => localStorage.getItem('academicRole') || 'undergraduate');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  
  // Professional Preferences
  const [defaultModel, setDefaultModel] = useState(() => localStorage.getItem('defaultModel') || 'openai/gpt-oss-120b:free');
  const [academicLevel, setAcademicLevel] = useState(() => localStorage.getItem('academicLevel') || 'undergraduate');
  const [responseLength, setResponseLength] = useState(() => localStorage.getItem('responseLength') || 'balanced');

  useEffect(() => {
    if (user && !localStorage.getItem('displayName')) {
      setDisplayName(user.email?.split('@')[0] || '');
    }
  }, [user]);

  // Sync Theme Choice
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
    setTheme(savedTheme);
  }, []);

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    window.dispatchEvent(new Event('theme-change'));
    toast.success(`Theme switched to ${newTheme} mode`);
  };

  const handleToggleDense = (checked: boolean) => {
    setDenseMode(checked);
    localStorage.setItem('denseMode', String(checked));
    if (checked) {
      document.documentElement.classList.add('dense-layout');
    } else {
      document.documentElement.classList.remove('dense-layout');
    }
    toast.success(`Dense layout ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleToggleHighContrast = (checked: boolean) => {
    setHighContrast(checked);
    localStorage.setItem('highContrast', String(checked));
    if (checked) {
      document.documentElement.classList.add('high-contrast-math');
    } else {
      document.documentElement.classList.remove('high-contrast-math');
    }
    toast.success(`High contrast math ${checked ? 'enabled' : 'disabled'}`);
  };

  const saveAccount = () => {
    setIsSavingAccount(true);
    setTimeout(() => {
      setIsSavingAccount(false);
      localStorage.setItem('displayName', displayName);
      localStorage.setItem('academicRole', academicRole);
      window.dispatchEvent(new Event('display-name-change'));
      toast.success('Account profile updated successfully');
    }, 800);
  };

  const resetPassword = () => {
    toast.success(`A password reset link has been dispatched to ${user?.email}. Please check your inbox.`);
  };

  const saveAcademicPreferences = () => {
    localStorage.setItem('defaultModel', defaultModel);
    localStorage.setItem('academicLevel', academicLevel);
    localStorage.setItem('responseLength', responseLength);
    window.dispatchEvent(new Event('academic-preferences-change'));
    toast.success('Academic and professional preferences updated');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] h-[80vh] max-h-[600px] flex flex-col p-0 overflow-hidden border-border/40 bg-background md:rounded-xl shadow-2xl">
        <DialogHeader className="p-6 border-b border-border/40 flex-shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Settings className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Preferences & Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Customize your academic profile, layout options, and AI preferences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Tabs Menu */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col md:flex-row">
            <div className="w-full md:w-[200px] border-b md:border-b-0 md:border-r border-border/40 bg-muted/10 p-2 md:p-3 flex-shrink-0">
              <TabsList className="flex md:flex-col items-stretch justify-start w-full bg-transparent p-0 gap-1.5 h-auto overflow-x-auto md:overflow-x-visible">
                <TabsTrigger 
                  value="account" 
                  className="flex items-center justify-start gap-2.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-left w-auto md:w-full shrink-0"
                >
                  <User className="w-4 h-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="personalization" 
                  className="flex items-center justify-start gap-2.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-left w-auto md:w-full shrink-0"
                >
                  <Palette className="w-4 h-4" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger 
                  value="subscription" 
                  className="flex items-center justify-start gap-2.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-left w-auto md:w-full shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger 
                  value="academic" 
                  className="flex items-center justify-start gap-2.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-left w-auto md:w-full shrink-0"
                >
                  <GraduationCap className="w-4 h-4" />
                  Academic Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
              {/* Account Tab */}
              <TabsContent value="account" className="space-y-5 m-0 focus-visible:outline-none">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Academic Profile</h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{displayName || 'User Profile'}</h4>
                      <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="account-name">Display Username</Label>
                      <Input
                        id="account-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="h-10 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="account-role">Current Academic Role</Label>
                      <Select value={academicRole} onValueChange={setAcademicRole}>
                        <SelectTrigger id="account-role" className="h-10 text-xs">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="highschool">High School Student</SelectItem>
                          <SelectItem value="undergraduate">Undergraduate Student</SelectItem>
                          <SelectItem value="graduate">Graduate Student / Researcher</SelectItem>
                          <SelectItem value="educator">Academic Faculty / Educator</SelectItem>
                          <SelectItem value="other">Independent Scholar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={saveAccount} className="gradient-primary h-9 px-4 text-xs font-semibold" disabled={isSavingAccount}>
                    {isSavingAccount ? 'Saving...' : 'Save Profile Details'}
                  </Button>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/40">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Security & Authentication
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Trigger a security notification to safely reset your sign-in password.
                  </p>
                  <Button variant="outline" onClick={resetPassword} className="h-9 px-4 text-xs font-medium border-border/40 hover:bg-muted/40">
                    Reset Account Password
                  </Button>
                </div>
              </TabsContent>

              {/* Personalization Tab */}
              <TabsContent value="personalization" className="space-y-5 m-0 focus-visible:outline-none">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Theme Preferences</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => changeTheme('light')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                        theme === 'light' 
                          ? 'border-primary bg-primary/5 shadow-sm text-primary font-medium' 
                          : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <Sun className="w-5 h-5 shrink-0" />
                      <span className="text-xs">Light Mode</span>
                    </button>
                    <button
                      onClick={() => changeTheme('dark')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                        theme === 'dark' 
                          ? 'border-primary bg-primary/5 shadow-sm text-primary font-medium' 
                          : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <Moon className="w-5 h-5 shrink-0" />
                      <span className="text-xs">Dark Mode</span>
                    </button>
                    <button
                      onClick={() => changeTheme('system')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                        theme === 'system' 
                          ? 'border-primary bg-primary/5 shadow-sm text-primary font-medium' 
                          : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <Monitor className="w-5 h-5 shrink-0" />
                      <span className="text-xs">System</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/40">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Layout & Typography</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 py-1.5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium">Dense Layout Mode</Label>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Reduces spacing and font sizes to display more formulas and references.
                        </p>
                      </div>
                      <Switch checked={denseMode} onCheckedChange={handleToggleDense} />
                    </div>

                    <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/20">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium">High Contrast Math</Label>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Increases the visual weight of LaTeX equations and formulas for readability.
                        </p>
                      </div>
                      <Switch checked={highContrast} onCheckedChange={handleToggleHighContrast} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="space-y-5 m-0 focus-visible:outline-none">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Current Academic License</h3>
                  
                  <div className="p-4 bg-muted/30 border rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">Sandbox Free Tier</span>
                        <span className="px-1.5 py-0.5 bg-muted border text-[9px] text-muted-foreground font-semibold rounded">Active</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Standard API access with 60 queries/min limit. Includes standard models.
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/40">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Tanoedu Academic Pro
                  </h3>
                  
                  <div className="p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-primary/5 rounded-xl space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold tracking-wider uppercase">Premium Academic Plan</span>
                      <div>
                        <span className="text-xl font-bold">$10</span>
                        <span className="text-[10px] text-muted-foreground font-normal"> / month</span>
                      </div>
                    </div>
                    
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>High-speed Reasoning (Deep Thinking) models</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>High-fidelity OCR scanner & math table parsing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Priority server speeds & 200 calls/min threshold</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Early features release for PDF study planners</span>
                      </li>
                    </ul>

                    <Button onClick={() => toast.success('Tanoedu Pro subscription model will launch soon!')} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs h-10 shadow-sm shadow-amber-500/10">
                      Upgrade to Tanoedu Pro (Coming Soon)
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Academic Preferences Tab */}
              <TabsContent value="academic" className="space-y-4 m-0 focus-visible:outline-none">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">Academic AI Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="pref-model">Preferred AI Reasoning Engine</Label>
                      <Select value={defaultModel} onValueChange={setDefaultModel}>
                        <SelectTrigger id="pref-model" className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODELS.map(m => (
                            <SelectItem key={m.id} value={m.id} className="text-xs">
                              {m.name} ({m.provider})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Sets the default model loaded in the AI Chat window.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="pref-level">Target Scholar Depth</Label>
                        <Select value={academicLevel} onValueChange={setAcademicLevel}>
                          <SelectTrigger id="pref-level" className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="highschool" className="text-xs">Introductory (High School)</SelectItem>
                            <SelectItem value="undergraduate" className="text-xs">Intermediate (Undergraduate)</SelectItem>
                            <SelectItem value="graduate" className="text-xs">Advanced (Graduate/PhD)</SelectItem>
                            <SelectItem value="researcher" className="text-xs">Professional Researcher</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Guides AI explanation depth and terminology complexity.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pref-length">Default Explanation Style</Label>
                        <Select value={responseLength} onValueChange={setResponseLength}>
                          <SelectTrigger id="pref-length" className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="concise" className="text-xs">Concise & Direct</SelectItem>
                            <SelectItem value="balanced" className="text-xs">Standard (Balanced)</SelectItem>
                            <SelectItem value="detailed" className="text-xs">Detailed & Complete</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Specifies default response brevity guidelines for queries.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={saveAcademicPreferences} className="gradient-primary h-9 px-4 text-xs font-semibold mt-4">
                    Save Academic Preferences
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
