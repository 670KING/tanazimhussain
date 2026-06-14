import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/layout/SEO';
import { ArrowLeft, Shield, Lock, Eye, CheckCircle } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', label: 'Introduction' },
    { id: 'data-collect', label: '1. Data We Collect' },
    { id: 'data-use', label: '2. How We Use Data' },
    { id: 'third-party', label: '3. AI Models & Partners' },
    { id: 'data-security', label: '4. Data Retention & Security' },
    { id: 'user-rights', label: '5. Your GDPR & Privacy Rights' },
    { id: 'cookies', label: '6. Cookies Policy' },
    { id: 'changes', label: '7. Policy Changes' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 80,
        behavior: 'smooth',
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Privacy Policy"
        description="Read the Privacy Policy of Tanoedu AI to learn how we protect your educational data, chat transcriptions, and personal information."
        keywords="privacy policy, data protection, Tanoedu AI privacy, GDPR, user data safety"
      />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.svg" className="w-8 h-8 object-contain" alt="Tanoedu AI Logo" />
            <span className="font-bold text-gradient text-lg">Tanoedu AI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative py-16 bg-muted/30 border-b overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-30" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary shadow-glow mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            At Tanoedu AI, we safeguard your academic search logs, documents, and transcripts with modern security standards.
          </p>
          <p className="text-xs text-muted-foreground pt-2">Last updated: June 14, 2026</p>
        </div>
      </div>

      {/* Content Layout */}
      <div className="max-w-7xl mx-auto px-4 py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Table of Contents Sticky Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-2 p-4 rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-4 px-2">On this page</h3>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary pl-2'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3 space-y-10">
          
          <Card className="border-border/60 bg-card/30 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8 space-y-8 prose-ai">
              
              <section id="intro" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">Introduction</h2>
                <p>
                  Welcome to <strong>Tanoedu AI</strong> (referred to as "we", "us", or "our"). We operate as a professional-grade educational utility platform. We are strongly committed to maintaining the privacy and security of your personal data.
                </p>
                <p>
                  This Privacy Policy describes how we collect, process, share, and protect your information when you interact with our web applications, custom databases, document summaries, quiz generation services, and AI Chat tools. By creating an account or using Tanoedu AI, you agree to the practices detailed in this policy.
                </p>
              </section>

              <section id="data-collect" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">1. Data We Collect</h2>
                <p>We process information only when necessary to deliver rich academic assistance features:</p>
                <div className="grid gap-4 md:grid-cols-2 mt-2">
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-sm">
                      <Lock className="w-4 h-4" />
                      <span>Account Information</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email addresses, usernames, and profile metrics captured during auth using secure Supabase providers.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-sm">
                      <Eye className="w-4 h-4" />
                      <span>Activity & Prompts</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chat transcripts, custom study planner prompts, generated quiz questions, and uploaded images for Vision models.
                    </p>
                  </div>
                </div>
              </section>

              <section id="data-use" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">2. How We Use Data</h2>
                <p>Your data is strictly used to provide, debug, and optimize your educational experience:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>AI Processing</strong>: Translating academic prompts and uploaded images to query state-of-the-art LLMs.</li>
                  <li><strong>Personalization</strong>: Storing recent conversations and study calendars so you can resume study sessions.</li>
                  <li><strong>Document Exporting</strong>: Compiling text and LaTeX equations into premium PDFs, Markdown, and text files.</li>
                  <li><strong>Security Audits</strong>: Guarding the platform against structural abuse, scraping, and prompt injections.</li>
                </ul>
              </section>

              <section id="third-party" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">3. AI Models & Partners</h2>
                <p>
                  To fulfill complex academic commands, we securely pass chat context to our LLM endpoints (e.g. Gemini, Llama, Mistral). 
                </p>
                <div className="p-4 rounded-lg bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 border border-yellow-500/20 text-xs">
                  <p className="font-semibold mb-1">Important Zero-Data-Training Policy:</p>
                  Our API integration contracts ensure that none of our external AI model providers (including Google and Meta models) use your prompts, document uploads, or vision uploads to train their base models.
                </div>
              </section>

              <section id="data-security" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">4. Data Retention & Security</h2>
                <p>
                  Your information is stored securely in encrypted Supabase database instances. We apply SSL/TLS transport encryption to all network packets, ensuring your data cannot be intercepted.
                </p>
                <p>
                  You may delete any chat logs, generated documents, or your entire Tanoedu AI account at any time. Deleted records are instantly wiped from our production database clusters.
                </p>
              </section>

              <section id="user-rights" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">5. Your GDPR & Privacy Rights</h2>
                <p>
                  Depending on your jurisdiction (e.g. the European Union under GDPR), you possess the following rights:
                </p>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div className="flex gap-2 items-start p-2.5 border rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Right to Access</strong>: Obtain a full copy of all personal data we hold about you.</span>
                  </div>
                  <div className="flex gap-2 items-start p-2.5 border rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Right to Rectify</strong>: Update outdated usernames or account credentials instantly.</span>
                  </div>
                  <div className="flex gap-2 items-start p-2.5 border rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Right to Erasure</strong>: Erase all account records and history files permanently.</span>
                  </div>
                  <div className="flex gap-2 items-start p-2.5 border rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Right to Portability</strong>: Export study materials and quiz data in structured formats.</span>
                  </div>
                </div>
              </section>

              <section id="cookies" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">6. Cookies Policy</h2>
                <p>
                  Tanoedu AI only writes essential functional cookies (e.g. session authentication tokens) to your local storage. We do not place third-party marketing, analytics, or behavioral tracking cookies on your device.
                </p>
              </section>

              <section id="changes" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">7. Policy Changes</h2>
                <p>
                  We may periodically revise this policy. If we publish substantial changes, we will notify you through in-app notices or email alerts before the new updates take effect.
                </p>
              </section>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
