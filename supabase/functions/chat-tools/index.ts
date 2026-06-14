// chat-tools edge function
// Sub-tools picked via { tool: 'router' | 'pdf' | 'chart' }.
// All powered by OpenRouter free models (no Lovable Gateway, no image gen).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processPdfHtml } from "./sanitizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const BUCKET = "chat-attachments";

// Free OpenRouter models (text-only) — small + fast for routing/PDF.
const ROUTER_MODEL = "openai/gpt-oss-120b:free";
const PDF_MODEL_PRIMARY = "openai/gpt-oss-120b:free";
const PDF_MODEL_FALLBACKS = [
  "tencent/hy3-preview:free",
  "inclusionai/ling-2.6-1t:free",
  "google/gemma-4-31b-it:free",
];
const CHART_MODEL = "openai/gpt-oss-120b:free";
const CHART_FALLBACKS = ["google/gemma-4-31b-it:free"];

// ---------- helpers ----------

async function getUserIdFromAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ?? null;
  } catch {
    return null;
  }
}

async function uploadToBucket(
  userId: string,
  fileName: string,
  body: Uint8Array | string,
  contentType: string
): Promise<string> {
  const path = `${userId}/${Date.now()}-${fileName}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: body instanceof Uint8Array ? body : new TextEncoder().encode(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${t}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorFromGateway(status: number): Response {
  if (status === 429)
    return jsonResponse(
      { error: "Rate limit reached, please try again in a moment." },
      429
    );
  if (status === 402)
    return jsonResponse(
      { error: "AI provider credits exhausted." },
      402
    );
  return jsonResponse({ error: "AI provider error" }, 500);
}

async function callOpenRouter(
  model: string,
  body: Record<string, unknown>
): Promise<Response> {
  return await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://tanoedu-ai.web.app",
      "X-Title": "Tanoedu AI",
    },
    body: JSON.stringify({ model, ...body }),
  });
}

async function callWithFallbacks(
  models: string[],
  body: Record<string, unknown>
): Promise<Response> {
  let lastErr = 0;
  for (const m of models) {
    const res = await callOpenRouter(m, body);
    if (res.ok) return res;
    lastErr = res.status;
    console.warn(`[chat-tools] model ${m} failed: ${res.status}`);
  }
  return new Response("all models failed", { status: lastErr || 500 });
}

// ---------- 1. INTENT ROUTER (tool calling) ----------

async function runRouter(userMessage: string, hasImages: boolean) {
  // If images attached, always treat as vision text.
  if (hasImages) {
    return { intent: "text", explanation: "", title: "", prompt: "", chart: null as any };
  }

  // Lightweight keyword pre-check — saves a model call for obvious cases.
  const lower = userMessage.toLowerCase();
  const wantsChart = /\b(chart|graph|plot|bar\s*graph|line\s*graph|pie\s*chart|histogram|visuali[sz]e|trend)\b/.test(lower);
  const wantsPdf = /\b(pdf|document|report|notes?|assignment|essay|paper|download|export|print)\b/.test(lower);

  // Use tool-calling on the small free model to decide.
  const tools = [
    {
      type: "function",
      function: {
        name: "decide_action",
        description:
          "Decide the single best action for the user's last message.",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["text", "pdf", "chart"],
              description:
                "text = normal chat. pdf = user explicitly wants a downloadable document/report/notes/assignment. chart = user wants data visualised as a graph/chart/plot.",
            },
            pdf_title: { type: "string" },
            pdf_topic: { type: "string" },
            chart_topic: { type: "string" },
          },
          required: ["intent"],
          additionalProperties: false,
        },
      },
    },
  ];

  const res = await callOpenRouter(ROUTER_MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You are an intent router. Pick exactly ONE action. Use 'chart' only when the user clearly wants a graph/chart/plot/visualisation of data. Use 'pdf' only when the user clearly asks for a document/file/report/notes/assignment they can download. Otherwise 'text'. Never explain — only call the tool.",
      },
      { role: "user", content: userMessage.slice(0, 2000) },
    ],
    tools,
    tool_choice: { type: "function", function: { name: "decide_action" } },
    max_tokens: 200,
    temperature: 0,
  });

  let intent: "text" | "pdf" | "chart" = wantsChart ? "chart" : wantsPdf ? "pdf" : "text";
  let title = "";
  let prompt = userMessage;

  if (res.ok) {
    try {
      const data = await res.json();
      const call = data?.choices?.[0]?.message?.tool_calls?.[0];
      if (call) {
        const args = JSON.parse(call.function.arguments || "{}");
        if (args.intent === "pdf" || args.intent === "chart" || args.intent === "text") {
          intent = args.intent;
        }
        title = args.pdf_title || "";
        prompt = args.pdf_topic || args.chart_topic || userMessage;
      }
    } catch (e) {
      console.warn("[router] parse failed, using keyword heuristic", e);
    }
  } else {
    console.warn("[router] model failed, using keyword heuristic", res.status);
  }

  return { intent, explanation: "", title, prompt, chart: null };
}

// ---------- 2. PDF (HTML) GENERATION with 3 templates ----------

type PdfTemplate = "academic" | "modern" | "minimal";

// ---- Shared print/PDF stylesheet ------------------------------------------
// Locks page geometry, side margins and page-break rules so the layout is
// IDENTICAL between the in-app preview and the downloaded PDF. The body is
// pinned to A4 width (794px @96dpi) and centred with generous side padding,
// so text always sits in the middle with breathing room on the sides.
const BASE_PRINT_CSS = `@page{size:A4;margin:0}
*{box-sizing:border-box}
html{margin:0;padding:0;background:#fff}
body{width:794px;margin:0 auto;padding:28px 76px;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3{page-break-after:avoid;break-after:avoid}
section{page-break-inside:avoid;break-inside:avoid}
p{orphans:3;widows:3}
li{page-break-inside:avoid;break-inside:avoid}
.highlight,.diagram,pre,figure,table{page-break-inside:avoid;break-inside:avoid}
img{max-width:100%;height:auto}
`;

function templateCss(template: PdfTemplate): string {
  if (template === "modern") {
    return `${BASE_PRINT_CSS}
      body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11.5pt;line-height:1.6;color:#1a1a1a}
      h1{font-size:26pt;color:#0b5fff;margin:0 0 6px;letter-spacing:-.01em}
      .subtitle{color:#666;font-size:11pt;margin-bottom:22px}
      h2{font-size:16pt;color:#0b5fff;margin:22px 0 8px;border-bottom:2px solid #0b5fff;padding-bottom:4px;page-break-after:avoid}
      h3{font-size:12.5pt;color:#222;margin:14px 0 4px;page-break-after:avoid}
      p{margin:0 0 9px;text-align:left;orphans:3;widows:3}
      ul,ol{margin:6px 0 12px 24px}
      li{margin-bottom:4px}
      section{page-break-inside:avoid;margin-bottom:14px}
      .highlight{background:#eef4ff;border-left:4px solid #0b5fff;padding:10px 14px;margin:14px 0;border-radius:4px}
      .diagram{background:#f7f9fc;border:1px solid #d6e0f0;padding:12px;margin:14px auto;text-align:center}
      .diagram pre{font-family:"Courier New",monospace;font-size:10pt;white-space:pre;margin:0;display:inline-block;text-align:left}`;
  }
  if (template === "minimal") {
    return `${BASE_PRINT_CSS}
      body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11pt;line-height:1.7;color:#000}
      h1{font-size:20pt;font-weight:300;letter-spacing:1px;text-align:center;margin:0 0 4px;text-transform:uppercase}
      .subtitle{text-align:center;font-size:10pt;color:#555;margin-bottom:30px;font-style:italic}
      h2{font-size:13pt;font-weight:600;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.5px;page-break-after:avoid}
      h3{font-size:11.5pt;font-weight:600;margin:12px 0 4px;page-break-after:avoid}
      p{margin:0 0 9px;text-align:justify;orphans:3;widows:3}
      ul,ol{margin:6px 0 12px 22px}
      li{margin-bottom:4px}
      section{page-break-inside:avoid;margin-bottom:16px}
      .highlight{border-top:1px solid #000;border-bottom:1px solid #000;padding:10px 0;margin:14px 0;font-style:italic}
      .diagram{padding:12px;margin:14px auto;text-align:center}
      .diagram pre{font-family:"Courier New",monospace;font-size:10pt;white-space:pre;margin:0;display:inline-block;text-align:left}`;
  }
  // academic (default)
  return `${BASE_PRINT_CSS}
    body{font-family:"Times New Roman",Georgia,serif;font-size:12pt;line-height:1.6;color:#111}
    h1{text-align:center;font-size:24pt;margin:0 0 8px;page-break-after:avoid}
    .subtitle{text-align:center;font-size:11pt;color:#555;margin-bottom:22px;font-style:italic}
    h2{font-size:15pt;margin-top:22px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ddd;page-break-after:avoid}
    h3{font-size:12pt;margin-top:14px;margin-bottom:6px;page-break-after:avoid}
    p{text-align:justify;margin:0 0 10px;orphans:3;widows:3}
    ul,ol{margin:6px 0 12px 22px}
    li{margin-bottom:5px}
    section{page-break-inside:avoid;margin-bottom:16px}
    .highlight{background:#f5f5f5;border-left:4px solid #333;padding:10px 14px;margin:14px 0}
    .diagram{background:#fafafa;border:1px solid #ccc;padding:12px;margin:14px auto;text-align:center}
    .diagram pre{font-family:"Courier New",monospace;font-size:10pt;white-space:pre;margin:0;display:inline-block;text-align:left}`;
}

function pickTemplateFromTopic(topic: string): PdfTemplate {
  const t = topic.toLowerCase();
  if (/\b(business|startup|product|marketing|design|portfolio|brand)\b/.test(t)) return "modern";
  if (/\b(minimal|clean|simple|short|essay|memo|letter)\b/.test(t)) return "minimal";
  return "academic";
}

const PDF_SYSTEM_BASE = `You are the core document processing engine for Tanoedu AI. Transform raw user input into a flawless, professionally structured, error-free document optimized for PDF.

STRICT RULES:
- Flawless grammar, spelling, and syntax. Natural, articulate, easy-to-read prose.
- Perfect visual hierarchy: ONE <h1> (main topic), <h2> for sections, <h3> for subsections.
- Break long text into concise paragraphs (3–6 sentences). Use <ul>/<ol> for any list of items, steps, or features.
- Zero fluff: NO "Here is...", NO intros, NO conversational filler, NO concluding meta-remarks.
- Output ONLY the inner HTML of <body>. NO <!DOCTYPE>, <html>, <head>, <body>, <style>, <script>, markdown fences, or commentary.

ALLOWED TAGS ONLY: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <section>, <div class="highlight">, <div class="diagram"><pre>...</pre></div>, <strong>, <em>.
FORBIDDEN: <table>, <img>, <svg>, <script>, <style>, flexbox/grid/position/transforms, LaTeX (\\frac, \\sum, $...$, $$...$$), markdown (#, **, \`\`\`).
Convert math to plain unicode (² ³ π ≤ ≥ ≈ ∫ Σ √ × ÷). Convert tabular data to bullet lists.

STRUCTURE:
1. One <h1> with the main topic.
2. One <div class="subtitle"> one-line summary.
3. 4–8 <section> blocks. Each starts with <h2>, then well-developed <p> paragraphs and lists.
4. At least one <div class="highlight"> for a key insight.
5. Use <div class="diagram"><pre>ASCII ≤70 cols</pre></div> only when describing a process/system.
6. Always end with a Conclusion section.

Keep spacing consistent. Make content COMPLETE — never truncate.`;

async function runPdf(
  title: string,
  topic: string,
  template: PdfTemplate,
  length: "short" | "medium" | "long" = "medium"
) {
  const safeTitle = (title || topic.slice(0, 80) || "Document").replace(/[<>&]/g, "").slice(0, 120);
  const lengthHint =
    length === "short" ? "4 sections, ~2 paragraphs each" :
    length === "long"  ? "7-8 sections, ~3-4 paragraphs each" :
                        "5-6 sections, ~3 paragraphs each";

  const res = await callWithFallbacks([PDF_MODEL_PRIMARY, ...PDF_MODEL_FALLBACKS], {
    messages: [
      { role: "system", content: PDF_SYSTEM_BASE },
      {
        role: "user",
        content: `Title: ${safeTitle}\nTopic: ${topic.slice(0, 4000)}\nLength: ${lengthHint}`,
      },
    ],
    max_tokens: length === "long" ? 16000 : length === "short" ? 4000 : 9000,
    temperature: 0.4,
    stream: false,
  });

  if (!res.ok) throw new Error(`pdf openrouter ${res.status}`);
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content || "";

  let { html: bodyHtml, validation } = processPdfHtml(raw, safeTitle);

  if (!bodyHtml || bodyHtml.length < 80) {
    bodyHtml = `<h1>${safeTitle}</h1><section><p>Document generation produced no content. Please try again.</p></section>`;
    validation = { ok: true, reasons: [], stats: { h1: 1, h2: 0, sections: 1, paragraphs: 1, lists: 0 } };
  }
  if (!validation.ok) {
    console.warn("[pdf] validation issues:", validation.reasons);
  }

  // Extract actual title from the first <h1> tag in the generated HTML body if possible
  const h1Match = bodyHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const extractedTitle = h1Match 
    ? h1Match[1].replace(/<[^>]*>/g, "").trim().slice(0, 100) 
    : safeTitle;

  const css = templateCss(template);
  const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${extractedTitle}</title><style>${css}</style></head><body>${bodyHtml}</body></html>`;

  return { html: fullHtml, title: extractedTitle, template };
}

// ---------- 3. CHART GENERATION (JSON spec for Recharts) ----------

async function runChart(prompt: string) {
  const tools = [
    {
      type: "function",
      function: {
        name: "build_chart",
        description: "Produce data + config for a chart that answers the user's request.",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["bar", "line", "pie", "area"] },
            title: { type: "string" },
            xKey: { type: "string", description: "Field name for x-axis labels (e.g. 'name')." },
            yKeys: {
              type: "array",
              items: { type: "string" },
              description: "Numeric field names to plot as series.",
            },
            data: {
              type: "array",
              description: "Array of points, max 24 items. Each item is an object with xKey + yKeys.",
              items: { type: "object" },
            },
            explanation: {
              type: "string",
              description: "1-3 sentence markdown explanation of what the chart shows.",
            },
          },
          required: ["type", "title", "xKey", "yKeys", "data"],
          additionalProperties: false,
        },
      },
    },
  ];

  const res = await callWithFallbacks([CHART_MODEL, ...CHART_FALLBACKS], {
    messages: [
      {
        role: "system",
        content:
          "You generate chart specifications. If the user provides data, use it exactly. If they only describe a topic (e.g. 'plot world population growth'), invent a small realistic illustrative dataset and clearly say so in the explanation. Always pick the most appropriate chart type. Keep data points ≤ 24. Never include nulls.",
      },
      { role: "user", content: prompt.slice(0, 4000) },
    ],
    tools,
    tool_choice: { type: "function", function: { name: "build_chart" } },
    max_tokens: 1500,
    temperature: 0.2,
    stream: false,
  });

  if (!res.ok) throw new Error(`chart openrouter ${res.status}`);
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No chart tool call");
  const args = JSON.parse(call.function.arguments || "{}");
  return {
    chart: {
      type: args.type,
      title: args.title,
      xKey: args.xKey,
      yKeys: args.yKeys,
      data: Array.isArray(args.data) ? args.data.slice(0, 24) : [],
    },
    explanation: args.explanation || "",
  };
}

// ---------- main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const body = await req.json();
    const tool = body?.tool as "router" | "pdf" | "chart";

    if (tool === "router") {
      const result = await runRouter(
        String(body?.message || ""),
        Boolean(body?.hasImages)
      );
      return jsonResponse(result);
    }

    if (tool === "chart") {
      const prompt = String(body?.prompt || body?.message || "").trim();
      if (!prompt) return jsonResponse({ error: "prompt required" }, 400);
      try {
        const out = await runChart(prompt);
        return jsonResponse(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429/.test(msg)) return errorFromGateway(429);
        console.error("chart error:", msg);
        return jsonResponse({ error: "Chart generation failed" }, 500);
      }
    }

    if (tool === "pdf") {
      const topic = String(body?.topic || body?.prompt || "").trim();
      if (!topic) return jsonResponse({ error: "topic required" }, 400);
      const reqTpl = String(body?.template || "").toLowerCase();
      const template: PdfTemplate =
        reqTpl === "academic" || reqTpl === "modern" || reqTpl === "minimal"
          ? (reqTpl as PdfTemplate)
          : pickTemplateFromTopic(topic);
      const length = (String(body?.length || "medium") as "short" | "medium" | "long");
      try {
        const out = await runPdf(String(body?.title || ""), topic, template, length);
        return jsonResponse(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429/.test(msg)) return errorFromGateway(429);
        console.error("pdf error:", msg);
        return jsonResponse({ error: "PDF generation failed" }, 500);
      }
    }

    return jsonResponse({ error: "unknown tool" }, 400);
  } catch (e) {
    console.error("chat-tools fatal:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});