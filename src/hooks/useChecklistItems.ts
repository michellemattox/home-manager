import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type CompletedChecklistItem =
  Database["public"]["Tables"]["completed_checklist_items"]["Row"];

export function useCompletedChecklistItems(
  sourceType: "project" | "trip",
  sourceId: string | undefined
) {
  return useQuery({
    queryKey: ["completed_checklist", sourceType, sourceId],
    queryFn: async () => {
      if (!sourceId) return [];
      const { data, error } = await supabase
        .from("completed_checklist_items")
        .select("*")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompletedChecklistItem[];
    },
    enabled: !!sourceId,
  });
}

export function useDeleteCompletedChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      sourceType,
      sourceId,
    }: {
      id: string;
      sourceType: "project" | "trip";
      sourceId: string;
    }) => {
      const { error } = await supabase
        .from("completed_checklist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { sourceType, sourceId };
    },
    onSuccess: ({ sourceType, sourceId }) =>
      qc.invalidateQueries({ queryKey: ["completed_checklist", sourceType, sourceId] }),
  });
}
