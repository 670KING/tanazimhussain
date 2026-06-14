import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/layout/SEO';
import { 
  ArrowLeft, Search, BookOpen, Terminal, Sparkles, Brain, 
  FileQuestion, Calendar, FileUser, Check, Copy, AlertCircle, Info, Zap
} from 'lucide-react';

interface DocArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: JSX.Element;
}

export default function Docs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState('intro');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const articles: DocArticle[] = [
    {
      id: 'intro',
      category: 'Getting Started',
      title: 'Introduction to Tanoedu AI',
      summary: 'Learn about the core platform design, architecture, and available AI features.',
      content: (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Introduction to Tanoedu AI</h1>
          <p className="text-muted-foreground text-lg">
            Welcome to the official developer and user documentation for Tanoedu AI — a premium, professional-grade educational assistant.
          </p>
          <p>
            Tanoedu AI is engineered to help students, researchers, and professionals accelerate their learning workflows. By combining multiple state-of-the-art Large Language Models (LLMs) with advanced mathematical parsing (LaTeX) and document generators, Tanoedu AI turns complex study topics into simplified summaries, practice exams, and organized schedules.
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-2">
                <Brain className="w-6 h-6 text-primary" />
                <h3 className="font-semibold text-base">State-of-the-Art Models</h3>
                <p className="text-xs text-muted-foreground">Toggle between Google Gemini Flash, Llama, and Mistral depending on your query type.</p>
              </CardContent>
            </Card>
            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-6 space-y-2">
                <Terminal className="w-6 h-6 text-accent" />
                <h3 className="font-semibold text-base">Mathematical Fidelity</h3>
                <p className="text-xs text-muted-foreground">View clean inline and block LaTeX equations compiled in real-time using KaTeX.</p>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 rounded-xl border bg-muted/30 flex items-start gap-3 mt-6">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Zero-data training policy:</strong> All requests sent to our processing models are encrypted. Under our API terms, your transcripts and uploaded documents are never used for training external models.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'models',
      category: 'Getting Started',
      title: 'Choosing the Right AI Model',
      summary: 'Understand model specialties: Gemini Flash for speed, Llama for reasoning, Vision models for images.',
      content: (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Choosing the Right AI Model</h1>
          <p className="text-muted-foreground text-lg">
            Tanoedu AI hosts multiple AI engines, letting you choose the perfect match for your task.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Badge color="blue">Google Gemini Flash</Badge>
                <span className="text-xs text-muted-foreground">Default Engine</span>
              </div>
              <p className="text-sm">
                <strong>Best for:</strong> Speed, formatting large files, LaTeX math, and general chat questions. Gemini Flash provides near-instant response speeds and handles extremely large transcripts effortlessly.
              </p>
            </div>

            <div className="p-4 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Badge color="purple">Meta Llama</Badge>
                <span className="text-xs text-muted-foreground">Reasoning Engine</span>
              </div>
              <p className="text-sm">
                <strong>Best for:</strong> Advanced computer science questions, programming debugging, step-by-step logic derivations, and complex text reasoning.
              </p>
            </div>

            <div className="p-4 rounded-xl border space-y-2">
              <div className="flex items-center gap-2">
                <Badge color="emerald">Vision Models</Badge>
                <span className="text-xs text-muted-foreground">Multimodal Engine</span>
              </div>
              <p className="text-sm">
                <strong>Best for:</strong> Reading textbook diagrams, math graphs, slides screenshots, and analyzing images. Switch to Vision Mode by selecting it from the dropdown or dragging an image into the text area.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'quiz',
      category: 'Core Features',
      title: 'Smart Quiz Generator',
      summary: 'Learn how to create custom tests with adjustable difficulty and download them.',
      content: (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Smart Quiz Generator</h1>
          <p className="text-muted-foreground text-lg">
            Create custom practicing exams with adjustable question count, subject topics, and difficulty.
          </p>
          <p>
            To launch a new quiz, navigate to the **Quiz Generator** from the tools sidebar, enter your target topic, select the difficulty level (Easy, Medium, Hard), choose the question format (Multiple Choice, True/False, or Short Answer), and click Generate.
          </p>
          <div className="p-4 bg-muted/40 rounded-xl border space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Pro Tip: Grounding with Custom Texts
            </h4>
            <p className="text-xs text-muted-foreground">
              You can paste custom notes or a syllabus outline directly into the generator prompt box. For example: <br />
              <code className="text-primary mt-1 block">"Create a 5-question multiple choice quiz testing only concepts from this text: [Paste notes here]"</code>
            </p>
          </div>
          <p>
            Once the quiz is rendered, you can answer the questions directly, check your scores, and download a beautifully styled PDF of the practice exam complete with answer keys!
          </p>
        </div>
      )
    },
    {
      id: 'planner',
      category: 'Core Features',
      title: 'AI Study Planner',
      summary: 'Generate weekly schedules customized to your specific syllabus and exams.',
      content: (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">AI Study Planner</h1>
          <p className="text-muted-foreground text-lg">
            Tailor-made academic calendars and schedules aligned with your exams.
          </p>
          <p>
            The Study Planner dynamically distributes your curriculum topics across structured daily blocks.
          </p>
          <h3 className="text-lg font-semibold">Configuring a Schedule:</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Define Milestones</strong>: Set the date of your upcoming exam or assignment deadline.</li>
            <li><strong>Upload Syllabus</strong>: Input study chapters or topics that need to be covered.</li>
            <li><strong>Select Intensity</strong>: Set daily study hour targets (e.g. 1 hour/day vs. intensive review).</li>
          </ol>
          <p>
            Tanoedu AI outputs a weekly checkpoint tracker, recommending specific sub-topics to master each day, complete with quiz prompts to check your retention.
          </p>
        </div>
      )
    },
    {
      id: 'api',
      category: 'Developer API',
      title: 'REST API Integration',
      summary: 'Integrate Tanoedu AI services directly into your scripts or custom interfaces.',
      content: (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">REST API Integration</h1>
          <p className="text-muted-foreground text-lg">
            Programmatically query Tanoedu AI tools, compile LaTeX documents, and generate study resources.
          </p>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Create Study Notes Endpoint
            </h3>
            <p className="text-sm text-muted-foreground">
              Send a request to generate structured study summaries.
            </p>
          </div>

          <div className="relative">
            <pre className="bg-[#1e1e24] text-white p-4 rounded-xl text-xs overflow-x-auto font-mono">
{`curl -X POST https://api.tanoedu.ai/v1/generate/notes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "Quantum Mechanics",
    "theme": "academic",
    "sections": ["Schrodinger Equation", "Wave Function Interpretation"]
  }'`}
            </pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 text-white hover:bg-white/10"
              onClick={() => copyCode(`curl -X POST https://api.tanoedu.ai/v1/generate/notes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "topic": "Quantum Mechanics",
    "theme": "academic",
    "sections": ["Schrodinger Equation", "Wave Function Interpretation"]
  }'`, 'api-curl')}
            >
              {copiedId === 'api-curl' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-600 dark:text-red-400">
              <strong>Rate Limiting:</strong> Standard sandbox accounts are limited to 60 calls/minute. For enterprise thresholds, contact API support.
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredArticles = articles.filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedArticle = articles.find(art => art.id === selectedArticleId) || articles[0];

  const categories = Array.from(new Set(articles.map(art => art.category)));

  const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${colorClasses[color] || 'bg-muted text-muted-foreground'}`}>
        {children}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO 
        title="Documentation & Guides"
        description="Access full guides and developer API documentation for Tanoedu AI. Learn how to configure AI models, quizzes, planners, and export documents."
        keywords="Tanoedu AI docs, documentation, developer API, PDF configuration, KaTeX guide"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.svg" className="w-8 h-8 object-contain" alt="Tanoedu AI Logo" />
            <span className="font-bold text-gradient text-lg">Tanoedu AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="gradient-primary">
              Launch App
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Left Column: Sidebar Navigation & Search */}
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              className="pl-9 bg-card/45"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Navigation Tree */}
          <div className="space-y-4">
            {categories.map(cat => {
              const catArticles = filteredArticles.filter(art => art.category === cat);
              if (catArticles.length === 0) return null;
              
              return (
                <div key={cat} className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                    {cat}
                  </h4>
                  <div className="space-y-0.5">
                    {catArticles.map(art => (
                      <button
                        key={art.id}
                        onClick={() => setSelectedArticleId(art.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                          selectedArticleId === art.id
                            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary pl-2'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{art.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Reading Pane */}
        <div className="md:col-span-3">
          <Card className="border-border/60 bg-card/30 backdrop-blur-sm min-h-[60vh] flex flex-col">
            <CardContent className="p-6 md:p-10 flex-1 flex flex-col">
              {selectedArticle.content}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
