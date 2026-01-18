import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Loader2, 
  Plus, 
  Trash2, 
  Clock, 
  Target,
  BookOpen,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic {
  name: string;
  duration: string;
  description: string;
  completed: boolean;
}

interface StudyPlan {
  id: string;
  title: string;
  subject: string | null;
  deadline: string | null;
  topics: Topic[];
  created_at: string;
}

export default function StudyPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (user) fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPlans(data.map(p => ({
        ...p,
        topics: Array.isArray(p.topics) ? (p.topics as unknown as Topic[]) : []
      })));
    }
    setIsLoading(false);
  };

  const generatePlan = async () => {
    if (!subject.trim() || !user) return;
    setIsGenerating(true);

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
            content: `Create a study plan for: ${subject}. ${goal ? `Goal: ${goal}.` : ''} ${deadline ? `Deadline: ${deadline}.` : ''} Break it into 5-8 topics with time estimates.`
          }],
          model: 'gemini-flash',
          stream: false,
          type: 'study_plan',
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[0]);
        
        const { data: insertedPlan, error } = await supabase
          .from('study_plans')
          .insert([{
            user_id: user.id,
            title: planData.title || `${subject} Study Plan`,
            subject,
            deadline: deadline || null,
            topics: JSON.parse(JSON.stringify(planData.topics || [])),
          }])
          .select()
          .single();

        if (!error && insertedPlan) {
          setPlans(prev => [{
            ...insertedPlan,
            topics: insertedPlan.topics as unknown as Topic[]
          }, ...prev]);
          setShowForm(false);
          setSubject('');
          setGoal('');
          setDeadline('');
          toast({ title: 'Success!', description: 'Study plan created' });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate plan', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTopic = async (planId: string, topicIndex: number) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const updatedTopics = [...plan.topics];
    updatedTopics[topicIndex] = {
      ...updatedTopics[topicIndex],
      completed: !updatedTopics[topicIndex].completed
    };

    const { error } = await supabase
      .from('study_plans')
      .update({ topics: JSON.parse(JSON.stringify(updatedTopics)) })
      .eq('id', planId);

    if (!error) {
      setPlans(prev => prev.map(p => 
        p.id === planId ? { ...p, topics: updatedTopics } : p
      ));
    }
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('study_plans').delete().eq('id', id);
    if (!error) {
      setPlans(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Deleted', description: 'Study plan removed' });
    }
  };

  const getProgress = (topics: Topic[]) => {
    if (!topics.length) return 0;
    return Math.round((topics.filter(t => t.completed).length / topics.length) * 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Calendar className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Study Plans</h1>
            <p className="text-muted-foreground">AI-generated personalized study schedules</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" /> New Plan
        </Button>
      </div>

      {showForm && (
        <Card className="animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create AI Study Plan
            </CardTitle>
            <CardDescription>Tell me what you want to learn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Subject or topic (e.g., Calculus, JavaScript)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Deadline (optional)"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Your goal or specific areas to focus on (optional)"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={generatePlan} disabled={isGenerating || !subject.trim()} className="gradient-primary">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Plan
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No study plans yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI-powered study plan</p>
            <Button onClick={() => setShowForm(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" /> Create Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {plans.map((plan) => {
            const progress = getProgress(plan.topics);
            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        {plan.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {plan.subject && <Badge variant="secondary">{plan.subject}</Badge>}
                        {plan.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(plan.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlan(plan.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="pt-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={cn(
                        "font-medium",
                        progress === 100 ? "text-green-500" : "text-foreground"
                      )}>
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {plan.topics.map((topic, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-colors",
                          topic.completed ? "bg-green-500/10" : "bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={topic.completed}
                          onCheckedChange={() => toggleTopic(plan.id, index)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              topic.completed && "line-through text-muted-foreground"
                            )}>
                              {topic.name}
                            </span>
                            {topic.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{topic.description}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {topic.duration}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
