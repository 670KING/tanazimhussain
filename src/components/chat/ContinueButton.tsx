import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContinueButtonProps {
  onContinue: () => Promise<string | void>;
  className?: string;
}

export function ContinueButton({ onContinue, className }: ContinueButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onContinue();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "gap-2 mt-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50",
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Continuing...
        </>
      ) : (
        <>
          <ChevronDown className="w-3.5 h-3.5" />
          Continue Response
        </>
      )}
    </Button>
  );
}
