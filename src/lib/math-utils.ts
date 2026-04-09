// Utility functions for converting LaTeX math to human-readable format

/**
 * Advanced preprocessing for LaTeX content before rendering.
 * Fixes common AI-generated LaTeX issues so KaTeX can render them.
 */
export function preprocessLatex(content: string): string {
  if (!content) return '';
  
  let result = content;
  
  // Step 1: Convert \( \) to $ $ for inline math
  result = result.replace(/\\\((.+?)\\\)/gs, (_, inner) => ` $${inner.trim()}$ `);
  
  // Step 2: Convert \[ \] to $$ $$ for display math  
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `\n$$\n${inner.trim()}\n$$\n`);
  
  // Step 3: Fix escaped LaTeX commands inside math contexts
  // Match content inside $...$ and $$...$$ and fix double-escaped commands
  const fixEscapedCommands = (mathStr: string): string => {
    // Fix \\frac -> \frac, \\begin -> \begin, etc. (double-escaped)
    let fixed = mathStr.replace(/\\\\(frac|begin|end|sqrt|sum|int|prod|lim|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|text|mathbf|mathrm|mathbb|vec|hat|bar|overline|underline|left|right|bmatrix|pmatrix|matrix|vmatrix|Bmatrix|cases|align|aligned|equation|array|gather|sin|cos|tan|log|ln|exp|det|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|forall|exists|in|notin|cup|cap|subset|supset|land|lor|neg|sim|propto|to|gets|mapsto|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|iff|implies|ldots|cdots|vdots|ddots|prime|circ|angle|perp|parallel|triangle|quad|qquad|hline|space|;|,|!|:)/g, '\\$1');
    return fixed;
  };
  
  // Fix commands in display math blocks
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
    return '$$\n' + fixEscapedCommands(inner.trim()) + '\n$$';
  });
  
  // Fix commands in inline math
  result = result.replace(/\$([^$\n]+)\$/g, (match, inner) => {
    if (inner.includes('\\\\') && /\\\\(frac|begin|sqrt|sum|int|cdot|alpha|beta|gamma)/.test(match)) {
      return '$' + fixEscapedCommands(inner) + '$';
    }
    return match;
  });
  
  // Step 4: Wrap bare \begin{env}...\end{env} blocks in $$ if not already wrapped
  const environments = ['bmatrix', 'pmatrix', 'matrix', 'vmatrix', 'Bmatrix', 'cases', 'align', 'aligned', 'array', 'gather'];
  for (const env of environments) {
    const pattern = new RegExp(`(?<!\\$\\s*\\n?)\\s*\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}(?!\\s*\\n?\\s*\\$)`, 'g');
    result = result.replace(pattern, (match) => {
      // Check if already inside $$ context
      const idx = result.indexOf(match);
      const before = result.substring(Math.max(0, idx - 10), idx);
      if (before.includes('$$') || before.trimEnd().endsWith('$')) return match;
      return `\n$$\n${match.trim()}\n$$\n`;
    });
  }
  
  // Step 5: Fix matrix row separators - ensure \\\\ inside matrix environments
  result = result.replace(/(\\begin\{[bpvBV]?matrix\})([\s\S]*?)(\\end\{[bpvBV]?matrix\})/g, 
    (_, open, inner, close) => {
      // Normalize: replace single \\ (not \\\\) with \\\\ for row breaks
      // But be careful not to touch \\cdot, \\frac, etc.
      let fixed = inner;
      // First normalize all \\\\ to a placeholder
      fixed = fixed.replace(/\\\\\\\\/g, '⟦ROW⟧');
      // Then convert remaining \\ followed by newline or space+digit/letter to row break
      fixed = fixed.replace(/\\\\(?=\s*\n|\s+[0-9a-zA-Z\\-])/g, '⟦ROW⟧');
      // Restore
      fixed = fixed.replace(/⟦ROW⟧/g, ' \\\\ ');
      return open + fixed + close;
    }
  );
  
  // Step 6: Fix escaped begin/end outside math contexts
  result = result.replace(/\\\\begin\{/g, '\\begin{');
  result = result.replace(/\\\\end\{/g, '\\end{');
  
  // Step 7: Clean up multiple newlines but preserve structure
  result = result.replace(/\n{4,}/g, '\n\n\n');
  
  // Step 8: Fix $$ that got merged onto same line as text
  result = result.replace(/([^\n])\$\$\s*\n/g, '$1\n$$\n');
  result = result.replace(/\n\s*\$\$([^\n$])/g, '\n$$\n$1');
  
  return result;
}

/**
 * Check if a response appears to be truncated
 */
export function isResponseTruncated(content: string): boolean {
  if (!content || content.length < 100) return false;
  
  const truncationSignals = [
    // Ends mid-sentence
    /[a-zA-Z0-9,]\s*$/.test(content.trim()),
    // Unclosed code block
    (content.match(/```/g) || []).length % 2 !== 0,
    // Unclosed math block
    (content.match(/\$\$/g) || []).length % 2 !== 0,
    // Ends with incomplete list
    /^[\-\*\d]+\.\s*\w+$/m.test(content.split('\n').slice(-1)[0] || ''),
    // Long content without proper ending
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
  
  // Matrix handling
  const matrixHandler = (_: string, inner: string) => {
    const rows = inner.split('\\\\').map((row: string) => row.trim());
    const formattedRows = rows
      .filter((row: string) => row.length > 0)
      .map((row: string) => {
        const cols = row.split('&').map((col: string) => col.trim());
        return '│ ' + cols.join(' │ ') + ' │';
      });
    
    if (formattedRows.length === 0) return '[ ]';
    
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
  
  // Cases
  result = result.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, inner) => {
    const rows = inner.split('\\\\').map((row: string) => row.trim());
    const formattedRows = rows
      .filter((row: string) => row.length > 0)
      .map((row: string) => '  ' + row.replace(/&/g, ', '));
    return '\n{\n' + formattedRows.join('\n') + '\n}\n';
  });
  
  // Fractions
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
  
  // Superscripts and subscripts
  result = result.replace(/\^(\{[^}]+\}|\d)/g, (_, exp) => {
    const clean = exp.replace(/[{}]/g, '');
    const sup: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','i':'ⁱ','+':'⁺','-':'⁻' };
    if (clean.length <= 2 && /^[\d\+\-ni]+$/.test(clean)) {
      return clean.split('').map(c => sup[c] || `^${c}`).join('');
    }
    return `^(${clean})`;
  });
  
  result = result.replace(/_(\{[^}]+\}|\d)/g, (_, sub) => {
    const clean = sub.replace(/[{}]/g, '');
    const subs: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ','i':'ᵢ','+':'₊','-':'₋' };
    if (clean.length <= 2 && /^[\d\+\-ni]+$/.test(clean)) {
      return clean.split('').map(c => subs[c] || `_${c}`).join('');
    }
    return `_(${clean})`;
  });
  
  // Operators
  const replacements: [RegExp, string][] = [
    [/\\cdot/g, '·'], [/\\times/g, '×'], [/\\div/g, '÷'], [/\\pm/g, '±'], [/\\mp/g, '∓'],
    [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\neq/g, '≠'], [/\\approx/g, '≈'], [/\\equiv/g, '≡'],
    [/\\sim/g, '∼'], [/\\propto/g, '∝'], [/\\to/g, '→'], [/\\gets/g, '←'], [/\\mapsto/g, '↦'],
    [/\\int/g, '∫'], [/\\sum/g, 'Σ'], [/\\prod/g, 'Π'], [/\\partial/g, '∂'], [/\\nabla/g, '∇'],
    [/\\infty/g, '∞'], [/\\lim/g, 'lim'],
    [/\\in(?![a-z])/g, '∈'], [/\\notin/g, '∉'], [/\\subset/g, '⊂'], [/\\supset/g, '⊃'],
    [/\\cup/g, '∪'], [/\\cap/g, '∩'], [/\\emptyset/g, '∅'], [/\\forall/g, '∀'], [/\\exists/g, '∃'],
    [/\\land/g, '∧'], [/\\lor/g, '∨'], [/\\neg/g, '¬'],
    [/\\rightarrow/g, '→'], [/\\leftarrow/g, '←'], [/\\Rightarrow/g, '⇒'], [/\\Leftarrow/g, '⇐'],
    [/\\leftrightarrow/g, '↔'], [/\\Leftrightarrow/g, '⇔'], [/\\iff/g, '⇔'], [/\\implies/g, '⇒'],
    [/\\left[(\[({|]/g, (_, c) => c], [/\\right[\])}|]/g, (_, c) => c],
    [/\\langle/g, '⟨'], [/\\rangle/g, '⟩'],
    [/\\ldots/g, '…'], [/\\cdots/g, '⋯'], [/\\vdots/g, '⋮'], [/\\ddots/g, '⋱'],
  ];
  
  // Greek letters
  const greek: Record<string, string> = {
    alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',
    iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',
    tau:'τ',upsilon:'υ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',
    Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω'
  };
  
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement as string);
  }
  for (const [name, symbol] of Object.entries(greek)) {
    result = result.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), symbol);
  }
  
  // Text commands
  result = result.replace(/\\text\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbb\{([^}]+)\}/g, '$1');
  
  // Clean remaining
  result = result.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
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
  result = result.replace(/^#{1,6}\s+(.*)$/gm, '$1');
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/___(.+?)___/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  result = result.replace(/_([^_]+)_/g, '$1');
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
  });
  result = result.replace(/`([^`]+)`/g, '$1');
  result = result.replace(/^[\*\-]\s+/gm, '• ');
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  result = result.replace(/^>\s+/gm, '');
  result = result.replace(/^---+$/gm, '');
  result = result.replace(/^\*\*\*+$/gm, '');
  return result;
}
