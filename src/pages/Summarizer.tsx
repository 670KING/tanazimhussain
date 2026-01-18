import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Sparkles, Copy, Check, FileText, Wand2, BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Summarizer() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const summarize = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to summarize');
      return;
    }
    
    setIsLoading(true);
    setSummary('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` 
        },
        body: JSON.stringify({ 
          messages: [{ 
            role: 'user', 
            content: `Please provide a comprehensive summary of the following text. Include:
• Key points and main ideas
• Important details and facts
• Logical structure and organization

Text to summarize:
${text}` 
          }], 
          model: 'mimo-flash', 
          stream: false, 
          type: 'summary' 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to summarize');
      }
      
      const data = await response.json();
      const summaryText = data.choices?.[0]?.message?.content;
      
      if (summaryText) {
        setSummary(summaryText);
        toast.success('Summary generated successfully!');
      } else {
        throw new Error('No summary generated');
      }
    } catch (error) {
      console.error('Summarization error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to summarize');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const summaryWordCount = summary.trim() ? summary.trim().split(/\s+/).length : 0;
  const compressionRate = wordCount > 0 && summaryWordCount > 0 
    ? Math.round((1 - summaryWordCount / wordCount) * 100) 
    : 0;

  const sampleTexts = [
    { 
      title: 'Scientific Article',
      preview: 'Paste a research paper or scientific article...',
    },
    { 
      title: 'History Essay',
      preview: 'Paste historical content to summarize...',
    },
    { 
      title: 'News Article',
      preview: 'Paste any news article for a quick summary...',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Summarizer</h1>
          <p className="text-muted-foreground">Transform long texts into concise summaries instantly</p>
        </div>
      </div>

      {/* Stats Bar */}
      {(text || summary) && (
        <Card className="border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">{wordCount}</span>
                    <span className="text-muted-foreground"> words input</span>
                  </span>
                </div>
                {summary && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">{summaryWordCount}</span>
                        <span className="text-muted-foreground"> words output</span>
                      </span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {compressionRate}% compressed
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Input Text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Paste your text here... (articles, essays, research papers, notes, etc.)" 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              className="min-h-[350px] resize-none"
            />
            
            <Button 
              onClick={summarize} 
              disabled={isLoading || !text.trim()} 
              className="w-full h-12 gradient-primary shadow-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Summarize Text
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Summary
            </CardTitle>
            {summary && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyToClipboard}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "min-h-[350px] p-4 rounded-lg border border-border/50 bg-muted/30",
              !summary && "flex items-center justify-center"
            )}>
              {summary ? (
                <div className="prose-ai text-sm whitespace-pre-wrap">
                  {summary}
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">Your summary will appear here</p>
                  
                  {!text && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-3">Try summarizing:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {sampleTexts.map((sample) => (
                          <Badge 
                            key={sample.title} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-muted"
                          >
                            {sample.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Tips for Better Summaries</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Paste complete paragraphs for more accurate summaries</li>
                <li>• Works best with academic papers, articles, and essays</li>
                <li>• The AI preserves key points and main arguments</li>
                <li>• Use the copy button to quickly save your summary</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
