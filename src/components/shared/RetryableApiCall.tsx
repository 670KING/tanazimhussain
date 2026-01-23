import { useState, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RetryableApiCallProps {
  children: ReactNode;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function RetryableApiCall({
  children,
  isError,
  errorMessage = 'Something went wrong',
  onRetry,
  isRetrying = false,
  className,
}: RetryableApiCallProps) {
  if (isError) {
    return (
      <Alert variant="destructive" className={cn("flex flex-col gap-3", className)}>
        <div className="flex items-start gap-3">
          <WifiOff className="w-5 h-5 mt-0.5" />
          <div className="flex-1">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-1">{errorMessage}</AlertDescription>
          </div>
        </div>
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          variant="outline"
          size="sm"
          className="self-start gap-2"
        >
          {isRetrying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Retry
            </>
          )}
        </Button>
      </Alert>
    );
  }

  return <>{children}</>;
}

// Hook for managing API call state with retry logic
export function useRetryableApi<T>(
  apiCall: () => Promise<T>,
  options?: { maxRetries?: number; retryDelay?: number }
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;

  const execute = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      setRetryCount(0);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const retry = async () => {
    if (retryCount >= maxRetries) {
      setError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
      await execute();
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    data,
    isLoading,
    isRetrying,
    error,
    execute,
    retry,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}
