import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';

export default function Summarizer() {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const summarize = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Summarize this text with key points:\n\n${text}` }], model: 'gemini-flash', stream: false, type: 'summary' }),
      });
      const data = await response.json();
      setSummary(data.choices?.[0]?.message?.content || 'Could not generate summary');
    } catch { toast({ title: 'Error', description: 'Failed to summarize', variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><Sparkles className="w-6 h-6 text-primary-foreground" /></div>
        <div><h1 className="text-2xl font-bold">AI Summarizer</h1><p className="text-muted-foreground">Get concise summaries of any text</p></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardContent className="pt-6"><Textarea placeholder="Paste your text here..." value={text} onChange={(e) => setText(e.target.value)} className="min-h-[300px]" /><Button onClick={summarize} disabled={isLoading || !text.trim()} className="w-full mt-4 gradient-primary">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Summarize'}</Button></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="min-h-[300px] prose-ai text-sm">{summary || <span className="text-muted-foreground">Summary will appear here...</span>}</div></CardContent></Card>
      </div>
    </div>
  );
}
