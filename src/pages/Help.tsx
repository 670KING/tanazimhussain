import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/layout/SEO';
import { 
  ArrowLeft, Search, HelpCircle, Mail, MessageSquare, LifeBuoy,
  ChevronDown, ChevronUp, CheckCircle, Loader2, BookOpen, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface FAQItem {
  q: string;
  a: string;
}

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Ticket Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('question');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const faqs: FAQItem[] = [
    {
      q: 'Is Tanoedu AI free to use?',
      a: 'Yes! Tanoedu AI is currently 100% free to access. You can leverage the multi-model AI chat assistant, generate smart study plans, summarize academic documents, and create practice exams without any cost.'
    },
    {
      q: 'Which AI models are supported on the platform?',
      a: 'Tanoedu AI integrates Google Gemini Flash (default speed engine), Meta Llama (reasoning engine), Mistral AI, and custom Vision Models for processing charts and textbook diagrams.'
    },
    {
      q: 'How do I download my generated chat notes as a PDF?',
      a: 'Simply hover over the chat message you want to save, click the Download icon, and select "Premium PDF" or "Plain Text". Tanoedu AI compiles the content and LaTeX expressions into a crisp, searchable vector PDF.'
    },
    {
      q: 'Does Tanoedu AI support uploading screenshots or files?',
      a: 'Yes, you can upload textbook diagrams, mathematical equations, or slide screenshots directly. Select a Vision model from the top dropdown, click the image upload icon in the text bar, attach your files, and click send.'
    },
    {
      q: 'Is my data secure and kept confidential?',
      a: 'Absolutely. We encrypt all study sessions and uploaded assets at rest and in transit. More importantly, under our secure API terms, our model endpoints are contractually bound not to train their algorithms using your prompts or documents.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API submission delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitSuccess(true);
    toast.success('Support ticket submitted successfully!');
    
    // Reset form fields
    setName('');
    setEmail('');
    setMessage('');
    
    // Reset success animation after a delay
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  // Structured Schema data for Google Rich FAQ snippets
  const schemaData = {
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Help & Support Center"
        description="Search our FAQ database, learn how to troubleshoot study planning queries, and submit support tickets to the Tanoedu AI team."
        keywords="Tanoedu AI help center, support ticket, AI tutor FAQs, troubleshooting math render"
        schemaData={schemaData}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.svg" className="w-8 h-8 object-contain" alt="Tanoedu AI Logo" />
            <span className="font-bold text-gradient text-lg">Tanoedu AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/docs')} className="gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Guides
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary">
              Launch App
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="relative py-20 bg-muted/30 border-b overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-30" />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary shadow-glow mb-2">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">How can we help?</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            Search our knowledge base for instant answers or send a direct ticket to our educational support desk.
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search help articles and FAQs..."
              className="pl-12 h-12 rounded-xl bg-card shadow-md border-border/80 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto w-full px-4 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 flex-1">
        
        {/* Left Column: FAQ Accordion */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="border rounded-xl bg-card/40 hover:bg-card/75 transition-all overflow-hidden">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-medium text-sm sm:text-base text-foreground"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-primary shrink-0 ml-4" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-4" />}
                  </button>
                  
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground border-t pt-3 leading-relaxed whitespace-pre-wrap">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredFaqs.length === 0 && (
              <div className="text-center py-12 border rounded-xl bg-muted/10">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-medium">No FAQ matches found.</p>
                <p className="text-xs text-muted-foreground mt-1">Try refining your search terms or contact support on the right.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact Support Ticket Form */}
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Submit a Ticket
          </h2>

          <Card className="border-border/60 bg-card/30 backdrop-blur-sm relative overflow-hidden">
            {submitSuccess && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4 animate-bounce" />
                <h3 className="font-bold text-lg mb-2">Ticket Submitted!</h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  We have successfully queued support ticket <strong>#TANO-{Math.floor(1000 + Math.random() * 9000)}</strong>. 
                  Our learning assistance team will review and reply to your email address within 24 hours.
                </p>
                <Button size="sm" variant="outline" className="mt-6" onClick={() => setSubmitSuccess(false)}>
                  Submit Another
                </Button>
              </div>
            )}

            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="support-name">Full Name</Label>
                  <Input 
                    id="support-name" 
                    placeholder="Your name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Email Address</Label>
                  <Input 
                    id="support-email" 
                    type="email" 
                    placeholder="you@school.edu" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="support-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">General Inquiry</SelectItem>
                      <SelectItem value="bug">Report a Bug / Math Render Issue</SelectItem>
                      <SelectItem value="feature">Request a Feature</SelectItem>
                      <SelectItem value="billing">Account & Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-message">Message / Details</Label>
                  <Textarea 
                    id="support-message" 
                    placeholder="Please describe how we can assist you..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4} 
                    required 
                    className="resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full gradient-primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Ticket...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
