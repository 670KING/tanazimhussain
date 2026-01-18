import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// All FREE models with fallback order - best performers first
const FREE_MODELS = [
  { id: 'mimo-flash', name: 'xiaomi/mimo-v2-flash:free', context: 262000 },
  { id: 'devstral', name: 'mistralai/devstral-2-2512:free', context: 262000 },
  { id: 'deepseek-r1', name: 'deepseek/deepseek-r1-0528:free', context: 164000 },
  { id: 'qwen-coder', name: 'qwen/qwen3-coder-480b-a35b:free', context: 262000 },
  { id: 'glm-air', name: 'z-ai/glm-4.5-air:free', context: 131000 },
  { id: 'chimera-r1t2', name: 'tngtech/deepseek-r1t2-chimera:free', context: 164000 },
  { id: 'chimera-r1t', name: 'tngtech/deepseek-r1t-chimera:free', context: 164000 },
  { id: 'tng-chimera', name: 'tngtech/r1t-chimera:free', context: 164000 },
];

// Model aliases for user-friendly selection
const MODEL_ALIASES: Record<string, string> = {
  'mimo-flash': 'xiaomi/mimo-v2-flash:free',
  'devstral': 'mistralai/devstral-2-2512:free',
  'deepseek-r1': 'deepseek/deepseek-r1-0528:free',
  'qwen-coder': 'qwen/qwen3-coder-480b-a35b:free',
  'glm-air': 'z-ai/glm-4.5-air:free',
  'chimera': 'tngtech/deepseek-r1t2-chimera:free',
  // Legacy aliases for backward compatibility
  'gemini-flash': 'xiaomi/mimo-v2-flash:free',
  'mistral': 'mistralai/devstral-2-2512:free',
  'llama': 'qwen/qwen3-coder-480b-a35b:free',
  'gemini-pro': 'deepseek/deepseek-r1-0528:free',
};

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
    default:
      return `You are TanoAI, an advanced intelligent academic assistant. You help students with:
• Learning and understanding complex topics
• Homework and assignment assistance
• Research and study strategies
• Exam preparation
• Writing and analysis

Be helpful, accurate, and educational. Explain concepts clearly and provide examples when helpful. 
Always encourage learning and critical thinking. Format responses with markdown for better readability.`;
  }
};

async function callModel(modelName: string, messages: any[], stream: boolean, temperature: number) {
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
      max_tokens: 8192,
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
    const { messages, model = 'mimo-flash', stream = true, type = 'chat' } = await req.json();

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Get the primary model
    let primaryModel = MODEL_ALIASES[model] || MODEL_ALIASES['mimo-flash'];
    const systemPrompt = getSystemPrompt(type);
    const temperature = type === 'quiz' || type === 'study_plan' ? 0.3 : 0.7;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Try primary model first
    let response = await callModel(primaryModel, fullMessages, stream, temperature);
    let usedModel = primaryModel;
    let attempts = 1;

    // Auto-fallback: if primary fails, try other models
    if (!response.ok) {
      console.log(`Primary model ${primaryModel} failed with status ${response.status}, trying fallbacks...`);
      
      for (const fallbackModel of FREE_MODELS) {
        if (fallbackModel.name === primaryModel) continue;
        
        attempts++;
        console.log(`Attempting fallback model: ${fallbackModel.name}`);
        response = await callModel(fallbackModel.name, fullMessages, stream, temperature);
        usedModel = fallbackModel.name;
        
        if (response.ok) {
          console.log(`Fallback model ${fallbackModel.name} succeeded`);
          break;
        }
        
        // Limit fallback attempts to prevent excessive retries
        if (attempts >= 4) {
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
      // Add model info header for client
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'text/event-stream');
      headers.set('X-Model-Used', usedModel);
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
      suggestion: 'Please check your internet connection and try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
