import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Pre-process content to fix common LaTeX issues
function preprocessMath(content: string): string {
  let processed = content;
  
  // Fix escaped backslashes in LaTeX (common from AI responses)
  // Convert \\frac to \frac, \\begin to \begin, etc.
  processed = processed.replace(/\\\\(frac|begin|end|left|right|sqrt|sum|int|prod|lim|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|subset|supset|in|notin|cup|cap|land|lor|neg|forall|exists|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|bmatrix|pmatrix|matrix|cases|align|equation)/g, '\\$1');
  
  // Fix double backslashes for newlines in matrices
  processed = processed.replace(/\\\\\\\\/g, '\\\\');
  
  // Detect LaTeX blocks that aren't wrapped and wrap them
  // Pattern: Look for \begin{...} without surrounding $$ and wrap them
  const latexBlockPattern = /(?<!\$\$?\s*)\\begin\{(bmatrix|pmatrix|matrix|cases|align|equation|array)\}[\s\S]*?\\end\{\1\}(?!\s*\$\$?)/g;
  processed = processed.replace(latexBlockPattern, (match) => `$$${match}$$`);
  
  // Fix inline math that uses ( ) instead of $ $
  // Pattern: \( ... \) should become $ ... $
  processed = processed.replace(/\\\(([^)]+)\\\)/g, '$$$1$$');
  
  // Fix block math that uses [ ] instead of $$ $$  
  // Pattern: \[ ... \] should become $$ ... $$
  processed = processed.replace(/\\\[([^\]]+)\\\]/g, '$$$$$1$$$$');
  
  // Ensure proper spacing around inline math
  processed = processed.replace(/\$([^$]+)\$/g, (match, inner) => {
    // Don't double-process display math
    if (inner.startsWith('$')) return match;
    return ` $${inner.trim()}$ `;
  });
  
  return processed;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Pre-process content to fix math formatting
  const processedContent = useMemo(() => preprocessMath(content), [content]);

  return (
    <div className={`prose-ai ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { 
          strict: false,
          throwOnError: false,
          trust: true,
          macros: {
            "\\bmatrix": "\\begin{bmatrix}#1\\end{bmatrix}",
          }
        }]
      ]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg sm:text-2xl font-bold mt-4 sm:mt-6 mb-2 sm:mb-4 text-foreground border-b border-border pb-2">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base sm:text-xl font-semibold mt-3 sm:mt-5 mb-2 sm:mb-3 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm sm:text-lg font-semibold mt-2 sm:mt-4 mb-1 sm:mb-2 text-foreground">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm sm:text-base font-semibold mt-2 sm:mt-3 mb-1 sm:mb-2 text-foreground">
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 sm:mb-3 last:mb-0 leading-relaxed text-foreground text-xs sm:text-sm">
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

        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 sm:mb-4 space-y-0.5 sm:space-y-1 ml-1 sm:ml-2 text-xs sm:text-sm">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 sm:mb-4 space-y-0.5 sm:space-y-1 ml-1 sm:ml-2 text-xs sm:text-sm">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground leading-relaxed">{children}</li>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-2 sm:pl-4 py-1 sm:py-2 my-2 sm:my-4 bg-muted/50 rounded-r-lg italic text-xs sm:text-sm">
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 sm:my-4 -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-border border border-border rounded-lg text-xs sm:text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs sm:text-sm font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-foreground border-t border-border">
            {children}
          </td>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {children}
          </a>
        ),

        // Horizontal Rule
        hr: () => <hr className="my-4 sm:my-6 border-border" />,

        // Inline code
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;

          if (isInline) {
            return (
              <code className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-sm font-mono text-primary break-words">
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

        // Code blocks
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {processedContent}
    </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ 
  children, 
  language, 
  isDark 
}: { 
  children: string; 
  language: string;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([children], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded');
  };

  return (
    <div className="relative group my-2 sm:my-4 rounded-lg overflow-hidden border border-border -mx-1 sm:mx-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1 sm:py-2 bg-muted/80 border-b border-border">
        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 sm:h-7 sm:w-7"
            onClick={downloadCode}
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 sm:h-7 sm:w-7"
            onClick={copyCode}
          >
            {copied ? (
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
            ) : (
              <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={isDark ? oneDark : oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '0.5rem',
            background: isDark ? 'hsl(222 47% 9%)' : 'hsl(220 14% 96%)',
            fontSize: '0.75rem',
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
