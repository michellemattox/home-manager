import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type WowUpdate = {
  id: string;
  household_id: string;
  week_start: string;
  source_type: "idea" | "project" | "activity" | "goal" | "task";
  source_id: string | null;
  source_tab: string;
  title: string;
  summary: string;
  created_at: string;
};

function getMostRecentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

export function useWowUpdates(householdId: string | undefined) {
  return useQuery({
    queryKey: ["wow_updates", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const weekStart = getMostRecentMonday();
      const { data, error } = await supabase
        .from("wow_updates" as any)
        .select("*")
        .eq("household_id", householdId)
        .eq("week_start", weekStart)
        .order("source_type", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WowUpdate[];
    },
    enabled: !!householdId,
  });
}

export function useGenerateWow() {
  const qc = useQueryClient();
  return async (householdId: string) => {
    const { error } = await supabase.functions.invoke("generate-wow", {
      body: { householdId },
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["wow_updates", householdId] });
  };
}
