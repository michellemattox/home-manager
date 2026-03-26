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
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

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

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 512 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? `Gemini error ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
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

// Rule-based fallback — works with no API keys at all
function ruleBasedParse(text: string, today: string): ParsedTask {
  const lower = text.toLowerCase();
  const year = today.slice(0, 4);

  // Frequency
  let frequency_type: ParsedTask["frequency_type"] = "monthly";
  let frequency_days = 30;
  const everyNDays = lower.match(/every\s+(\d+)\s+days?/);
  const everyNWeeks = lower.match(/every\s+(\d+)\s+weeks?/);
  const everyNMonths = lower.match(/every\s+(\d+)\s+months?/);
  if (/every\s+day|daily/.test(lower))           { frequency_type = "daily";   frequency_days = 1; }
  else if (/every\s+week|weekly/.test(lower))    { frequency_type = "weekly";  frequency_days = 7; }
  else if (/every\s+month|monthly/.test(lower))  { frequency_type = "monthly"; frequency_days = 30; }
  else if (/every\s+year|annual|yearly/.test(lower)) { frequency_type = "yearly"; frequency_days = 365; }
  else if (everyNDays)  { frequency_type = "custom"; frequency_days = parseInt(everyNDays[1]); }
  else if (everyNWeeks) { frequency_type = "custom"; frequency_days = parseInt(everyNWeeks[1]) * 7; }
  else if (everyNMonths){ frequency_type = "custom"; frequency_days = parseInt(everyNMonths[1]) * 30; }

  // Season → anchor date
  let anchor_date: string | null = null;
  if (/spring/.test(lower))        anchor_date = `${year}-03-20`;
  else if (/summer/.test(lower))   anchor_date = `${year}-06-21`;
  else if (/fall|autumn/.test(lower)) anchor_date = `${year}-09-22`;
  else if (/winter/.test(lower))   anchor_date = `${year}-12-21`;

  // Title — strip scheduling filler
  let title = text
    .replace(/remind me to\s*/i, "")
    .replace(/\s*every\s+(day|week|month|year|\d+\s*(days?|weeks?|months?))\b.*/i, "")
    .replace(/\s*(in the|each|this)\s+(spring|summer|fall|autumn|winter)\b.*/i, "")
    .trim();
  title = title ? title.charAt(0).toUpperCase() + title.slice(1) : text.trim();

  // Category
  let category: string | null = null;
  if (/mow|lawn|weed|mulch|plant|prune|hedge|garden/.test(lower))    category = "yard_and_garden";
  else if (/clean|dust|vacuum|mop|scrub|sweep/.test(lower))          category = "cleaning";
  else if (/gutter|roof|furnace|filter|hvac|repair|paint/.test(lower)) category = "home_maintenance";
  else if (/car|oil change|tire|vehicle/.test(lower))                 category = "vehicles";
  else if (/dog|cat|pet|vet/.test(lower))                             category = "pets";
  else if (/doctor|dentist|medication|exercise|gym/.test(lower))      category = "health";
  else if (/bill|budget|tax|finance|insurance/.test(lower))           category = "finances";

  return { title, description: null, frequency_type, frequency_days, anchor_date, time_of_day: null, category };
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

    const today = new Date().toISOString().split("T")[0];
    const prompt = buildPrompt(text, today);

    // Try AI providers in order: Anthropic → Gemini → Groq → OpenAI → rule-based
    let rawText: string | undefined;

    if (ANTHROPIC_API_KEY) {
      try { rawText = await callAnthropic(prompt); } catch { /* fall through */ }
    }
    if (rawText === undefined && GEMINI_API_KEY) {
      try { rawText = await callGemini(prompt); } catch { /* fall through */ }
    }
    if (rawText === undefined && OPENAI_API_KEY) {
      try { rawText = await callOpenAI(prompt); } catch { /* fall through */ }
    }

    // Rule-based parser — always works, no API needed
    let parsed: ParsedTask;
    if (rawText === undefined) {
      parsed = ruleBasedParse(text, today);
    } else {
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (!parsed?.title) throw new Error();
      } catch {
        // AI returned something unparseable — fall back to rules
        parsed = ruleBasedParse(text, today);
      }
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
