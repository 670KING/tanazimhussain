import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { preprocessLatex } from '@/lib/math-utils';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Pre-process content to fix math formatting
  const processedContent = useMemo(() => preprocessLatex(content), [content]);

  return (
    <div className={`prose-ai break-words overflow-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { 
            strict: false,
            throwOnError: false,
            trust: true,
            output: 'html',
            macros: {
              "\\R": "\\mathbb{R}",
              "\\N": "\\mathbb{N}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
              "\\bm": "\\mathbf",
            }
          }]
        ]}
        components={{
          // Headings with responsive sizing
          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mt-4 sm:mt-6 mb-2 sm:mb-4 text-foreground border-b border-border pb-2 break-words">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mt-3 sm:mt-5 mb-2 sm:mb-3 text-foreground break-words">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base md:text-lg font-semibold mt-2 sm:mt-4 mb-1 sm:mb-2 text-foreground break-words">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm sm:text-base font-semibold mt-2 sm:mt-3 mb-1 sm:mb-2 text-foreground break-words">
              {children}
            </h4>
          ),

          // Paragraphs with proper wrapping
          p: ({ children }) => (
            <p className="mb-2 sm:mb-3 last:mb-0 leading-relaxed text-foreground text-xs sm:text-sm md:text-base break-words hyphens-auto overflow-hidden">
              {children}
            </p>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-foreground">{children}</em>
          ),

          // Lists with proper mobile sizing
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-4 sm:ml-5 mb-2 sm:mb-4 space-y-1 sm:space-y-1.5 text-xs sm:text-sm md:text-base">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-4 sm:ml-5 mb-2 sm:mb-4 space-y-1 sm:space-y-1.5 text-xs sm:text-sm md:text-base">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed pl-1 break-words">{children}</li>
          ),

          // Blockquotes with accent
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-3 sm:pl-4 py-2 sm:py-3 my-2 sm:my-4 bg-muted/50 rounded-r-lg italic text-xs sm:text-sm md:text-base overflow-hidden">
              {children}
            </blockquote>
          ),

          // Responsive tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 sm:my-4 -mx-2 sm:mx-0 rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/80">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground border-t border-border break-words">
              {children}
            </td>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium break-all"
            >
              {children}
            </a>
          ),

          // Horizontal Rule
          hr: () => <hr className="my-4 sm:my-6 border-border" />,

          // Inline and block code
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs md:text-sm font-mono text-primary break-all">
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match[1]} isDark={isDark}>
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          },

          // Code blocks wrapper
          pre: ({ children }) => <>{children}</>,
          
          // Images
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt || 'Image'} 
              className="max-w-full h-auto rounded-lg my-2 sm:my-4 border border-border"
              loading="lazy"
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps {
  children: string;
  language: string;
  isDark: boolean;
}

function CodeBlock({ children, language, isDark }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([children], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded!');
  }, [children, language]);

  const lineCount = children.split('\n').length;
  const shouldTruncate = lineCount > 20 && !expanded;
  const displayContent = shouldTruncate 
    ? children.split('\n').slice(0, 20).join('\n') + '\n// ...'
    : children;

  return (
    <div className="relative group my-2 sm:my-4 rounded-lg overflow-hidden border border-border w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/80 border-b border-border">
        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase truncate max-w-[100px]">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {lineCount > 20 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 sm:h-7 sm:w-7"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 sm:h-7 sm:w-7"
            onClick={downloadCode}
            title="Download"
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 sm:h-7 sm:w-7"
            onClick={copyCode}
            title="Copy"
          >
            {copied ? (
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
            ) : (
              <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Code - scrollable container; capped height keeps chat stable */}
      <div
        className="overflow-auto max-h-[300px] sm:max-h-[400px] w-full"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <SyntaxHighlighter
          style={isDark ? oneDark : oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '0.5rem 0.75rem',
            background: isDark ? 'hsl(222 47% 9%)' : 'hsl(220 14% 96%)',
            fontSize: 'clamp(0.65rem, 2.5vw, 0.8rem)',
            minWidth: 'fit-content',
            whiteSpace: 'pre',
            wordBreak: 'normal',
          }}
          wrapLines={false}
          wrapLongLines={false}
        >
          {displayContent}
        </SyntaxHighlighter>
      </div>
      
      {/* Show more button */}
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2 text-xs text-center text-primary bg-muted/50 hover:bg-muted border-t border-border transition-colors"
        >
          Show all {lineCount} lines
        </button>
      )}
    </div>
  );
}
