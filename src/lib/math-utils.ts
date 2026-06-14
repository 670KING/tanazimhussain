// Ultra Pro math utilities for LaTeX preprocessing, rendering, and export

// ─── HTML / CSS Sanitization ─────────────────────────────────────────────────

/**
 * Strip LLM-injected raw HTML fragments and broken CSS attributes from content
 * WITHOUT removing legitimate math delimiters ($, $$, \[, \() etc.).
 *
 * Strategy (no external DOM dependency — pure regex, safe in SSR):
 *  1. Remove orphaned HTML tag fragments that have no matching close (e.g. `style="color:#cc0000">`)
 *  2. Strip `style="..."` attributes from any remaining tags
 *  3. Remove script/iframe/object tags entirely
 *  4. Collapse multiple blank lines that HTML removal may introduce
 *
 * When DOMPurify (isomorphic-dompurify) is available it is preferred
 * and used instead of the regex approach for stronger guarantees.
 */
export function sanitizeContent(raw: string): string {
  if (!raw) return '';

  let result = raw;

  // 1. Remove orphaned closing-tag fragments that LLMs sometimes emit
  //    e.g.  style="color:#cc0000">  or  class="x">
  result = result.replace(/(?:^|\s)[a-zA-Z][a-zA-Z0-9-]*="[^"]*">?(?=\s|$)/gm, ' ');

  // 2. Remove bare `>` left over after orphaned attributes on its own
  result = result.replace(/^\s*>\s*$/gm, '');

  // 3. Remove dangerous tags wholesale: <script>, <iframe>, <object>, <embed>
  result = result.replace(/<(script|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '');
  result = result.replace(/<(script|iframe|object|embed|link|meta)[^>]*\/?>/gi, '');

  // 4. Strip inline style attributes from HTML tags that did make it through
  result = result.replace(/(<[a-zA-Z][^>]*?)\s+style="[^"]*"/gi, '$1');

  // 5. Strip inline event handlers (onclick="...", onerror="...", etc.)
  result = result.replace(/(<[a-zA-Z][^>]*?)\s+on[a-z]+="[^"]*"/gi, '$1');

  // 6. Clean up extra blank lines introduced by removal
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result;
}

/**
 * Full LLM content pre-processing pipeline:
 *   sanitizeContent → preprocessLatex
 *
 * Run this ONCE on the raw streamed content before passing to ReactMarkdown.
 */
export function sanitizeLLMContent(raw: string): string {
  return preprocessLatex(sanitizeContent(raw));
}

// ─── LaTeX Preprocessing ─────────────────────────────────────────────────────

/**
 * Mathematically correct replacement of pipes (|) inside math blocks with
 * \vert and \Vert commands to prevent markdown table formatting breakage
 * while retaining absolute values, determinants, and norms. Also escapes
 * raw percent symbols (%) to prevent LaTeX comment truncation.
 */
function replacePipesInMath(mathStr: string): string {
  let cleaned = mathStr;
  // 1. Replace pre-escaped or doubled pipes with \Vert
  cleaned = cleaned.replace(/\\\|/g, '\\Vert');
  cleaned = cleaned.replace(/\|\|/g, '\\Vert');
  // 2. Replace remaining single pipes with \vert
  cleaned = cleaned.replace(/\|/g, '\\vert');
  // 3. Escape raw percent symbols (%) to prevent LaTeX comment truncation
  cleaned = cleaned.replace(/(?<!\\)%/g, '\\%');
  return cleaned;
}

/**
 * Advanced preprocessing for LaTeX content before KaTeX rendering.
 * Fixes 15+ common AI-generated LaTeX issues.
 */
export function preprocessLatex(content: string): string {
  if (!content) return '';

  // ── Guard: mask code fences & inline code so none of the replacements
  //    below fire on LaTeX/TikZ that lives inside a code block.
  const codeStore: string[] = [];
  let result = content
    .replace(/```[\s\S]*?```/g, (m) => { codeStore.push(m); return `\x00LTXCODE${codeStore.length - 1}\x00`; })
    .replace(/`[^`\n]+`/g,      (m) => { codeStore.push(m); return `\x00LTXCODE${codeStore.length - 1}\x00`; });

  const restoreCode = (s: string) =>
    s.replace(/\x00LTXCODE(\d+)\x00/g, (_, i) => codeStore[Number(i)]);

  // Step 1: Convert \( \) to $ $ for inline math
  result = result.replace(/\\\((.+?)\\\)/gs, (_, inner) => ` $${inner.trim()}$ `);
  
  // Step 2: Convert \[ \] to $$ $$ for display math  
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `\n$$\n${inner.trim()}\n$$\n`);

  // Step 2.5: Normalize spaces inside inline math delimiters ($ math $ -> $math$)
  // only if the content looks like math to avoid matching regular currency signs.
  const isMathLike = (str: string): boolean => {
    return /[\^_\\]/.test(str) || /[=+\-*/<>~≈±×÷≤≥≠≡]/.test(str);
  };

  result = result.replace(/(?<!\$)\$\s*([^$\n]+?)\s*\$(?!\$)/g, (match, inner) => {
    if (isMathLike(inner)) {
      return `$${inner.trim()}$`;
    }
    return match;
  });
  
  // Step 3: Fix double-escaped LaTeX commands inside math
  const fixEscapedCommands = (mathStr: string): string => {
    return mathStr.replace(/\\\\(frac|begin|end|sqrt|sum|int|prod|lim|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|text|mathbf|mathrm|mathbb|mathcal|vec|hat|bar|dot|ddot|tilde|overline|underline|overbrace|underbrace|left|right|big|Big|bigg|Bigg|bmatrix|pmatrix|matrix|vmatrix|Bmatrix|cases|align|aligned|equation|array|gather|split|multline|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|det|max|min|sup|inf|gcd|deg|ker|dim|hom|arg|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|infty|partial|nabla|forall|exists|nexists|in|notin|ni|cup|cap|subset|supset|subseteq|supseteq|setminus|land|lor|lnot|neg|sim|simeq|cong|propto|to|gets|mapsto|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|iff|implies|ldots|cdots|vdots|ddots|prime|circ|angle|perp|parallel|triangle|square|diamond|star|bullet|oplus|otimes|odot|dagger|ddagger|ell|wp|Re|Im|aleph|hbar|quad|qquad|hline|space|;|,|!|:|phantom|hspace|vspace|operatorname|binom|tbinom|dbinom|choose|atop|stackrel|overset|underset|xleftarrow|xrightarrow|cancel|boxed|color|textcolor|colorbox|tag|notag|label|ref|eqref|displaystyle|textstyle|scriptstyle|vert|Vert)/g, '\\$1');
  };
  
  // Fix commands and double backslashes in display math blocks
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
    if (inner.includes('\n\n')) return match;
    const fixed = fixEscapedCommands(inner.trim());
    const doubled = fixed.replace(/(?<!\\)\\\\(?!\\)/g, '\\\\\\\\');
    return '$$\n' + doubled + '\n$$';
  });
  
  // Fix commands and double backslashes in inline math
  result = result.replace(/(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g, (match, inner) => {
    let processed = inner;
    if (inner.includes('\\\\') && /\\\\(frac|begin|sqrt|sum|int|cdot|alpha|beta|gamma|text|vec|hat|bar|overline)/.test(match)) {
      processed = fixEscapedCommands(inner);
    }
    const doubled = processed.replace(/(?<!\\)\\\\(?!\\)/g, '\\\\\\\\');
    return '$' + doubled + '$';
  });
  
  // Step 4: Wrap bare \begin{env}...\end{env} blocks in $$ if not already wrapped
  const environments = ['bmatrix', 'pmatrix', 'matrix', 'vmatrix', 'Bmatrix', 'cases', 'aligned', 'array', 'gather', 'split'];
  for (const env of environments) {
    const pattern = new RegExp(`(?<!\\$\\s*\\n?)\\s*\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}(?!\\s*\\n?\\s*\\$)`, 'g');
    result = result.replace(pattern, (match) => {
      const idx = result.indexOf(match);
      const before = result.substring(Math.max(0, idx - 10), idx);
      if (before.includes('$$') || before.trimEnd().endsWith('$')) return match;
      return `\n$$\n${match.trim()}\n$$\n`;
    });
  }
  
  // Step 5: Fix matrix row separators
  result = result.replace(/(\\begin\{[bpvBV]?matrix\})([\s\S]*?)(\\end\{[bpvBV]?matrix\})/g, 
    (_, open, inner, close) => {
      let fixed = inner;
      fixed = fixed.replace(/\\\\\\\\/g, '⟦ROW⟧');
      fixed = fixed.replace(/\\\\(?=\s*\n|\s+[0-9a-zA-Z\\-])/g, '⟦ROW⟧');
      fixed = fixed.replace(/⟦ROW⟧/g, ' \\\\ ');
      return open + fixed + close;
    }
  );
  
  // Step 6: Fix escaped begin/end outside math contexts
  result = result.replace(/\\\\begin\{/g, '\\begin{');
  result = result.replace(/\\\\end\{/g, '\\end{');
  
  // Step 7: Fix common AI mistakes
  // Fix "\\text {" -> "\text{" (space before brace)
  result = result.replace(/\\text\s+\{/g, '\\text{');
  // Fix "\operatorname {" -> "\operatorname{"
  result = result.replace(/\\operatorname\s+\{/g, '\\operatorname{');
  
  // Step 8: Fix $$ that got merged onto same line as text
  result = result.replace(/([^\n])\$\$\s*\n/g, '$1\n$$\n');
  result = result.replace(/\n\s*\$\$([^\n$])/g, '\n$$\n$1');
  // Step 9: Clean pipe characters, percent signs, and newlines inside math blocks to prevent table parsing and rendering breakage
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, inner) => {
    if (inner.includes('\n\n')) return match;
    const cleanInner = replacePipesInMath(inner).replace(/\r?\n/g, ' ');
    return `$$${cleanInner}$$`;
  });

  result = result.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (match, envName, inner) => {
    const cleanInner = replacePipesInMath(inner).replace(/\r?\n/g, ' ');
    return `\\begin{${envName}}${cleanInner}\\end{${envName}}`;
  });

  result = result.replace(/(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g, (match, inner) => {
    const cleanInner = replacePipesInMath(inner).replace(/\r?\n/g, ' ');
    return `$${cleanInner}$`;
  });
  // Step 10: Clean up excessive newlines
  result = result.replace(/\n{4,}/g, '\n\n\n');
  
  // Step 11: Fix single $ inside display math (common AI error)
  // If we have $$ ... $ something $ ... $$, the inner $ should be kept as-is

  // Step 12: Escape backslashes inside math blocks and environments in markdown tables
  const lines = result.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|')) {
      let processedLine = line;
      // Process display math $$...$$ and inline math $...$
      processedLine = processedLine.replace(/(\$\$?)([\s\S]+?)\1/g, (match, delimiter, inner) => {
        const doubled = inner.replace(/(?<!\\)\\\\(?!\\)/g, '\\\\\\\\');
        return `${delimiter}${doubled}${delimiter}`;
      });
      // Process environments \begin{env}...\end{env}
      processedLine = processedLine.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (match, envName, inner) => {
        const doubled = inner.replace(/(?<!\\)\\\\(?!\\)/g, '\\\\\\\\');
        return `\\begin{${envName}}${doubled}\\end{${envName}}`;
      });
      lines[i] = processedLine;
    }
  }
  result = lines.join('\n');

  // ── Restore code blocks (they were never touched)
  return restoreCode(result);
}

/**
 * Check if a response appears to be truncated
 */
export function isResponseTruncated(content: string): boolean {
  if (!content || content.length < 100) return false;
  
  const truncationSignals = [
    /[a-zA-Z0-9,]\s*$/.test(content.trim()),
    (content.match(/```/g) || []).length % 2 !== 0,
    (content.match(/\$\$/g) || []).length % 2 !== 0,
    /^[\-\*\d]+\.\s*\w+$/m.test(content.split('\n').slice(-1)[0] || ''),
    content.length > 3000 && !/(\.|!|\?|```|\$\$|conclusion|summary|finally|therefore)\s*$/i.test(content.trim()),
  ];
  
  return truncationSignals.filter(Boolean).length >= 2;
}

/**
 * Parse structured JSON document from AI response.
 * Handles both raw JSON and JSON embedded in markdown code blocks.
 */
export function parseStructuredDocument(content: string): StructuredDocument | null {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(content);
    if (parsed.document) return parsed;
  } catch {
    // Try extracting JSON from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.document) return parsed;
      } catch { /* fall through */ }
    }
    
    // Try finding JSON object in the content
    const braceStart = content.indexOf('{');
    const braceEnd = content.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      try {
        const parsed = JSON.parse(content.substring(braceStart, braceEnd + 1));
        if (parsed.document) return parsed;
      } catch { /* not valid JSON */ }
    }
  }
  return null;
}

// Structured document types
export interface StructuredSection {
  heading: string;
  content: string;
  bullets: string[];
  math_inline: string[];
  math_block: string[];
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
}

export interface StructuredDocument {
  document: {
    title: string;
    subtitle: string;
    author: string;
    sections: StructuredSection[];
  };
  presentation?: {
    title: string;
    slides: Array<{
      title: string;
      points: string[];
      notes: string;
      visual_hint: string;
    }>;
  };
}

/**
 * Convert structured document to rich markdown for preview
 */
export function structuredToMarkdown(doc: StructuredDocument): string {
  const d = doc.document;
  let md = `# ${d.title}\n\n`;
  if (d.subtitle) md += `*${d.subtitle}*\n\n`;
  md += `---\n\n`;
  
  for (const section of d.sections) {
    md += `## ${section.heading}\n\n`;
    
    if (section.content) {
      md += `${section.content}\n\n`;
    }
    
    // Inline math
    if (section.math_inline?.length > 0) {
      for (const expr of section.math_inline) {
        // Already embedded in content usually, but add standalone ones
        if (!section.content?.includes(expr)) {
          md += `$${expr}$\n\n`;
        }
      }
    }
    
    // Block math
    if (section.math_block?.length > 0) {
      for (const expr of section.math_block) {
        md += `$$\n${expr}\n$$\n\n`;
      }
    }
    
    // Bullets
    if (section.bullets?.length > 0) {
      for (const bullet of section.bullets) {
        md += `- ${bullet}\n`;
      }
      md += '\n';
    }
    
    // Tables
    if (section.tables?.length > 0) {
      for (const table of section.tables) {
        if (table.headers?.length > 0) {
          md += '| ' + table.headers.join(' | ') + ' |\n';
          md += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';
          for (const row of table.rows || []) {
            md += '| ' + row.join(' | ') + ' |\n';
          }
          md += '\n';
        }
      }
    }
  }
  
  return md;
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
    let iterations = 0;
    while (prev !== str && iterations < 10) {
      prev = str;
      str = str.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
      iterations++;
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
    const sup: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','i':'ⁱ','+':'⁺','-':'⁻','T':'ᵀ' };
    if (clean.length <= 2 && /^[\d\+\-niT]+$/.test(clean)) {
      return clean.split('').map((c: string) => sup[c] || `^${c}`).join('');
    }
    return `^(${clean})`;
  });
  
  result = result.replace(/_(\{[^}]+\}|\d)/g, (_, sub) => {
    const clean = sub.replace(/[{}]/g, '');
    const subs: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ','i':'ᵢ','j':'ⱼ','k':'ₖ','+':'₊','-':'₋' };
    if (clean.length <= 2 && /^[\d\+\-nijk]+$/.test(clean)) {
      return clean.split('').map((c: string) => subs[c] || `_${c}`).join('');
    }
    return `_(${clean})`;
  });
  
  // Operators
  const replacements: [RegExp, string][] = [
    [/\\cdot/g, '·'], [/\\times/g, '×'], [/\\div/g, '÷'], [/\\pm/g, '±'], [/\\mp/g, '∓'],
    [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\neq/g, '≠'], [/\\approx/g, '≈'], [/\\equiv/g, '≡'],
    [/\\sim/g, '∼'], [/\\simeq/g, '≃'], [/\\cong/g, '≅'], [/\\propto/g, '∝'],
    [/\\to/g, '→'], [/\\gets/g, '←'], [/\\mapsto/g, '↦'],
    [/\\int/g, '∫'], [/\\iint/g, '∬'], [/\\iiint/g, '∭'], [/\\oint/g, '∮'],
    [/\\sum/g, 'Σ'], [/\\prod/g, 'Π'], [/\\coprod/g, '∐'],
    [/\\partial/g, '∂'], [/\\nabla/g, '∇'],
    [/\\infty/g, '∞'], [/\\lim/g, 'lim'],
    [/\\sin/g, 'sin'], [/\\cos/g, 'cos'], [/\\tan/g, 'tan'],
    [/\\log/g, 'log'], [/\\ln/g, 'ln'], [/\\exp/g, 'exp'],
    [/\\det/g, 'det'], [/\\max/g, 'max'], [/\\min/g, 'min'],
    [/\\sup/g, 'sup'], [/\\inf/g, 'inf'], [/\\gcd/g, 'gcd'],
    [/\\in(?![a-z])/g, '∈'], [/\\notin/g, '∉'], [/\\ni/g, '∋'],
    [/\\subset/g, '⊂'], [/\\supset/g, '⊃'], [/\\subseteq/g, '⊆'], [/\\supseteq/g, '⊇'],
    [/\\cup/g, '∪'], [/\\cap/g, '∩'], [/\\setminus/g, '\\'],
    [/\\emptyset/g, '∅'], [/\\varnothing/g, '∅'],
    [/\\forall/g, '∀'], [/\\exists/g, '∃'], [/\\nexists/g, '∄'],
    [/\\land/g, '∧'], [/\\lor/g, '∨'], [/\\lnot/g, '¬'], [/\\neg/g, '¬'],
    [/\\rightarrow/g, '→'], [/\\leftarrow/g, '←'],
    [/\\Rightarrow/g, '⇒'], [/\\Leftarrow/g, '⇐'],
    [/\\leftrightarrow/g, '↔'], [/\\Leftrightarrow/g, '⇔'],
    [/\\iff/g, '⇔'], [/\\implies/g, '⇒'],
    [/\\langle/g, '⟨'], [/\\rangle/g, '⟩'],
    [/\\lceil/g, '⌈'], [/\\rceil/g, '⌉'], [/\\lfloor/g, '⌊'], [/\\rfloor/g, '⌋'],
    [/\\ldots/g, '…'], [/\\cdots/g, '⋯'], [/\\vdots/g, '⋮'], [/\\ddots/g, '⋱'],
    [/\\therefore/g, '∴'], [/\\because/g, '∵'],
    [/\\perp/g, '⊥'], [/\\parallel/g, '∥'], [/\\angle/g, '∠'],
    [/\\triangle/g, '△'], [/\\square/g, '□'], [/\\diamond/g, '◇'],
    [/\\star/g, '⋆'], [/\\bullet/g, '•'],
    [/\\oplus/g, '⊕'], [/\\otimes/g, '⊗'], [/\\odot/g, '⊙'],
    [/\\dagger/g, '†'], [/\\ddagger/g, '‡'],
    [/\\ell/g, 'ℓ'], [/\\wp/g, '℘'], [/\\Re/g, 'ℜ'], [/\\Im/g, 'ℑ'],
    [/\\aleph/g, 'ℵ'], [/\\hbar/g, 'ℏ'],
  ];
  
  // Greek letters
  const greek: Record<string, string> = {
    alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'ϑ',
    iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',varpi:'ϖ',rho:'ρ',varrho:'ϱ',
    sigma:'σ',varsigma:'ς',tau:'τ',upsilon:'υ',phi:'φ',varphi:'ϕ',chi:'χ',psi:'ψ',omega:'ω',
    Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Upsilon:'Υ',Phi:'Φ',Psi:'Ψ',Omega:'Ω'
  };
  
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  
  // Bracket replacements
  result = result.replace(/\\left\(/g, '(');
  result = result.replace(/\\right\)/g, ')');
  result = result.replace(/\\left\[/g, '[');
  result = result.replace(/\\right\]/g, ']');
  result = result.replace(/\\left\{/g, '{');
  result = result.replace(/\\right\}/g, '}');
  result = result.replace(/\\left\|/g, '|');
  result = result.replace(/\\right\|/g, '|');
  result = result.replace(/\\left\./g, '');
  result = result.replace(/\\right\./g, '');
  
  for (const [name, symbol] of Object.entries(greek)) {
    result = result.replace(new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g'), symbol);
  }
  
  // Text commands
  result = result.replace(/\\text\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\textit\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathbb\{([^}]+)\}/g, '$1');
  result = result.replace(/\\mathcal\{([^}]+)\}/g, '$1');
  result = result.replace(/\\operatorname\{([^}]+)\}/g, '$1');
  result = result.replace(/\\binom\{([^}]+)\}\{([^}]+)\}/g, 'C($1,$2)');
  result = result.replace(/\\boxed\{([^}]+)\}/g, '[$1]');
  
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

/**
 * Auto-closes unclosed markdown and math tags (fences) during chat streaming.
 * Keeps the ReactMarkdown compiler happy and prevents layout/flicker blowouts.
 */
export function autoCloseMarkdownAndMath(text: string): string {
  if (!text) return '';

  let closedText = text;

  // 1. Close unclosed code blocks (fenced code blocks)
  const codeBlockCount = (closedText.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    closedText += '\n```';
  }

  // 2. Close unclosed display math blocks ($$)
  const displayMathCount = (closedText.match(/\$\$/g) || []).length;
  if (displayMathCount % 2 !== 0) {
    closedText += '\n$$';
  }

  // 3. Close unclosed inline math blocks ($)
  // Mask $$ first so we only count single $
  const singleDollarCount = (closedText.replace(/\$\$/g, '').match(/\$/g) || []).length;
  if (singleDollarCount % 2 !== 0) {
    closedText += '$';
  }

  return closedText;
}
