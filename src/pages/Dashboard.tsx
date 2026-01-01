import { useState, useEffect, useRef } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Loader2,
  Bot,
  User,
  Zap,
  Brain,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const models = [
  { id: 'gemini-flash', name: 'Gemini Flash', icon: Zap, description: 'Fast & Free' },
  { id: 'mistral', name: 'Mistral 7B', icon: Brain, description: 'Balanced' },
  { id: 'llama', name: 'Llama 3.2', icon: Sparkles, description: 'Meta AI' },
];

export default function Dashboard() {
  const {
    messages,
    isLoading,
    currentConversation,
    conversations,
    sendMessage,
    createConversation,
    loadConversation,
    fetchConversations,
    deleteConversation,
    clearCurrentChat,
  } = useChat();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    await sendMessage(message, selectedModel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar - Conversation History */}
      <div className="w-72 hidden lg:flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="py-4 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Conversations</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => clearCurrentChat()}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors',
                      currentConversation?.id === conv.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-sm">{conv.title}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No conversations yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">TanoAI Chat</h3>
              <p className="text-xs text-muted-foreground">Your academic assistant</p>
            </div>
          </div>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <model.icon className="w-4 h-4" />
                    <span>{model.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow animate-float">
                    <Bot className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Welcome to TanoAI!</h2>
                  <p className="text-muted-foreground max-w-md">
                    I'm your intelligent academic assistant. Ask me anything about studying, 
                    homework, research, or any academic topic.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {['Explain quantum physics', 'Help me study for my exam', 'Write a summary of...'].map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(prompt)}
                        className="text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t bg-card/50">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="gradient-primary h-11 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isUser ? 'bg-secondary' : 'gradient-primary'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary-foreground" />
        )}
      </div>
      <div
        className={cn(
          'rounded-2xl px-4 py-3 max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted rounded-tl-md'
        )}
      >
        <div className={cn('prose-ai text-sm', isUser && 'text-primary-foreground')}>
          {message.content.split('\n').map((line, i) => (
            <p key={i} className="mb-1 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
