import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const gmailUser = Deno.env.get("GMAIL_USER") ?? "";
const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReminderItem {
  title: string;
  dueDate: string;
  overdue: boolean;
  timeOfDay?: string | null;
  source: "Task" | "Project" | "Checklist" | "Activity" | "Goal" | "Garden" | "Service";
  parentName?: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTodayPT(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

/** Sort items by date ascending, then by time (no-time first) */
function sortItems(items: ReminderItem[]): ReminderItem[] {
  return items.sort((a, b) => {
    const dateCmp = a.dueDate.localeCompare(b.dueDate);
    if (dateCmp !== 0) return dateCmp;
    const ta = parseTimeToMinutes(a.timeOfDay);
    const tb = parseTimeToMinutes(b.timeOfDay);
    return ta - tb;
  });
}

function normalizeTimeTo12h(time: string): string {
  if (/am|pm/i.test(time)) return time;
  const m = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return time;
  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const suffix = hours >= 12 ? "pm" : "am";
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  return mins === 0 ? `${hours}${suffix}` : `${hours}:${m[2]}${suffix}`;
}

function parseTimeToMinutes(time?: string | null): number {
  if (!time) return -1;
  const m = time.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return -1;
  let hours = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[4] || "").toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function formatDateCompact(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

// ── Fetch all reminder items for a household ────────────────────────────────

async function fetchAllItems(householdId: string, today: string): Promise<ReminderItem[]> {
  const items: ReminderItem[] = [];

  // 1. Recurring tasks — due today or overdue
  const { data: recurringTasks } = await supabase
    .from("recurring_tasks")
    .select("id, title, next_due_date, household_id, assigned_member_id, time_of_day")
    .eq("is_active", true)
    .eq("household_id", householdId)
    .lte("next_due_date", today);

  for (const t of recurringTasks ?? []) {
    items.push({
      title: t.title,
      dueDate: t.next_due_date,
      overdue: t.next_due_date < today,
      timeOfDay: (t as any).time_of_day ?? null,
      source: "Task",
      _assignedMemberId: t.assigned_member_id,
    } as any);
  }

  // 2. One-off tasks — due today or overdue, not completed
  const { data: oneOffTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, due_time, assigned_member_id, is_personal, household_id")
    .eq("household_id", householdId)
    .eq("is_completed", false)
    .not("due_date", "is", null)
    .lte("due_date", today);

  for (const t of oneOffTasks ?? []) {
    items.push({
      title: t.title,
      dueDate: t.due_date!,
      overdue: t.due_date! < today,
      timeOfDay: t.due_time ?? null,
      source: "Task",
      _assignedMemberId: t.assigned_member_id,
      _isPersonal: t.is_personal,
    } as any);
  }

  // 3. Projects with expected_date due today or overdue (not completed/finished)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, expected_date, household_id")
    .eq("household_id", householdId)
    .not("status", "in", '("completed","finished")')
    .not("expected_date", "is", null)
    .lte("expected_date", today);

  // Get project owners for assignment matching
  const projectIds = (projects ?? []).map((p) => p.id);
  let projectOwnerMap: Record<string, string[]> = {};
  if (projectIds.length) {
    const { data: owners } = await supabase
      .from("project_owners")
      .select("project_id, member_id")
      .in("project_id", projectIds);
    for (const o of owners ?? []) {
      if (!projectOwnerMap[o.project_id]) projectOwnerMap[o.project_id] = [];
      projectOwnerMap[o.project_id].push(o.member_id);
    }
  }

  for (const p of projects ?? []) {
    items.push({
      title: p.title,
      dueDate: p.expected_date!,
      overdue: p.expected_date! < today,
      source: "Project",
      _ownerMemberIds: projectOwnerMap[p.id] ?? [],
    } as any);
  }

  // 4. Project checklist items — uncompleted with due date today or overdue
  if (projectIds.length) {
    const { data: projectTasks } = await supabase
      .from("project_tasks")
      .select("id, title, due_date, assigned_member_id, project_id, checklist_name")
      .in("project_id", projectIds)
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .lte("due_date", today);

    // Get parent project titles
    const projectTitleMap: Record<string, string> = {};
    for (const p of projects ?? []) projectTitleMap[p.id] = p.title;

    for (const t of projectTasks ?? []) {
      items.push({
        title: t.title,
        dueDate: t.due_date!,
        overdue: t.due_date! < today,
        source: "Checklist",
        parentName: projectTitleMap[t.project_id] ?? "Project",
        _assignedMemberId: t.assigned_member_id,
      } as any);
    }
  }

  // 5. Trips (Activities) — departure_date today or overdue
  const { data: trips } = await supabase
    .from("trips")
    .select("id, title, departure_date, return_date, assigned_to, household_id")
    .eq("household_id", householdId)
    .lte("departure_date", today);

  // Only include trips that haven't passed their return date by more than a day
  const activeTrips = (trips ?? []).filter((t) => t.return_date >= today || t.departure_date >= today);

  for (const t of activeTrips) {
    items.push({
      title: t.title,
      dueDate: t.departure_date,
      overdue: t.departure_date < today,
      source: "Activity",
      _assignedMemberId: t.assigned_to,
    } as any);
  }

  // 6. Trip checklist items — uncompleted with due date today or overdue
  const tripIds = (trips ?? []).map((t) => t.id);
  if (tripIds.length) {
    const { data: tripTasks } = await supabase
      .from("trip_tasks")
      .select("id, title, due_date, assigned_member_id, trip_id, checklist_name")
      .in("trip_id", tripIds)
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .lte("due_date", today);

    const tripTitleMap: Record<string, string> = {};
    for (const t of trips ?? []) tripTitleMap[t.id] = t.title;

    for (const t of tripTasks ?? []) {
      items.push({
        title: t.title,
        dueDate: t.due_date!,
        overdue: t.due_date! < today,
        source: "Checklist",
        parentName: tripTitleMap[t.trip_id] ?? "Activity",
        _assignedMemberId: t.assigned_member_id,
      } as any);
    }
  }

  // 7. Goals — active with due date today or overdue
  const { data: goals } = await supabase
    .from("goals")
    .select("id, title, due_date, member_id, user_type, household_id")
    .eq("household_id", householdId)
    .eq("status", "active")
    .not("due_date", "is", null)
    .lte("due_date", today);

  for (const g of goals ?? []) {
    items.push({
      title: g.title,
      dueDate: g.due_date!,
      overdue: g.due_date! < today,
      source: "Goal",
      _assignedMemberId: g.member_id,
      _isFamily: g.user_type === "family",
    } as any);
  }

  // 8. Garden plantings — active plantings that were planted (reminders for tending)
  //    Include plantings that were planted within the last 30 days as "new planting" reminders
  const { data: plantings } = await supabase
    .from("garden_plantings")
    .select("id, plant_name, variety, date_planted, household_id")
    .eq("household_id", householdId)
    .is("date_removed", null)
    .not("date_planted", "is", null);

  // Garden pest logs — unresolved issues
  const { data: pestLogs } = await supabase
    .from("garden_pest_logs")
    .select("id, name, log_type, observation_date, household_id")
    .eq("household_id", householdId)
    .eq("resolved", false)
    .lte("observation_date", today);

  for (const p of pestLogs ?? []) {
    items.push({
      title: `${p.log_type === "pest" ? "🐛" : p.log_type === "disease" ? "🦠" : "⚠️"} ${p.name}`,
      dueDate: p.observation_date,
      overdue: p.observation_date < today,
      source: "Garden",
      _isFamily: true,
    } as any);
  }

  // 9. Service records — recurring services coming due
  const { data: services } = await supabase
    .from("service_records")
    .select("id, vendor_name, service_type, service_date, frequency, event_type, event_id, household_id")
    .eq("household_id", householdId)
    .not("frequency", "is", null);

  for (const s of services ?? []) {
    if (s.event_type === "project" && s.event_id) continue; // shown under project
    const days = s.frequency === "monthly" ? 30 : s.frequency === "quarterly" ? 90 : s.frequency === "bi-annually" ? 180 : 365;
    const nextDue = new Date(new Date(s.service_date).getTime() + days * 86400000);
    const nextDueStr = nextDue.toISOString().split("T")[0];
    if (nextDueStr > today) continue; // not yet due
    // Only include if overdue by up to 14 days
    const daysOverdue = Math.ceil((new Date(today).getTime() - nextDue.getTime()) / 86400000);
    if (daysOverdue > 14) continue;
    items.push({
      title: `${s.service_type} (${s.vendor_name})`,
      dueDate: nextDueStr,
      overdue: nextDueStr < today,
      source: "Service",
      _isFamily: true,
    } as any);
  }

  return items;
}

/** Filter items to those relevant for a specific member */
function filterItemsForMember(items: any[], memberId: string): ReminderItem[] {
  return items.filter((item) => {
    // Personal tasks: only the assigned member
    if (item._isPersonal && item._assignedMemberId && item._assignedMemberId !== memberId) return false;
    // Assigned to a specific member
    if (item._assignedMemberId && item._assignedMemberId !== memberId) return false;
    // Project owners check
    if (item._ownerMemberIds && item._ownerMemberIds.length > 0 && !item._ownerMemberIds.includes(memberId)) return false;
    // Family/unassigned items: include for everyone
    return true;
  }).map((item) => ({
    title: item.title,
    dueDate: item.dueDate,
    overdue: item.overdue,
    timeOfDay: item.timeOfDay ?? null,
    source: item.source,
    parentName: item.parentName ?? null,
  }));
}

// ── Email template ──────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  Task: "#3b82f6",
  Project: "#8b5cf6",
  Checklist: "#6366f1",
  Activity: "#ec4899",
  Goal: "#f59e0b",
  Garden: "#22c55e",
  Service: "#64748b",
};

const SOURCE_ICONS: Record<string, string> = {
  Task: "✅",
  Project: "🏗️",
  Checklist: "☑️",
  Activity: "✈️",
  Goal: "🎯",
  Garden: "🌱",
  Service: "🔧",
};

function sendDigestEmail(
  to: string,
  firstName: string,
  items: ReminderItem[]
) {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD is not set.");
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const overdueItems = sortItems(items.filter((i) => i.overdue));
  const dueItems = sortItems(items.filter((i) => !i.overdue));

  const renderItem = (i: ReminderItem) => {
    const color = SOURCE_COLORS[i.source] ?? "#6b7280";
    const icon = SOURCE_ICONS[i.source] ?? "•";
    const time = i.timeOfDay ? ` <span style="color:#6b7280;font-size:12px;">@ ${normalizeTimeTo12h(i.timeOfDay)}</span>` : "";
    const overdueMeta = i.overdue
      ? ` <span style="color:#9ca3af;font-size:12px;">(was due ${formatDateCompact(i.dueDate)})</span>`
      : "";
    const parent = i.parentName
      ? ` <span style="color:#9ca3af;font-size:11px;">· ${i.parentName}</span>`
      : "";
    const badge = `<span style="display:inline-block;background:${color};color:#fff;font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;margin-right:6px;vertical-align:middle;">${i.source}</span>`;
    return `<li style="margin-bottom:10px;color:#374151;">${badge}${icon} ${i.title}${parent}${time}${overdueMeta}</li>`;
  };

  const allCaughtUp = items.length === 0;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lobster&display=swap"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:28px 24px;background:#fffff8;">

  <!-- Header: logo + app name -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding-right:14px;vertical-align:middle;width:60px;">
        <img src="https://home-manager-michellemattoxs-projects.vercel.app/logo.svg" width="60" height="60" alt="Home Manager Logo" style="display:block;"/>
      </td>
      <td style="vertical-align:middle;">
        <div style="color:#FC9853;font-family:'Lobster',Georgia,serif;font-size:26px;letter-spacing:0.5px;line-height:1.25;">Mattox Family</div>
        <div style="color:#FC9853;font-family:'Lobster',Georgia,serif;font-size:26px;letter-spacing:0.5px;line-height:1.25;">Home Management</div>
      </td>
    </tr>
  </table>

  <p style="color:#374151;font-size:15px;margin-bottom:6px;">Hi ${firstName} 👋</p>
  <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">Here are your reminders for <strong>${today}</strong>:</p>

  ${allCaughtUp ? `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 16px;margin-bottom:16px;text-align:center;">
    <p style="color:#16a34a;font-weight:700;font-size:16px;margin:0 0 4px;">🎉 You're all caught up!</p>
    <p style="color:#6b7280;font-size:13px;margin:0;">No tasks, projects, or reminders due today.</p>
  </div>` : ""}

  ${overdueItems.length > 0 ? `
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
    <p style="color:#dc2626;font-weight:700;margin:0 0 10px;">⚠ Overdue (${overdueItems.length})</p>
    <ul style="margin:0;padding-left:18px;">${overdueItems.map(renderItem).join("")}</ul>
  </div>` : ""}

  ${dueItems.length > 0 ? `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
    <p style="color:#d97706;font-weight:700;margin:0 0 10px;">📋 Due Today (${dueItems.length})</p>
    <ul style="margin:0;padding-left:18px;">${dueItems.map(renderItem).join("")}</ul>
  </div>` : ""}

  <!-- Legend -->
  ${!allCaughtUp ? `
  <div style="margin-top:8px;margin-bottom:16px;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">
      ${Object.entries(SOURCE_COLORS).map(([label, color]) =>
        `<span style="display:inline-block;background:${color};color:#fff;font-size:9px;font-weight:600;padding:1px 5px;border-radius:3px;margin-right:4px;">${label}</span>`
      ).join("")}
    </p>
  </div>` : ""}

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
  <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">
    Mattox Family Home Management · Daily Digest
  </p>
  <p style="margin:0;">
    <a href="https://home-manager-michellemattoxs-projects.vercel.app" style="color:#FC9853;font-size:13px;font-weight:600;text-decoration:none;">Visit the App →</a>
  </p>
</div>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  const itemCount = items.length;
  const subject = itemCount > 0
    ? `Daily Reminders — ${itemCount} item${itemCount === 1 ? "" : "s"} · ${today}`
    : `Daily Digest — All caught up! · ${today}`;

  return transporter.sendMail({
    from: `Mattox Family Home Management <${gmailUser}>`,
    to,
    subject,
    html,
  });
}

// ── Push notification helpers ───────────────────────────────────────────────

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Fall";
  return "Winter";
}

async function generateSmartPushMessage(
  items: ReminderItem[],
  season: string,
  weatherSummary: string
): Promise<{ title: string; body: string }> {
  const fallback = {
    title: items.length === 1
      ? `Reminder: ${items[0].title}`
      : `${items.length} reminders today`,
    body: items.slice(0, 3).map((i) => `[${i.source}] ${i.title}`).join(", "),
  };

  if (!ANTHROPIC_API_KEY) return fallback;

  const overdue = items.filter((i) => i.overdue);
  const due = items.filter((i) => !i.overdue);

  // Group by source for context
  const sourceSummary = Object.entries(
    items.reduce((acc, i) => { acc[i.source] = (acc[i.source] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([s, n]) => `${n} ${s.toLowerCase()}${n > 1 ? "s" : ""}`).join(", ");

  const prompt = `Generate a short, specific push notification for a household management app.

Season: ${season}
Weather today: ${weatherSummary}
Overdue (${overdue.length}): ${overdue.map((i) => `"${i.title}" [${i.source}] (was due ${i.dueDate})`).join(", ") || "none"}
Due today (${due.length}): ${due.map((i) => `"${i.title}" [${i.source}]`).join(", ") || "none"}
Summary: ${sourceSummary}

Rules:
- Lead with the single most urgent item by name
- If tasks are overdue mention how many
- Plain language, no emojis in body
- title: ≤50 chars, punchy
- body: ≤110 chars, 1-2 sentences

Respond ONLY with JSON (no markdown): {"title": "...", "body": "..."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const rawText = data.content?.[0]?.text ?? "{}";
    const match = rawText.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (parsed?.title && parsed?.body) return parsed;
  } catch { /* fall through */ }

  return fallback;
}

async function sendPushNotifications(messages: object[]) {
  if (!messages.length) return null;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  return res.json();
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const today = getTodayPT();

    // ── Test mode: send real digest for the given email ──────────────────────
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    if (body.testEmail) {
      const testEmail = body.testEmail as string;
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      const testUser = users?.find((u) => u.email?.toLowerCase() === testEmail.toLowerCase());
      if (!testUser) {
        return new Response(
          JSON.stringify({ error: `No user found with email ${testEmail}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: testMember } = await supabase
        .from("household_members")
        .select("id, display_name, household_id")
        .eq("user_id", testUser.id)
        .is("invite_token", null)
        .single();
      if (!testMember) {
        return new Response(
          JSON.stringify({ error: "No household member found for this user" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const allItems = await fetchAllItems(testMember.household_id, today);
      const memberItems = filterItemsForMember(allItems, testMember.id);
      const sorted = sortItems(memberItems);

      const firstName = testMember.display_name?.split(" ")[0] ?? "there";
      await sendDigestEmail(testEmail, firstName, sorted);
      return new Response(
        JSON.stringify({ test: true, email: testEmail, itemCount: sorted.length, items: sorted.map((i) => `[${i.source}] ${i.title}`) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Production: hourly cron flow ────────────────────────────────────────

    const currentHourPT = (() => {
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        hour12: false,
      }).format(now);
      const h = parseInt(formatted, 10);
      return isNaN(h) ? now.getUTCHours() : h;
    })();

    const ptDayOfWeek = (() => {
      const d = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short" }).format(now);
      return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[d] ?? now.getUTCDay();
    })();
    const ptDayOfMonth = (() => {
      const d = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "numeric" }).format(now);
      return parseInt(d, 10) || now.getUTCDate();
    })();

    function shouldSendToday(frequency: string, lastSentAt: string | null): boolean {
      if (frequency === "daily") return true;

      if (!lastSentAt) return true; // never sent before — send now

      // Calculate days since last digest in PT
      const lastSent = new Date(lastSentAt);
      const lastSentDatePT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(lastSent);
      const daysSinceLast = Math.floor(
        (new Date(today + "T00:00:00").getTime() - new Date(lastSentDatePT + "T00:00:00").getTime()) / 86400000
      );

      if (frequency === "every_other_day") return daysSinceLast >= 2;
      if (frequency === "weekly") return daysSinceLast >= 7;
      if (frequency === "monthly") return daysSinceLast >= 28;
      return true;
    }

    // 1. Load ALL notification preferences
    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("member_id, household_id, overdue_enabled, due_soon_enabled, reminder_hour, reminder_frequency, last_digest_sent_at");

    if (!allPrefs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No members have notification preferences" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Filter to eligible members
    const eligiblePrefs = allPrefs.filter((p) => {
      if (p.reminder_hour !== currentHourPT) return false;
      if (!shouldSendToday(p.reminder_frequency, p.last_digest_sent_at)) return false;
      if (p.last_digest_sent_at) {
        const minutesSinceLast = (now.getTime() - new Date(p.last_digest_sent_at).getTime()) / 60000;
        if (minutesSinceLast < 55) return false;
      }
      return true;
    });

    if (!eligiblePrefs.length) {
      return new Response(JSON.stringify({ sent: 0, skipped: allPrefs.length, currentHourPT, message: "No members eligible this hour" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eligibleMemberIds = eligiblePrefs.map((p) => p.member_id);
    const prefsByMemberId: Record<string, typeof allPrefs[0]> = {};
    for (const p of allPrefs) prefsByMemberId[p.member_id] = p;

    // 3. Load member records
    const { data: allMembers } = await supabase
      .from("household_members")
      .select("id, user_id, display_name, household_id")
      .in("id", eligibleMemberIds)
      .is("invite_token", null);

    if (!allMembers?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No matching member records" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Fetch all items per household (cache per household to avoid duplicate queries)
    const householdIds = [...new Set(allMembers.map((m) => m.household_id))];
    const itemsByHousehold: Record<string, any[]> = {};
    for (const hhId of householdIds) {
      itemsByHousehold[hhId] = await fetchAllItems(hhId, today);
    }

    // 5. Send email digest to each eligible member
    let emailsSent = 0;
    let skipped = 0;
    const userIds: string[] = [];
    const memberItemsMap: Record<string, ReminderItem[]> = {};

    for (const member of allMembers) {
      if (!member.user_id) { skipped++; continue; }

      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userData?.user?.email;
      if (!email) { skipped++; continue; }

      const allItems = itemsByHousehold[member.household_id] ?? [];
      let memberItems = filterItemsForMember(allItems, member.id);

      // Apply overdue/due-soon preferences
      const prefs = prefsByMemberId[member.id];
      if (prefs) {
        memberItems = memberItems.filter((item) => {
          if (item.overdue && !prefs.overdue_enabled) return false;
          if (!item.overdue && !prefs.due_soon_enabled) return false;
          return true;
        });
      }

      const sorted = sortItems(memberItems);
      memberItemsMap[member.id] = sorted;

      const firstName = member.display_name?.split(" ")[0] ?? "there";
      await sendDigestEmail(email, firstName, sorted);
      emailsSent++;
      userIds.push(member.user_id);

      await supabase
        .from("notification_preferences")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("member_id", member.id);
    }

    // 6. Build smart push notifications
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("user_id, expo_push_token")
      .in("user_id", userIds);

    const { data: recentWeather } = await supabase
      .from("garden_weather_logs")
      .select("household_id, log_date, temp_high_f, rainfall_mm, condition_main")
      .in("household_id", householdIds)
      .gte("log_date", (() => {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d.toISOString().split("T")[0];
      })())
      .order("log_date", { ascending: false });

    const weatherByHousehold: Record<string, string> = {};
    for (const hhId of householdIds) {
      const logs = (recentWeather ?? []).filter((w) => w.household_id === hhId).slice(0, 3);
      if (logs.length) {
        const latest = logs[0];
        weatherByHousehold[hhId] =
          `${latest.condition_main ?? "Unknown"}, ${latest.temp_high_f ?? "?"}°F, ` +
          `${logs.reduce((s, w) => s + (w.rainfall_mm ?? 0), 0).toFixed(1)}mm rain last 7 days`;
      } else {
        weatherByHousehold[hhId] = "No recent weather data";
      }
    }

    const season = getSeason(now.getMonth() + 1);
    const householdByUserId: Record<string, string> = {};
    for (const m of allMembers ?? []) {
      if (m.user_id) householdByUserId[m.user_id] = m.household_id;
    }

    const tokensByUserId: Record<string, string[]> = {};
    for (const t of tokens ?? []) {
      if (!tokensByUserId[t.user_id]) tokensByUserId[t.user_id] = [];
      tokensByUserId[t.user_id].push(t.expo_push_token);
    }

    const smartMessageResults = await Promise.all(
      Object.entries(tokensByUserId).map(async ([userId, userTokens]) => {
        const member = (allMembers ?? []).find((m) => m.user_id === userId);
        const items = member ? (memberItemsMap[member.id] ?? []) : [];
        if (!items.length) return null;
        const hhId = householdByUserId[userId] ?? householdIds[0];
        const weatherSummary = weatherByHousehold[hhId] ?? "No weather data";
        const msg = await generateSmartPushMessage(items, season, weatherSummary);
        return userTokens.map((tok) => ({
          to: tok,
          title: msg.title,
          body: msg.body,
          data: { screen: "tasks" },
        }));
      })
    );

    const pushMessages = smartMessageResults.flat().filter(Boolean);
    const pushResult = await sendPushNotifications(pushMessages);

    return new Response(
      JSON.stringify({ emailsSent, skipped, pushSent: pushMessages.length, pushResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
