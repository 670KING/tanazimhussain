import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// ONLY user-specified free models
const FREE_TEXT_MODELS = [
  { id: 'nemotron-super', name: 'nvidia/nemotron-3-super-120b-a12b:free', context: 262144 },
  { id: 'gemma-4-26b', name: 'google/gemma-4-26b-a4b-it:free', context: 262144 },
  { id: 'lfm-thinking', name: 'liquid/lfm-2.5-1.2b-thinking:free', context: 32768 },
  { id: 'gpt-oss-120b', name: 'openai/gpt-oss-120b:free', context: 131072 },
  { id: 'qwen3-next', name: 'qwen/qwen3-next-80b-a3b-instruct:free', context: 262144 },
];

const FREE_VISION_MODELS = [
  { id: 'gemma-4-26b-vision', name: 'google/gemma-4-26b-a4b-it:free', context: 262144 },
  { id: 'nemotron-nano-vl', name: 'nvidia/nemotron-nano-12b-v2-vl:free', context: 128000 },
];

const MODEL_ALIASES: Record<string, string> = {};
for (const m of [...FREE_TEXT_MODELS, ...FREE_VISION_MODELS]) {
  MODEL_ALIASES[m.id] = m.name;
}

const VISION_MODEL_IDS = FREE_VISION_MODELS.map(m => m.id);

/**
 * Pre-output HTML sanitizer for PDF mode.
 * Strips LaTeX/markdown artifacts and replaces them with safe plain text.
 */
function sanitizePdfHtml(raw: string): string {
  let html = raw.trim();

  // 1. Strip code fences (```html ... ```)
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '');

  // 2. Trim anything before <!DOCTYPE or <html
  const dt = html.search(/<!DOCTYPE\s+html/i);
  const ht = html.search(/<html[\s>]/i);
  const start = dt >= 0 ? dt : (ht >= 0 ? ht : -1);
  if (start > 0) html = html.slice(start);

  // 3. Trim trailing junk after </html>
  const endIdx = html.lastIndexOf('</html>');
  if (endIdx >= 0) html = html.slice(0, endIdx + '</html>'.length);

  // 4. Remove LaTeX delimiters and common commands → plain text
  html = html
    .replace(/\\begin\{[^}]+\}/g, '')
    .replace(/\\end\{[^}]+\}/g, '')
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\s*\{([^}]*)\}/g, '√($1)')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\int/g, '∫')
    .replace(/\\prod/g, 'Π')
    .replace(/\\infty/g, '∞')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\to/g, '→')
    .replace(/\\text\s*\{([^}]*)\}/g, '$1')
    .replace(/\\\(|\\\)/g, '')
    .replace(/\\\[|\\\]/g, '')
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    // remove any leftover LaTeX commands like \foo or \foo{...}
    .replace(/\\[a-zA-Z]+\s*\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '');

  // 5. Remove markdown artifacts that escaped into HTML text nodes.
  // Only target obvious leftovers — avoid touching attribute values.
  html = html
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/(^|\n)#{1,6}\s+/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1');

  // 6. If model returned no <html>, wrap minimally
  if (!/<html[\s>]/i.test(html)) {
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title><style>@page{size:A4;margin:1in}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;color:#000}h1{text-align:center}p{text-align:justify}</style></head><body>${html}</body></html>`;
  }

  return html;
}

const MATH_INSTRUCTIONS = `
**CRITICAL - LaTeX Math Formatting (ALWAYS follow these rules exactly):**

For inline math, use single dollar signs: $x^2 + y^2 = r^2$

For block/display math, use double dollar signs on SEPARATE LINES:

$$
\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}
$$

For matrices, ALWAYS use \\begin{bmatrix}...\\end{bmatrix} inside $$ $$:

$$
A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}
$$

Rules:
- Use \\frac{a}{b} for fractions (NOT a/b in complex expressions)
- Use \\sqrt{x} for square roots
- Use \\cdot for multiplication dots
- Use \\\\ for new rows in matrices (ALWAYS double backslash)
- Use & to separate columns in matrices
- NEVER output raw LaTeX source like \\begin or \\frac as plain text
- ALL math must be inside $ or $$ delimiters
- NEVER use \\( \\) or \\[ \\] - ONLY use $ and $$
- Use \\text{} for text inside math environments
- Use \\operatorname{} for multi-letter operators
- Properly nest braces: \\frac{\\sqrt{x^2+1}}{2}`;

const getSystemPrompt = (type: string) => {
  switch (type) {
    case 'quiz':
      return `You are TanoAI Quiz Generator. Generate quiz questions in valid JSON format only.
Return ONLY a JSON array: [{"question": "...", "type": "multiple_choice", "options": ["A","B","C","D"], "correct_answer": "A", "explanation": "..."}]
${MATH_INSTRUCTIONS}`;

    case 'study_plan':
      return `You are TanoAI Study Planner. Create study plans in valid JSON format only.
Return ONLY: {"title": "...", "topics": [{"name": "...", "duration": "...", "description": "...", "completed": false, "resources": ["..."]}], "tips": ["..."], "milestones": ["..."]}`;

    case 'summary':
      return `You are TanoAI Summarizer. Provide clear, comprehensive summaries.\n${MATH_INSTRUCTIONS}`;

    case 'pdf':
      return `You are an HTML-to-PDF document engine in SELF-DEFENSIVE MODE. Generate a COMPLETE, STABLE, ERROR-FREE HTML document guaranteed to render correctly as PDF under all conditions. You must actively PREVENT, DETECT, and CORRECT all possible errors.

CORE PRINCIPLE: Stability > Consistency > Readability > Design. Never prioritize design over correctness.

⚠️ ABSOLUTE OUTPUT RULES:
- Output ONLY raw HTML. Start EXACTLY with <!DOCTYPE html>, end EXACTLY with </html>.
- NO markdown, NO backticks, NO \`\`\`html fences, NO commentary, NO explanations.
- All CSS in ONE <style> tag. No external CSS/JS/fonts/images/CDNs.

🛡️ ERROR PREVENTION (assume any complex feature can break PDF rendering — default to SIMPLE, SAFE, PREDICTABLE):
1. SYNTAX → close every tag, valid nesting, no orphan elements.
2. RENDERING → simplify layout, reduce density, control spacing, avoid overflow.
3. FORMAT MIXING (CRITICAL) → strip all LaTeX/markdown, convert to plain text.
4. STRUCTURAL → uniform sections, consistent hierarchy, even content distribution.
5. PERFORMANCE → lightweight CSS, no heavy tables, no deep nesting.
6. FUTURE-RISK → replace anything that MAY break in any PDF engine with safest alternative.

🚫 FORBIDDEN OUTPUT (STRICT BLOCK):
- NO LaTeX or math markup: \\begin, \\end, \\frac, \\sqrt, \\lambda, \\sum, \\int, \\(, \\), \\[, \\], $, $$.
- NO markdown: #, ##, **, *, \`, \`\`\`, ~~, ---.
- NO <table> elements (convert tabular data to bullet points).
- NO flexbox, grid, float, position:absolute/fixed, transforms, animations.
- NO decorative styling: shadows, gradients, heavy borders.
- NO images, NO SVG, NO external resources, NO inline-style overload.

✅ MATH/SYMBOLS — plain text or Unicode only:
- "lambda = 0.5", "E = mc²", "x² + y² = r²", "∫ from 0 to 1 of x² dx = 1/3".
- Allowed: ² ³ ⁿ ₀ ₁ ₂ × ÷ ± ≤ ≥ ≠ ≈ ∞ π θ λ μ Δ Σ ∫ √ → ∈.

📋 TABULAR DATA RULE:
- If data is tabular → convert to BULLET POINTS, never use <table>.

🧱 FIXED HTML TEMPLATE (use this exact skeleton):
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>{Topic Title}</title>
<style>
@page { size: A4; margin: 1in; }
body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: black; margin: 0; }
h1 { text-align: center; font-size: 20pt; margin-bottom: 20px; page-break-after: avoid; }
h2 { font-size: 14pt; margin-top: 20px; margin-bottom: 8px; page-break-after: avoid; }
h3 { font-size: 12pt; margin-top: 14px; margin-bottom: 6px; page-break-after: avoid; }
p { text-align: justify; margin: 0 0 10px; orphans: 3; widows: 3; }
ul, ol { margin: 6px 0 12px 20px; }
li { margin-bottom: 4px; }
section { page-break-inside: avoid; margin-bottom: 14px; }
</style>
</head>
<body>
  <h1>{Title}</h1>
  <section><h2>Introduction</h2>...</section>
  <section><h2>Background</h2>...</section>
  <section><h2>Main Explanation</h2>...</section>
  <section><h2>Key Points</h2><ul>...</ul></section>
  <section><h2>Practical Insights</h2>...</section>
  <section><h2>Conclusion</h2>...</section>
</body>
</html>

📐 CONTENT ENGINE — always produce these 7 parts:
1. Title  2. Introduction  3. Background  4. Main Explanation
5. Key Points (bullet list)  6. Practical Insights  7. Conclusion

🧠 INTELLIGENT SIMPLIFICATION:
- IF content is complex → simplify.
- IF layout is risky → flatten structure.
- IF formatting is mixed → unify into plain text.

🎯 AUTO-OPTIMIZATION:
- Medium-length paragraphs (4–7 sentences). Balance content across ~4–6 pages.
- No overcrowding, no overly short content, smooth reading flow, no repetition.
- Uniform spacing, consistent hierarchy, no visual inconsistency.

🔁 SELF-VALIDATION LOOP — run before output, repeat until ZERO issues:
✔ No LaTeX  ✔ No $ or \\ commands  ✔ No markdown (#, **, \`\`\`)  ✔ No <table>
✔ No flexbox/grid/float/absolute  ✔ All tags closed  ✔ Single <style> block
✔ Uniform structure  ✔ No overflow risk  ✔ Consistent formatting
If ANY violation → REMOVE or SIMPLIFY. If unsure → use simplest version.

FAIL-SAFE: Never attempt risky formatting. Output must render correctly across ALL PDF engines.

Return ONLY the complete HTML document.`;

    case 'vision':
      return `You are TanoAI Vision Assistant. Analyze images in detail: describe elements, extract text, explain math/diagrams with LaTeX, interpret charts.\n${MATH_INSTRUCTIONS}`;

    case 'resume':
      return `You are TanoAI Resume Writer. Use strong action verbs, quantify achievements, keep bullets concise, use industry keywords. Return only improved text.`;

    default:
      return `You are TanoAI, an advanced academic assistant. Help with learning, homework, research, exams, writing, code, and math.

**Formatting:** Use **bold**, \`code blocks\`, headings (#), bullet points, tables, > blockquotes.

${MATH_INSTRUCTIONS}

Be helpful, accurate, educational. ALWAYS complete your response fully.`;
  }
};

async function callModel(modelName: string, messages: any[], stream: boolean, temperature: number, maxTokens: number = 8192) {
  console.log(`Calling model: ${modelName} with maxTokens: ${maxTokens}`);
  
  return await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://tanoai.lovable.app',
      'X-Title': 'TanoAI',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream,
      max_tokens: maxTokens,
      temperature,
    }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      messages, 
      model = 'gemma-4-26b', 
      stream = true, 
      type = 'chat',
      images = [],
      maxTokens = 8192,
      pdfOptions = null
    } = await req.json();

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const hasImages = images && images.length > 0;
    const isVisionRequest = hasImages || type === 'vision';
    
    let primaryModel: string;
    let fallbackModels: typeof FREE_TEXT_MODELS;
    
    if (isVisionRequest) {
      primaryModel = MODEL_ALIASES[model] && VISION_MODEL_IDS.includes(model) 
        ? MODEL_ALIASES[model] 
        : 'google/gemma-4-26b-a4b-it:free';
      fallbackModels = FREE_VISION_MODELS;
    } else {
      primaryModel = MODEL_ALIASES[model] || MODEL_ALIASES['nemotron-super'];
      fallbackModels = FREE_TEXT_MODELS;
    }

    let systemPrompt = getSystemPrompt(type);
    
    if (pdfOptions) {
      systemPrompt += `\n\nDocument Requirements:
- Title: ${pdfOptions.title || 'Untitled'}
- Type: ${pdfOptions.type}
- Style: ${pdfOptions.style}
- Length: ${pdfOptions.length === 'short' ? '3-4 sections' : pdfOptions.length === 'medium' ? '4-5 sections' : '5-6 sections'}
Generate COMPLETE content. Never truncate.`;
    }

    const temperature = type === 'quiz' || type === 'study_plan' ? 0.3 : type === 'pdf' ? 0.3 : 0.7;
    const tokenLimit = pdfOptions?.length === 'long' ? 24000 : type === 'pdf' ? 12000 : maxTokens > 8192 ? maxTokens : 16384;

    let fullMessages: any[];
    
    if (hasImages) {
      const lastUserMessage = messages[messages.length - 1];
      const previousMessages = messages.slice(0, -1);
      
      const imageContent = images.map((img: string) => ({
        type: 'image_url',
        image_url: { url: img }
      }));
      
      fullMessages = [
        { role: 'system', content: systemPrompt },
        ...previousMessages,
        {
          role: 'user',
          content: [
            { type: 'text', text: lastUserMessage.content },
            ...imageContent
          ]
        }
      ];
    } else {
      fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];
    }

    // PDF mode MUST be non-streaming so we can run the sanitizer over full HTML.
    const effectiveStream = type === 'pdf' ? false : stream;
    let response = await callModel(primaryModel, fullMessages, effectiveStream, temperature, tokenLimit);
    let usedModel = primaryModel;
    let attempts = 1;

    if (!response.ok) {
      console.log(`Primary model ${primaryModel} failed (${response.status}), trying fallbacks...`);
      
      for (const fallbackModel of fallbackModels) {
        if (fallbackModel.name === primaryModel) continue;
        attempts++;
        console.log(`Fallback: ${fallbackModel.name}`);
        response = await callModel(fallbackModel.name, fullMessages, effectiveStream, temperature, tokenLimit);
        usedModel = fallbackModel.name;
        
        if (response.ok) break;
        if (attempts >= 5) break;
      }
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('All models failed:', response.status, error);
      
      return new Response(JSON.stringify({ 
        error: response.status === 429 
          ? 'All AI models are busy. Please try again in a moment.' 
          : 'AI service temporarily unavailable. Please try again.',
      }), {
        status: response.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (effectiveStream) {
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'text/event-stream');
      headers.set('X-Model-Used', usedModel);
      headers.set('X-Vision-Mode', String(isVisionRequest));
      return new Response(response.body, { headers });
    } else {
      const data = await response.json();

      if (type === 'pdf' && data?.choices?.[0]?.message?.content) {
        const cleaned = sanitizePdfHtml(data.choices[0].message.content);
        data.choices[0].message.content = cleaned;
      }

      return new Response(JSON.stringify({ ...data, model_used: usedModel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
