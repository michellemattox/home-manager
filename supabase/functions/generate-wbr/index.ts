import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── PT helpers ─────────────────────────────────────────────────────────────

function pacificParts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    weekday: get("weekday"), // "Mon", "Tue", ...
  };
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayPT() {
  const p = pacificParts();
  return ymd(p.year, p.month, p.day);
}

/** Returns YYYY-MM-DD of the Monday of the current Pacific Time week. */
function mondayOfWeekPT(): string {
  const p = pacificParts();
  // JS Date treated as UTC for math; we only need the day-of-week offset.
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

// ── Snapshot types ─────────────────────────────────────────────────────────

interface IdeaItem {
  id: string;
  subject: string;
  body: string | null;
  author_id: string | null;
  created_at: string;
}

interface TaskItem {
  id: string;
  title: string;
  due_date: string;
  time_of_day: string | null;
  assigned_member_id: string | null;
  source: "task" | "recurring";
  bucket: "overdue" | "due_today" | "due_soon";
}

interface ProjectUpcoming {
  id: string;
  title: string;
  expected_date: string;
  status: string;
  owner_ids: string[];
}

interface ProjectTaskItem {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  due_date: string;
  assigned_member_id: string | null;
}

interface ProjectWithUpdate {
  id: string;
  title: string;
  latest_update_body: string;
  latest_update_author_id: string | null;
  latest_update_at: string;
}

interface ActivityItem {
  id: string;
  title: string;
  destination: string | null;
  departure_date: string;
  return_date: string | null;
  assigned_to: string | null;
}

interface ActivityTaskItem {
  id: string;
  trip_id: string;
  trip_title: string;
  title: string;
  due_date: string;
  assigned_member_id: string | null;
}

interface ActivityWithUpdate {
  id: string;
  title: string;
  latest_update_body: string;
  latest_update_author_id: string | null;
  latest_update_at: string;
}

interface Snapshot {
  ideas: IdeaItem[];
  tasks: TaskItem[];
  projects_upcoming: ProjectUpcoming[];
  project_tasks: ProjectTaskItem[];
  projects_with_recent_updates: ProjectWithUpdate[];
  activities: ActivityItem[];
  activity_tasks: ActivityTaskItem[];
  activities_with_recent_updates: ActivityWithUpdate[];
}

// ── Generation ─────────────────────────────────────────────────────────────

async function generateForHousehold(householdId: string, weekStart: string, today: string): Promise<Snapshot> {
  const twoWeeksAgoISO = addDays(today, -14);
  const threeWeeksAgoISO = addDays(today, -21);
  const sevenDaysAhead = addDays(today, 7);
  const thirtyDaysAhead = addDays(today, 30);
  const ninetyDaysAhead = addDays(today, 90);

  // 1. Ideas — new in past 3 weeks. Ideas use topic_id as household_id (legacy column name).
  const { data: ideasData } = await supabase
    .from("ideas")
    .select("id, subject, body, author_id, created_at")
    .eq("topic_id", householdId)
    .gte("created_at", `${threeWeeksAgoISO}T00:00:00Z`)
    .order("created_at", { ascending: false });

  const ideas: IdeaItem[] = (ideasData ?? []).map((i: any) => ({
    id: i.id,
    subject: i.subject ?? "",
    body: i.body,
    author_id: i.author_id,
    created_at: i.created_at,
  }));

  // 2. Tasks — overdue OR due in next 7 days. Exclude any task with is_personal = true.
  function bucketFor(due: string): "overdue" | "due_today" | "due_soon" {
    if (due < today) return "overdue";
    if (due === today) return "due_today";
    return "due_soon";
  }

  const { data: oneOff } = await supabase
    .from("tasks")
    .select("id, title, due_date, due_time, assigned_member_id, is_personal, is_completed")
    .eq("household_id", householdId)
    .eq("is_completed", false)
    .eq("is_personal", false)
    .not("due_date", "is", null)
    .lte("due_date", sevenDaysAhead);

  const { data: recurring } = await supabase
    .from("recurring_tasks")
    .select("id, title, next_due_date, time_of_day, assigned_member_id, is_personal, is_active")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .eq("is_personal", false)
    .not("next_due_date", "is", null)
    .lte("next_due_date", sevenDaysAhead);

  const tasks: TaskItem[] = [];
  for (const t of oneOff ?? []) {
    tasks.push({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      time_of_day: t.due_time ?? null,
      assigned_member_id: t.assigned_member_id,
      source: "task",
      bucket: bucketFor(t.due_date),
    });
  }
  for (const t of recurring ?? []) {
    tasks.push({
      id: t.id,
      title: t.title,
      due_date: t.next_due_date,
      time_of_day: t.time_of_day ?? null,
      assigned_member_id: t.assigned_member_id,
      source: "recurring",
      bucket: bucketFor(t.next_due_date),
    });
  }
  tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));

  // 3. Projects — coming up in next 30 days.
  const { data: projData } = await supabase
    .from("projects")
    .select("id, title, status, expected_date, project_owners(member_id), project_updates(id, body, author_id, created_at), project_tasks(id, title, due_date, assigned_member_id, is_completed)")
    .eq("household_id", householdId)
    .neq("status", "completed")
    .neq("status", "finished");

  const projects_upcoming: ProjectUpcoming[] = [];
  const project_tasks: ProjectTaskItem[] = [];
  const projects_with_recent_updates: ProjectWithUpdate[] = [];

  for (const p of (projData ?? []) as any[]) {
    // Coming up in next 30 days
    if (p.expected_date && p.expected_date <= thirtyDaysAhead) {
      projects_upcoming.push({
        id: p.id,
        title: p.title,
        expected_date: p.expected_date,
        status: p.status,
        owner_ids: (p.project_owners ?? []).map((po: any) => po.member_id),
      });
    }

    // Project tasks with pending due dates
    for (const t of (p.project_tasks ?? []) as any[]) {
      if (t.due_date && !t.is_completed && t.due_date <= thirtyDaysAhead) {
        project_tasks.push({
          id: t.id,
          project_id: p.id,
          project_title: p.title,
          title: t.title,
          due_date: t.due_date,
          assigned_member_id: t.assigned_member_id,
        });
      }
    }

    // Projects with updates in past 2 weeks
    const recentUpdates = (p.project_updates ?? [])
      .filter((u: any) => u.created_at >= `${twoWeeksAgoISO}T00:00:00Z`)
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    if (recentUpdates.length > 0) {
      const latest = recentUpdates[0];
      projects_with_recent_updates.push({
        id: p.id,
        title: p.title,
        latest_update_body: latest.body,
        latest_update_author_id: latest.author_id,
        latest_update_at: latest.created_at,
      });
    }
  }

  projects_upcoming.sort((a, b) => a.expected_date.localeCompare(b.expected_date));
  project_tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
  projects_with_recent_updates.sort((a, b) => b.latest_update_at.localeCompare(a.latest_update_at));

  // 4. Activity (Trips) — coming up in next 90 days, plus their tasks (due dates) and recent updates.
  const { data: tripData } = await supabase
    .from("trips")
    .select("id, title, destination, departure_date, return_date, assigned_to, trip_tasks(id, title, due_date, assigned_member_id, is_completed), trip_updates(id, body, author_id, created_at)")
    .eq("household_id", householdId);

  const activities: ActivityItem[] = [];
  const activity_tasks: ActivityTaskItem[] = [];
  const activities_with_recent_updates: ActivityWithUpdate[] = [];

  for (const t of (tripData ?? []) as any[]) {
    const tripTitle = t.title ?? t.destination ?? "Trip";

    // Upcoming trips: departure in [today, today+90]
    if (t.departure_date && t.departure_date >= today && t.departure_date <= ninetyDaysAhead) {
      activities.push({
        id: t.id,
        title: tripTitle,
        destination: t.destination,
        departure_date: t.departure_date,
        return_date: t.return_date,
        assigned_to: t.assigned_to,
      });
    }

    // Trip tasks with pending due dates in the next 90 days
    for (const tt of (t.trip_tasks ?? []) as any[]) {
      if (tt.due_date && !tt.is_completed && tt.due_date >= today && tt.due_date <= ninetyDaysAhead) {
        activity_tasks.push({
          id: tt.id,
          trip_id: t.id,
          trip_title: tripTitle,
          title: tt.title,
          due_date: tt.due_date,
          assigned_member_id: tt.assigned_member_id,
        });
      }
    }

    // Trips with updates in past 2 weeks
    const recentUpdates = (t.trip_updates ?? [])
      .filter((u: any) => u.created_at >= `${twoWeeksAgoISO}T00:00:00Z`)
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    if (recentUpdates.length > 0) {
      const latest = recentUpdates[0];
      activities_with_recent_updates.push({
        id: t.id,
        title: tripTitle,
        latest_update_body: latest.body,
        latest_update_author_id: latest.author_id,
        latest_update_at: latest.created_at,
      });
    }
  }

  activities.sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  activity_tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
  activities_with_recent_updates.sort((a, b) => b.latest_update_at.localeCompare(a.latest_update_at));

  return {
    ideas,
    tasks,
    projects_upcoming,
    project_tasks,
    projects_with_recent_updates,
    activities,
    activity_tasks,
    activities_with_recent_updates,
  };
}

// ── Entry ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Support a manual trigger via { force: true } so the user can regenerate without waiting for cron.
  let force = false;
  try {
    const body = await req.json();
    force = body?.force === true;
  } catch (_) {}

  const pt = pacificParts();
  const isMonday4pm = pt.weekday === "Mon" && pt.hour === 16;

  if (!isMonday4pm && !force) {
    return new Response(
      JSON.stringify({
        skipped: true,
        reason: "Not Monday 4pm PT",
        pt_weekday: pt.weekday,
        pt_hour: pt.hour,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const weekStart = mondayOfWeekPT();
  const today = todayPT();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id");

  if (hhErr) {
    return new Response(JSON.stringify({ error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ household_id: string; status: string }> = [];

  for (const h of (households ?? []) as { id: string }[]) {
    try {
      // Idempotency: skip if a snapshot already exists for this week (unless force).
      if (!force) {
        const { data: existing } = await supabase
          .from("weekly_business_reviews")
          .select("id")
          .eq("household_id", h.id)
          .eq("week_start", weekStart)
          .maybeSingle();
        if (existing) {
          results.push({ household_id: h.id, status: "already-generated" });
          continue;
        }
      }

      const snapshot = await generateForHousehold(h.id, weekStart, today);

      const { error: insertErr } = await supabase
        .from("weekly_business_reviews")
        .upsert(
          { household_id: h.id, week_start: weekStart, snapshot, generated_at: new Date().toISOString() },
          { onConflict: "household_id,week_start" }
        );
      if (insertErr) throw insertErr;
      results.push({ household_id: h.id, status: "generated" });
    } catch (e: any) {
      results.push({ household_id: h.id, status: `error: ${e.message}` });
    }
  }

  return new Response(JSON.stringify({ week_start: weekStart, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
