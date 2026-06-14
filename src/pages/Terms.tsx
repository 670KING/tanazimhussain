import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/layout/SEO';
import { ArrowLeft, Scale, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('intro');

  const sections = [
    { id: 'intro', label: 'Introduction' },
    { id: 'user-accounts', label: '1. User Accounts' },
    { id: 'academic-integrity', label: '2. Academic Integrity' },
    { id: 'intellectual-property', label: '3. Intellectual Property' },
    { id: 'prohibited-conduct', label: '4. Prohibited Conduct' },
    { id: 'limitation-liability', label: '5. Limitation of Liability' },
    { id: 'termination', label: '6. Termination' },
    { id: 'governing-law', label: '7. Governing Law' },
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
        title="Terms of Service"
        description="Review the Terms of Service for Tanoedu AI. Understand your rights, compliance rules, and academic integrity policies when using our tools."
        keywords="terms of service, user agreement, academic honesty policy, Tanoedu terms"
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
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            Please read these terms carefully before accessing our AI chat, quiz, and study planning services.
          </p>
          <p className="text-xs text-muted-foreground pt-2">Last updated: June 14, 2026</p>
        </div>
      </div>

      {/* Content Layout */}
      <div className="max-w-7xl mx-auto px-4 py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Table of Contents Sticky Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-2 p-4 rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-4 px-2">Sections</h3>
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
                  These Terms of Service govern your access to and use of <strong>Tanoedu AI</strong> ("Tanoedu AI", "Platform", "we", "us", or "our"). By visiting our website or registering an account, you agree to be bound by these terms.
                </p>
                <p>
                  If you are registering an account on behalf of a school, university, or corporate organization, you represent that you hold the legal authority to bind that entity to these Terms. If you do not agree to all elements of this agreement, you must immediately cease using the platform.
                </p>
              </section>

              <section id="user-accounts" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">1. User Accounts</h2>
                <p>
                  To leverage Tanoedu AI study portals, you must register a user account through our secure authentication wizard. 
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>Security</strong>: You are responsible for keeping your login credentials confidential.</li>
                  <li><strong>Accuracy</strong>: You must provide accurate email details. Multiple accounts created for structural manipulation will be closed.</li>
                  <li><strong>Age limit</strong>: You must be at least 13 years old (or the minimum legal age in your country) to construct an account.</li>
                </ul>
              </section>

              <section id="academic-integrity" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">2. Academic Integrity</h2>
                <p>
                  Tanoedu AI is engineered strictly as an educational study aid. We support positive, honest learning frameworks.
                </p>
                <div className="p-4 rounded-lg bg-red-500/10 text-red-800 dark:text-red-400 border border-red-500/20 text-xs flex gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Academic Integrity Warning:</p>
                    You agree NOT to use the chat assistant, quiz output, or summarization files to engage in academic cheating, plagiarism, or direct exam completion. Using Tanoedu AI outputs to claim authorship of essays or scientific work without attribution violates standard institutional codes of conduct and is prohibited.
                  </div>
                </div>
              </section>

              <section id="intellectual-property" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">3. Intellectual Property</h2>
                <p>
                  <strong>Our Content</strong>: The design interface, software components, proprietary styles, code, and logo assets are the intellectual property of Tanoedu AI and protected by copyrights.
                </p>
                <p>
                  <strong>Your Content</strong>: You retain all ownership rights to the prompts, notes, and files you upload to Tanoedu AI. You grant us a limited, worldwide license to feed this content into processing models solely to generate responses for you.
                </p>
              </section>

              <section id="prohibited-conduct" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">4. Prohibited Conduct</h2>
                <p>You agree not to perform the following restricted actions:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Attempting to compromise the service security or bypass rate limits.</li>
                  <li>Injecting malware, prompt injections, or script attacks to exploit system endpoints.</li>
                  <li>Using automated scrapers, crawlers, or scripts to copy our structural databases.</li>
                  <li>Misrepresenting AI-generated work as original, unassisted human-created materials where prohibited.</li>
                </ul>
              </section>

              <section id="limitation-liability" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">5. Limitation of Liability</h2>
                <p>
                  TANOEDU AI PORTALS ARE PROVIDED "AS IS" AND "AS AVAILABLE". TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING FIT FOR PURPOSE OR FUNCTIONAL ACCURACY.
                </p>
                <p>
                  We are not liable for direct, indirect, incidental, or consequential damages resulting from database downtime, translation inaccuracies, AI hallucinations, quiz errors, or grade metrics.
                </p>
              </section>

              <section id="termination" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">6. Termination</h2>
                <p>
                  We reserve the right to suspend or block your platform access at any time, with or without notice, for violating these Terms of Service or engaging in malicious activities.
                </p>
              </section>

              <section id="governing-law" className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-foreground border-b pb-2">7. Governing Law</h2>
                <p>
                  These Terms of Service are governed by and construed in accordance with local regulations, without giving effect to conflicts of law principles. Any legal actions must be filed in local jurisdiction courts.
                </p>
              </section>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
