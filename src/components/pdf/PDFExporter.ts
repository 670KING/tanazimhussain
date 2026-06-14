// Ultra Pro multi-format document exporter with structured JSON support
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ThemeConfig, getTheme, PDFTheme } from './PDFThemes';
import { latexToHumanReadable, cleanMarkdown, parseStructuredDocument, structuredToMarkdown, StructuredDocument, StructuredSection } from '@/lib/math-utils';

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
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'math' | 'quote' | 'table';
  level?: number;
  content: string;
  items?: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
}

// Try to parse structured JSON, fall back to markdown parsing
function parseContentSmart(content: string): ContentSection[] {
  const structured = parseStructuredDocument(content);
  if (structured) {
    return structuredToSections(structured);
  }
  return parseMarkdownContent(content);
}

// Convert structured document to ContentSections
function structuredToSections(doc: StructuredDocument): ContentSection[] {
  const sections: ContentSection[] = [];
  const d = doc.document;
  
  if (d.subtitle) {
    sections.push({ type: 'paragraph', content: d.subtitle });
  }
  
  for (const section of d.sections) {
    // Section heading
    sections.push({ type: 'heading', level: 2, content: section.heading });
    
    // Content paragraph
    if (section.content) {
      // Process inline math references within content
      let processedContent = section.content;
      if (section.math_inline?.length > 0) {
        for (const expr of section.math_inline) {
          // If the expression isn't already in the content, it will show as a standalone
          if (!processedContent.includes(expr)) {
            processedContent += ` [${latexToHumanReadable(expr)}]`;
          }
        }
      }
      sections.push({ type: 'paragraph', content: cleanMarkdown(latexToHumanReadable(processedContent)) });
    }
    
    // Block math
    if (section.math_block?.length > 0) {
      for (const expr of section.math_block) {
        const humanReadable = latexToHumanReadable(expr);
        if (humanReadable.trim()) {
          sections.push({ type: 'math', content: humanReadable });
        }
      }
    }
    
    // Bullets
    if (section.bullets?.length > 0) {
      sections.push({ 
        type: 'list', 
        content: '', 
        items: section.bullets.map(b => cleanMarkdown(latexToHumanReadable(b)))
      });
    }
    
    // Tables
    if (section.tables?.length > 0) {
      for (const table of section.tables) {
        if (table.headers?.length > 0) {
          sections.push({
            type: 'table',
            content: '',
            tableHeaders: table.headers,
            tableRows: (table.rows || []).map(row => 
              row.map(cell => cleanMarkdown(latexToHumanReadable(cell)))
            ),
          });
        }
      }
    }
  }
  
  return sections;
}

// Parse markdown content into structured sections (fallback)
function parseMarkdownContent(content: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      sections.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: cleanMarkdown(latexToHumanReadable(headingMatch[2])),
      });
      i++; continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      sections.push({ type: 'code', content: codeContent.trim() });
      i++; continue;
    }

    // Math blocks ($$...$$)
    if (line.trim().startsWith('$$') || line.includes('\\begin{')) {
      let mathContent = '';
      
      if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
        mathContent = line.trim().slice(2, -2);
      } else {
        if (line.trim() === '$$') { i++; } else { mathContent = line.replace(/^\$\$/, ''); }
        while (i < lines.length) {
          const currentLine = lines[i];
          if (currentLine.trim() === '$$' || currentLine.trim().endsWith('$$')) {
            if (currentLine.trim() !== '$$') mathContent += '\n' + currentLine.replace(/\$\$$/, '');
            break;
          }
          if (currentLine.includes('\\end{')) { mathContent += '\n' + currentLine; break; }
          mathContent += '\n' + currentLine;
          i++;
        }
      }
      
      const humanReadable = latexToHumanReadable(mathContent.trim());
      if (humanReadable) sections.push({ type: 'math', content: humanReadable });
      i++; continue;
    }

    // Inline math in paragraphs
    if (line.includes('$') && !line.startsWith('$')) {
      const converted = latexToHumanReadable(line);
      sections.push({ type: 'paragraph', content: cleanMarkdown(converted) });
      i++; continue;
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

    // Markdown tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
        const rows: string[][] = [];
        for (let j = 2; j < tableLines.length; j++) {
          const row = tableLines[j].split('|').filter(c => c.trim()).map(c => cleanMarkdown(latexToHumanReadable(c.trim())));
          if (row.length > 0) rows.push(row);
        }
        sections.push({ type: 'table', content: '', tableHeaders: headers, tableRows: rows });
      }
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

    // Regular paragraph
    let paragraphContent = line;
    i++;
    while (i < lines.length && lines[i].trim() && 
           !lines[i].match(/^[#\-\*\d>`\$\|]/) && 
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
function extractHeadings(sections: ContentSection[]): Array<{ level: number; text: string }> {
  return sections
    .filter(s => s.type === 'heading' && s.level && s.level <= 3)
    .map(s => ({ level: s.level!, text: s.content }));
}

// Generate executive summary
function generateSummary(sections: ContentSection[]): string {
  const paragraphs = sections.filter(s => s.type === 'paragraph');
  if (paragraphs.length === 0) return '';
  
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

/**
 * Replace common non-ASCII symbols with safe ASCII approximations for standard jsPDF fonts,
 * preventing WinAnsiEncoding compilation errors and crashes.
 */
function sanitizeForJsPDF(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, (char) => {
      const replacements: Record<string, string> = {
        '–': '-', '—': '--', '‘': "'", '’': "'", '“': '"', '”': '"',
        '…': '...', '•': '*', '◦': 'o', '‣': '>', '·': '*',
        'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon',
        'θ': 'theta', 'λ': 'lambda', 'μ': 'mu', 'π': 'pi', 'σ': 'sigma',
        'ω': 'omega', 'Σ': 'Sum', 'Π': 'Product', '∫': 'Integral',
        '±': '+/-', '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~=',
        '→': '->', '←': '<-', '⇒': '=>', '⇔': '<=>', '∞': 'infinity',
        '∂': 'd', '∇': 'grad', '∈': 'in', '∉': 'not in', '⊂': 'subset',
        '⊃': 'superset', '⊆': 'subseteq', '⊇': 'supseteq', '∩': 'cap',
        '∪': 'cup', '∅': 'empty', '∀': 'for all', 'exists': 'exists',
        '√': 'sqrt'
      };
      return replacements[char] || '?';
    });
}

// Generate PDF with all features
export async function generateUltraPDF(options: ExportOptions): Promise<Blob> {
  const theme = getTheme(options.theme);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { margins, fontSize, lineHeight } = theme.layout;
  const contentWidth = pageWidth - margins.left - margins.right;
  
  const sections = parseContentSmart(options.content);
  const headings = extractHeadings(sections);
  
  let currentPage = 1;
  let y = margins.top;

  const setColor = (color: [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const addPage = () => {
    doc.addPage();
    currentPage++;
    y = margins.top;
    if (options.theme === 'dark') {
      doc.setFillColor(...theme.colors.background);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  };

  const checkPageBreak = (needed: number = 20) => {
    if (y > pageHeight - margins.bottom - needed) addPage();
  };

  // Safe text drawing helper to wrap all text writes and filter out unsupported glyphs
  const safeText = (text: string | string[], x: number, y: number, textOptions?: any) => {
    if (Array.isArray(text)) {
      const sanitized = text.map(t => sanitizeForJsPDF(t));
      doc.text(sanitized, x, y, textOptions);
    } else {
      doc.text(sanitizeForJsPDF(text), x, y, textOptions);
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
  safeText(titleLines, margins.left, y + 10);
  y += (titleLines.length * fontSize.title * 0.5) + 15;

  // Subtitle
  doc.setFontSize(fontSize.caption);
  setColor(theme.colors.muted);
  doc.setFont(theme.fonts.body, 'normal');
  safeText(`Generated by Tanoedu AI • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margins.left, y);
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
      safeText('Executive Summary', margins.left + 5, y + 7);
      
      doc.setFont(theme.fonts.body, 'normal');
      doc.setFontSize(fontSize.body);
      setColor(theme.colors.text);
      safeText(summaryLines, margins.left + 5, y + 14);
      y += boxHeight + 8;
    }
  }

  // Table of Contents
  if (options.includeToC && headings.length > 3) {
    doc.setFont(theme.fonts.body, 'bold');
    doc.setFontSize(fontSize.h2);
    setColor(theme.colors.primary);
    safeText('Table of Contents', margins.left, y);
    y += 8;
    
    doc.setFont(theme.fonts.body, 'normal');
    doc.setFontSize(fontSize.body);
    setColor(theme.colors.text);
    
    for (const heading of headings) {
      const indent = (heading.level - 1) * 5;
      const prefix = heading.level === 1 ? '•' : heading.level === 2 ? '◦' : '‣';
      const tocLine = doc.splitTextToSize(`${prefix} ${heading.text}`, contentWidth - indent);
      safeText(tocLine[0], margins.left + indent, y);
      y += 5;
      checkPageBreak(10);
    }
    y += 10;
    checkPageBreak(50);
  }

  // Content sections
  for (const section of sections) {
    checkPageBreak();

    switch (section.type) {
      case 'heading': {
        const level = section.level || 1;
        const size = level === 1 ? fontSize.h1 : level === 2 ? fontSize.h2 : fontSize.h3;
        y += level === 1 ? 8 : 5;
        
        doc.setFont(theme.fonts.body, 'bold');
        doc.setFontSize(size);
        
        if (theme.styling.coloredHeaders) {
          setColor(theme.colors.accent);
        } else {
          setColor(theme.colors.primary);
        }
        
        if (theme.styling.boxedHeaders && level <= 2) {
          doc.setFillColor(...theme.colors.accent);
          doc.rect(margins.left, y - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          safeText(section.content, margins.left + 3, y);
          y += 10;
        } else {
          const headingLines = doc.splitTextToSize(section.content, contentWidth);
          safeText(headingLines, margins.left, y);
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
          checkPageBreak(8);
          safeText(line, margins.left, y);
          y += fontSize.body * lineHeight * 0.4;
        }
        y += 4;
        break;
      }

      case 'code': {
        doc.setFont(theme.fonts.code, 'normal');
        doc.setFontSize(fontSize.body - 1);
        const codeLines = doc.splitTextToSize(section.content, contentWidth - 10);
        const displayLines = codeLines.slice(0, 25);
        const boxHeight = Math.min(displayLines.length * 4 + 8, 100);
        
        checkPageBreak(boxHeight + 5);
        doc.setFillColor(...theme.colors.codeBg);
        if (theme.styling.roundedBoxes) {
          doc.roundedRect(margins.left, y - 2, contentWidth, boxHeight, 2, 2, 'F');
        } else {
          doc.rect(margins.left, y - 2, contentWidth, boxHeight, 'F');
        }
        setColor(theme.colors.code);
        safeText(displayLines, margins.left + 4, y + 4);
        if (codeLines.length > 25) {
          doc.setFontSize(fontSize.caption);
          setColor(theme.colors.muted);
          safeText(`... (${codeLines.length - 25} more lines)`, margins.left + 4, y + boxHeight - 4);
        }
        y += boxHeight + 6;
        break;
      }

      case 'math': {
        doc.setFont(theme.fonts.body, 'normal');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.accent);
        const mathLines = section.content.split('\n');
        
        // Draw a subtle background for math blocks
        const mathHeight = mathLines.length * fontSize.body * 0.6 + 8;
        checkPageBreak(mathHeight);
        doc.setFillColor(theme.colors.codeBg[0], theme.colors.codeBg[1], theme.colors.codeBg[2]);
        doc.roundedRect(margins.left, y - 4, contentWidth, mathHeight, 2, 2, 'F');
        
        for (const line of mathLines) {
          checkPageBreak(8);
          const textWidth = doc.getTextWidth(sanitizeForJsPDF(line));
          const xPos = Math.max(margins.left + 4, (pageWidth - textWidth) / 2);
          safeText(line, xPos, y);
          y += fontSize.body * 0.6;
        }
        y += 8;
        break;
      }

      case 'quote': {
        doc.setFont(theme.fonts.body, 'italic');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.muted);
        doc.setDrawColor(...theme.colors.accent);
        doc.setLineWidth(1);
        const quoteLines = doc.splitTextToSize(section.content, contentWidth - 15);
        const quoteHeight = quoteLines.length * 4.5;
        checkPageBreak(quoteHeight + 5);
        doc.line(margins.left, y - 2, margins.left, y + quoteHeight);
        safeText(quoteLines, margins.left + 8, y);
        y += quoteHeight + 6;
        break;
      }

      case 'list': {
        doc.setFont(theme.fonts.body, 'normal');
        doc.setFontSize(fontSize.body);
        setColor(theme.colors.text);
        for (const item of section.items || []) {
          checkPageBreak(8);
          const itemLines = doc.splitTextToSize('•  ' + item, contentWidth - 10);
          for (let j = 0; j < itemLines.length; j++) {
            safeText(itemLines[j], margins.left + (j === 0 ? 5 : 10), y);
            y += fontSize.body * lineHeight * 0.4;
          }
        }
        y += 4;
        break;
      }

      case 'table': {
        if (!section.tableHeaders || section.tableHeaders.length === 0) break;
        
        const colCount = section.tableHeaders.length;
        const colWidth = contentWidth / colCount;
        const rowHeight = 7;
        const totalRows = (section.tableRows?.length || 0) + 1;
        const tableHeight = totalRows * rowHeight + 4;
        
        checkPageBreak(tableHeight);
        
        // Header row
        doc.setFillColor(theme.colors.codeBg[0], theme.colors.codeBg[1], theme.colors.codeBg[2]);
        doc.rect(margins.left, y - 3, contentWidth, rowHeight, 'F');
        
        doc.setFont(theme.fonts.body, 'bold');
        doc.setFontSize(fontSize.body - 1);
        setColor(theme.colors.primary);
        
        for (let c = 0; c < colCount; c++) {
          safeText(
            section.tableHeaders[c] || '', 
            margins.left + c * colWidth + 2, 
            y + 1,
            { maxWidth: colWidth - 4 }
          );
        }
        y += rowHeight;
        
        // Data rows
        doc.setFont(theme.fonts.body, 'normal');
        setColor(theme.colors.text);
        
        for (const row of section.tableRows || []) {
          checkPageBreak(rowHeight);
          doc.setDrawColor(theme.colors.codeBg[0], theme.colors.codeBg[1], theme.colors.codeBg[2]);
          doc.line(margins.left, y - 3, margins.left + contentWidth, y - 3);
          
          for (let c = 0; c < colCount; c++) {
            safeText(
              (row[c] || '').substring(0, 30),
              margins.left + c * colWidth + 2,
              y + 1,
              { maxWidth: colWidth - 4 }
            );
          }
          y += rowHeight;
        }
        
        // Bottom border
        doc.setDrawColor(...theme.colors.muted);
        doc.line(margins.left, y - 3, margins.left + contentWidth, y - 3);
        y += 6;
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
      const qrY = pageHeight - margins.bottom - 25;
      const qrX = pageWidth - margins.right - 25;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, 20, 20);
      doc.setFontSize(7);
      setColor(theme.colors.muted);
      safeText('Scan for original', qrX, qrY + 23, { maxWidth: 20 });
    } catch (e) {
      console.error('QR generation failed:', e);
    }
  }

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(fontSize.caption);
    setColor(theme.colors.muted);
    doc.setFont(theme.fonts.body, 'normal');
    
    if (theme.styling.footerLine) {
      doc.setDrawColor(...theme.colors.muted);
      doc.setLineWidth(0.2);
      doc.line(margins.left, pageHeight - margins.bottom + 5, pageWidth - margins.right, pageHeight - margins.bottom + 5);
    }
    
    safeText(`Page ${i} of ${totalPages} • Tanoedu AI`, pageWidth / 2, pageHeight - margins.bottom + 10, { align: 'center' });
    safeText(new Date().toLocaleDateString(), margins.left, pageHeight - margins.bottom + 10);
  }

  return doc.output('blob');
}

// Quick download for message actions
export async function quickDownloadPDF(content: string, title: string = 'Tanoedu_AI_Document') {
  const blob = await generateUltraPDF({
    title,
    content,
    theme: 'modern',
    includeToC: true,
    includeQR: false,
    includeSummary: false,
  });
  downloadFile(blob, `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf`, 'application/pdf');
}

// Export as Markdown
export function exportAsMarkdown(options: ExportOptions): string {
  const structured = parseStructuredDocument(options.content);
  if (structured) {
    return structuredToMarkdown(structured);
  }
  return `# ${options.title}\n\n*Generated by Tanoedu AI on ${new Date().toLocaleDateString()}*\n\n---\n\n${options.content}`;
}

// Export as LaTeX
export function exportAsLaTeX(options: ExportOptions): string {
  const structured = parseStructuredDocument(options.content);
  
  let latex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{mathtools}
\\usepackage{hyperref}
\\usepackage{listings}
\\usepackage{geometry}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\geometry{margin=1in}
 
\\title{${options.title}}
\\author{Generated by Tanoedu AI}
\\date{${new Date().toLocaleDateString()}}
 
\\begin{document}
\\maketitle
 
`;

  if (structured) {
    for (const section of structured.document.sections) {
      latex += `\\section{${section.heading}}\n\n`;
      if (section.content) latex += `${section.content}\n\n`;
      
      if (section.math_block?.length > 0) {
        for (const expr of section.math_block) {
          latex += `\\begin{equation}\n${expr}\n\\end{equation}\n\n`;
        }
      }
      
      if (section.bullets?.length > 0) {
        latex += '\\begin{itemize}\n';
        for (const b of section.bullets) latex += `  \\item ${b}\n`;
        latex += '\\end{itemize}\n\n';
      }
      
      if (section.tables?.length > 0) {
        for (const table of section.tables) {
          const cols = table.headers.length;
          latex += `\\begin{table}[h]\n\\centering\n\\begin{tabular}{${'l'.repeat(cols)}}\n\\toprule\n`;
          latex += table.headers.join(' & ') + ' \\\\\n\\midrule\n';
          for (const row of table.rows) {
            latex += row.join(' & ') + ' \\\\\n';
          }
          latex += '\\bottomrule\n\\end{tabular}\n\\end{table}\n\n';
        }
      }
    }
  } else {
    let content = options.content;
    content = content.replace(/^### (.+)$/gm, '\\subsubsection{$1}');
    content = content.replace(/^## (.+)$/gm, '\\subsection{$1}');
    content = content.replace(/^# (.+)$/gm, '\\section{$1}');
    content = content.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
    content = content.replace(/\*(.+?)\*/g, '\\textit{$1}');
    content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `\\begin{lstlisting}[language=${lang || 'text'}]\n${code}\\end{lstlisting}`;
    });
    content = content.replace(/`([^`]+)`/g, '\\texttt{$1}');
    content = content.replace(/^[\-\*] (.+)$/gm, '\\item $1');
    const listPattern = /((?:\\item .+\n?)+)/g;
    content = content.replace(listPattern, '\\begin{itemize}\n$1\\end{itemize}\n');
    latex += content;
  }
  
  latex += '\n\\end{document}';
  return latex;
}

// Export as plain text
export function exportAsText(options: ExportOptions): string {
  const header = `${options.title}\nGenerated by Tanoedu AI on ${new Date().toLocaleDateString()}\n${'='.repeat(50)}\n\n`;
  
  const structured = parseStructuredDocument(options.content);
  if (structured) {
    let text = header;
    for (const section of structured.document.sections) {
      text += `\n${section.heading}\n${'-'.repeat(section.heading.length)}\n\n`;
      if (section.content) text += `${section.content}\n\n`;
      if (section.math_block?.length > 0) {
        for (const expr of section.math_block) {
          text += `  ${latexToHumanReadable(expr)}\n\n`;
        }
      }
      if (section.bullets?.length > 0) {
        for (const b of section.bullets) text += `• ${b}\n`;
        text += '\n';
      }
    }
    return text;
  }
  
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
