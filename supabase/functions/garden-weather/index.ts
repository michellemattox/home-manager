import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const owmApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/** Process weather + rain logging for a single household/zip pair */
async function processHousehold(zipCode: string, householdId: string) {
  // ── 1. Fetch current weather ──────────────────────────────────────────────
  const [currentRes, forecastRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},us&appid=${owmApiKey}&units=imperial`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?zip=${zipCode},us&appid=${owmApiKey}&units=imperial&cnt=40`),
  ]);

  if (!currentRes.ok) {
    const err = await currentRes.json();
    throw new Error(`OpenWeatherMap error: ${err.message ?? currentRes.status}`);
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

  // ── 5. Backfill past 7 days via Open-Meteo (free, no key required) ─────────
  // OWM forecast only covers future data — Open-Meteo fills historical gaps so
  // yesterday's rain is captured the next time the app is opened.
  try {
    const lat = current.coord?.lat;
    const lon = current.coord?.lon;
    if (lat != null && lon != null) {
      const meteoRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode` +
        `&past_days=7&forecast_days=1&timezone=auto&temperature_unit=fahrenheit`
      );
      if (meteoRes.ok) {
        const meteo = await meteoRes.json();
        const { time, precipitation_sum, temperature_2m_max, temperature_2m_min, weathercode } = meteo.daily ?? {};
        if (Array.isArray(time) && Array.isArray(precipitation_sum)) {
          const pastRows = (time as string[])
            .filter((d: string) => d !== today) // today already logged via OWM above
            .map((d: string, i: number) => {
              const wcode: number = (weathercode as number[])?.[i] ?? 0;
              let conditionMain = "Clear";
              if (wcode === 0)                               conditionMain = "Clear";
              else if (wcode <= 3)                           conditionMain = "Clouds";
              else if (wcode <= 48)                          conditionMain = "Fog";
              else if (wcode <= 55)                          conditionMain = "Drizzle";
              else if ((wcode >= 61 && wcode <= 67) || (wcode >= 80 && wcode <= 82)) conditionMain = "Rain";
              else if (wcode >= 71 && wcode <= 77)           conditionMain = "Snow";
              else if (wcode >= 95)                          conditionMain = "Thunderstorm";
              return {
                household_id:   householdId,
                log_date:       d,
                zip_code:       zipCode,
                rainfall_mm:    Math.round(((precipitation_sum as number[])[i] ?? 0) * 10) / 10,
                temp_high_f:    (temperature_2m_max as number[])?.[i] != null ? Math.round((temperature_2m_max as number[])[i]) : null,
                temp_low_f:     (temperature_2m_min as number[])?.[i] != null ? Math.round((temperature_2m_min as number[])[i]) : null,
                condition_main: conditionMain,
                condition_desc: null as string | null,
                icon:           null as string | null,
              };
            });
          if (pastRows.length > 0) {
            // ignoreDuplicates: don't overwrite days already captured by OWM
            await supabase.from("garden_weather_logs").upsert(pastRows, {
              onConflict: "household_id,log_date",
              ignoreDuplicates: true,
            });

            // ── Auto-log rainfall as watering entries ───────────────────────
            // Find rainy days (>=5mm) that don't already have a rain watering entry.
            const rainyDates = pastRows
              .filter((r) => (r.rainfall_mm ?? 0) >= 5)
              .map((r) => r.log_date);

            if (rainyDates.length > 0) {
              // Fetch any rain watering entries that already exist for these dates
              const { data: existingRain } = await supabase
                .from("garden_watering_logs")
                .select("water_date")
                .eq("household_id", householdId)
                .eq("method", "rain")
                .in("water_date", rainyDates);

              const alreadyLogged = new Set((existingRain ?? []).map((r: { water_date: string }) => r.water_date));

              const rainEntries = pastRows
                .filter((r) => (r.rainfall_mm ?? 0) >= 5 && !alreadyLogged.has(r.log_date))
                .map((r) => ({
                  household_id: householdId,
                  plot_id:      null,
                  zone_id:      null,
                  water_date:   r.log_date,
                  method:       "rain",
                  duration_min: null,
                  amount_gal:   null,
                  notes:        `Auto-logged: ${(r.rainfall_mm ?? 0).toFixed(1)}mm rainfall`,
                }));

              if (rainEntries.length > 0) {
                await supabase.from("garden_watering_logs").insert(rainEntries);
              }
            }
          }
        }
      }
    }
  } catch {
    // Open-Meteo backfill is best-effort — never block the main response
  }

  // Also auto-log today's rain if significant and not yet logged
  if (dailyRainfallMm >= 5) {
    const { data: todayRainLog } = await supabase
      .from("garden_watering_logs")
      .select("id")
      .eq("household_id", householdId)
      .eq("method", "rain")
      .eq("water_date", today)
      .maybeSingle();

    if (!todayRainLog) {
      await supabase.from("garden_watering_logs").insert({
        household_id: householdId,
        plot_id:      null,
        zone_id:      null,
        water_date:   today,
        method:       "rain",
        duration_min: null,
        amount_gal:   null,
        notes:        `Auto-logged: ${dailyRainfallMm.toFixed(1)}mm rainfall`,
      });
    }
  }

  return { current: currentData, forecast, loggedToday: !logErr };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!owmApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENWEATHERMAP_API_KEY is not set. Add it in Supabase Dashboard → Edge Functions → garden-weather → Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json() as { zipCode?: string; householdId?: string; cron?: boolean };

    // ── Cron mode: process ALL households with a zip code ──────────────────
    if (body.cron) {
      const { data: households, error: hErr } = await supabase
        .from("households")
        .select("id, zip_code")
        .not("zip_code", "is", null)
        .neq("zip_code", "");

      if (hErr) throw hErr;

      const results: { householdId: string; zip: string; ok: boolean; error?: string }[] = [];
      for (const h of (households ?? [])) {
        try {
          await processHousehold(h.zip_code!, h.id);
          results.push({ householdId: h.id, zip: h.zip_code!, ok: true });
        } catch (e) {
          results.push({ householdId: h.id, zip: h.zip_code!, ok: false, error: (e as Error).message });
        }
      }

      return new Response(
        JSON.stringify({ cron: true, processed: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Single-household mode (app calls) ──────────────────────────────────
    const { zipCode, householdId } = body;
    if (!zipCode || !householdId) {
      return new Response(JSON.stringify({ error: "zipCode and householdId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await processHousehold(zipCode, householdId);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
