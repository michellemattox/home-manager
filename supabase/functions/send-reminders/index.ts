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

  const listItems = (arr: ReminderItem[], color: string) =>
    arr
      .map(
        (i) =>
          `<li style="margin-bottom:6px;color:#374151;">${i.title}${
            i.overdue
              ? ` <span style="color:#9ca3af;font-size:12px;">(was due ${i.dueDate})</span>`
              : ""
          }</li>`
      )
      .join("");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:28px 24px;background:#fffff8;">
  <div style="margin-bottom:20px;">
    <span style="font-size:26px;font-weight:700;color:#FC9853;letter-spacing:0.5px;">Mattox Family</span><br/>
    <span style="font-size:18px;color:#FC9853;font-weight:400;">Home Management</span>
  </div>

  <p style="color:#374151;font-size:15px;margin-bottom:6px;">Hi ${firstName} 👋</p>
  <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">Here are your reminders for <strong>${today}</strong>:</p>

  ${
    overdueItems.length > 0
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
           <p style="color:#dc2626;font-weight:700;margin:0 0 8px;">⚠ Overdue (${overdueItems.length})</p>
           <ul style="margin:0;padding-left:18px;">${listItems(overdueItems, "#dc2626")}</ul>
         </div>`
      : ""
  }

  ${
    dueItems.length > 0
      ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
           <p style="color:#d97706;font-weight:700;margin:0 0 8px;">📋 Due Today (${dueItems.length})</p>
           <ul style="margin:0;padding-left:18px;">${listItems(dueItems, "#374151")}</ul>
         </div>`
      : ""
  }

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
  <p style="color:#9ca3af;font-size:12px;margin:0;">
    Mattox Family Home Management · Daily Digest<br/>
    Open the app to mark items complete.
  </p>
</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
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
    const today = new Date().toISOString().split("T")[0];

    // ── Test mode: send a sample digest to a specific email ──────────────────
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    if (body.testEmail) {
      const testItems: ReminderItem[] = [
        { title: "Drink water (daily)", dueDate: today, overdue: false },
        { title: "Check HVAC filter", dueDate: today, overdue: true },
      ];
      const result = await sendDigestEmail(body.testEmail as string, "Michelle", testItems);
      return new Response(
        JSON.stringify({ test: true, email: body.testEmail, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Fetch all active recurring tasks due today or overdue ──────────────
    const { data: recurringTasks, error: rtError } = await supabase
      .from("recurring_tasks")
      .select(`
        id, title, next_due_date, household_id, assigned_member_id,
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

    // ── 2. Load all household members (needed for unassigned tasks) ───────────
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

    // ── 3. Group tasks by user_id ─────────────────────────────────────────────
    const tasksByUserId: Record<string, ReminderItem[]> = {};

    const addItem = (userId: string, item: ReminderItem) => {
      if (!tasksByUserId[userId]) tasksByUserId[userId] = [];
      // Deduplicate by title within the same user
      if (!tasksByUserId[userId].some((i) => i.title === item.title)) {
        tasksByUserId[userId].push(item);
      }
    };

    for (const task of recurringTasks) {
      const overdue = task.next_due_date < today;
      const item: ReminderItem = { title: task.title, dueDate: task.next_due_date, overdue };

      if (task.assigned_member_id) {
        // Assigned task — notify only the assigned member
        const member = task.household_members as any;
        if (member?.user_id) addItem(member.user_id, item);
      } else {
        // Unassigned / household-level task — notify all members
        for (const m of membersByHousehold[task.household_id] ?? []) {
          if (m.user_id) addItem(m.user_id, item);
        }
      }
    }

    const userIds = Object.keys(tasksByUserId);
    if (!userIds.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Send email digest to each user ─────────────────────────────────────
    let emailsSent = 0;
    for (const userId of userIds) {
      const items = tasksByUserId[userId];
      if (!items.length) continue;

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
      JSON.stringify({ emailsSent, pushSent: pushMessages.length, pushResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
