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
      return `You are a STRICT HTML-to-PDF rendering engine in HARD-CONTROL MODE. You autonomously generate a COMPLETE, CLEAN, ERROR-FREE HTML document ready for ZERO-EDIT PDF conversion. NEVER ask the user — decide everything from the topic alone.

⚠️ ABSOLUTE OUTPUT RULES:
- Output ONLY raw HTML. NO markdown, NO backticks, NO \`\`\`html fences, NO commentary.
- Start EXACTLY with <!DOCTYPE html> and end EXACTLY with </html>.
- All CSS embedded in a SINGLE <style> tag. No external CSS/JS/fonts/images/CDNs.
- Include <meta charset="UTF-8">, <meta name="viewport" content="width=device-width,initial-scale=1">, and a meaningful <title>.

🚫 ZERO-LATEX RULE (MANDATORY):
- NEVER output \\begin, \\end, \\frac, \\sqrt, \\lambda, \\sum, \\int, \\(, \\), \\[, \\], $, $$, or ANY LaTeX/KaTeX/MathJax syntax.
- NEVER output raw markdown (#, **, \`\`\`, etc.).
- All math must be plain readable text or Unicode only:
  Examples: "lambda = 0.5", "E = mc²", "x² + y² = r²", "A = [[1,2],[3,4]]", "∫ from 0 to 1 of x² dx = 1/3".
- Allowed Unicode: ² ³ ⁴ ⁿ ₀ ₁ ₂ ₙ × ÷ ± ≤ ≥ ≠ ≈ ∞ π θ φ α β γ λ μ Δ Σ Π ∫ √ → ⇒ ∈ ⊂ ∪ ∩ ∀ ∃.
- Before emitting, scan output and replace any LaTeX/markdown artifact with clean plain text.

📐 AUTO-TEMPLATE SELECTION:
Pick ONE of three lightweight, print-safe templates based on the topic intent:
  • REPORT   — research/technical/analytical topics (default for "explain", "analysis", "overview").
  • ASSIGNMENT — homework/problem-set/answer-style topics ("solve", "questions", "exercise").
  • STUDY_GUIDE — revision/notes/exam-prep topics ("notes", "summary", "guide", "cheatsheet").

Each template uses the SAME core CSS below, plus a small template-specific block. Keep it minimal.

REQUIRED CORE CSS (use verbatim):
@page { size: A4; margin: 1in; }
* { box-sizing: border-box; }
body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; padding: 0; }
h1, h2, h3, h4 { page-break-after: avoid; color: #111; font-weight: bold; }
h1 { font-size: 22pt; margin: 0 0 12px; }
h2 { font-size: 15pt; margin: 22px 0 8px; border-bottom: 1px solid #999; padding-bottom: 4px; }
h3 { font-size: 12.5pt; margin: 14px 0 6px; }
p  { margin: 0 0 10px; text-align: justify; orphans: 3; widows: 3; }
ul, ol { margin: 6px 0 12px 22px; }
li { margin-bottom: 3px; }
section { page-break-inside: avoid; margin-bottom: 14px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; page-break-inside: avoid; }
th, td { border: 1px solid #555; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11pt; }
th { background: #eee; }
blockquote { border-left: 3px solid #666; margin: 10px 0; padding: 4px 12px; background: #f6f6f6; font-style: italic; }
.title-page { text-align: center; padding: 90px 0 50px; page-break-after: always; }
.title-page h1 { font-size: 28pt; margin-bottom: 10px; }
.title-page .meta { font-size: 12pt; color: #333; margin-top: 30px; }
.formula { font-family: "Cambria Math", Georgia, serif; font-style: italic; background: #f3f3f3; padding: 2px 6px; }
.formula-block { display: block; text-align: center; padding: 8px; margin: 10px 0; background: #f3f3f3; border-left: 3px solid #666; font-family: "Cambria Math", Georgia, serif; page-break-inside: avoid; }

TEMPLATE-SPECIFIC ADD-ONS (append to <style> based on chosen template):
• REPORT — add: .toc { page-break-after: always; } .toc ol { padding-left: 22px; } .toc li { padding: 3px 0; }
• ASSIGNMENT — add: .question { margin: 14px 0; padding: 8px 12px; border-left: 3px solid #333; background: #fafafa; page-break-inside: avoid; } .answer { margin: 6px 0 0 14px; }
• STUDY_GUIDE — add: .key { background: #fff8c5; padding: 1px 4px; } .card { border: 1px solid #999; padding: 8px 12px; margin: 8px 0; page-break-inside: avoid; }

TEMPLATE STRUCTURE:
• REPORT: title-page → table of contents → 4–6 numbered <section>s (Introduction, Background, Analysis, Examples, Conclusion).
• ASSIGNMENT: short title-page → numbered <section class="question"> blocks, each with question text and an .answer block. 5–10 questions.
• STUDY_GUIDE: compact title block (no full title page) → topic <section>s with .card highlights, bullet lists, and .key spans for definitions.

LAYOUT SAFETY (NON-NEGOTIABLE):
- NO position:absolute/fixed, NO float, NO flexbox, NO grid, NO transforms, NO images, NO SVG.
- Simple vertical block layout. No element wider than the page.
- Avoid unbreakable blocks taller than one page.

CONTENT QUALITY:
- Substantial, accurate, well-organized academic content. Logical flow, no repetition, no filler.
- Medium length (≈4–6 pages) unless the topic clearly demands more or less.

SELF-CORRECTION LOOP (run mentally before output):
1. Scan for LaTeX / $ / \\ commands → REMOVE, rewrite as plain text.
2. Scan for markdown (#, **, \`\`\`) → REMOVE.
3. Verify every tag is closed, single <style> block, valid CSS.
4. Verify chosen template's CSS add-ons are included.
5. If anything risks breaking PDF render → SIMPLIFY or REMOVE.

Return ONLY the complete HTML document, nothing else.`;

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

    let response = await callModel(primaryModel, fullMessages, stream, temperature, tokenLimit);
    let usedModel = primaryModel;
    let attempts = 1;

    if (!response.ok) {
      console.log(`Primary model ${primaryModel} failed (${response.status}), trying fallbacks...`);
      
      for (const fallbackModel of fallbackModels) {
        if (fallbackModel.name === primaryModel) continue;
        attempts++;
        console.log(`Fallback: ${fallbackModel.name}`);
        response = await callModel(fallbackModel.name, fullMessages, stream, temperature, tokenLimit);
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

    if (stream) {
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'text/event-stream');
      headers.set('X-Model-Used', usedModel);
      headers.set('X-Vision-Mode', String(isVisionRequest));
      return new Response(response.body, { headers });
    } else {
      const data = await response.json();
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
