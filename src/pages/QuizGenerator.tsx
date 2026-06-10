import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, FileQuestion, CheckCircle, XCircle, Trophy, Target, Clock, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from 'next-themes';
import { CodeBlock } from '@/components/chat/MarkdownRenderer';
import { sanitizeLLMContent } from '@/lib/math-utils';

interface QuizQuestion {
  question: string;
  type: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export default function QuizGenerator() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState('5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const generateQuiz = async (retry = false) => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    
    if (retry) {
      setIsRetrying(true);
    } else {
      setIsGenerating(true);
      setQuiz([]);
      setAnswers({});
      setSubmitted(false);
      setCurrentQuestion(0);
    }
    setError(null);

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
            content: `Generate exactly ${numQuestions} ${difficulty} difficulty quiz questions about: ${topic}. 
Make questions educational and appropriate for students. Include detailed explanations for each answer.` 
          }],
          model: 'mimo-flash',
          stream: false,
          type: 'quiz',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate quiz');
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        setQuiz(questions);
        toast.success(`Quiz generated with ${questions.length} questions!`);
        
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
      } else {
        throw new Error('Failed to parse quiz questions');
      }
    } catch (err) {
      console.error('Quiz generation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate quiz';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setIsRetrying(false);
    }
  };

  const submitQuiz = async () => {
    setSubmitted(true);
    const score = quiz.reduce((acc, q, i) => (answers[i] === q.correct_answer ? acc + 1 : acc), 0);
    const percentage = Math.round((score / quiz.length) * 100);
    
    toast.success(
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <span>Quiz Complete! Score: {score}/{quiz.length} ({percentage}%)</span>
      </div>
    );

    // Update quiz score in database
    if (user) {
      await supabase
        .from('quizzes')
        .update({ 
          score, 
          completed_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('subject', topic)
        .order('created_at', { ascending: false })
        .limit(1);
    }
  };

  const resetQuiz = () => {
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestion(0);
  };

  const answeredCount = Object.keys(answers).length;
  const progress = quiz.length > 0 ? (answeredCount / quiz.length) * 100 : 0;
  const score = submitted ? quiz.reduce((acc, q, i) => (answers[i] === q.correct_answer ? acc + 1 : acc), 0) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <FileQuestion className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quiz Generator</h1>
            <p className="text-muted-foreground">Create AI-powered quizzes on any topic</p>
          </div>
        </div>
        
        {quiz.length > 0 && (
          <Button variant="outline" onClick={resetQuiz} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            New Quiz
          </Button>
        )}
      </div>

      {/* Generator Card */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <Input 
                placeholder="Enter topic (e.g., World War II, Calculus, Python)..." 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)} 
                className="h-11"
              />
            </div>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Easy
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="hard">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Hard
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={numQuestions} onValueChange={setNumQuestions}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Questions" />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 7, 10, 15].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n} Questions</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => generateQuiz()} 
              disabled={isGenerating || !topic.trim()} 
              className="h-11 gradient-primary shadow-glow"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {quiz.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Badge variant={submitted ? "default" : "secondary"} className="gap-1">
                  <Target className="w-3 h-3" />
                  {answeredCount}/{quiz.length} Answered
                </Badge>
                {submitted && (
                  <Badge 
                    variant="default" 
                    className={cn(
                      "gap-1",
                      score / quiz.length >= 0.7 ? "bg-green-500" : 
                      score / quiz.length >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                    )}
                  >
                    <Trophy className="w-3 h-3" />
                    Score: {score}/{quiz.length} ({Math.round((score / quiz.length) * 100)}%)
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{difficulty} difficulty</span>
              </div>
            </div>
            <Progress value={submitted ? 100 : progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Quiz Questions */}
      {quiz.length > 0 && (
        <div className="space-y-4">
          {quiz.map((q, i) => (
            <Card 
              key={i} 
              className={cn(
                "border-border/50 transition-all duration-300",
                submitted && answers[i] === q.correct_answer && "border-green-500/50 bg-green-500/5",
                submitted && answers[i] !== q.correct_answer && answers[i] && "border-red-500/50 bg-red-500/5"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium flex items-start gap-3 w-full min-w-0">
                    <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-3">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="leading-relaxed break-words text-sm font-medium">{children}</p>,
                          code: ({ className: codeClassName, children }) => {
                            const match = /language-(\w+)/.exec(codeClassName || '');
                            const lang = match ? match[1] : '';
                            const text = String(children);
                            const isInline = !match && !text.includes('\n');
                            if (isInline) {
                              return (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary break-words">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <CodeBlock language={lang} isDark={isDark}>
                                {text.replace(/\n$/, '')}
                              </CodeBlock>
                            );
                          }
                        }}
                      >
                        {sanitizeLLMContent(q.question)}
                      </ReactMarkdown>
                    </div>
                  </CardTitle>
                  {submitted && (
                    <div className="shrink-0 ml-2">
                      {answers[i] === q.correct_answer ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {q.options?.map((opt: string, optIndex: number) => {
                    const isSelected = answers[i] === opt;
                    const isCorrect = opt === q.correct_answer;
                    const showCorrect = submitted && isCorrect;
                    const showWrong = submitted && isSelected && !isCorrect;
                    
                    return (
                      <Button
                        key={optIndex}
                        variant="outline"
                        className={cn(
                          'w-full min-w-0 h-auto py-3 px-4 flex items-start justify-start text-left whitespace-normal break-words transition-all gap-0',
                          isSelected && !submitted && 'border-primary bg-primary/10',
                          showCorrect && 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
                          showWrong && 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                        )}
                        onClick={() => !submitted && setAnswers({ ...answers, [i]: opt })}
                        disabled={submitted}
                      >
                        <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-medium mr-3 shrink-0 mt-0.5">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className="flex-1 min-w-0 break-words whitespace-normal">{opt}</span>
                        {showCorrect && <CheckCircle className="w-4 h-4 text-green-500 shrink-0 ml-2 mt-1" />}
                        {showWrong && <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2 mt-1" />}
                      </Button>
                    );
                  })}
                </div>
                
                {submitted && q.explanation && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                    <p className="text-sm font-medium">Explanation:</p>
                    <div className="text-sm text-muted-foreground prose-ai">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="leading-relaxed break-words text-sm">{children}</p>,
                          code: ({ className: codeClassName, children }) => {
                            const match = /language-(\w+)/.exec(codeClassName || '');
                            const lang = match ? match[1] : '';
                            const text = String(children);
                            const isInline = !match && !text.includes('\n');
                            if (isInline) {
                              return (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary break-words">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <CodeBlock language={lang} isDark={isDark}>
                                {text.replace(/\n$/, '')}
                              </CodeBlock>
                            );
                          }
                        }}
                      >
                        {sanitizeLLMContent(q.explanation)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {!submitted && (
            <Button 
              onClick={submitQuiz} 
              className="w-full h-12 gradient-primary shadow-glow text-lg"
              disabled={answeredCount < quiz.length}
            >
              <Trophy className="w-5 h-5 mr-2" />
              Submit Quiz ({answeredCount}/{quiz.length} answered)
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
      {quiz.length === 0 && !isGenerating && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Test Your Knowledge?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a topic above and click "Generate" to create a personalized quiz powered by AI.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
