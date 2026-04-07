import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUndoStore } from "@/stores/undoStore";
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
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => {
      qc.invalidateQueries({ queryKey: ["tasks", householdId] });
      qc.invalidateQueries({ queryKey: ["tasks_completed", householdId] });
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
