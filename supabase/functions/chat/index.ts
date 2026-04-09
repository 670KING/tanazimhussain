import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// All FREE text models with fallback order
const FREE_TEXT_MODELS = [
  { id: 'nemotron-super', name: 'nvidia/nemotron-3-super:free', context: 262144 },
  { id: 'trinity-large', name: 'arcee-ai/trinity-large-preview:free', context: 131000 },
  { id: 'qwen3-coder', name: 'qwen/qwen3-coder-480b-a35b:free', context: 262000 },
  { id: 'gemma-4-31b', name: 'google/gemma-4-31b:free', context: 262144 },
  { id: 'glm-air', name: 'z-ai/glm-4.5-air:free', context: 131072 },
  { id: 'gpt-oss-120b', name: 'openai/gpt-oss-120b:free', context: 131072 },
  { id: 'llama-70b', name: 'meta-llama/llama-3.3-70b-instruct:free', context: 65536 },
  { id: 'minimax-m25', name: 'minimax/minimax-m2.5:free', context: 196608 },
  { id: 'nemotron-nano-30b', name: 'nvidia/nemotron-3-nano-30b-a3b:free', context: 256000 },
  { id: 'trinity-mini', name: 'arcee-ai/trinity-mini:free', context: 131072 },
  { id: 'qwen3-next', name: 'qwen/qwen3-next-80b-a3b-instruct:free', context: 262144 },
  { id: 'hermes-405b', name: 'nousresearch/hermes-3-llama-3.1-405b:free', context: 131072 },
  { id: 'gpt-oss-20b', name: 'openai/gpt-oss-20b:free', context: 131072 },
  { id: 'gemma-4-26b', name: 'google/gemma-4-26b-a4b:free', context: 262144 },
  { id: 'gemma-3-27b', name: 'google/gemma-3-27b:free', context: 131072 },
  { id: 'llama-3b', name: 'meta-llama/llama-3.2-3b-instruct:free', context: 131072 },
  { id: 'lfm-thinking', name: 'liquidai/lfm2.5-1.2b-thinking:free', context: 32768 },
  { id: 'venice', name: 'venice-ai/uncensored:free', context: 32768 },
];

// FREE Vision models
const FREE_VISION_MODELS = [
  { id: 'nemotron-nano-vl', name: 'nvidia/nemotron-nano-12b-2-vl:free', context: 128000 },
  { id: 'gemma-4-31b-vision', name: 'google/gemma-4-31b:free', context: 262144 },
  { id: 'gemma-3-12b', name: 'google/gemma-3-12b:free', context: 32768 },
  { id: 'gemma-3-4b', name: 'google/gemma-3-4b:free', context: 32768 },
  { id: 'nemotron-embed-vl', name: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', context: 131072 },
  { id: 'gemma-3n-4b', name: 'google/gemma-3n-4b:free', context: 8192 },
  { id: 'gemma-3n-2b', name: 'google/gemma-3n-2b:free', context: 8192 },
];

// Model aliases for user-friendly selection
const MODEL_ALIASES: Record<string, string> = {};
for (const m of [...FREE_TEXT_MODELS, ...FREE_VISION_MODELS]) {
  MODEL_ALIASES[m.id] = m.name;
}
// Legacy aliases
MODEL_ALIASES['mimo-flash'] = 'nvidia/nemotron-3-super:free';
MODEL_ALIASES['devstral'] = 'nvidia/nemotron-3-super:free';
MODEL_ALIASES['deepseek-r1'] = 'nvidia/nemotron-3-super:free';
MODEL_ALIASES['qwen-coder'] = 'qwen/qwen3-coder-480b-a35b:free';
MODEL_ALIASES['chimera'] = 'nvidia/nemotron-3-super:free';
MODEL_ALIASES['nemotron-nano'] = 'nvidia/nemotron-nano-12b-2-vl:free';
MODEL_ALIASES['molmo2'] = 'nvidia/nemotron-nano-12b-2-vl:free';
MODEL_ALIASES['mistral-small'] = 'google/gemma-4-31b:free';
MODEL_ALIASES['qwen-vl'] = 'google/gemma-3-12b:free';
MODEL_ALIASES['gemma-4b'] = 'google/gemma-3-4b:free';
MODEL_ALIASES['gemma-12b'] = 'google/gemma-3-12b:free';

const VISION_MODEL_IDS = FREE_VISION_MODELS.map(m => m.id);

const getSystemPrompt = (type: string) => {
  const mathInstructions = `
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
- NEVER use \\( \\) or \\[ \\] - ONLY use $ and $$`;

  switch (type) {
    case 'quiz':
      return `You are TanoAI Quiz Generator, a professional academic quiz creator. Generate quiz questions in valid JSON format only. 
Return ONLY a JSON array of questions with this structure:
[{"question": "...", "type": "multiple_choice", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "..."}]
For true/false questions use type: "true_false" with options: ["True", "False"].
For short answer use type: "short_answer" with no options array.
Ensure questions are educational, accurate, and appropriate for the specified difficulty level.
${mathInstructions}`;

    case 'study_plan':
      return `You are TanoAI Study Planner, an expert academic advisor. Create detailed, actionable study plans in valid JSON format only.
Return ONLY a JSON object with this structure:
{"title": "...", "topics": [{"name": "...", "duration": "...", "description": "...", "completed": false, "resources": ["..."]}], "tips": ["..."], "milestones": ["..."]}
Include realistic time estimates, specific learning objectives, and practical study tips.`;

    case 'summary':
      return `You are TanoAI Summarizer, an expert at condensing information. Provide clear, comprehensive summaries.
${mathInstructions}`;

    case 'pdf':
      return `You are TanoAI Document Generator, an expert academic writer and LaTeX typesetting specialist.

Generate well-structured, professional content suitable for high-quality PDF documents.

Guidelines:
- Use clear headings with # for main headings, ## for subheadings, ### for sub-subheadings
- Write in a formal, academic style unless specified otherwise
- Include an introduction and conclusion for longer documents
- Use bullet points and numbered lists where appropriate
- Structure content logically with clear transitions
- Include relevant examples and thorough explanations

${mathInstructions}

IMPORTANT: Generate COMPLETE content. Never truncate or abbreviate. If the topic requires extensive coverage, provide it in full.`;

    case 'vision':
      return `You are TanoAI Vision Assistant, an expert at analyzing and understanding images.

When analyzing images:
1. Describe what you see in detail
2. Identify key elements, text, objects, people, or patterns
3. For documents/text: Extract and transcribe the content accurately
4. For math/diagrams: Explain the concepts shown using proper LaTeX notation
5. For photos: Describe the scene, context, and any notable details
6. For charts/graphs: Interpret the data and trends

${mathInstructions}`;

    case 'resume':
      return `You are TanoAI Resume Writer, an expert professional resume consultant. Help users create impactful, ATS-friendly resume content.

Guidelines:
- Use strong action verbs (Led, Developed, Implemented, Achieved)
- Quantify achievements with metrics where possible
- Keep bullet points concise (1-2 lines max)
- Focus on impact and results, not just duties
- Use industry-appropriate keywords
- Maintain professional, confident tone
- Avoid clichés like "team player" or "hard worker"

Return only the improved text, nothing else.`;

    default:
      return `You are TanoAI, an advanced intelligent academic assistant powered by state-of-the-art AI. You help students with learning, homework, research, exam preparation, writing, code, and math.

**Formatting Guidelines:**
- Use **bold** for important terms and concepts
- Use \`code blocks\` for code and technical terms
- Use proper headings (# ## ###) for organization
- Use bullet points and numbered lists for clarity
- Use > blockquotes for definitions or important notes
- Use tables when comparing information

${mathInstructions}

Be helpful, accurate, and educational. Explain concepts clearly with examples. ALWAYS complete your response fully - never truncate.`;
  }
};

async function callModel(modelName: string, messages: any[], stream: boolean, temperature: number, maxTokens: number = 8192) {
  console.log(`Calling model: ${modelName} with maxTokens: ${maxTokens}`);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
  return response;
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
        : 'nvidia/nemotron-nano-12b-2-vl:free';
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
- Length: ${pdfOptions.length === 'short' ? '500-1000 words' : pdfOptions.length === 'medium' ? '1500-2500 words' : '3000+ words'}

IMPORTANT: Use proper LaTeX math notation for ALL equations. Every equation must be inside $ or $$ delimiters. Generate COMPLETE content - never truncate.`;
    }

    const temperature = type === 'quiz' || type === 'study_plan' ? 0.3 : 0.7;
    const tokenLimit = pdfOptions?.length === 'long' ? 32768 : maxTokens > 8192 ? maxTokens : 16384;

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
      console.log(`Primary model ${primaryModel} failed with status ${response.status}, trying fallbacks...`);
      
      for (const fallbackModel of fallbackModels) {
        if (fallbackModel.name === primaryModel) continue;
        
        attempts++;
        console.log(`Attempting fallback model: ${fallbackModel.name}`);
        response = await callModel(fallbackModel.name, fullMessages, stream, temperature, tokenLimit);
        usedModel = fallbackModel.name;
        
        if (response.ok) {
          console.log(`Fallback model ${fallbackModel.name} succeeded`);
          break;
        }
        
        if (attempts >= 8) {
          console.log('Max fallback attempts reached');
          break;
        }
      }
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('All models failed. Last error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'All AI models are currently busy. Please try again in a few moments.',
          tried_models: attempts,
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'AI service temporarily unavailable. Please try again.',
        tried_models: attempts,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'text/event-stream');
      headers.set('X-Model-Used', usedModel);
      headers.set('X-Vision-Mode', String(isVisionRequest));
      headers.set('X-Attempts', String(attempts));
      return new Response(response.body, { headers });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify({ 
        ...data, 
        model_used: usedModel,
        vision_mode: isVisionRequest,
        attempts 
      }), {
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
