import { supabase } from "@/lib/supabase";

export type ParsedTask = {
  title: string;
  description: string | null;
  frequency_type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  frequency_days: number;
  anchor_date: string | null;
  time_of_day: string | null;
  category: string | null;
};

export async function parseTaskFromText(text: string): Promise<ParsedTask> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out. Check your connection and try again.")), 30_000)
  );

  const invoke = supabase.functions.invoke("parse-task", { body: { text } });

  const { data, error } = await Promise.race([invoke, timeout]);

  if (error) {
    // Extract the actual message from FunctionsHttpError when possible
    const msg: string =
      (error as any)?.context?.body
        ? await (error as any).context.json().then((j: any) => j?.error ?? error.message).catch(() => error.message)
        : error.message ?? "AI Assist failed";
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as ParsedTask;
}
