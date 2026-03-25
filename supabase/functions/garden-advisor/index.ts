/**
 * garden-advisor — Daily AI garden brief for Zone 8b (Puget Sound)
 *
 * POST body: { householdId: string }
 * Returns:   { recommendations: AdvisorRec[] }
 *
 * Fetches current garden data (plots, plantings, weather, watering, pests,
 * harvests), passes it to Claude, and stores 3–5 actionable recommendations
 * in garden_advisor_recommendations for today.  Clears today's pending recs
 * before inserting so calling it multiple times is idempotent.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Fall";
  return "Winter";
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

interface AdvisorRec {
  recommendation: string;
  action_label: string;
  action_type: string;
  priority: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    const householdId = body.householdId as string;
    if (!householdId) {
      return new Response(JSON.stringify({ error: "householdId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const season = getSeason(today.getMonth() + 1);
    const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    // ── Fetch all garden data in parallel ────────────────────────────────────
    const cutoff14 = new Date(today);
    cutoff14.setDate(today.getDate() - 14);
    const cutoff14Str = cutoff14.toISOString().split("T")[0];
    const cutoff30 = new Date(today);
    cutoff30.setDate(today.getDate() - 30);
    const cutoff30Str = cutoff30.toISOString().split("T")[0];

    const [
      { data: plots },
      { data: zones },
      { data: plantings },
      { data: weatherLogs },
      { data: wateringLogs },
      { data: pestLogs },
      { data: harvests },
    ] = await Promise.all([
      supabase.from("garden_plots").select("id, name, description").eq("household_id", householdId),
      supabase.from("garden_zones").select("id, name, plot_id, zone_type").in(
        "plot_id",
        // sub-select plot IDs for this household
        (await supabase.from("garden_plots").select("id").eq("household_id", householdId)).data?.map((p: any) => p.id) ?? []
      ),
      supabase.from("garden_plantings").select("plant_name, plant_family, variety, date_planted, zone_id, plot_id, season_year")
        .in("plot_id",
          (await supabase.from("garden_plots").select("id").eq("household_id", householdId)).data?.map((p: any) => p.id) ?? []
        ).is("date_removed", null),
      supabase.from("garden_weather_logs").select("log_date, rainfall_mm, temp_high_f, temp_low_f, condition_main")
        .eq("household_id", householdId).gte("log_date", cutoff14Str).order("log_date", { ascending: false }),
      supabase.from("garden_watering_logs").select("water_date, zone_id, method, amount_gal, duration_min")
        .eq("household_id", householdId).gte("water_date", cutoff14Str).order("water_date", { ascending: false }),
      supabase.from("garden_pest_logs").select("name, log_type, severity, observation_date, plot_id")
        .eq("household_id", householdId).eq("resolved", false).order("observation_date", { ascending: false }),
      supabase.from("garden_harvests").select("date, quantity_value, quantity_unit, planting_id, garden_plantings!inner(plant_name, plot_id)")
        .gte("date", cutoff30Str).order("date", { ascending: false }).limit(20),
    ]);

    // ── Build concise context strings ────────────────────────────────────────
    const plotMap = new Map((plots ?? []).map((p: any) => [p.id, p.name]));
    const zoneMap = new Map((zones ?? []).map((z: any) => [z.id, z.name]));

    const plantingsText = (plantings ?? []).slice(0, 20).map((p: any) => {
      const plot = plotMap.get(p.plot_id) ?? "Unknown";
      const zone = p.zone_id ? zoneMap.get(p.zone_id) ?? "" : "";
      const days = p.date_planted ? daysSince(p.date_planted) : null;
      return `${p.plant_name}${p.variety ? ` (${p.variety})` : ""} in ${plot}${zone ? `/${zone}` : ""}${days !== null ? `, ${days}d old` : ""}`;
    }).join("; ") || "No current plantings";

    const weatherText = (weatherLogs ?? []).slice(0, 7).map((w: any) =>
      `${w.log_date}: ${w.temp_high_f ?? "?"}°F high, ${w.rainfall_mm ?? 0}mm rain, ${w.condition_main ?? ""}`
    ).join("; ") || "No weather data logged";

    const totalRainfall7d = (weatherLogs ?? []).slice(0, 7).reduce((sum: number, w: any) => sum + (w.rainfall_mm ?? 0), 0);

    // Last watered per zone
    const lastWateredByZone = new Map<string, string>();
    for (const w of (wateringLogs ?? [])) {
      if (w.zone_id && !lastWateredByZone.has(w.zone_id)) {
        lastWateredByZone.set(w.zone_id, w.water_date);
      }
    }
    const wateringText = lastWateredByZone.size > 0
      ? Array.from(lastWateredByZone.entries()).map(([zId, date]) =>
          `${zoneMap.get(zId) ?? zId}: ${daysSince(date)}d ago`
        ).join("; ")
      : "No watering logged";

    const pestText = (pestLogs ?? []).slice(0, 5).map((p: any) =>
      `${p.name} (${p.log_type}, severity ${p.severity ?? "?"}) — ${daysSince(p.observation_date)}d ago`
    ).join("; ") || "No active pest/disease issues";

    const harvestText = (harvests ?? []).slice(0, 8).map((h: any) => {
      const plantName = (h as any)["garden_plantings"]?.plant_name ?? "Unknown";
      return `${plantName}: ${h.quantity_value ?? ""} ${h.quantity_unit ?? ""} (${daysSince(h.date)}d ago)`;
    }).join("; ") || "No recent harvests";

    // ── Claude prompt ────────────────────────────────────────────────────────
    const prompt = `You are an expert garden advisor for Zone 8b, Puget Sound, Washington. Today is ${dateLabel} (${season}).

GARDEN DATA:
- Plots: ${(plots ?? []).map((p: any) => p.name).join(", ") || "None"}
- Current plantings: ${plantingsText}
- Weather (last 7 days): ${weatherText}
- Total rainfall last 7 days: ${totalRainfall7d.toFixed(1)}mm
- Last watered per zone: ${wateringText}
- Active pest/disease issues: ${pestText}
- Recent harvests: ${harvestText}

Generate exactly 3-5 specific, actionable recommendations for TODAY based on the data above. Reference specific plants, zones, or issues by name. Prioritize urgent problems (pests, drought stress, frost risk).

Respond ONLY with a JSON array:
[
  {
    "recommendation": "1-2 sentences of specific actionable advice",
    "action_label": "2-3 word label",
    "action_type": "watering|pests|garden|tasks|harvest",
    "priority": "urgent|normal|info"
  }
]

Priority:
- urgent = act today (active pest, no rain + high heat, frost warning)
- normal = do this week
- info = good to know`;

    // ── Call Claude ──────────────────────────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text ?? "[]";

    let recs: AdvisorRec[] = [];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      recs = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recs = [];
    }

    if (!recs.length) {
      return new Response(JSON.stringify({ recommendations: [], message: "No recommendations generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Clear today's pending recs, then insert new ones ─────────────────────
    await supabase.from("garden_advisor_recommendations")
      .delete()
      .eq("household_id", householdId)
      .eq("generated_date", todayStr)
      .eq("status", "pending");

    const toInsert = recs.slice(0, 5).map((r) => ({
      household_id: householdId,
      generated_date: todayStr,
      recommendation: r.recommendation ?? "",
      action_label: r.action_label ?? "View",
      action_type: r.action_type ?? "garden",
      priority: ["urgent", "normal", "info"].includes(r.priority) ? r.priority : "normal",
      status: "pending",
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("garden_advisor_recommendations")
      .insert(toInsert)
      .select();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ recommendations: inserted ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
