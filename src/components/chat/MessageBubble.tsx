import { cn } from '@/lib/utils';
import { Message } from '@/hooks/useChat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { StreamingIndicator } from './TypingIndicator';
import { Bot, User, Clock } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  isStreaming?: boolean;
}

export function MessageBubble({ message, onRegenerate, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-2 sm:gap-3 group', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105',
          isUser ? 'bg-secondary' : 'gradient-primary'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
        )}
      </div>
      
      {/* Message content */}
      <div
        className={cn(
          'rounded-2xl px-3 py-2 sm:px-4 sm:py-3 max-w-[88%] sm:max-w-[85%] md:max-w-[80%] relative transition-all duration-200',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md shadow-sm'
            : 'bg-muted/80 rounded-tl-md border border-border/50 hover:border-border'
        )}
      >
        {/* User images */}
        {isUser && message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            {message.images.map((img, index) => (
              <div key={index} className="relative group/img">
                <img 
                  src={img} 
                  alt={`Attached ${index + 1}`} 
                  className="max-w-[100px] sm:max-w-[150px] md:max-w-[200px] max-h-[100px] sm:max-h-[150px] md:max-h-[200px] rounded-lg object-cover border border-white/20 cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={() => window.open(img, '_blank')}
                />
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>
        ) : (
          <div className="relative">
            <MarkdownRenderer 
              content={message.content} 
              className="text-xs sm:text-sm" 
            />
            <StreamingIndicator isStreaming={isStreaming && !message.content} />
          </div>
        )}
        
        {/* Timestamp */}
        {message.timestamp && (
          <div className={cn(
            'flex items-center gap-1 mt-1.5 text-[9px] sm:text-[10px]',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}>
            <Clock className="w-2.5 h-2.5" />
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {message.model && !isUser && (
              <span className="hidden sm:inline">
                • {message.model.split('/')[0]}
              </span>
            )}
          </div>
        )}
        
        {/* Actions for assistant messages */}
        {!isUser && message.content && (
          <div className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2 opacity-0 group-hover:opacity-100 transition-opacity">
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