import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const owmApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!owmApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENWEATHERMAP_API_KEY is not set. Add it in Supabase Dashboard → Edge Functions → garden-weather → Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { zipCode, householdId } = await req.json() as { zipCode: string; householdId: string };
    if (!zipCode || !householdId) {
      return new Response(JSON.stringify({ error: "zipCode and householdId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Fetch current weather ──────────────────────────────────────────────
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},us&appid=${owmApiKey}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?zip=${zipCode},us&appid=${owmApiKey}&units=imperial&cnt=40`),
    ]);

    if (!currentRes.ok) {
      const err = await currentRes.json();
      return new Response(JSON.stringify({ error: `OpenWeatherMap error: ${err.message ?? currentRes.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const current = await currentRes.json();
    const forecastRaw = forecastRes.ok ? await forecastRes.json() : { list: [] };

    // ── 2. Parse current ──────────────────────────────────────────────────────
    const rainfallMm = (current.rain?.["1h"] ?? 0) + (current.snow?.["1h"] ?? 0);
    const currentData = {
      temp:        Math.round(current.main.temp),
      feelsLike:   Math.round(current.main.feels_like),
      tempMin:     Math.round(current.main.temp_min),
      tempMax:     Math.round(current.main.temp_max),
      humidity:    current.main.humidity,
      windSpeed:   Math.round(current.wind?.speed ?? 0),
      condition:   current.weather[0]?.main ?? "",
      description: current.weather[0]?.description ?? "",
      icon:        current.weather[0]?.icon ?? "",
      cityName:    current.name ?? "",
      sunrise:     current.sys?.sunrise ?? 0,
      sunset:      current.sys?.sunset ?? 0,
      rainfallMm,
      dt:          current.dt,
    };

    // ── 3. Parse 5-day forecast (group 3hr slots by calendar date) ────────────
    const dayMap = new Map<string, { tempMins: number[]; tempMaxes: number[]; humidities: number[]; precipMm: number; condition: string; description: string; icon: string }>();
    for (const slot of (forecastRaw.list ?? [])) {
      const date = slot.dt_txt.slice(0, 10);
      if (!dayMap.has(date)) {
        dayMap.set(date, { tempMins: [], tempMaxes: [], humidities: [], precipMm: 0, condition: "", description: "", icon: "" });
      }
      const d = dayMap.get(date)!;
      d.tempMins.push(slot.main.temp_min);
      d.tempMaxes.push(slot.main.temp_max);
      d.humidities.push(slot.main.humidity);
      d.precipMm += (slot.rain?.["3h"] ?? 0) + (slot.snow?.["3h"] ?? 0);
      // Use noon (12:00:00) slot for representative condition
      if (slot.dt_txt.includes("12:00:00") || !d.condition) {
        d.condition = slot.weather[0]?.main ?? "";
        d.description = slot.weather[0]?.description ?? "";
        d.icon = slot.weather[0]?.icon ?? "";
      }
    }

    const forecast = Array.from(dayMap.entries())
      .slice(0, 5)
      .map(([date, d]) => ({
        date,
        tempMin:     Math.round(Math.min(...d.tempMins)),
        tempMax:     Math.round(Math.max(...d.tempMaxes)),
        humidity:    Math.round(d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length),
        precipMm:    Math.round(d.precipMm * 10) / 10,
        condition:   d.condition,
        description: d.description,
        icon:        d.icon,
      }));

    // ── 4. Upsert today's log ──────────────────────────────────────────────────
    // Use daily accumulated precip from forecast slots (much more accurate than
    // the 1-hour current snapshot, which is 0 whenever it's not actively raining).
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
    const todayForecastData = dayMap.get(today);
    const dailyRainfallMm = todayForecastData
      ? Math.round(todayForecastData.precipMm * 10) / 10
      : rainfallMm; // fallback to 1h snapshot

    const { error: logErr } = await supabase
      .from("garden_weather_logs")
      .upsert({
        household_id:   householdId,
        log_date:       today,
        zip_code:       zipCode,
        rainfall_mm:    dailyRainfallMm,
        temp_high_f:    currentData.tempMax,
        temp_low_f:     currentData.tempMin,
        condition_main: currentData.condition,
        condition_desc: currentData.description,
        icon:           currentData.icon,
      }, { onConflict: "household_id,log_date" });

    return new Response(
      JSON.stringify({ current: currentData, forecast, loggedToday: !logErr }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
