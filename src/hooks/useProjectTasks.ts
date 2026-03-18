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
      checklist_name = "General",
      assigned_member_id,
      due_date,
    }: {
      project_id: string;
      title: string;
      sort_order: number;
      checklist_name?: string;
      assigned_member_id?: string | null;
      due_date?: string | null;
    }) => {
      const { error } = await supabase
        .from("project_tasks")
        .insert({ project_id, title, sort_order, checklist_name, assigned_member_id, due_date });
      if (error) throw error;
      return { project_id };
    },
    onSuccess: ({ project_id }) =>
      qc.invalidateQueries({ queryKey: ["project", project_id] }),
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
      const { error } = await supabase
        .from("project_tasks")
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: ({ project_id }) =>
      qc.invalidateQueries({ queryKey: ["project", project_id] }),
  });
}

export function useCompleteProjectChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      task,
      completedByMemberId,
    }: {
      task: ProjectTask;
      completedByMemberId: string | null;
    }) => {
      const { error: archiveError } = await supabase
        .from("completed_checklist_items")
        .insert({
          source_type: "project",
          source_id: task.project_id,
          original_task_id: task.id,
          title: task.title,
          checklist_name: task.checklist_name ?? "General",
          assigned_member_id: task.assigned_member_id,
          due_date: task.due_date,
          completed_by: completedByMemberId,
        });
      if (archiveError) throw archiveError;

      const { error: deleteError } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", task.id);
      if (deleteError) throw deleteError;

      return { project_id: task.project_id };
    },
    onSuccess: ({ project_id }) => {
      qc.invalidateQueries({ queryKey: ["project", project_id] });
      qc.invalidateQueries({ queryKey: ["completed_checklist", "project", project_id] });
    },
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
