import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// All FREE text models with fallback order
const FREE_TEXT_MODELS = [
  { id: 'mimo-flash', name: 'xiaomi/mimo-v2-flash:free', context: 262000 },
  { id: 'devstral', name: 'mistralai/devstral-2-2512:free', context: 262000 },
  { id: 'deepseek-r1', name: 'deepseek/deepseek-r1-0528:free', context: 164000 },
  { id: 'qwen-coder', name: 'qwen/qwen3-coder-480b-a35b:free', context: 262000 },
  { id: 'glm-air', name: 'z-ai/glm-4.5-air:free', context: 131000 },
  { id: 'chimera-r1t2', name: 'tngtech/deepseek-r1t2-chimera:free', context: 164000 },
  { id: 'chimera-r1t', name: 'tngtech/deepseek-r1t-chimera:free', context: 164000 },
  { id: 'tng-chimera', name: 'tngtech/r1t-chimera:free', context: 164000 },
];

// FREE Vision models (can analyze images)
const FREE_VISION_MODELS = [
  { id: 'nemotron-nano', name: 'nvidia/nemotron-nano-12b-2-vl:free', context: 128000 },
  { id: 'molmo2', name: 'allenai/molmo2-8b:free', context: 37000 },
  { id: 'mistral-small', name: 'mistralai/mistral-small-3.1-24b:free', context: 128000 },
  { id: 'qwen-vl', name: 'qwen/qwen-2.5-vl-7b-instruct:free', context: 33000 },
  { id: 'gemma-4b', name: 'google/gemma-3-4b:free', context: 33000 },
  { id: 'gemma-12b', name: 'google/gemma-3-12b:free', context: 33000 },
];

// Model aliases for user-friendly selection
const MODEL_ALIASES: Record<string, string> = {
  // Text models
  'mimo-flash': 'xiaomi/mimo-v2-flash:free',
  'devstral': 'mistralai/devstral-2-2512:free',
  'deepseek-r1': 'deepseek/deepseek-r1-0528:free',
  'qwen-coder': 'qwen/qwen3-coder-480b-a35b:free',
  'glm-air': 'z-ai/glm-4.5-air:free',
  'chimera': 'tngtech/deepseek-r1t2-chimera:free',
  // Vision models
  'nemotron-nano': 'nvidia/nemotron-nano-12b-2-vl:free',
  'molmo2': 'allenai/molmo2-8b:free',
  'mistral-small': 'mistralai/mistral-small-3.1-24b:free',
  'qwen-vl': 'qwen/qwen-2.5-vl-7b-instruct:free',
  'gemma-4b': 'google/gemma-3-4b:free',
  'gemma-12b': 'google/gemma-3-12b:free',
  // Legacy aliases
  'gemini-flash': 'xiaomi/mimo-v2-flash:free',
  'mistral': 'mistralai/devstral-2-2512:free',
  'llama': 'qwen/qwen3-coder-480b-a35b:free',
};

const VISION_MODEL_IDS = ['nemotron-nano', 'molmo2', 'mistral-small', 'qwen-vl', 'gemma-4b', 'gemma-12b'];

const getSystemPrompt = (type: string) => {
  switch (type) {
    case 'quiz':
      return `You are TanoAI Quiz Generator, a professional academic quiz creator. Generate quiz questions in valid JSON format only. 
Return ONLY a JSON array of questions with this structure:
[{"question": "...", "type": "multiple_choice", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "..."}]
For true/false questions use type: "true_false" with options: ["True", "False"].
For short answer use type: "short_answer" with no options array.
Ensure questions are educational, accurate, and appropriate for the specified difficulty level.`;

    case 'study_plan':
      return `You are TanoAI Study Planner, an expert academic advisor. Create detailed, actionable study plans in valid JSON format only.
Return ONLY a JSON object with this structure:
{"title": "...", "topics": [{"name": "...", "duration": "...", "description": "...", "completed": false, "resources": ["..."]}], "tips": ["..."], "milestones": ["..."]}
Include realistic time estimates, specific learning objectives, and practical study tips.`;

    case 'summary':
      return `You are TanoAI Summarizer, an expert at condensing information. Provide clear, comprehensive summaries with:
• Key points in bullet format
• Main concepts highlighted
• Important details preserved
• Logical organization
• Easy-to-understand language
Focus on accuracy and clarity while maintaining the essential meaning.`;

    case 'pdf':
      return `You are TanoAI Document Generator, an expert academic writer. Generate well-structured, professional content suitable for PDF documents.

Guidelines:
- Use clear headings and subheadings (use # for main headings, ## for subheadings)
- Write in a formal, academic style unless specified otherwise
- Include an introduction and conclusion
- Use bullet points and numbered lists where appropriate
- Ensure content is factually accurate and well-researched
- Structure content logically with clear transitions
- Include relevant examples and explanations
- Format for easy reading with proper paragraphs

Generate comprehensive, publication-ready content.`;

    case 'vision':
      return `You are TanoAI Vision Assistant, an expert at analyzing and understanding images. When analyzing images:

1. Describe what you see in detail
2. Identify key elements, text, objects, people, or patterns
3. For documents/text: Extract and transcribe the content accurately
4. For math/diagrams: Explain the concepts shown
5. For photos: Describe the scene, context, and any notable details
6. For charts/graphs: Interpret the data and trends

Be thorough, accurate, and helpful in your analysis.`;

    default:
      return `You are TanoAI, an advanced intelligent academic assistant powered by state-of-the-art AI. You help students with:

• Learning and understanding complex topics
• Homework and assignment assistance  
• Research and study strategies
• Exam preparation
• Writing and analysis
• Code explanation and debugging
• Math problem solving

**Formatting Guidelines:**
- Use **bold** for important terms and concepts
- Use \`code blocks\` for code, formulas, and technical terms
- Use proper headings (# ## ###) for organization
- Use bullet points and numbered lists for clarity
- Use > blockquotes for definitions or important notes
- Use tables when comparing information
- For math equations, use LaTeX: $inline$ or $$block$$

**Math Examples:**
- Inline: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$
- Block equation:
$$
\\int_{a}^{b} f(x) dx = F(b) - F(a)
$$

Be helpful, accurate, and educational. Explain concepts clearly with examples. 
Always encourage learning and critical thinking.`;
  }
};

async function callModel(modelName: string, messages: any[], stream: boolean, temperature: number, maxTokens: number = 8192) {
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
      model = 'mimo-flash', 
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
    
    // Select appropriate model based on request type
    let primaryModel: string;
    let fallbackModels: typeof FREE_TEXT_MODELS;
    
    if (isVisionRequest) {
      // Use vision model for image analysis
      primaryModel = MODEL_ALIASES[model] && VISION_MODEL_IDS.includes(model) 
        ? MODEL_ALIASES[model] 
        : 'nvidia/nemotron-nano-12b-2-vl:free';
      fallbackModels = FREE_VISION_MODELS;
    } else {
      // Use text model
      primaryModel = MODEL_ALIASES[model] || MODEL_ALIASES['mimo-flash'];
      fallbackModels = FREE_TEXT_MODELS;
    }

    // Get system prompt based on type
    let systemPrompt = getSystemPrompt(type);
    
    // Enhance system prompt for PDF generation
    if (pdfOptions) {
      systemPrompt += `\n\nDocument Requirements:
- Title: ${pdfOptions.title || 'Untitled'}
- Type: ${pdfOptions.type}
- Style: ${pdfOptions.style}
- Length: ${pdfOptions.length === 'short' ? '500-1000 words' : pdfOptions.length === 'medium' ? '1500-2500 words' : '3000+ words'}`;
    }

    const temperature = type === 'quiz' || type === 'study_plan' ? 0.3 : 0.7;
    const tokenLimit = pdfOptions?.length === 'long' ? 16384 : maxTokens;

    // Build messages with images if present
    let fullMessages: any[];
    
    if (hasImages) {
      // Format messages with images for vision models
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

    // Try primary model first
    let response = await callModel(primaryModel, fullMessages, stream, temperature, tokenLimit);
    let usedModel = primaryModel;
    let attempts = 1;

    // Auto-fallback: if primary fails, try other models
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
        
        // Limit fallback attempts
        if (attempts >= 5) {
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
          error: 'All AI models are currently rate limited. Please try again in a few moments.',
          tried_models: attempts
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'AI service temporarily unavailable. Please try again.',
        tried_models: attempts
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
      return new Response(response.body, { headers });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify({ 
        ...data, 
        model_used: usedModel,
        vision_mode: isVisionRequest 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please check your internet connection and try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
