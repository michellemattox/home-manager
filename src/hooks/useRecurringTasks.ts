import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { calculateNextDueDate } from "@/utils/scheduleUtils";
import { useNotificationStore } from "@/stores/notificationStore";
import { isOverdue } from "@/utils/dateUtils";
import { useUndoStore } from "@/stores/undoStore";
import type { RecurringTask, RecurringTaskCompletion } from "@/types/app.types";

export function useRecurringTasks(householdId: string | undefined) {
  const setOverdueCount = useNotificationStore((s) => s.setOverdueTaskCount);

  return useQuery({
    queryKey: ["recurring_tasks", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("recurring_tasks")
        .select("*")
        .eq("household_id", householdId)
        .eq("is_active", true)
        .order("next_due_date");
      if (error) throw error;
      const tasks = (data ?? []) as RecurringTask[];
      const overdue = tasks.filter((t) => isOverdue(t.next_due_date)).length;
      setOverdueCount(overdue);
      return tasks;
    },
    enabled: !!householdId,
  });
}

export function useCreateRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      task: Omit<RecurringTask, "id" | "created_at" | "last_completed_at">
    ) => {
      const { data, error } = await supabase
        .from("recurring_tasks")
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data as RecurringTask;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["recurring_tasks", data.household_id] }),
  });
}

export function useCompleteRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      task,
      completedBy,
    }: {
      task: RecurringTask;
      completedBy: string;
    }) => ({ task, completedBy }),
    onSuccess: ({ task, completedBy }) => {
      const queryKey = ["recurring_tasks", task.household_id] as const;
      const items = qc.getQueryData<RecurringTask[]>(queryKey);
      const index = items?.findIndex((t) => t.id === task.id) ?? -1;

      const isNoRepeat = task.frequency_type === "no_repeat";
      const newDueDate = isNoRepeat
        ? task.next_due_date
        : calculateNextDueDate(
            task.frequency_type,
            task.frequency_days,
            new Date(task.next_due_date + "T12:00:00")
          );

      // Optimistically update cache: remove if no_repeat, advance due date otherwise
      qc.setQueryData(queryKey, (old: RecurringTask[] | undefined) => {
        if (!old) return old;
        if (isNoRepeat) return old.filter((t) => t.id !== task.id);
        return old.map((t) =>
          t.id === task.id ? { ...t, next_due_date: newDueDate, last_completed_at: new Date().toISOString() } : t
        );
      });

      useUndoStore.getState().schedule({
        label: isNoRepeat ? "Task completed" : "Task marked done",
        restore: () => {
          // Restore original task state in cache
          qc.setQueryData(queryKey, (old: RecurringTask[] | undefined) => {
            if (!old) return old;
            if (isNoRepeat) {
              const arr = [...old];
              arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, task);
              return arr;
            }
            return old.map((t) => (t.id === task.id ? task : t));
          });
        },
        execute: async () => {
          const now = new Date().toISOString();

          const { error: logErr } = await supabase
            .from("recurring_task_completions")
            .insert({
              recurring_task_id: task.id,
              completed_by: completedBy,
              completed_at: now,
              notes: null,
            });
          if (logErr) throw logErr;

          const taskUpdate = isNoRepeat
            ? { last_completed_at: now, is_active: false }
            : { last_completed_at: now, next_due_date: newDueDate };

          const { error: updateErr } = await supabase
            .from("recurring_tasks")
            .update(taskUpdate)
            .eq("id", task.id);
          if (updateErr) throw updateErr;

          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

export function useUpdateRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, householdId }: { id: string; updates: Partial<RecurringTask>; householdId: string }) => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Save timed out. Please check your connection and try again.")), 12000)
      );
      const request = supabase
        .from("recurring_tasks")
        .update(updates)
        .eq("id", id)
        .then(({ error }) => { if (error) throw error; return householdId; });
      return Promise.race([request, timeout]);
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] }),
  });
}

export function useDeleteRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) =>
      ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["recurring_tasks", householdId] as const;
      const items = qc.getQueryData<RecurringTask[]>(queryKey);
      const item = items?.find((t) => t.id === id);
      const index = items?.findIndex((t) => t.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: RecurringTask[] | undefined) =>
        old ? old.filter((t) => t.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Maintenance task",
        restore: () =>
          qc.setQueryData(queryKey, (old: RecurringTask[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase
            .from("recurring_tasks")
            .update({ is_active: false })
            .eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

export function useTaskCompletions(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_completions", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from("recurring_task_completions")
        .select("*")
        .eq("recurring_task_id", taskId)
        .order("completed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RecurringTaskCompletion[];
    },
    enabled: !!taskId,
  });
}
