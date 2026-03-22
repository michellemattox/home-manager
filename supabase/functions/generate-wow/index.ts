import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getMostRecentMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const weekStart = getMostRecentMonday();
    const sinceDate = weekStart + "T00:00:00.000Z";

    // Optional: limit to a specific household for testing
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    // Fetch households (or single household if specified)
    const hhQuery = supabase.from("households").select("id");
    if (body.householdId) hhQuery.eq("id", body.householdId as string);
    const { data: households, error: hErr } = await hhQuery;
    if (hErr) throw hErr;

    let totalInserted = 0;

    for (const hh of households ?? []) {
      const householdId = hh.id;

      // Clear this week's existing entries for this household
      await supabase.from("wow_updates")
        .delete()
        .eq("household_id", householdId)
        .eq("week_start", weekStart);

      const entries: object[] = [];

      // ── 1. New ideas ──────────────────────────────────────────────────────
      const { data: topics } = await supabase
        .from("idea_topics").select("id").eq("household_id", householdId);
      const topicIds = (topics ?? []).map((t: any) => t.id);
      topicIds.push(householdId); // new ideas store household_id directly in topic_id

      const { data: ideas } = await supabase
        .from("ideas").select("id, body, created_at")
        .in("topic_id", topicIds)
        .gte("created_at", sinceDate);

      for (const idea of ideas ?? []) {
        entries.push({
          household_id: householdId,
          week_start: weekStart,
          source_type: "idea",
          source_id: (idea as any).id,
          source_tab: "ideas",
          title: truncate((idea as any).body, 60),
          summary: "New idea submitted this week.",
        });
      }

      // ── 2. Project updates ────────────────────────────────────────────────
      const { data: projUpdates } = await supabase
        .from("project_updates")
        .select("id, body, project_id, projects!inner(id, title, household_id)")
        .gte("created_at", sinceDate);

      for (const pu of projUpdates ?? []) {
        const project = (pu as any).projects;
        if (project?.household_id !== householdId) continue;
        entries.push({
          household_id: householdId,
          week_start: weekStart,
          source_type: "project",
          source_id: project.id,
          source_tab: "projects",
          title: project.title,
          summary: truncate((pu as any).body, 120),
        });
      }

      // ── 3. New activities (trips) ─────────────────────────────────────────
      const { data: trips } = await supabase
        .from("trips").select("id, title, departure_date, return_date")
        .eq("household_id", householdId)
        .gte("created_at", sinceDate);

      for (const trip of trips ?? []) {
        entries.push({
          household_id: householdId,
          week_start: weekStart,
          source_type: "activity",
          source_id: (trip as any).id,
          source_tab: "activity",
          title: (trip as any).title,
          summary: `${(trip as any).departure_date} → ${(trip as any).return_date}`,
        });
      }

      // ── 4. New goals ──────────────────────────────────────────────────────
      const { data: newGoals } = await supabase
        .from("goals").select("id, title")
        .eq("household_id", householdId)
        .gte("created_at", sinceDate);

      for (const goal of newGoals ?? []) {
        entries.push({
          household_id: householdId,
          week_start: weekStart,
          source_type: "goal",
          source_id: (goal as any).id,
          source_tab: "goals",
          title: (goal as any).title,
          summary: "New goal added this week.",
        });
      }

      // ── 5. Goal updates ───────────────────────────────────────────────────
      const { data: goalUpdates } = await supabase
        .from("goal_updates")
        .select("id, body, goal_id, goals!inner(id, title, household_id)")
        .gte("created_at", sinceDate);

      for (const gu of goalUpdates ?? []) {
        const goal = (gu as any).goals;
        if (goal?.household_id !== householdId) continue;
        entries.push({
          household_id: householdId,
          week_start: weekStart,
          source_type: "goal",
          source_id: goal.id,
          source_tab: "goals",
          title: goal.title,
          summary: truncate((gu as any).body, 120),
        });
      }

      // ── 6. Tasks created or completed this week ───────────────────────────
      const { data: taskChanges } = await supabase
        .from("tasks").select("id, title, is_completed")
        .eq("household_id", householdId)
        .gte("created_at", sinceDate);

      for (const task of taskChanges ?? []) {
        entries.push({
          household_id: householdId,
          week_start: weekStart,
          source_type: "task",
          source_id: null,
          source_tab: "tasks",
          title: (task as any).title,
          summary: (task as any).is_completed ? "Task completed this week." : "New task added this week.",
        });
      }

      if (entries.length > 0) {
        const { error: insertErr } = await supabase.from("wow_updates").insert(entries);
        if (insertErr) throw insertErr;
        totalInserted += entries.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, weekStart, totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
