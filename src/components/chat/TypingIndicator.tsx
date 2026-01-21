import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  message?: string;
  className?: string;
}

export function TypingIndicator({ message = 'Thinking', className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1">
        <span 
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
        />
        <span 
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
        />
        <span 
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
        />
      </div>
      <span className="text-xs sm:text-sm text-muted-foreground animate-pulse">
        {message}...
      </span>
    </div>
  );
}

export function StreamingIndicator({ isStreaming }: { isStreaming: boolean }) {
  if (!isStreaming) return null;
  
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
    </span>
  );
}