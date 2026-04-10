import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUndoStore } from "@/stores/undoStore";
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
      notes,
    }: {
      project_id: string;
      title: string;
      sort_order: number;
      checklist_name?: string;
      assigned_member_id?: string | null;
      due_date?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from("project_tasks")
        .insert({ project_id, title, sort_order, checklist_name, assigned_member_id, due_date, notes });
      if (error) throw error;
      return { project_id };
    },
    onSuccess: ({ project_id }) =>
      qc.invalidateQueries({ queryKey: ["project", project_id] }),
  });
}

export function useUpdateProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      project_id,
      updates,
    }: {
      id: string;
      project_id: string;
      updates: Partial<Pick<ProjectTask, "title" | "due_date" | "assigned_member_id" | "checklist_name" | "notes">>;
    }) => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Save timed out. Please check your connection and try again.")), 12000)
      );
      const request = supabase
        .from("project_tasks")
        .update(updates)
        .eq("id", id)
        .then(({ error }) => { if (error) throw error; return { project_id }; });
      return Promise.race([request, timeout]);
    },
    onSuccess: ({ project_id }) => {
      qc.invalidateQueries({ queryKey: ["project", project_id] });
      qc.invalidateQueries({ queryKey: ["all_project_tasks"] });
    },
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
    }) => ({ task, completedByMemberId }),
    onSuccess: ({ task, completedByMemberId }) => {
      const allTasksKey = ["all_project_tasks"] as const;
      const allTasks = qc.getQueryData<ProjectTask[]>(allTasksKey);
      const index = allTasks?.findIndex((t) => t.id === task.id) ?? -1;

      // Optimistically remove from all project tasks cache
      qc.setQueryData(allTasksKey, (old: ProjectTask[] | undefined) =>
        old ? old.filter((t) => t.id !== task.id) : old
      );

      useUndoStore.getState().schedule({
        label: "Task completed",
        restore: () => {
          qc.setQueryData(allTasksKey, (old: ProjectTask[] | undefined) => {
            if (!old) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, task);
            return arr;
          });
        },
        execute: async () => {
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

          qc.invalidateQueries({ queryKey: ["project", task.project_id] });
          qc.invalidateQueries({ queryKey: ["completed_checklist", "project", task.project_id] });
          qc.invalidateQueries({ queryKey: allTasksKey });
        },
      });
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
      return { id, project_id };
    },
    onSuccess: ({ id, project_id }) => {
      // Optimistically remove from the all-tasks cache so the list updates instantly
      qc.setQueriesData({ queryKey: ["all_project_tasks"] }, (old: ProjectTask[] | undefined) =>
        old ? old.filter((t) => t.id !== id) : old
      );
      qc.invalidateQueries({ queryKey: ["project", project_id] });
      qc.invalidateQueries({ queryKey: ["all_project_tasks"] });
    },
  });
}

// Fetches all uncompleted project_tasks across all household projects
export function useAllProjectTasks(householdId: string | undefined) {
  return useQuery({
    queryKey: ["all_project_tasks", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      // Step 1: get active project IDs + titles
      const { data: projectData, error: projErr } = await supabase
        .from("projects")
        .select("id, title")
        .eq("household_id", householdId)
        .not("status", "in", '("completed","finished")');
      if (projErr) throw projErr;

      const projects = projectData ?? [];
      if (projects.length === 0) return [];

      const projectIds = projects.map((p) => p.id);
      const projectTitleMap: Record<string, string> = Object.fromEntries(
        projects.map((p) => [p.id, p.title])
      );

      // Step 2: get all uncompleted tasks for those projects
      const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .in("project_id", projectIds)
        .eq("is_completed", false)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;

      return (data ?? []).map((t) => ({
        ...(t as ProjectTask & { notes: string | null }),
        project_title: projectTitleMap[t.project_id] ?? "",
      }));
    },
    enabled: !!householdId,
  });
}
