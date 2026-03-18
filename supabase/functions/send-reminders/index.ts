import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendExpoPushNotifications(messages: ExpoPushMessage[]) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });
  return response.json();
}

Deno.serve(async (req) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateCutoff = tomorrow.toISOString().split("T")[0];

    // Get tasks due within the next day
    const { data: tasks, error: tasksError } = await supabase
      .from("recurring_tasks")
      .select(
        `
        id,
        title,
        next_due_date,
        household_id,
        assigned_member_id,
        household_members!assigned_member_id (user_id)
      `
      )
      .eq("is_active", true)
      .lte("next_due_date", dueDateCutoff)
      .limit(100);

    if (tasksError) throw tasksError;
    if (!tasks?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Collect unique user IDs to notify
    const userIds = new Set<string>();
    const tasksByUser: Record<string, typeof tasks> = {};

    for (const task of tasks) {
      const member = task.household_members as any;
      if (member?.user_id && member.user_id !== "pending") {
        userIds.add(member.user_id);
        if (!tasksByUser[member.user_id]) tasksByUser[member.user_id] = [];
        tasksByUser[member.user_id].push(task);
      }
    }

    // Get device tokens for these users
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("user_id, expo_push_token")
      .in("user_id", Array.from(userIds));

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, noTokens: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build push messages
    const messages: ExpoPushMessage[] = [];
    for (const token of tokens) {
      const userTasks = tasksByUser[token.user_id] ?? [];
      if (!userTasks.length) continue;

      const title =
        userTasks.length === 1
          ? `Maintenance due: ${userTasks[0].title}`
          : `${userTasks.length} maintenance tasks due`;

      const body =
        userTasks.length === 1
          ? `${userTasks[0].title} is due ${userTasks[0].next_due_date}`
          : userTasks.map((t) => t.title).join(", ");

      messages.push({
        to: token.expo_push_token,
        title,
        body,
        data: { screen: "tasks" },
      });
    }

    const result = await sendExpoPushNotifications(messages);

    return new Response(
      JSON.stringify({ sent: messages.length, result }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
