/**
 * parse-task — Natural-language → structured recurring task
 *
 * POST body: { text: string }
 * Returns:   { title, description, frequency_type, frequency_days,
 *              anchor_date, time_of_day, category }
 *
 * Uses Anthropic Claude if ANTHROPIC_API_KEY is set and has credits.
 * Falls back to OpenAI gpt-4o-mini if OPENAI_API_KEY is set.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface ParsedTask {
  title: string;
  description: string | null;
  frequency_type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  frequency_days: number;
  anchor_date: string | null;
  time_of_day: string | null;
  category: string | null;
}

function buildPrompt(text: string, today: string): string {
  return `You are a household task scheduling assistant. Parse the following natural-language task request into a structured recurring task.

Today's date: ${today}

User input: "${text}"

Valid frequency_type values:
- "daily"   → every day            (frequency_days = 1)
- "weekly"  → every 7 days         (frequency_days = 7)
- "monthly" → every 30 days        (frequency_days = 30)
- "yearly"  → every 365 days       (frequency_days = 365)
- "custom"  → any other interval   (set frequency_days to the best number)

Season-to-anchor_date mapping (use current or next occurrence relative to ${today}):
- Spring → ${today.slice(0, 4)}-03-20
- Summer → ${today.slice(0, 4)}-06-21
- Fall   → ${today.slice(0, 4)}-09-22
- Winter → ${today.slice(0, 4)}-12-21

Valid category values (pick the best fit or null):
"home_maintenance", "yard_and_garden", "cleaning", "errands", "finances",
"health", "vehicles", "pets", "seasonal", "other"

Respond ONLY with a JSON object (no markdown):
{
  "title": "Short imperative title (e.g. 'Clean gutters')",
  "description": "Optional extra detail or null",
  "frequency_type": "daily|weekly|monthly|yearly|custom",
  "frequency_days": <integer>,
  "anchor_date": "YYYY-MM-DD or null",
  "time_of_day": "e.g. '9:00 AM' or null",
  "category": "category_value or null"
}`;
}

async function callAnthropic(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? `Anthropic error ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "{}";
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? `OpenAI error ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    const text = (body.text as string)?.trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const prompt = buildPrompt(text, today);

    let rawText: string;

    // Try Anthropic first; fall back to OpenAI if Anthropic fails
    if (ANTHROPIC_API_KEY) {
      try {
        rawText = await callAnthropic(prompt);
      } catch (anthropicErr: any) {
        if (!OPENAI_API_KEY) throw anthropicErr;
        // Anthropic failed (e.g. low credits) — try OpenAI
        rawText = await callOpenAI(prompt);
      }
    } else {
      rawText = await callOpenAI(prompt);
    }

    let parsed: ParsedTask;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (!parsed?.title) throw new Error("Missing title");
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    const validFreqs = ["daily", "weekly", "monthly", "yearly", "custom"] as const;
    const freqType = validFreqs.includes(parsed.frequency_type as any) ? parsed.frequency_type : "monthly";
    const freqDays =
      typeof parsed.frequency_days === "number" && parsed.frequency_days > 0
        ? Math.round(parsed.frequency_days)
        : freqType === "daily" ? 1 : freqType === "weekly" ? 7 : freqType === "monthly" ? 30 : freqType === "yearly" ? 365 : 30;

    const result: ParsedTask = {
      title: parsed.title,
      description: parsed.description || null,
      frequency_type: freqType,
      frequency_days: freqDays,
      anchor_date: parsed.anchor_date || null,
      time_of_day: parsed.time_of_day || null,
      category: parsed.category || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
