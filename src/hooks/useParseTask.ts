import { supabase } from "@/lib/supabase";

const FUNCTION_URL = "https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/parse-task";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdGxtdmN4Y2ZmZnRzZGxlZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTg3NTEsImV4cCI6MjA4OTQzNDc1MX0.0WrpJr1KcZYdWQxSnq5jK05Ka-gpAvZKpCqgrfm9wRc";

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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? `Server error ${res.status}`);
    if (json?.error) throw new Error(json.error);
    return json as ParsedTask;
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("Request timed out. Check your connection and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
