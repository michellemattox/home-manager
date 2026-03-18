import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProjectTask } from "@/types/app.types";

export function useAddProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      project_id,
      title,
      sort_order,
    }: {
      project_id: string;
      title: string;
      sort_order: number;
    }) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .insert({ project_id, title, sort_order })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTask;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["project", data.project_id] }),
  });
}

export function useToggleProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      is_completed,
    }: {
      id: string;
      project_id: string;
      is_completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTask;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["project", data.project_id] }),
  });
}

export function useDeleteProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: ({ project_id }) =>
      qc.invalidateQueries({ queryKey: ["project", project_id] }),
  });
}
