import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type AdvisorRec = {
  id: string;
  household_id: string;
  generated_date: string;
  recommendation: string;
  action_label: string;
  action_type: "watering" | "pests" | "garden" | "tasks" | "harvest";
  priority: "urgent" | "normal" | "info";
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
};

export function useGardenAdvisorRecs(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_advisor_recs", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("garden_advisor_recommendations" as any)
        .select("*")
        .eq("household_id", householdId)
        .eq("generated_date", today)
        .eq("status", "pending")
        .order("priority", { ascending: true }) // urgent first
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdvisorRec[];
    },
    enabled: !!householdId,
  });
}

export function useGenerateGardenAdvisor() {
  const qc = useQueryClient();
  return async (householdId: string) => {
    const { error } = await supabase.functions.invoke("garden-advisor", {
      body: { householdId },
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["garden_advisor_recs", householdId] });
  };
}

export function useDismissAdvisorRec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from("garden_advisor_recommendations" as any)
        .update({ status: "dismissed" })
        .eq("id", recId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["garden_advisor_recs"] });
    },
  });
}

export function useAcceptAdvisorRec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from("garden_advisor_recommendations" as any)
        .update({ status: "accepted" })
        .eq("id", recId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["garden_advisor_recs"] });
    },
  });
}
