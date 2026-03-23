import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const fromEmail = Deno.env.get("REMINDER_FROM_EMAIL") ?? "reminders@mattoxhome.com";

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
  if (!resendApiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Go to Supabase Dashboard → Edge Functions → send-reminders → Secrets and add RESEND_API_KEY."
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

  const logoSvg = `<svg width="60" height="60" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="85" fill="#7dd3fc"/><circle cx="100" cy="100" r="85" fill="url(#skyGradient)" opacity="0.5"/><ellipse cx="100" cy="160" rx="80" ry="30" fill="#65a30d"/><ellipse cx="100" cy="158" rx="75" ry="25" fill="#84cc16" opacity="0.8"/><rect x="55" y="70" width="18" height="80" fill="#78350f" rx="3"/><rect x="127" y="70" width="18" height="80" fill="#78350f" rx="3"/><path d="M64 70 L64 75 L95 110 L100 110 L100 105 L73 75 L73 70 Z" fill="#92400e"/><path d="M136 70 L136 75 L105 110 L100 110 L100 105 L127 75 L127 70 Z" fill="#92400e"/><rect x="91" y="105" width="18" height="45" fill="#78350f" rx="3"/><path d="M100 50 L150 75 L145 80 L100 58 L55 80 L50 75 Z" fill="#b45309"/><rect x="93" y="130" width="14" height="20" fill="#92400e" rx="2"/><circle cx="103" cy="140" r="1.5" fill="#d97706"/><circle cx="160" cy="40" r="14" fill="#fbbf24" opacity="0.6"/><circle cx="160" cy="40" r="10" fill="#fde047"/><defs><linearGradient id="skyGradient" x1="100" y1="15" x2="100" y2="185"><stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#7dd3fc"/></linearGradient></defs></svg>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:28px 24px;background:#fffff8;">

  <!-- Header: logo + app name -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding-right:14px;vertical-align:middle;width:60px;">${logoSvg}</td>
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: `Mattox Family Home Management <${fromEmail}>`,
      to,
      subject: `Daily Reminders — ${items.length} item${items.length === 1 ? "" : "s"} · ${today}`,
      html,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${JSON.stringify(json)}`);
  return json;
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
      const testUser = users?.find((u) => u.email === testEmail);
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

    // ── 1. Load notification preferences for all members ─────────────────────
    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("member_id, overdue_enabled, due_soon_enabled, reminder_hour, reminder_frequency");

    const prefsByMemberId: Record<string, {
      overdue_enabled: boolean;
      due_soon_enabled: boolean;
      reminder_hour: number;
      reminder_frequency: string;
    }> = {};
    for (const p of allPrefs ?? []) {
      prefsByMemberId[p.member_id] = p;
    }

    // Helper: should this member receive a reminder today based on frequency?
    function shouldSendToday(frequency: string): boolean {
      if (frequency === "daily") return true;
      if (frequency === "every_other_day") {
        const daysSinceEpoch = Math.floor(now.getTime() / 86400000);
        return daysSinceEpoch % 2 === 0;
      }
      if (frequency === "weekly") return now.getUTCDay() === 1; // Monday
      if (frequency === "monthly") return now.getUTCDate() === 1;
      return true;
    }

    // ── 2. Fetch all active recurring tasks due today or overdue ──────────────
    const { data: recurringTasks, error: rtError } = await supabase
      .from("recurring_tasks")
      .select(`
        id, title, next_due_date, household_id, assigned_member_id, time_of_day,
        household_members!assigned_member_id (id, user_id, display_name)
      `)
      .eq("is_active", true)
      .lte("next_due_date", today);
    if (rtError) throw rtError;

    if (!recurringTasks?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No tasks due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Load all household members (needed for unassigned tasks) ───────────
    const householdIds = [...new Set(recurringTasks.map((t) => t.household_id))];
    const { data: allMembers } = await supabase
      .from("household_members")
      .select("id, user_id, display_name, household_id")
      .in("household_id", householdIds)
      .is("invite_token", null);

    const membersByHousehold: Record<string, typeof allMembers> = {};
    for (const m of allMembers ?? []) {
      if (!membersByHousehold[m.household_id]) membersByHousehold[m.household_id] = [];
      membersByHousehold[m.household_id]!.push(m);
    }

    // ── 4. Group tasks by user_id ─────────────────────────────────────────────
    const tasksByUserId: Record<string, ReminderItem[]> = {};

    const addItem = (userId: string, item: ReminderItem) => {
      if (!tasksByUserId[userId]) tasksByUserId[userId] = [];
      if (!tasksByUserId[userId].some((i) => i.title === item.title)) {
        tasksByUserId[userId].push(item);
      }
    };

    for (const task of recurringTasks) {
      const overdue = task.next_due_date < today;
      const item: ReminderItem = {
        title: task.title,
        dueDate: task.next_due_date,
        overdue,
        timeOfDay: (task as any).time_of_day ?? null,
      };

      if (task.assigned_member_id) {
        const member = task.household_members as any;
        if (member?.user_id) {
          const prefs = prefsByMemberId[task.assigned_member_id];
          // Skip entirely if this member has no saved notification preferences
          if (!prefs) continue;
          if (overdue && !prefs.overdue_enabled) continue;
          if (!overdue && !prefs.due_soon_enabled) continue;
          addItem(member.user_id, item);
        }
      } else {
        // Unassigned task — add to all members who have prefs set up
        for (const m of membersByHousehold[task.household_id] ?? []) {
          if (!m.user_id) continue;
          const prefs = prefsByMemberId[m.id];
          if (!prefs) continue; // skip members with no saved preferences
          if (overdue && !prefs.overdue_enabled) continue;
          if (!overdue && !prefs.due_soon_enabled) continue;
          addItem(m.user_id, item);
        }
      }
    }

    const userIds = Object.keys(tasksByUserId);
    if (!userIds.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Send email digest to each user (respecting their prefs) ────────────
    let emailsSent = 0;
    let skipped = 0;
    for (const userId of userIds) {
      const items = tasksByUserId[userId];
      if (!items.length) continue;

      // Find this user's member record and their saved prefs
      const member = (allMembers ?? []).find((m) => m.user_id === userId);
      const prefs = member ? prefsByMemberId[member.id] : undefined;

      // No saved preferences = user has not opted in to reminders
      if (!prefs) { skipped++; continue; }

      // Only send on the right day based on their chosen frequency
      if (!shouldSendToday(prefs.reminder_frequency)) { skipped++; continue; }

      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      const firstName =
        (allMembers ?? []).find((m) => m.user_id === userId)?.display_name?.split(" ")[0] ??
        "there";

      await sendDigestEmail(email, firstName, items);
      emailsSent++;
    }

    // ── 5. Also send push notifications if device tokens exist ────────────────
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("user_id, expo_push_token")
      .in("user_id", userIds);

    const pushMessages = (tokens ?? [])
      .map((token) => {
        const items = tasksByUserId[token.user_id] ?? [];
        if (!items.length) return null;
        return {
          to: token.expo_push_token,
          title:
            items.length === 1
              ? `Reminder: ${items[0].title}`
              : `${items.length} reminders today`,
          body: items.map((i) => i.title).join(", "),
          data: { screen: "tasks" },
        };
      })
      .filter(Boolean);

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
