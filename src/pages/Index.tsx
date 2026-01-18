import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { 
  GraduationCap, 
  Sparkles, 
  Brain, 
  FileQuestion, 
  Calendar, 
  BarChart3, 
  Zap, 
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Get instant help with any academic topic. Powered by multiple AI models.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: FileQuestion,
    title: 'Smart Quiz Generator',
    description: 'Create customized quizzes on any subject with adjustable difficulty.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Calendar,
    title: 'Study Planner',
    description: 'AI-generated study schedules tailored to your goals and deadlines.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Sparkles,
    title: 'Text Summarizer',
    description: 'Quickly summarize long texts into concise, easy-to-understand points.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Brain,
    title: 'Multi-Model AI',
    description: 'Choose from Gemini Flash, Mistral, and Llama for different tasks.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Progress Analytics',
    description: 'Track your learning journey with detailed statistics and insights.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
];

const testimonials = [
  { name: 'Sarah K.', role: 'Medical Student', text: 'TanoAI helped me ace my anatomy exams. The quiz feature is incredible!' },
  { name: 'James M.', role: 'CS Major', text: 'The AI explains complex algorithms better than my textbooks.' },
  { name: 'Emily R.', role: 'Law Student', text: 'Study plans keep me organized during exam season. Highly recommend!' },
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <header className="relative z-10 max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient">TanoAI</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="gradient-primary">
                Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
                <Button onClick={() => navigate('/auth')} className="gradient-primary">Get Started</Button>
              </>
            )}
          </div>
        </header>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Zap className="w-4 h-4" />
            Powered by Advanced AI Models
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            Your AI-Powered
            <span className="block text-gradient">Academic Assistant</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up">
            Study smarter with AI chat, quiz generation, personalized study plans, 
            and powerful summarization tools. All in one platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Button size="lg" onClick={handleGetStarted} className="gradient-primary text-lg px-8 h-14 shadow-glow">
              Start Learning Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 h-14">
              View Features
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Free to start
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              No credit card
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Multiple AI models
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Excel</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful AI tools designed specifically for students and learners
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:border-primary/30 transition-all hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Students</h2>
            <p className="text-lg text-muted-foreground">See what our users have to say</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4">"{testimonial.text}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of students using TanoAI to study smarter and achieve more.
          </p>
          <Button size="lg" onClick={handleGetStarted} className="gradient-primary text-lg px-8 h-14 shadow-glow">
            Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-gradient">TanoAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TanoAI. Your AI-powered academic assistant.
          </p>
        </div>
      </footer>
    </div>
  );
}
