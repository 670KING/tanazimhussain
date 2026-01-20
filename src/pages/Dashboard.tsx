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
  User,
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
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { CompactImageUpload } from '@/components/chat/ImageUpload';
import { UltraPDFGenerator, PDFOptions } from '@/components/pdf/UltraPDFGenerator';
import { MessageActions } from '@/components/chat/MessageActions';

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
  } = useChat();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [modelTab, setModelTab] = useState<'text' | 'vision'>('text');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-2 md:gap-4 lg:gap-6 overflow-hidden touch-pan-y">
      {/* Sidebar - Conversation History */}
      <div className="w-full lg:w-72 hidden lg:flex flex-col flex-shrink-0">
        <Card className="flex-1 flex flex-col border-border/50">
          <CardHeader className="py-4 px-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Chat History</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => clearCurrentChat()}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Chat</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200',
                      currentConversation?.id === conv.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted/80 border border-transparent'
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
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Start chatting to create one</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border/50 min-h-0">
        {/* Header */}
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4 border-b border-border/50 flex-row items-center justify-between space-y-0 bg-card/50 flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-glow flex-shrink-0",
              isVisionMode ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "gradient-primary"
            )}>
              {isVisionMode ? (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              )}
            </div>
            <div className="hidden xs:block">
              <h3 className="font-semibold text-sm sm:text-base">TanoAI Chat</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {isVisionMode ? 'Vision Mode' : 'Academic Assistant'}
                </span>
                {currentModel && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 hidden sm:inline-flex">
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
                  <Bot className="w-3 h-3 mr-0.5 sm:mr-1" />
                  <span className="hidden xs:inline">Text</span>
                </TabsTrigger>
                <TabsTrigger value="vision" className="text-[10px] sm:text-xs px-1.5 sm:px-2 h-5 sm:h-6">
                  <Eye className="w-3 h-3 mr-0.5 sm:mr-1" />
                  <span className="hidden xs:inline">Vision</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-24 sm:w-44 h-7 sm:h-9 bg-background/50 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <model.icon className={cn('w-4 h-4', model.color)} />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">{model.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* PDF Generator */}
            <div className="hidden sm:block">
              <UltraPDFGenerator onGenerateWithAI={handleGeneratePDF} isLoading={isLoading} />
            </div>
            
            {/* Model Info */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 hidden sm:flex">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{currentModelInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{currentModelInfo.provider} • {currentModelInfo.context} context</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentModelInfo.specialties.map(s => (
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
          <ScrollArea className="h-full overflow-auto">
            <div className="p-2 sm:p-4 space-y-4 sm:space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-8 sm:py-16 text-center px-4">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl gradient-primary flex items-center justify-center mb-4 sm:mb-6 shadow-glow animate-float">
                    <Bot className="w-7 h-7 sm:w-10 sm:h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome to TanoAI!</h2>
                  <p className="text-muted-foreground max-w-md mb-2 text-sm sm:text-base">
                    Your intelligent academic assistant powered by cutting-edge AI models.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-primary mb-2">
                    <Zap className="w-3 h-3" />
                    <span>12 AI models • 100% FREE • Auto-fallback</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-primary mb-6 sm:mb-8">
                    <Eye className="w-3 h-3" />
                    <span>6 Vision models for image analysis</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl">
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
                        }}
                        className="text-xs h-auto py-2.5 px-3 justify-start text-left hover:bg-primary/5 hover:border-primary/30"
                      >
                        <prompt.icon className="w-3 h-3 mr-2 text-primary shrink-0" />
                        <span className="truncate">{prompt.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    onRegenerate={
                      message.role === 'assistant' && index === messages.length - 1
                        ? () => regenerateLastMessage(selectedModel)
                        : undefined
                    }
                  />
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-3 py-3 px-4 bg-muted/50 rounded-2xl rounded-tl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {attachedImages.length > 0 ? 'Analyzing images...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="p-2 sm:p-4 border-t border-border/50 bg-card/50 flex-shrink-0">
          {/* Attached Images Preview */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
              {attachedImages.map((img, index) => (
                <div key={index} className="relative group w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt={`Attached ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground">
                {attachedImages.length}/5
              </div>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedImages.length > 0 ? "Describe what you want to know..." : "Ask me anything..."}
                className="min-h-[42px] sm:min-h-[48px] max-h-28 sm:max-h-32 resize-none pr-16 sm:pr-24 bg-background/50 text-sm sm:text-base"
                rows={1}
              />
              <div className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground mr-0.5 sm:mr-1 hidden xs:inline">
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
              className="gradient-primary h-10 sm:h-12 px-3 sm:px-5 shadow-glow"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-muted-foreground">
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            <span className="sm:hidden">Enter to send</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="hidden sm:inline">{ALL_MODELS.length} AI models online • Math, code & images</span>
              <span className="sm:hidden">{ALL_MODELS.length} models</span>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-2 sm:gap-3 group', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
          isUser ? 'bg-secondary' : 'gradient-primary'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
        )}
      </div>
      <div
        className={cn(
          'rounded-2xl px-3 py-2 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%] relative overflow-hidden',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted/80 rounded-tl-md border border-border/50'
        )}
      >
        {/* User images */}
        {isUser && message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
            {message.images.map((img, index) => (
              <img 
                key={index} 
                src={img} 
                alt={`Attached ${index + 1}`} 
                className="max-w-[120px] sm:max-w-[200px] max-h-[120px] sm:max-h-[200px] rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="text-xs sm:text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <MarkdownRenderer content={message.content} className="text-xs sm:text-sm" />
        )}
        
        {/* Actions for assistant messages */}
        {!isUser && (
          <div className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2">
            <MessageActions 
              content={message.content} 
              onRegenerate={onRegenerate}
              showRegenerate={!!onRegenerate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
