import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { calculateNextDueDate } from "@/utils/scheduleUtils";
import { useNotificationStore } from "@/stores/notificationStore";
import { isOverdue } from "@/utils/dateUtils";
import type { RecurringTask, RecurringTaskCompletion } from "@/types/app.types";
import { parseISO } from "date-fns";

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
      notes,
    }: {
      task: RecurringTask;
      completedBy: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const nextDue = calculateNextDueDate(
        task.frequency_type,
        task.frequency_days,
        parseISO(task.next_due_date)
      );

      // Log completion
      const { error: logErr } = await supabase
        .from("recurring_task_completions")
        .insert({
          recurring_task_id: task.id,
          completed_by: completedBy,
          completed_at: now,
          notes: notes ?? null,
        });
      if (logErr) throw logErr;

      // Advance next_due_date
      const { error: updateErr } = await supabase
        .from("recurring_tasks")
        .update({ last_completed_at: now, next_due_date: nextDue })
        .eq("id", task.id);
      if (updateErr) throw updateErr;

      return task.household_id;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] }),
  });
}

export function useUpdateRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, householdId }: { id: string; updates: Partial<RecurringTask>; householdId: string }) => {
      const { error } = await supabase
        .from("recurring_tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] }),
  });
}

export function useDeleteRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("recurring_tasks").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] }),
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
