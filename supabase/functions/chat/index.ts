import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

const MODELS = {
  'gemini-flash': 'google/gemini-2.0-flash-exp:free',
  'mistral': 'mistralai/mistral-7b-instruct:free',
  'llama': 'meta-llama/llama-3.2-3b-instruct:free',
  'gemini-pro': 'google/gemini-pro:free',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = 'gemini-flash', stream = true, type = 'chat' } = await req.json();

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const selectedModel = MODELS[model as keyof typeof MODELS] || MODELS['gemini-flash'];

    let systemPrompt = "You are TanoAI, an intelligent academic assistant. You help students with learning, studying, and academic tasks. Be helpful, clear, and educational in your responses.";

    if (type === 'quiz') {
      systemPrompt = `You are TanoAI Quiz Generator. Generate quiz questions in valid JSON format only. 
Return ONLY a JSON array of questions with this structure:
[{"question": "...", "type": "multiple_choice", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "..."}]
For true/false questions use type: "true_false" with options: ["True", "False"].
For short answer use type: "short_answer" with no options array.`;
    } else if (type === 'study_plan') {
      systemPrompt = `You are TanoAI Study Planner. Create detailed study plans in valid JSON format only.
Return ONLY a JSON object with this structure:
{"title": "...", "topics": [{"name": "...", "duration": "...", "description": "...", "completed": false}], "tips": ["..."]}`;
    } else if (type === 'summary') {
      systemPrompt = "You are TanoAI Summarizer. Provide clear, concise summaries with key points. Use bullet points for main ideas and highlight important concepts.";
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tanoai.lovable.app',
        'X-Title': 'TanoAI',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream,
        max_tokens: 4096,
        temperature: type === 'quiz' || type === 'study_plan' ? 0.3 : 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
