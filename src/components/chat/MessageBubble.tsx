import { cn } from '@/lib/utils';
import { Message } from '@/hooks/useChat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { StreamingIndicator } from './TypingIndicator';
import { ContinueButton } from './ContinueButton';
import { ChartRenderer } from './ChartRenderer';
import { Bot, User, Clock, ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { Download, Loader2, FileText, Eye } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { isResponseTruncated } from '@/lib/math-utils';
import { PDFPreviewDialog } from './PDFPreviewDialog';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  onContinue?: () => Promise<string | undefined>;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
}

// Image component with robust error handling and retry
function MessageImage({ src, alt, _index }: { src: string; alt: string; index: number }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when src changes
  useEffect(() => {
    setError(false);
    setLoaded(false);
    setRetryCount(0);
  }, [src]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(false);
      setLoaded(false);
      setRetryCount(prev => prev + 1);
    }
  }, [retryCount]);

  const handleError = useCallback(() => {
    // For base64 images, check if the data is valid
    if (src.startsWith('data:image/')) {
      // Base64 image - might be corrupted
      setError(true);
    } else {
      // URL image - might be a temporary network issue
      if (retryCount < 2) {
        // Auto-retry once after a short delay
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setError(false);
        }, 1000);
      } else {
        setError(true);
      }
    }
  }, [src, retryCount]);

  if (error) {
    return (
      <div 
        className="w-[100px] sm:w-[150px] md:w-[200px] h-[80px] sm:h-[100px] md:h-[120px] rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={handleRetry}
        title="Click to retry"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="text-[10px]">Failed to load</span>
        {retryCount < 3 && (
          <span className="text-[9px] flex items-center gap-1 text-primary">
            <RefreshCw className="w-2.5 h-2.5" /> Tap to retry
          </span>
        )}
      </div>
    );
  }

  // Add cache-busting for retries
  const imageSrc = retryCount > 0 && !src.startsWith('data:') 
    ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}` 
    : src;

  return (
    <div className="relative group/img">
      {!loaded && (
        <div className="w-[100px] sm:w-[150px] md:w-[200px] h-[80px] sm:h-[100px] md:h-[120px] rounded-lg bg-muted/50 border border-border flex items-center justify-center animate-pulse">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}
      <img 
        src={imageSrc} 
        alt={alt}
        className={cn(
          "max-w-[100px] sm:max-w-[150px] md:max-w-[200px] max-h-[100px] sm:max-h-[150px] md:max-h-[200px] rounded-lg object-cover border border-white/20 cursor-zoom-in hover:opacity-90 transition-opacity",
          !loaded && "hidden"
        )}
        onClick={() => window.open(src, '_blank')}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        crossOrigin="anonymous"
      />
    </div>
  );
}

export function MessageBubble({ 
  message, 
  onRegenerate, 
  onContinue,
  isStreaming = false,
  isLastAssistant = false
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isTruncated = !isUser && isLastAssistant && !isStreaming && isResponseTruncated(message.content);
  const [previewOpen, setPreviewOpen] = useState(false);

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
          'rounded-2xl px-3 py-2 sm:px-4 sm:py-3 max-w-[calc(100%-3rem)] sm:max-w-[85%] md:max-w-[80%] min-w-0 flex-1 sm:flex-initial relative transition-all duration-200 overflow-hidden',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md shadow-sm'
            : 'bg-muted/80 rounded-tl-md border border-border/50 hover:border-border'
        )}
      >
        {/* User images with error handling */}
        {isUser && message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            {message.images.map((img, index) => (
              <MessageImage 
                key={`${message.id}-img-${index}`}
                src={img} 
                alt={`Attached ${index + 1}`} 
                index={index}
              />
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed overflow-hidden max-w-full">
            {message.content}
          </div>
        ) : (
          <div className="relative overflow-x-auto max-w-full message-content">
            {message.content ? (
              <>
                <MarkdownRenderer 
                  content={message.content} 
                  className="text-xs sm:text-sm" 
                />
                {/* AI-generated chart */}
                {message.chart && <ChartRenderer chart={message.chart} />}
                {/* Generating placeholder */}
                {!message.chart && !message.attachmentUrl && !message.attachmentHtml && message.attachmentTitle && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{message.attachmentTitle}</span>
                  </div>
                )}
                {/* Inline-HTML PDF — generated on click in the browser */}
                {message.attachmentHtml && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="mt-3 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors group/link text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                          {message.attachmentTitle || 'Document'}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-muted-foreground">
                          Tap to preview · PDF
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-primary group-hover/link:scale-110 transition-transform" />
                    </button>
                    <PDFPreviewDialog
                      open={previewOpen}
                      onOpenChange={setPreviewOpen}
                      html={message.attachmentHtml}
                      title={message.attachmentTitle || 'Document'}
                    />
                  </>
                )}
                {/* Legacy: hosted file URL */}
                {message.attachmentUrl && !message.attachmentHtml && (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors group/link"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {message.attachmentTitle || 'Document'}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground">
                        Tap to download · {message.attachmentType?.toUpperCase() || 'HTML'}
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-primary group-hover/link:translate-y-0.5 transition-transform" />
                  </a>
                )}
                {/* Continue button for truncated responses */}
                {isTruncated && onContinue && (
                  <ContinueButton onContinue={onContinue} />
                )}
              </>
            ) : (
              <StreamingIndicator isStreaming={isStreaming} />
            )}
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
              <span className="hidden sm:inline truncate max-w-[100px]">
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
