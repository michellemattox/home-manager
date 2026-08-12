import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUndoStore } from "@/stores/undoStore";
import { useCompletedStore } from "@/stores/completedStore";
import type { Task } from "@/types/app.types";

export function useTasks(householdId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("household_id", householdId)
        .eq("is_completed", false)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    enabled: !!householdId,
  });
}

export function useCompletedTasks(householdId: string | undefined) {
  return useQuery({
    queryKey: ["tasks_completed", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("household_id", householdId)
        .eq("is_completed", true)
        .order("completed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    enabled: !!householdId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      task: Omit<Task, "id" | "created_at" | "is_completed" | "completed_at">
    ) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, is_completed: false })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["tasks", data.household_id] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      updates,
    }: {
      id: string;
      householdId: string;
      updates: Partial<Task>;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["tasks", householdId] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
    }: {
      id: string;
      householdId: string;
    }) => ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      // Cross-off pattern: keep the item in the active list (rendered
      // struck-through via completedStore) instead of hiding it behind a
      // 2-second undo bar. We deliberately do NOT invalidate the active
      // ["tasks"] query here so the struck row stays visible until the next
      // real refetch (pull-to-refresh / focus), when it drops off naturally.
      useCompletedStore.getState().markCompleted(id, async () => {
        const { error } = await supabase
          .from("tasks")
          .update({ is_completed: false, completed_at: null })
          .eq("id", id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["tasks_completed", householdId] });
      });

      supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error(error);
            useCompletedStore.getState().unmark(id);
          } else {
            qc.invalidateQueries({ queryKey: ["tasks_completed", householdId] });
          }
        });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) =>
      ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["tasks", householdId] as const;
      const items = qc.getQueryData<Task[]>(queryKey);
      const item = items?.find((t) => t.id === id);
      const index = items?.findIndex((t) => t.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: Task[] | undefined) =>
        old ? old.filter((t) => t.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Task",
        restore: () =>
          qc.setQueryData(queryKey, (old: Task[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("tasks").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}
