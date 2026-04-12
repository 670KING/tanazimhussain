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
      return `You are TanoAI Ultra Pro Document Engine.

⚠️ CRITICAL: Output ONLY valid JSON. No markdown, no backticks, no code blocks. Just raw JSON.

Return this EXACT structure:
{
  "document": {
    "title": "string",
    "subtitle": "string",
    "author": "TanoAI",
    "sections": [
      {
        "heading": "string",
        "content": "string",
        "bullets": ["string"],
        "math_inline": ["a^2 + b^2 = c^2"],
        "math_block": ["\\\\frac{a}{b}"],
        "tables": [{"headers": ["A","B"], "rows": [["1","2"]]}]
      }
    ]
  },
  "presentation": {
    "title": "string",
    "slides": [
      {"title": "string", "points": ["bullet"], "notes": "notes", "visual_hint": "equation"}
    ]
  }
}

RULES: 3-6 sections, 2-5 bullets each, KaTeX-compatible LaTeX only, escape backslashes in JSON (double \\\\). All arrays must exist (empty [] if none). VALIDATE JSON before output.`;

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
      model = 'nemotron-super', 
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

    const temperature = type === 'quiz' || type === 'study_plan' ? 0.3 : type === 'pdf' ? 0.4 : 0.7;
    const tokenLimit = pdfOptions?.length === 'long' ? 32768 : type === 'pdf' ? 16384 : maxTokens > 8192 ? maxTokens : 16384;

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
