import { useState, useEffect, useRef } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Loader2,
  Bot,
  Sparkles,
  Info,
  Zap,
  Image,
  X,
  Eye,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_MODELS, VISION_MODELS, ALL_MODELS, getModelById, DEFAULT_MODEL, DEFAULT_VISION_MODEL, isVisionModel } from '@/lib/ai-models';
import { toast } from 'sonner';
import { CompactImageUpload } from '@/components/chat/ImageUpload';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Dashboard() {
  const {
    messages,
    isLoading,
    currentModel,
    isVisionMode,
    sendMessage,
    fetchConversations,
    regenerateLastMessage,
    continueResponse,
  } = useChat();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('defaultModel') || DEFAULT_MODEL;
  });
  const [modelTab, setModelTab] = useState<'text' | 'vision'>(() => {
    const saved = localStorage.getItem('defaultModel') || DEFAULT_MODEL;
    return isVisionModel(saved) ? 'vision' : 'text';
  });

  useEffect(() => {
    const handlePreferencesChange = () => {
      const savedModel = localStorage.getItem('defaultModel') || DEFAULT_MODEL;
      setSelectedModel(savedModel);
      setModelTab(isVisionModel(savedModel) ? 'vision' : 'text');
    };
    window.addEventListener('academic-preferences-change', handlePreferencesChange);
    return () => {
      window.removeEventListener('academic-preferences-change', handlePreferencesChange);
    };
  }, []);

  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Smart autoscroll: only stick to bottom when the user is already near it.
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Track whether the user has scrolled away from the bottom of the transcript.
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport) return;
    const onScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      // Within 150px of the bottom = "stuck" to bottom.
      stickToBottomRef.current = distanceFromBottom < 150;
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll on new content, but ONLY if the user hasn't scrolled up to read.
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]'
    );
    requestAnimationFrame(() => {
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    });
  }, [messages, isLoading]);

  // Auto-switch to vision model when images are attached
  useEffect(() => {
    if (attachedImages.length > 0 && !isVisionModel(selectedModel)) {
      setSelectedModel(DEFAULT_VISION_MODEL);
      setModelTab('vision');
    }
  }, [attachedImages, selectedModel]);

  const handleSend = async () => {
    if (!input.trim() && attachedImages.length === 0) return;
    if (isLoading) return;

    const message = input;
    const images = [...attachedImages];
    setInput('');
    setAttachedImages([]);
    
    await sendMessage(message, selectedModel, 'chat', images);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageAdd = (base64: string) => {
    if (attachedImages.length >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setAttachedImages(prev => [...prev, base64]);
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const currentModelInfo = getModelById(selectedModel);
  const displayModels = modelTab === 'text' ? AI_MODELS : VISION_MODELS;

  const suggestedPrompts = [
    { text: 'Explain quantum physics simply', icon: Sparkles },
    { text: 'Help me study for my exam', icon: FileText },
    { text: 'Solve this math problem step by step', icon: Zap },
    { text: 'Analyze this image for me', icon: Image, requiresVision: true },
    { text: 'Write a summary of a topic', icon: FileText },
    { text: 'Create practice problems', icon: Sparkles },
  ];

  return (
    <div className="h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] flex flex-col overflow-hidden w-full min-w-0 max-w-full">
      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border/40 shadow-sm min-h-0 min-w-0 max-w-full bg-card/25 backdrop-blur-sm rounded-xl">
        {/* Header - Sleek top bar */}
        <CardHeader className="py-1.5 px-2 sm:py-2 sm:px-4 border-b border-border/40 flex-row items-center justify-between space-y-0 bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <SidebarTrigger className="h-8 w-8 text-foreground hover:bg-muted/80 rounded-lg transition-colors shrink-0" />
            
            <div className="h-4 w-px bg-border/50 mx-0.5" />
            
            {/* Model Type Tabs */}
            <Tabs value={modelTab} onValueChange={(v) => {
              setModelTab(v as 'text' | 'vision');
              setSelectedModel(v === 'vision' ? DEFAULT_VISION_MODEL : DEFAULT_MODEL);
            }}>
              <TabsList className="h-8 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                <TabsTrigger value="text" className="text-[10px] sm:text-xs px-2.5 py-1 rounded-md h-7">
                  Text
                </TabsTrigger>
                <TabsTrigger value="vision" className="text-[10px] sm:text-xs px-2.5 py-1 rounded-md h-7">
                  Vision
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[110px] sm:w-[230px] flex-shrink flex-grow h-8 bg-background/40 border-border/40 text-xs rounded-lg font-medium shadow-sm hover:bg-background/80 transition-colors truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[280px]">
                {displayModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-1.5">
                      <model.icon className={cn('w-3.5 h-3.5', model.color)} />
                      <span className="font-medium text-xs text-foreground truncate">{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
                
                {/* Pro Version - Coming Soon option inside selector */}
                <div className="h-px bg-border/40 my-1" />
                <SelectItem value="pro-placeholder" disabled className="text-muted-foreground font-medium text-xs py-1.5 opacity-60">
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Tanoedu Pro+ (Coming Soon)</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Model Info */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex text-muted-foreground hover:text-foreground">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{currentModelInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{currentModelInfo.provider} • Context: {currentModelInfo.context}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentModelInfo.specialties.slice(0, 3).map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-primary mt-2">✓ 100% Free with auto-fallback</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Premium Header Badge */}
            <Badge variant="outline" className="flex items-center gap-1 border-amber-500/20 bg-amber-500/5 text-amber-500 font-semibold px-2 py-0.5 text-[10px] rounded-lg animate-pulse-slow shrink-0">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Pro Coming Soon</span>
              <span className="sm:hidden">Pro</span>
            </Badge>
          </div>
        </CardHeader>

        {/* Messages - Fixed scroll container */}
        <CardContent className="flex-1 p-0 overflow-hidden min-h-0 min-w-0 max-w-full flex flex-col">
          <ScrollArea ref={scrollAreaRef} className="flex-1 w-full chat-scroll-area">
            <div className="p-3 sm:p-4 space-y-4 sm:space-y-5 w-full min-h-full">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
                  <div className="mb-4 animate-float">
                    <img src="/logo.svg" className="w-14 h-14 sm:w-16 sm:h-16 object-contain hover:scale-105 transition-transform" alt="Tanoedu AI Logo" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold mb-2">Welcome to Tanoedu AI!</h2>
                  <p className="text-muted-foreground max-w-md mb-2 text-sm">
                    Your intelligent academic assistant powered by cutting-edge AI.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-primary mb-4">
                    <Zap className="w-3 h-3" />
                    <span>{ALL_MODELS.length} AI models • 100% FREE</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        key={prompt.text}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (prompt.requiresVision) {
                            setModelTab('vision');
                            setSelectedModel(DEFAULT_VISION_MODEL);
                          }
                          setInput(prompt.text);
                          inputRef.current?.focus();
                        }}
                        className="text-[10px] sm:text-xs h-auto py-2 px-2 justify-start text-left hover:bg-primary/5 hover:border-primary/30"
                      >
                        <prompt.icon className="w-3 h-3 mr-1.5 text-primary shrink-0" />
                        <span className="truncate">{prompt.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <MessageBubble 
                      key={message.id} 
                      message={message} 
                      isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                      isLastAssistant={message.role === 'assistant' && index === messages.length - 1}
                      onRegenerate={
                        message.role === 'assistant' && index === messages.length - 1
                          ? () => regenerateLastMessage(selectedModel)
                          : undefined
                      }
                      onContinue={
                        message.role === 'assistant' && index === messages.length - 1
                          ? () => continueResponse(selectedModel)
                          : undefined
                      }
                    />
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
                      </div>
                      <div className="py-3 px-4 bg-muted/80 rounded-2xl rounded-tl-md border border-border/50">
                        <TypingIndicator 
                          message={attachedImages.length > 0 ? 'Analyzing images' : 'Thinking'} 
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input - Fixed at bottom with safe area */}
        <div className="p-2 sm:p-3 border-t border-border/50 bg-card/80 backdrop-blur-sm flex-shrink-0 safe-area-bottom">
          {/* Attached Images Preview */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachedImages.map((img, index) => (
                <div key={index} className="relative group w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt={`Attached ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <div className="flex items-center text-[10px] text-muted-foreground">
                {attachedImages.length}/5
              </div>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedImages.length > 0 ? "Describe what you want to know..." : "Ask me anything..."}
                className="min-h-[44px] max-h-24 sm:max-h-32 resize-none pr-12 sm:pr-20 bg-background/50 text-sm rounded-xl"
                rows={1}
                style={{ 
                  paddingBottom: '8px',
                  fontSize: '16px', // Prevents iOS zoom
                }}
              />
              <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground mr-0.5 hidden sm:inline">
                  {input.length}/4000
                </span>
                <CompactImageUpload 
                  onImageAdd={handleImageAdd} 
                  disabled={isLoading || attachedImages.length >= 5}
                />
              </div>
            </div>
            <Button 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
              className="gradient-primary h-11 w-11 sm:w-auto sm:px-4 shadow-glow shrink-0 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[9px] sm:text-[10px] text-muted-foreground">
            <span className="hidden sm:inline">Enter to send • Shift+Enter for new line</span>
            <span className="sm:hidden">Tap send or Enter</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="hidden sm:inline">{ALL_MODELS.length} models • Math & code</span>
              <span className="sm:hidden">{ALL_MODELS.length} models</span>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}