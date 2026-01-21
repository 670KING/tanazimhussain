// Utility functions for converting LaTeX math to human-readable format

/**
 * Convert LaTeX math notation to human-readable text for PDF/plain text export
 */
export function latexToHumanReadable(content: string): string {
  let result = content;
  
  // Remove $$ markers
  result = result.replace(/\$\$/g, '');
  result = result.replace(/\$/g, '');
  
  // Matrix handling - convert to table-like format
  result = result.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_, inner) => {
    const rows = inner.split('\\\\').map((row: string) => row.trim());
    const formattedRows = rows
      .filter((row: string) => row.length > 0)
      .map((row: string) => {
        const cols = row.split('&').map((col: string) => col.trim());
        return '│ ' + cols.join(' │ ') + ' │';
      });
    
    if (formattedRows.length === 0) return '[ ]';
    
    const colCount = rows[0].split('&').length;
    const separator = '─'.repeat(colCount * 4 + 1);
    
    return '\n┌' + separator + '┐\n' + 
           formattedRows.join('\n') + 
           '\n└' + separator + '┘\n';
  });
  
  // Pmatrix (parentheses matrix)
  result = result.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_, inner) => {
    const rows = inner.split('\\\\').map((row: string) => row.trim());
    const formattedRows = rows
      .filter((row: string) => row.length > 0)
      .map((row: string) => {
        const cols = row.split('&').map((col: string) => col.trim());
        return '( ' + cols.join('  ') + ' )';
      });
    return '\n' + formattedRows.join('\n') + '\n';
  });
  
  // Fractions
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Square roots
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  result = result.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '$1√($2)');
  
  // Powers and subscripts
  result = result.replace(/\^(\{[^}]+\}|\d)/g, (_, exp) => {
    const clean = exp.replace(/[{}]/g, '');
    return `^${clean}`;
  });
  result = result.replace(/_(\{[^}]+\}|\d)/g, (_, sub) => {
    const clean = sub.replace(/[{}]/g, '');
    return `_${clean}`;
  });
  
  // Common operators
  result = result.replace(/\\cdot/g, '·');
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\mp/g, '∓');
  result = result.replace(/\\leq/g, '≤');
  result = result.replace(/\\geq/g, '≥');
  result = result.replace(/\\neq/g, '≠');
  result = result.replace(/\\approx/g, '≈');
  result = result.replace(/\\equiv/g, '≡');
  result = result.replace(/\\sim/g, '∼');
  result = result.replace(/\\propto/g, '∝');
  
  // Greek letters
  result = result.replace(/\\alpha/g, 'α');
  result = result.replace(/\\beta/g, 'β');
  result = result.replace(/\\gamma/g, 'γ');
  result = result.replace(/\\delta/g, 'δ');
  result = result.replace(/\\epsilon/g, 'ε');
  result = result.replace(/\\zeta/g, 'ζ');
  result = result.replace(/\\eta/g, 'η');
  result = result.replace(/\\theta/g, 'θ');
  result = result.replace(/\\iota/g, 'ι');
  result = result.replace(/\\kappa/g, 'κ');
  result = result.replace(/\\lambda/g, 'λ');
  result = result.replace(/\\mu/g, 'μ');
  result = result.replace(/\\nu/g, 'ν');
  result = result.replace(/\\xi/g, 'ξ');
  result = result.replace(/\\pi/g, 'π');
  result = result.replace(/\\rho/g, 'ρ');
  result = result.replace(/\\sigma/g, 'σ');
  result = result.replace(/\\tau/g, 'τ');
  result = result.replace(/\\upsilon/g, 'υ');
  result = result.replace(/\\phi/g, 'φ');
  result = result.replace(/\\chi/g, 'χ');
  result = result.replace(/\\psi/g, 'ψ');
  result = result.replace(/\\omega/g, 'ω');
  result = result.replace(/\\Gamma/g, 'Γ');
  result = result.replace(/\\Delta/g, 'Δ');
  result = result.replace(/\\Theta/g, 'Θ');
  result = result.replace(/\\Lambda/g, 'Λ');
  result = result.replace(/\\Xi/g, 'Ξ');
  result = result.replace(/\\Pi/g, 'Π');
  result = result.replace(/\\Sigma/g, 'Σ');
  result = result.replace(/\\Phi/g, 'Φ');
  result = result.replace(/\\Psi/g, 'Ψ');
  result = result.replace(/\\Omega/g, 'Ω');
  
  // Calculus
  result = result.replace(/\\int/g, '∫');
  result = result.replace(/\\sum/g, 'Σ');
  result = result.replace(/\\prod/g, 'Π');
  result = result.replace(/\\partial/g, '∂');
  result = result.replace(/\\nabla/g, '∇');
  result = result.replace(/\\infty/g, '∞');
  result = result.replace(/\\lim/g, 'lim');
  
  // Set theory
  result = result.replace(/\\in/g, '∈');
  result = result.replace(/\\notin/g, '∉');
  result = result.replace(/\\subset/g, '⊂');
  result = result.replace(/\\supset/g, '⊃');
  result = result.replace(/\\cup/g, '∪');
  result = result.replace(/\\cap/g, '∩');
  result = result.replace(/\\emptyset/g, '∅');
  result = result.replace(/\\forall/g, '∀');
  result = result.replace(/\\exists/g, '∃');
  
  // Logic
  result = result.replace(/\\land/g, '∧');
  result = result.replace(/\\lor/g, '∨');
  result = result.replace(/\\neg/g, '¬');
  result = result.replace(/\\rightarrow/g, '→');
  result = result.replace(/\\leftarrow/g, '←');
  result = result.replace(/\\Rightarrow/g, '⇒');
  result = result.replace(/\\Leftarrow/g, '⇐');
  result = result.replace(/\\leftrightarrow/g, '↔');
  result = result.replace(/\\Leftrightarrow/g, '⇔');
  
  // Brackets
  result = result.replace(/\\left\(/g, '(');
  result = result.replace(/\\right\)/g, ')');
  result = result.replace(/\\left\[/g, '[');
  result = result.replace(/\\right\]/g, ']');
  result = result.replace(/\\left\{/g, '{');
  result = result.replace(/\\right\}/g, '}');
  result = result.replace(/\\left\|/g, '|');
  result = result.replace(/\\right\|/g, '|');
  
  // Text commands
  result = result.replace(/\\text\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textit\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  
  // Clean up remaining LaTeX artifacts
  result = result.replace(/\\[a-zA-Z]+/g, '');
  result = result.replace(/[{}]/g, '');
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result.trim();
}

/**
 * Clean markdown formatting for plain text
 */
export function cleanMarkdown(content: string): string {
  let result = content;
  
  // Remove headers
  result = result.replace(/^#{1,6}\s+(.*)$/gm, '$1');
  
  // Remove bold/italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/___(.+?)___/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  result = result.replace(/_(.+?)_/g, '$1');
  
  // Remove code blocks but keep content
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
  });
  
  // Remove inline code backticks
  result = result.replace(/`([^`]+)`/g, '$1');
  
  // Convert bullet points
  result = result.replace(/^[\*\-]\s+/gm, '• ');
  
  // Remove link formatting
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove blockquote markers
  result = result.replace(/^>\s+/gm, '');
  
  return result;
}