// chat-tools edge function
// Three sub-tools, picked via { tool: 'router' | 'image' | 'pdf' } in the body.
// All use Lovable AI Gateway (no extra API key needed).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUCKET = "chat-attachments";

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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
      { error: "AI credits exhausted. Add credits in workspace settings." },
      402
    );
  return jsonResponse({ error: "AI gateway error" }, 500);
}

// ---------- 1. INTENT ROUTER (tool calling) ----------

async function runRouter(userMessage: string, hasImages: boolean) {
  // If images attached, always treat as vision text — never auto-generate image.
  if (hasImages) {
    return { intent: "text", explanation: "", title: "", prompt: "" };
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "decide_action",
        description:
          "Decide whether to reply with text only, generate an image, or generate a PDF document. Pick the single best action for the user's last message.",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["text", "image", "pdf"],
              description:
                "text = normal chat answer. image = the user wants a picture/illustration/diagram drawn or visualized. pdf = the user explicitly wants a downloadable document/report/notes/assignment.",
            },
            image_prompt: {
              type: "string",
              description:
                "If intent=image: a vivid, detailed visual prompt (English) for an image generator. Empty otherwise.",
            },
            explanation: {
              type: "string",
              description:
                "If intent=image: a beautiful 2-4 sentence explanation in markdown that will be shown alongside the generated image. Empty otherwise.",
            },
            pdf_title: {
              type: "string",
              description:
                "If intent=pdf: short title for the document. Empty otherwise.",
            },
            pdf_topic: {
              type: "string",
              description:
                "If intent=pdf: the topic / instructions for the document. Empty otherwise.",
            },
          },
          required: ["intent"],
          additionalProperties: false,
        },
      },
    },
  ];

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an intent router. Pick exactly ONE action. Choose 'image' only when the user clearly wants a picture, illustration, drawing, diagram, photo or visual. Choose 'pdf' only when the user clearly asks for a document/file/PDF/report/notes/assignment they can download. Otherwise choose 'text'. Never explain — just call the tool.",
        },
        { role: "user", content: userMessage.slice(0, 2000) },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "decide_action" } },
    }),
  });

  if (!res.ok) {
    console.error("router gateway error", res.status, await res.text());
    return { intent: "text", explanation: "", title: "", prompt: "" };
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return { intent: "text", explanation: "", title: "", prompt: "" };
  try {
    const args = JSON.parse(call.function.arguments || "{}");
    return {
      intent: (args.intent as "text" | "image" | "pdf") || "text",
      explanation: args.explanation || "",
      title: args.pdf_title || "",
      prompt: args.image_prompt || args.pdf_topic || "",
    };
  } catch {
    return { intent: "text", explanation: "", title: "", prompt: "" };
  }
}

// ---------- 2. IMAGE GENERATION ----------

async function runImage(
  userId: string,
  prompt: string,
  inputImage?: string // optional base64 data URL for editing
) {
  const userContent: any[] = [
    {
      type: "text",
      text:
        (inputImage ? "Edit this image: " : "Generate an image: ") +
        prompt.slice(0, 1500),
    },
  ];
  if (inputImage) {
    userContent.push({
      type: "image_url",
      image_url: { url: inputImage },
    });
  }

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: userContent }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) throw new Error(`image gateway ${res.status}`);
  const data = await res.json();
  const dataUrl: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    throw new Error("No image returned");
  }
  // data:image/png;base64,XXXX
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Bad image data url");
  const mime = match[1];
  const ext = mime.split("/")[1].split("+")[0] || "png";
  const bytes = base64ToBytes(match[2]);
  const url = await uploadToBucket(userId, `image.${ext}`, bytes, mime);
  return { url, mime };
}

// ---------- 3. PDF (HTML) GENERATION ----------

const PDF_SYSTEM_PROMPT = `You are an HTML-to-PDF document engine. Output ONLY raw HTML.
Start with <!DOCTYPE html>, end with </html>. No markdown, no fences, no commentary.
Single <style> block. A4 page. Times New Roman 12pt. No <table>, no flexbox/grid, no JS, no images.
Convert any math to plain unicode (², ³, π, ≤, ≥, ≈, ∫, Σ, √). Replace tabular data with bullet lists.
Required sections in order: Title (h1, centered), Subtitle (1-line italic), Introduction, Core Concepts, Detailed Explanation, Key Points (bullets), Practical Examples, Conclusion.
Justified paragraphs, 4–7 sentences each, 4–6 sections total.`;

async function runPdf(userId: string, title: string, topic: string) {
  const safeTitle = (title || "Document").slice(0, 120);
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: PDF_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Title: ${safeTitle}\nTopic: ${topic.slice(0, 4000)}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`pdf gateway ${res.status}`);
  const data = await res.json();
  let html: string = data?.choices?.[0]?.message?.content || "";
  // strip code fences if any
  html = html
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!/<html[\s>]/i.test(html)) {
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safeTitle}</title><style>@page{size:A4;margin:1in}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.6;color:#000}h1{text-align:center}p{text-align:justify;margin:0 0 10px}</style></head><body><h1>${safeTitle}</h1>${html}</body></html>`;
  }

  const fileName = `${safeTitle.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "document"}.html`;
  const url = await uploadToBucket(userId, fileName, html, "text/html; charset=utf-8");
  return { url, title: safeTitle };
}

// ---------- main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const tool = body?.tool as "router" | "image" | "pdf";

    if (tool === "router") {
      const result = await runRouter(
        String(body?.message || ""),
        Boolean(body?.hasImages)
      );
      return jsonResponse(result);
    }

    // image and pdf require auth
    const userId = await getUserIdFromAuth(req);
    if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

    if (tool === "image") {
      const prompt = String(body?.prompt || "").trim();
      if (!prompt) return jsonResponse({ error: "prompt required" }, 400);
      try {
        const out = await runImage(userId, prompt, body?.inputImage);
        return jsonResponse(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429/.test(msg)) return errorFromGateway(429);
        if (/402/.test(msg)) return errorFromGateway(402);
        console.error("image error:", msg);
        return jsonResponse({ error: "Image generation failed" }, 500);
      }
    }

    if (tool === "pdf") {
      const topic = String(body?.topic || body?.prompt || "").trim();
      if (!topic) return jsonResponse({ error: "topic required" }, 400);
      try {
        const out = await runPdf(userId, String(body?.title || ""), topic);
        return jsonResponse(out);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429/.test(msg)) return errorFromGateway(429);
        if (/402/.test(msg)) return errorFromGateway(402);
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