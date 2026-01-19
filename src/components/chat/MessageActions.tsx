import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Check, 
  Download, 
  FileText, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadTextAsPDF } from './PDFGenerator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

export function MessageActions({ 
  content, 
  onRegenerate, 
  showRegenerate = true 
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanoai_response_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as text file');
  };

  const downloadAsPDF = () => {
    downloadTextAsPDF(content, 'TanoAI Response');
    toast.success('Downloaded as PDF');
  };

  const shareContent = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TanoAI Response',
          text: content,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Copy */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={copyToClipboard}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </Button>

      {/* Download dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <Download className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={downloadAsText}>
            <FileText className="w-4 h-4 mr-2" />
            Download as Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadAsPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Download as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={shareContent}
      >
        <Share2 className="w-3.5 h-3.5" />
      </Button>

      {/* Feedback */}
      <div className="flex items-center border-l border-border ml-1 pl-1">
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 ${liked === true ? 'text-green-500' : ''}`}
          onClick={() => {
            setLiked(liked === true ? null : true);
            if (liked !== true) toast.success('Thanks for the feedback!');
          }}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 ${liked === false ? 'text-red-500' : ''}`}
          onClick={() => {
            setLiked(liked === false ? null : false);
            if (liked !== false) toast.info('We\'ll try to improve!');
          }}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Regenerate */}
      {showRegenerate && onRegenerate && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 ml-1"
          onClick={onRegenerate}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
