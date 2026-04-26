import { useState, useEffect, useRef } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Loader2,
  Bot,
  Sparkles,
  Info,
  Zap,
  Image,
  X,
  Eye,
  FileText,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_MODELS, VISION_MODELS, ALL_MODELS, getModelById, DEFAULT_MODEL, DEFAULT_VISION_MODEL, isVisionModel } from '@/lib/ai-models';
import { toast } from 'sonner';
import { CompactImageUpload } from '@/components/chat/ImageUpload';
import type { PDFOptions } from '@/components/pdf/UltraPDFGenerator';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function Dashboard() {
  const {
    messages,
    isLoading,
    currentConversation,
    conversations,
    currentModel,
    isVisionMode,
    sendMessage,
    loadConversation,
    fetchConversations,
    deleteConversation,
    clearCurrentChat,
    regenerateLastMessage,
    continueResponse,
  } = useChat();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [modelTab, setModelTab] = useState<'text' | 'vision'>('text');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleGeneratePDF = async (prompt: string, options: PDFOptions): Promise<string> => {
    const content = await sendMessage(
      `Generate a ${options.type} about: ${prompt}`,
      selectedModel,
      'pdf',
      [],
      options
    );
    return content;
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

  // Sidebar content component
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className="py-3 px-3 border-b border-border/50 flex items-center justify-between">
        <span className="text-sm font-semibold">Chat History</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearCurrentChat();
                setSidebarOpen(false);
              }}
              className="h-7 w-7 p-0 hover:bg-primary/10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200',
                currentConversation?.id === conv.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-muted/80 border border-transparent'
              )}
              onClick={() => {
                loadConversation(conv.id);
                setSidebarOpen(false);
              }}
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
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col lg:flex-row gap-2 md:gap-4 overflow-hidden">
      {/* Mobile sidebar trigger */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="w-72 hidden lg:flex flex-col flex-shrink-0">
        <Card className="flex-1 flex flex-col border-border/50 overflow-hidden">
          <SidebarContent />
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border/50 min-h-0">
        {/* Header */}
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4 border-b border-border/50 flex-row items-center justify-between space-y-0 bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <div className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-glow flex-shrink-0",
              isVisionMode ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "gradient-primary"
            )}>
              {isVisionMode ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <div className="hidden sm:block">
              <h3 className="font-semibold text-sm">TanoAI Chat</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {isVisionMode ? 'Vision Mode' : 'Academic Assistant'}
                </span>
                {currentModel && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                    {currentModel.split('/')[0]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {/* Model Type Tabs */}
            <Tabs value={modelTab} onValueChange={(v) => {
              setModelTab(v as 'text' | 'vision');
              setSelectedModel(v === 'vision' ? DEFAULT_VISION_MODEL : DEFAULT_MODEL);
            }}>
              <TabsList className="h-7 sm:h-8">
                <TabsTrigger value="text" className="text-[10px] sm:text-xs px-1.5 sm:px-2 h-5 sm:h-6">
                  <Bot className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">Text</span>
                </TabsTrigger>
                <TabsTrigger value="vision" className="text-[10px] sm:text-xs px-1.5 sm:px-2 h-5 sm:h-6">
                  <Eye className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">Vision</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-20 sm:w-36 h-7 sm:h-8 bg-background/50 text-[10px] sm:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <model.icon className={cn('w-3 h-3 sm:w-4 sm:h-4', model.color)} />
                      <span className="font-medium text-xs sm:text-sm">{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Model Info */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{currentModelInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{currentModelInfo.provider} • {currentModelInfo.context}</p>
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
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow animate-float">
                    <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold mb-2">Welcome to TanoAI!</h2>
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