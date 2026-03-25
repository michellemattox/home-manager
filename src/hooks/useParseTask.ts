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
  const { data, error } = await supabase.functions.invoke("parse-task", {
    body: { text },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as ParsedTask;
}
