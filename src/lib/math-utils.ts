// Utility functions for converting LaTeX math to human-readable format

// Common LaTeX commands that need proper escaping
const LATEX_COMMANDS = [
  'frac', 'begin', 'end', 'left', 'right', 'sqrt', 'sum', 'int', 'prod', 'lim',
  'cdot', 'times', 'div', 'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'equiv',
  'sim', 'subset', 'supset', 'in', 'notin', 'cup', 'cap', 'land', 'lor', 'neg',
  'forall', 'exists', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta',
  'lambda', 'mu', 'pi', 'sigma', 'omega', 'infty', 'partial', 'nabla',
  'bmatrix', 'pmatrix', 'matrix', 'vmatrix', 'Bmatrix', 'cases', 'align',
  'aligned', 'equation', 'array', 'gather', 'text', 'mathbf', 'mathrm', 'vec',
  'hat', 'bar', 'dot', 'ddot', 'overline', 'underline', 'sin', 'cos', 'tan',
  'log', 'ln', 'exp', 'det', 'mod', 'gcd', 'min', 'max', 'sup', 'inf', 'limsup',
  'liminf', 'oplus', 'otimes', 'circ', 'bullet', 'star', 'dagger', 'ddagger'
];

const LATEX_PATTERN = LATEX_COMMANDS.join('|');

/**
 * Advanced preprocessing for LaTeX content before rendering
 * Fixes common AI-generated LaTeX issues
 */
export function preprocessLatex(content: string): string {
  if (!content) return '';
  
  let result = content;
  
  // Step 1: Fix multiple levels of escaped backslashes (\\\\frac -> \frac, \\frac -> \frac)
  const escapePattern = new RegExp(`\\\\\\\\\\\\\\\\(${LATEX_PATTERN})`, 'gi');
  result = result.replace(escapePattern, '\\$1');
  
  const doubleEscapePattern = new RegExp(`\\\\\\\\(${LATEX_PATTERN})`, 'gi');
  result = result.replace(doubleEscapePattern, '\\$1');
  
  // Step 2: Fix quadruple backslash newlines in matrices (\\\\  -> \\)
  result = result.replace(/\\\\\\\\/g, '\\\\');
  
  // Step 3: Convert \( \) to $ $ for inline math (with better spacing)
  result = result.replace(/\\\(([^)]+)\\\)/g, ' $$$1$$ ');
  
  // Step 4: Convert \[ \] to $$ $$ for display math
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');
  
  // Step 5: Wrap bare \begin{...}...\end{...} blocks in $$ if not already wrapped
  const environments = ['bmatrix', 'pmatrix', 'matrix', 'vmatrix', 'Bmatrix', 'cases', 'align', 'aligned', 'equation', 'array', 'gather'];
  for (const env of environments) {
    // Match \begin{env}...\end{env} not already wrapped in $$
    const pattern = new RegExp(`(?<![\\$\\n])\\s*\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}(?![\\s\\n]*\\$)`, 'g');
    result = result.replace(pattern, (match) => `\n$$\n${match.trim()}\n$$\n`);
  }
  
  // Step 6: Fix common AI mistakes: escaped matrix environment names
  result = result.replace(/\\\\begin\{/g, '\\begin{');
  result = result.replace(/\\\\end\{/g, '\\end{');
  
  // Step 7: Fix broken matrix row separators (sometimes AI outputs \\ instead of \\\\)
  // Inside matrix environments, ensure proper row breaks
  result = result.replace(/(\\begin\{[bpvBV]?matrix\}[\s\S]*?)(\\(?!\\))([\s\S]*?\\end\{[bpvBV]?matrix\})/g, 
    (match, before, slash, after) => before + '\\\\' + after
  );
  
  // Step 8: Remove extra spaces around math delimiters
  result = result.replace(/\$\s+\$/g, '$$');
  result = result.replace(/\$\$\s+\$\$/g, '$$$$');
  
  // Step 9: Clean up multiple newlines but preserve structure
  result = result.replace(/\n{4,}/g, '\n\n\n');
  
  // Step 10: Ensure inline math has proper spacing
  result = result.replace(/([^\s$])\$([^$]+)\$([^\s$])/g, '$1 $$$2$$ $3');
  
  return result;
}

/**
 * Check if a response appears to be truncated
 */
export function isResponseTruncated(content: string): boolean {
  if (!content || content.length < 100) return false;
  
  const truncationSignals = [
    // Ends mid-sentence (no punctuation at end)
    /[a-zA-Z0-9,]\s*$/.test(content.trim()),
    // Ends with incomplete code block
    /```[a-z]*\s*\n[^`]*$/.test(content) && !/```\s*$/.test(content),
    // Ends with incomplete math block
    /\$\$[^$]*$/.test(content) && !/\$\$\s*$/.test(content),
    // Ends with incomplete list item
    /^[\-\*\d]+\.\s*\w+$/m.test(content.split('\n').slice(-1)[0] || ''),
    // Common truncation patterns from AI
    /\.\.\.\s*$/.test(content.trim()) && content.length > 2000,
    // Ends abruptly without conclusion
    content.length > 3000 && !/(\.|!|\?|```|\$\$|conclusion|summary|finally|therefore)\s*$/i.test(content.trim()),
  ];
  
  return truncationSignals.filter(Boolean).length >= 2;
}

/**
 * Convert LaTeX math notation to human-readable text for PDF/plain text export
 */
export function latexToHumanReadable(content: string): string {
  let result = content;
  
  // Remove $$ markers
  result = result.replace(/\$\$/g, '');
  result = result.replace(/\$/g, '');
  
  // Matrix handling - convert to table-like format with box-drawing characters
  const matrixHandler = (_: string, inner: string) => {
    const rows = inner.split('\\\\').map((row: string) => row.trim());
    const formattedRows = rows
      .filter((row: string) => row.length > 0)
      .map((row: string) => {
        const cols = row.split('&').map((col: string) => col.trim());
        return '│ ' + cols.join(' │ ') + ' │';
      });
    
    if (formattedRows.length === 0) return '[ ]';
    
    // Calculate column width for proper separator
    const firstRow = rows[0]?.split('&') || [];
    const colCount = firstRow.length;
    const colWidth = Math.max(4, ...firstRow.map(c => c.trim().length + 2));
    const separator = '─'.repeat(colCount * colWidth + 1);
    
    return '\n┌' + separator + '┐\n' + 
           formattedRows.join('\n') + 
           '\n└' + separator + '┘\n';
  };
  
  result = result.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, matrixHandler);
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
  result = result.replace(/\\begin\{vmatrix\}([\s\S]*?)\\end\{vmatrix\}/g, matrixHandler);
  result = result.replace(/\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}/g, matrixHandler);
  
  // Cases environment
  result = result.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, inner) => {
    const rows = inner.split('\\\\').map((row: string) => row.trim());
    const formattedRows = rows
      .filter((row: string) => row.length > 0)
      .map((row: string) => '  ' + row.replace(/&/g, ', '));
    return '\n{\n' + formattedRows.join('\n') + '\n}\n';
  });
  
  // Fractions - handle nested fractions
  const processFractions = (str: string): string => {
    let prev = '';
    while (prev !== str) {
      prev = str;
      str = str.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    }
    return str;
  };
  result = processFractions(result);
  
  // Square roots
  result = result.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '$1√($2)');
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  
  // Powers and subscripts
  result = result.replace(/\^(\{[^}]+\}|\d)/g, (_, exp) => {
    const clean = exp.replace(/[{}]/g, '');
    // Convert to superscript unicode if simple
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      'n': 'ⁿ', 'i': 'ⁱ', '+': '⁺', '-': '⁻'
    };
    if (clean.length <= 2 && /^[\d\+\-ni]+$/.test(clean)) {
      return clean.split('').map(c => superscripts[c] || `^${c}`).join('');
    }
    return `^(${clean})`;
  });
  
  result = result.replace(/_(\{[^}]+\}|\d)/g, (_, sub) => {
    const clean = sub.replace(/[{}]/g, '');
    // Convert to subscript unicode if simple
    const subscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'n': 'ₙ', 'i': 'ᵢ', '+': '₊', '-': '₋'
    };
    if (clean.length <= 2 && /^[\d\+\-ni]+$/.test(clean)) {
      return clean.split('').map(c => subscripts[c] || `_${c}`).join('');
    }
    return `_(${clean})`;
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
  result = result.replace(/\\to/g, '→');
  result = result.replace(/\\gets/g, '←');
  result = result.replace(/\\mapsto/g, '↦');
  
  // Greek letters (lowercase)
  const greekLower: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
    tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω'
  };
  for (const [name, symbol] of Object.entries(greekLower)) {
    result = result.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), symbol);
  }
  
  // Greek letters (uppercase)
  const greekUpper: Record<string, string> = {
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
    Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
  };
  for (const [name, symbol] of Object.entries(greekUpper)) {
    result = result.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), symbol);
  }
  
  // Calculus and operators
  result = result.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]');
  result = result.replace(/\\int/g, '∫');
  result = result.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, 'Σ[$1→$2]');
  result = result.replace(/\\sum/g, 'Σ');
  result = result.replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, 'Π[$1→$2]');
  result = result.replace(/\\prod/g, 'Π');
  result = result.replace(/\\partial/g, '∂');
  result = result.replace(/\\nabla/g, '∇');
  result = result.replace(/\\infty/g, '∞');
  result = result.replace(/\\lim_\{([^}]+)\}/g, 'lim[$1]');
  result = result.replace(/\\lim/g, 'lim');
  
  // Set theory
  result = result.replace(/\\in/g, '∈');
  result = result.replace(/\\notin/g, '∉');
  result = result.replace(/\\subset/g, '⊂');
  result = result.replace(/\\subseteq/g, '⊆');
  result = result.replace(/\\supset/g, '⊃');
  result = result.replace(/\\supseteq/g, '⊇');
  result = result.replace(/\\cup/g, '∪');
  result = result.replace(/\\cap/g, '∩');
  result = result.replace(/\\emptyset/g, '∅');
  result = result.replace(/\\varnothing/g, '∅');
  result = result.replace(/\\forall/g, '∀');
  result = result.replace(/\\exists/g, '∃');
  result = result.replace(/\\nexists/g, '∄');
  result = result.replace(/\\setminus/g, '\\');
  
  // Logic
  result = result.replace(/\\land/g, '∧');
  result = result.replace(/\\lor/g, '∨');
  result = result.replace(/\\lnot/g, '¬');
  result = result.replace(/\\neg/g, '¬');
  result = result.replace(/\\rightarrow/g, '→');
  result = result.replace(/\\leftarrow/g, '←');
  result = result.replace(/\\Rightarrow/g, '⇒');
  result = result.replace(/\\Leftarrow/g, '⇐');
  result = result.replace(/\\leftrightarrow/g, '↔');
  result = result.replace(/\\Leftrightarrow/g, '⇔');
  result = result.replace(/\\iff/g, '⇔');
  result = result.replace(/\\implies/g, '⇒');
  
  // Brackets and delimiters
  result = result.replace(/\\left\(/g, '(');
  result = result.replace(/\\right\)/g, ')');
  result = result.replace(/\\left\[/g, '[');
  result = result.replace(/\\right\]/g, ']');
  result = result.replace(/\\left\{/g, '{');
  result = result.replace(/\\right\}/g, '}');
  result = result.replace(/\\left\|/g, '|');
  result = result.replace(/\\right\|/g, '|');
  result = result.replace(/\\left\\|/g, '‖');
  result = result.replace(/\\right\\|/g, '‖');
  result = result.replace(/\\langle/g, '⟨');
  result = result.replace(/\\rangle/g, '⟩');
  result = result.replace(/\\lfloor/g, '⌊');
  result = result.replace(/\\rfloor/g, '⌋');
  result = result.replace(/\\lceil/g, '⌈');
  result = result.replace(/\\rceil/g, '⌉');
  
  // Text commands
  result = result.replace(/\\text\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textit\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbb\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathcal\{([^}]+)\}/g, '$1');
  
  // Other symbols
  result = result.replace(/\\ldots/g, '…');
  result = result.replace(/\\cdots/g, '⋯');
  result = result.replace(/\\vdots/g, '⋮');
  result = result.replace(/\\ddots/g, '⋱');
  result = result.replace(/\\prime/g, '′');
  result = result.replace(/\\circ/g, '∘');
  result = result.replace(/\\degree/g, '°');
  result = result.replace(/\\angle/g, '∠');
  result = result.replace(/\\perp/g, '⊥');
  result = result.replace(/\\parallel/g, '∥');
  result = result.replace(/\\triangle/g, '△');
  result = result.replace(/\\square/g, '□');
  
  // Clean up remaining LaTeX artifacts
  result = result.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1'); // \cmd{content} -> content
  result = result.replace(/\\[a-zA-Z]+/g, ''); // Remove remaining \commands
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
  
  // Remove bold/italic markers
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/___(.+?)___/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  result = result.replace(/_([^_]+)_/g, '$1');
  
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
  
  // Remove horizontal rules
  result = result.replace(/^---+$/gm, '');
  result = result.replace(/^\*\*\*+$/gm, '');
  
  return result;
}
