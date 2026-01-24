// Multi-format document exporter with human-readable math
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ThemeConfig, getTheme, PDFTheme } from './PDFThemes';
import { latexToHumanReadable, cleanMarkdown } from '@/lib/math-utils';

export interface ExportOptions {
  title: string;
  content: string;
  theme: PDFTheme;
  includeToC: boolean;
  includeQR: boolean;
  includeSummary: boolean;
  qrUrl?: string;
}

interface ContentSection {
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'math' | 'quote';
  level?: number;
  content: string;
  items?: string[];
}

// Parse markdown content into structured sections
function parseContent(content: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      sections.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: cleanMarkdown(latexToHumanReadable(headingMatch[2])),
      });
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      let codeContent = '';
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      sections.push({ type: 'code', content: codeContent.trim() });
      i++; // Skip closing ```
      continue;
    }

    // Math blocks ($$...$$)
    if (line.trim().startsWith('$$') || line.includes('\\begin{')) {
      let mathContent = '';
      
      // Check if it's a single-line math block
      if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
        mathContent = line.trim().slice(2, -2);
      } else {
        // Multi-line math block
        if (line.trim() === '$$') {
          i++;
        } else {
          mathContent = line.replace(/^\$\$/, '');
        }
        
        while (i < lines.length) {
          const currentLine = lines[i];
          if (currentLine.trim() === '$$' || currentLine.trim().endsWith('$$')) {
            if (currentLine.trim() !== '$$') {
              mathContent += '\n' + currentLine.replace(/\$\$$/, '');
            }
            break;
          }
          if (currentLine.includes('\\end{')) {
            mathContent += '\n' + currentLine;
            break;
          }
          mathContent += '\n' + currentLine;
          i++;
        }
      }
      
      // Convert to human-readable format
      const humanReadable = latexToHumanReadable(mathContent.trim());
      if (humanReadable) {
        sections.push({ type: 'math', content: humanReadable });
      }
      i++;
      continue;
    }

    // Inline math in paragraphs - convert to human readable
    if (line.includes('$') && !line.startsWith('$')) {
      const converted = latexToHumanReadable(line);
      sections.push({ type: 'paragraph', content: cleanMarkdown(converted) });
      i++;
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      let quoteContent = line.substring(1).trim();
      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteContent += '\n' + lines[i].substring(1).trim();
        i++;
      }
      sections.push({ type: 'quote', content: cleanMarkdown(latexToHumanReadable(quoteContent)) });
      continue;
    }

    // Lists
    if (line.match(/^[\-\*]\s+/) || line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].match(/^[\-\*]\s+/) || lines[i].match(/^\d+\.\s+/))) {
        const item = lines[i].replace(/^[\-\*\d\.]+\s+/, '');
        items.push(cleanMarkdown(latexToHumanReadable(item)));
        i++;
      }
      sections.push({ type: 'list', content: '', items });
      continue;
    }

    // Regular paragraph - collect until we hit something special
    let paragraphContent = line;
    i++;
    while (i < lines.length && lines[i].trim() && 
           !lines[i].match(/^[#\-\*\d>`\$]/) && 
           !lines[i].startsWith('```') &&
           !lines[i].includes('\\begin{')) {
      paragraphContent += ' ' + lines[i];
      i++;
    }
    sections.push({ type: 'paragraph', content: cleanMarkdown(latexToHumanReadable(paragraphContent)) });
  }

  return sections;
}

// Extract headings for ToC
function extractHeadings(sections: ContentSection[]): Array<{ level: number; text: string; page?: number }> {
  return sections
    .filter(s => s.type === 'heading' && s.level && s.level <= 3)
    .map(s => ({ level: s.level!, text: s.content }));
}

// Generate executive summary from content
function generateSummary(sections: ContentSection[]): string {
  const paragraphs = sections.filter(s => s.type === 'paragraph');
  if (paragraphs.length === 0) return '';
  
  // Take first 2-3 paragraphs or first 500 chars
  let summary = '';
  for (const p of paragraphs.slice(0, 3)) {
    if (summary.length + p.content.length > 500) {
      summary += p.content.substring(0, 500 - summary.length) + '...';
      break;
    }
    summary += p.content + ' ';
  }
  return summary.trim();
}

// Generate PDF with all features
export async function generateUltraPDF(options: ExportOptions): Promise<Blob> {
  const theme = getTheme(options.theme);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { margins, fontSize, lineHeight } = theme.layout;
  const contentWidth = pageWidth - margins.left - margins.right;
  
  const sections = parseContent(options.content);
  const headings = extractHeadings(sections);
  
  let currentPage = 1;
  let y = margins.top;

  // Helper to set colors
  const setColor = (color: [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  // Helper to add new page
  const addPage = () => {
    doc.addPage();
    currentPage++;
    y = margins.top;
    
    // Apply background for dark theme
    if (options.theme === 'dark') {
      doc.setFillColor(...theme.colors.background);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  };

  // Apply background for first page (dark theme)
  if (options.theme === 'dark') {
    doc.setFillColor(...theme.colors.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // Title
  doc.setFont(theme.fonts.title, 'bold');
  doc.setFontSize(fontSize.title);
  setColor(theme.colors.primary);
  
  const titleLines = doc.splitTextToSize(options.title, contentWidth);
  doc.text(titleLines, margins.left, y + 10);
  y += (titleLines.length * fontSize.title * 0.5) + 15;

  // Subtitle with date
  doc.setFontSize(fontSize.caption);
  setColor(theme.colors.muted);
  doc.setFont(theme.fonts.body, 'normal');
  doc.text(`Generated by TanoAI • ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  })}`, margins.left, y);
  y += 8;

  // Header line
  if (theme.styling.headerLine) {
    doc.setDrawColor(...theme.colors.muted);
    doc.setLineWidth(0.3);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 8;
  } else {
    y += 5;
  }

  // Executive Summary
  if (options.includeSummary) {
    const summary = generateSummary(sections);
    if (summary) {
      // Summary box
      doc.setFillColor(theme.colors.codeBg[0], theme.colors.codeBg[1], theme.colors.codeBg[2]);
      const summaryLines = doc.splitTextToSize(summary, contentWidth - 10);
      const boxHeight = summaryLines.length * 5 + 16;
      
      if (theme.styling.roundedBoxes) {
        doc.roundedRect(margins.left, y, contentWidth, boxHeight, 3, 3, 'F');
      } else {
        doc.rect(margins.left, y, contentWidth, boxHeight, 'F');
      }
      
      doc.setFont(theme.fonts.body, 'bold');
      doc.setFontSize(fontSize.h3);
      setColor(theme.colors.accent);
      doc.text('Executive Summary', margins.left + 5, y + 7);
      
      doc.setFont(theme.fonts.body, 'normal');
      doc.setFontSize(fontSize.body);
      setColor(theme.colors.text);
      doc.text(summaryLines, margins.left + 5, y + 14);
      
      y += boxHeight + 8;
    }
  }

  // Table of Contents
  if (options.includeToC && headings.length > 3) {
    doc.setFont(theme.fonts.body, 'bold');
    doc.setFontSize(fontSize.h2);
    setColor(theme.colors.primary);
    doc.text('Table of Contents', margins.left, y);
    y += 8;
    
    doc.setFont(theme.fonts.body, 'normal');
    doc.setFontSize(fontSize.body);
    setColor(theme.colors.text);
    
    for (const heading of headings) {
      const indent = (heading.level - 1) * 5;
      const prefix = heading.level === 1 ? '•' : heading.level === 2 ? '◦' : '‣';
      const tocLine = doc.splitTextToSize(`${prefix} ${heading.text}`, contentWidth - indent);
      doc.text(tocLine[0], margins.left + indent, y);
      y += 5;
      
      if (y > pageHeight - 50) {
        addPage();
      }
    }
    
    y += 10;
    
    // Check if we need a new page
    if (y > pageHeight - 50) {
      addPage();
    }
  }

  // Content sections
  for (const section of sections) {
    // Check for page break
    if (y > pageHeight - margins.bottom - 20) {
      addPage();
    }

    switch (section.type) {
      case 'heading': {
        const level = section.level || 1;
        const size = level === 1 ? fontSize.h1 : level === 2 ? fontSize.h2 : fontSize.h3;
        
        // Add some space before heading
        y += level === 1 ? 8 : 5;
        
        doc.setFont(theme.fonts.body, 'bold');
        doc.setFontSize(size);
        
        if (theme.styling.coloredHeaders) {
          setColor(theme.colors.accent);
        } else {
          setColor(theme.colors.primary);
        }
        
        if (theme.styling.boxedHeaders && level === 1) {
          doc.setFillColor(...theme.colors.accent);
          doc.rect(margins.left, y - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text(section.content, margins.left + 3, y);
          y += 10;
        } else {
          const headingLines = doc.splitTextToSize(section.content, contentWidth);
          doc.text(headingLines, margins.left, y);
          y += headingLines.length * size * 0.5 + 3;
        }
        break;
      }

      case 'paragraph': {
        doc.setFont(theme.fonts.body, 'normal');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.text);
        
        const lines = doc.splitTextToSize(section.content, contentWidth);
        
        for (const line of lines) {
          if (y > pageHeight - margins.bottom) {
            addPage();
          }
          doc.text(line, margins.left, y);
          y += fontSize.body * lineHeight * 0.4;
        }
        y += 4;
        break;
      }

      case 'code': {
        doc.setFont(theme.fonts.code, 'normal');
        doc.setFontSize(fontSize.body - 1);
        
        const codeLines = doc.splitTextToSize(section.content, contentWidth - 10);
        const displayLines = codeLines.slice(0, 25); // Limit code display
        const boxHeight = Math.min(displayLines.length * 4 + 8, 100);
        
        // Code background
        doc.setFillColor(...theme.colors.codeBg);
        if (theme.styling.roundedBoxes) {
          doc.roundedRect(margins.left, y - 2, contentWidth, boxHeight, 2, 2, 'F');
        } else {
          doc.rect(margins.left, y - 2, contentWidth, boxHeight, 'F');
        }
        
        setColor(theme.colors.code);
        doc.text(displayLines, margins.left + 4, y + 4);
        
        if (codeLines.length > 25) {
          doc.setFontSize(fontSize.caption);
          setColor(theme.colors.muted);
          doc.text(`... (${codeLines.length - 25} more lines)`, margins.left + 4, y + boxHeight - 4);
        }
        
        y += boxHeight + 6;
        break;
      }

      case 'math': {
        // Math block - human readable format
        doc.setFont(theme.fonts.body, 'normal');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.accent);
        
        const mathLines = section.content.split('\n');
        
        for (const line of mathLines) {
          if (y > pageHeight - margins.bottom) {
            addPage();
          }
          
          // Center math content
          const textWidth = doc.getTextWidth(line);
          const xPos = Math.max(margins.left, (pageWidth - textWidth) / 2);
          doc.text(line, xPos, y);
          y += fontSize.body * 0.6;
        }
        y += 6;
        break;
      }

      case 'quote': {
        doc.setFont(theme.fonts.body, 'italic');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.muted);
        
        // Quote line
        doc.setDrawColor(...theme.colors.accent);
        doc.setLineWidth(1);
        
        const quoteLines = doc.splitTextToSize(section.content, contentWidth - 15);
        const quoteHeight = quoteLines.length * 4.5;
        
        doc.line(margins.left, y - 2, margins.left, y + quoteHeight);
        doc.text(quoteLines, margins.left + 8, y);
        y += quoteHeight + 6;
        break;
      }

      case 'list': {
        doc.setFont(theme.fonts.body, 'normal');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.text);
        
        for (const item of section.items || []) {
          if (y > pageHeight - margins.bottom) {
            addPage();
          }
          const itemLines = doc.splitTextToSize('•  ' + item, contentWidth - 10);
          for (let j = 0; j < itemLines.length; j++) {
            doc.text(itemLines[j], margins.left + (j === 0 ? 5 : 10), y);
            y += fontSize.body * lineHeight * 0.4;
          }
        }
        y += 4;
        break;
      }
    }
  }

  // QR Code
  if (options.includeQR && options.qrUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(options.qrUrl, {
        width: 60,
        margin: 1,
        color: {
          dark: options.theme === 'dark' ? '#FFFFFF' : '#000000',
          light: options.theme === 'dark' ? '#1E1E23' : '#FFFFFF',
        },
      });
      
      // Add QR on last page
      const qrY = pageHeight - margins.bottom - 25;
      const qrX = pageWidth - margins.right - 25;
      
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, 20, 20);
      
      doc.setFontSize(7);
      setColor(theme.colors.muted);
      doc.text('Scan for original', qrX, qrY + 23, { maxWidth: 20 });
    } catch (e) {
      console.error('QR generation failed:', e);
    }
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    doc.setFontSize(fontSize.caption);
    setColor(theme.colors.muted);
    doc.setFont(theme.fonts.body, 'normal');
    
    // Footer line
    if (theme.styling.footerLine) {
      doc.setDrawColor(...theme.colors.muted);
      doc.setLineWidth(0.2);
      doc.line(margins.left, pageHeight - margins.bottom + 5, pageWidth - margins.right, pageHeight - margins.bottom + 5);
    }
    
    // Page number and branding
    const footerText = `Page ${i} of ${totalPages} • TanoAI`;
    doc.text(footerText, pageWidth / 2, pageHeight - margins.bottom + 10, { align: 'center' });
    
    // Date on left
    doc.text(new Date().toLocaleDateString(), margins.left, pageHeight - margins.bottom + 10);
  }

  return doc.output('blob');
}

// Export as Markdown
export function exportAsMarkdown(options: ExportOptions): string {
  const header = `# ${options.title}\n\n*Generated by TanoAI on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
  return header + options.content;
}

// Export as LaTeX
export function exportAsLaTeX(options: ExportOptions): string {
  let latex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{hyperref}
\\usepackage{listings}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{${options.title}}
\\author{Generated by TanoAI}
\\date{${new Date().toLocaleDateString()}}

\\begin{document}
\\maketitle

`;

  // Convert markdown to LaTeX
  let content = options.content;
  
  // Convert headers
  content = content.replace(/^### (.+)$/gm, '\\subsubsection{$1}');
  content = content.replace(/^## (.+)$/gm, '\\subsection{$1}');
  content = content.replace(/^# (.+)$/gm, '\\section{$1}');
  
  // Convert bold and italic
  content = content.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
  content = content.replace(/\*(.+?)\*/g, '\\textit{$1}');
  
  // Convert code blocks
  content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `\\begin{lstlisting}[language=${lang || 'text'}]\n${code}\\end{lstlisting}`;
  });
  
  // Convert inline code
  content = content.replace(/`([^`]+)`/g, '\\texttt{$1}');
  
  // Convert bullet points
  content = content.replace(/^[\-\*] (.+)$/gm, '\\item $1');
  
  // Wrap lists
  const listPattern = /((?:\\item .+\n?)+)/g;
  content = content.replace(listPattern, '\\begin{itemize}\n$1\\end{itemize}\n');
  
  latex += content;
  latex += '\n\\end{document}';
  
  return latex;
}

// Export as plain text with human-readable math
export function exportAsText(options: ExportOptions): string {
  const header = `${options.title}\nGenerated by TanoAI on ${new Date().toLocaleDateString()}\n${'='.repeat(50)}\n\n`;
  
  // Convert math to human readable and clean markdown
  let content = latexToHumanReadable(options.content);
  content = cleanMarkdown(content);
  
  return header + content;
}

// Helper to download file
export function downloadFile(content: Blob | string, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
