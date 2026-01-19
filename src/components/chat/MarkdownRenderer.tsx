import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`prose-ai ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground border-b border-border pb-2">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 leading-relaxed text-foreground">
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
          <ul className="list-disc list-inside mb-4 space-y-1 ml-2">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 ml-2">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground leading-relaxed">{children}</li>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/50 rounded-r-lg italic">
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-border border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-sm text-foreground border-t border-border">
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
        hr: () => <hr className="my-6 border-border" />,

        // Inline code
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;

          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
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
      {content}
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
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border">
        <span className="text-xs font-mono text-muted-foreground uppercase">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={downloadCode}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={copyCode}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: isDark ? 'hsl(222 47% 9%)' : 'hsl(220 14% 96%)',
          fontSize: '0.875rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
