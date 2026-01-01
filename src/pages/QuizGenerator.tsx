import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileQuestion, CheckCircle, XCircle } from 'lucide-react';

export default function QuizGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState('5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Generate ${numQuestions} ${difficulty} difficulty quiz questions about: ${topic}` }],
          model: 'gemini-flash',
          stream: false,
          type: 'quiz',
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        setQuiz(questions);
        if (user) {
          await supabase.from('quizzes').insert({
            user_id: user.id,
            title: `Quiz: ${topic}`,
            subject: topic,
            difficulty,
            questions,
            total_questions: questions.length,
          });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate quiz', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const submitQuiz = () => {
    setSubmitted(true);
    const score = quiz.reduce((acc, q, i) => (answers[i] === q.correct_answer ? acc + 1 : acc), 0);
    toast({ title: 'Quiz Complete!', description: `You scored ${score}/${quiz.length}` });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <FileQuestion className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Quiz Generator</h1>
          <p className="text-muted-foreground">Create AI-powered quizzes on any topic</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Input placeholder="Enter topic..." value={topic} onChange={(e) => setTopic(e.target.value)} className="md:col-span-2" />
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateQuiz} disabled={isGenerating || !topic.trim()} className="gradient-primary">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {quiz.length > 0 && (
        <div className="space-y-4">
          {quiz.map((q, i) => (
            <Card key={i}>
              <CardHeader><CardTitle className="text-base">Q{i + 1}: {q.question}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {q.options?.map((opt: string) => (
                  <Button
                    key={opt}
                    variant={answers[i] === opt ? 'default' : 'outline'}
                    className={`w-full justify-start ${submitted && opt === q.correct_answer ? 'border-green-500 bg-green-500/10' : ''}`}
                    onClick={() => !submitted && setAnswers({ ...answers, [i]: opt })}
                    disabled={submitted}
                  >
                    {submitted && opt === q.correct_answer && <CheckCircle className="w-4 h-4 mr-2 text-green-500" />}
                    {submitted && answers[i] === opt && opt !== q.correct_answer && <XCircle className="w-4 h-4 mr-2 text-destructive" />}
                    {opt}
                  </Button>
                ))}
                {submitted && q.explanation && <p className="text-sm text-muted-foreground mt-2">{q.explanation}</p>}
              </CardContent>
            </Card>
          ))}
          {!submitted && <Button onClick={submitQuiz} className="w-full gradient-primary">Submit Quiz</Button>}
        </div>
      )}
    </div>
  );
}
