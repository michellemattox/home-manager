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
}

async function sendDigestEmail(
  to: string,
  firstName: string,
  items: ReminderItem[]
) {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error(
      "GMAIL_USER or GMAIL_APP_PASSWORD is not set. Go to Supabase Dashboard → Edge Functions → send-reminders → Secrets."
    );
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const overdueItems = items.filter((i) => i.overdue);
  const dueItems = items.filter((i) => !i.overdue);

  const listItems = (arr: ReminderItem[]) =>
    arr
      .map((i) => {
        const time = i.timeOfDay ? ` <span style="color:#6b7280;font-size:12px;">@ ${i.timeOfDay}</span>` : "";
        const overdueMeta = i.overdue
          ? ` <span style="color:#9ca3af;font-size:12px;">(was due ${i.dueDate})</span>`
          : "";
        return `<li style="margin-bottom:8px;color:#374151;">${i.title}${time}${overdueMeta}</li>`;
      })
      .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lobster&display=swap"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
  @font-face {
    font-family: 'Lobster';
    font-style: normal;
    font-weight: 400;
    src: url('https://fonts.gstatic.com/s/lobster/v30/neILzCirqoswsqX9zoKmMw.woff2') format('woff2');
  }
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

  ${
    overdueItems.length > 0
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
           <p style="color:#dc2626;font-weight:700;margin:0 0 8px;">⚠ Overdue (${overdueItems.length})</p>
           <ul style="margin:0;padding-left:18px;">${listItems(overdueItems)}</ul>
         </div>`
      : ""
  }

  ${
    dueItems.length > 0
      ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
           <p style="color:#d97706;font-weight:700;margin:0 0 8px;">📋 Due Today (${dueItems.length})</p>
           <ul style="margin:0;padding-left:18px;">${listItems(dueItems)}</ul>
         </div>`
      : ""
  }

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
  await transporter.sendMail({
    from: `Mattox Family Home Management <${gmailUser}>`,
    to,
    subject: `Daily Reminders — ${items.length} item${items.length === 1 ? "" : "s"} · ${today}`,
    html,
  });
}

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
    body: items.slice(0, 3).map((i) => i.title).join(", "),
  };

  if (!ANTHROPIC_API_KEY) return fallback;

  const overdue = items.filter((i) => i.overdue);
  const due = items.filter((i) => !i.overdue);

  const prompt = `Generate a short, specific push notification for a household management app.

Season: ${season}
Weather today: ${weatherSummary}
Overdue tasks (${overdue.length}): ${overdue.map((i) => `"${i.title}" (was due ${i.dueDate})`).join(", ") || "none"}
Due today (${due.length}): ${due.map((i) => `"${i.title}"`).join(", ") || "none"}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date();
    // Use Pacific Time (Seattle) for "today" date comparisons
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);

    // ── Test mode: send real digest for the given email ──────────────────────
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    if (body.testEmail) {
      const testEmail = body.testEmail as string;
      // Look up the user by email
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      const testUser = users?.find((u) => u.email?.toLowerCase() === testEmail.toLowerCase());
      if (!testUser) {
        return new Response(
          JSON.stringify({ error: `No user found with email ${testEmail}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Get their member record and tasks due today or overdue
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
      const { data: testTasks } = await supabase
        .from("recurring_tasks")
        .select("title, next_due_date, time_of_day")
        .eq("household_id", testMember.household_id)
        .eq("is_active", true)
        .lte("next_due_date", today);
      const testItems: ReminderItem[] = (testTasks ?? []).map((t) => ({
        title: t.title,
        dueDate: t.next_due_date,
        overdue: t.next_due_date < today,
        timeOfDay: (t as any).time_of_day ?? null,
      }));
      // Always send so the user can preview the email format
      const firstName = testMember.display_name?.split(" ")[0] ?? "there";
      const itemsToSend: ReminderItem[] = testItems.length > 0
        ? testItems
        : [{ title: "You're all caught up — no tasks due today!", dueDate: today, overdue: false }];
      const result = await sendDigestEmail(testEmail, firstName, itemsToSend);
      return new Response(
        JSON.stringify({ test: true, email: testEmail, taskCount: testItems.length, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Current hour in Pacific Time — used to match each member's reminder_hour preference.
    // The cron fires hourly; we only email members whose reminder_hour matches now.
    const currentHourPT = (() => {
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        hour12: false,
      }).format(now);
      const h = parseInt(formatted, 10);
      return isNaN(h) ? now.getUTCHours() : h;
    })();

    // Pacific Time day-of-week / day-of-month for frequency checks
    const ptDayOfWeek = (() => {
      const d = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short" }).format(now);
      return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[d] ?? now.getUTCDay();
    })();
    const ptDayOfMonth = (() => {
      const d = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "numeric" }).format(now);
      return parseInt(d, 10) || now.getUTCDate();
    })();

    function shouldSendToday(frequency: string): boolean {
      if (frequency === "daily") return true;
      if (frequency === "every_other_day") return Math.floor(now.getTime() / 86400000) % 2 === 0;
      if (frequency === "weekly") return ptDayOfWeek === 1; // Monday PT
      if (frequency === "monthly") return ptDayOfMonth === 1;
      return true;
    }

    // ── 1. Load ALL notification preferences ─────────────────────────────────
    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("member_id, household_id, overdue_enabled, due_soon_enabled, reminder_hour, reminder_frequency, last_digest_sent_at");

    if (!allPrefs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No members have notification preferences" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Filter to members who should receive an email RIGHT NOW ───────────
    // Member-first: find eligible members, then gather their tasks.
    // Guarantees delivery even when a member has zero due tasks ("all caught up").
    const eligiblePrefs = allPrefs.filter((p) => {
      if (p.reminder_hour !== currentHourPT) return false;
      if (!shouldSendToday(p.reminder_frequency)) return false;
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

    // ── 3. Load member records for eligible members ──────────────────────────
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

    const householdIds = [...new Set(allMembers.map((m) => m.household_id))];

    // ── 4. Fetch all active recurring tasks due today or overdue ──────────────
    const { data: recurringTasks } = await supabase
      .from("recurring_tasks")
      .select("id, title, next_due_date, household_id, assigned_member_id, time_of_day")
      .eq("is_active", true)
      .in("household_id", householdIds)
      .lte("next_due_date", today);

    // ── 5. Group tasks by member_id ──────────────────────────────────────────
    const tasksByMemberId: Record<string, ReminderItem[]> = {};
    for (const m of allMembers) tasksByMemberId[m.id] = [];

    for (const task of recurringTasks ?? []) {
      const overdue = task.next_due_date < today;
      const item: ReminderItem = {
        title: task.title,
        dueDate: task.next_due_date,
        overdue,
        timeOfDay: (task as any).time_of_day ?? null,
      };

      if (task.assigned_member_id) {
        if (tasksByMemberId[task.assigned_member_id]) {
          const prefs = prefsByMemberId[task.assigned_member_id];
          if (prefs) {
            if (overdue && !prefs.overdue_enabled) continue;
            if (!overdue && !prefs.due_soon_enabled) continue;
          }
          tasksByMemberId[task.assigned_member_id].push(item);
        }
      } else {
        for (const m of allMembers) {
          if (m.household_id !== task.household_id) continue;
          const prefs = prefsByMemberId[m.id];
          if (prefs) {
            if (overdue && !prefs.overdue_enabled) continue;
            if (!overdue && !prefs.due_soon_enabled) continue;
          }
          if (!tasksByMemberId[m.id].some((i) => i.title === item.title)) {
            tasksByMemberId[m.id].push(item);
          }
        }
      }
    }

    // ── 6. Send email digest to each eligible member ─────────────────────────
    let emailsSent = 0;
    let skipped = 0;
    const userIds: string[] = [];

    for (const member of allMembers) {
      if (!member.user_id) { skipped++; continue; }

      const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
      const email = userData?.user?.email;
      if (!email) { skipped++; continue; }

      const items = tasksByMemberId[member.id] ?? [];
      const firstName = member.display_name?.split(" ")[0] ?? "there";

      // Always send — if no tasks, send "all caught up"
      const itemsToSend = items.length > 0
        ? items
        : [{ title: "You're all caught up — no tasks due today!", dueDate: today, overdue: false }];

      await sendDigestEmail(email, firstName, itemsToSend);
      emailsSent++;
      userIds.push(member.user_id);

      await supabase
        .from("notification_preferences")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("member_id", member.id);
    }

    // ── 7. Build smart push notifications via Claude ──────────────────────────
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("user_id, expo_push_token")
      .in("user_id", userIds);

    // Fetch recent weather for all households (last 7 days) to give Claude context
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

    // Summarize weather per household
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

    // Find which household each user belongs to
    const householdByUserId: Record<string, string> = {};
    for (const m of allMembers ?? []) {
      if (m.user_id) householdByUserId[m.user_id] = m.household_id;
    }

    // Generate smart messages for all users with tokens in parallel
    const tokensByUserId: Record<string, string[]> = {};
    for (const t of tokens ?? []) {
      if (!tokensByUserId[t.user_id]) tokensByUserId[t.user_id] = [];
      tokensByUserId[t.user_id].push(t.expo_push_token);
    }

    const smartMessageResults = await Promise.all(
      Object.entries(tokensByUserId).map(async ([userId, userTokens]) => {
        const member = (allMembers ?? []).find((m) => m.user_id === userId);
        const items = member ? (tasksByMemberId[member.id] ?? []) : [];
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
