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

export function useUncompleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
    }: {
      item: CompletedChecklistItem;
    }) => {
      // Re-create the task in its original table
      if (item.source_type === "project") {
        const { error } = await supabase.from("project_tasks").insert({
          project_id: item.source_id,
          title: item.title,
          checklist_name: item.checklist_name,
          assigned_member_id: item.assigned_member_id,
          due_date: item.due_date,
          is_completed: false,
          sort_order: 9999,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trip_tasks").insert({
          trip_id: item.source_id,
          title: item.title,
          checklist_name: item.checklist_name,
          assigned_member_id: item.assigned_member_id,
          due_date: item.due_date,
          is_completed: false,
          sort_order: 9999,
        });
        if (error) throw error;
      }

      // Remove from completed list
      const { error: delError } = await supabase
        .from("completed_checklist_items")
        .delete()
        .eq("id", item.id);
      if (delError) throw delError;

      return { sourceType: item.source_type, sourceId: item.source_id };
    },
    onSuccess: ({ sourceType, sourceId }) => {
      qc.invalidateQueries({ queryKey: ["completed_checklist", sourceType, sourceId] });
      if (sourceType === "project") {
        qc.invalidateQueries({ queryKey: ["project", sourceId] });
        qc.invalidateQueries({ queryKey: ["all_project_tasks"] });
      } else {
        qc.invalidateQueries({ queryKey: ["trip", sourceId] });
        qc.invalidateQueries({ queryKey: ["all_trip_tasks"] });
      }
    },
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
