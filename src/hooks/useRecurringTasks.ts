import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { calculateNextDueDate } from "@/utils/scheduleUtils";
import { isOverdue, isDueToday, laterOfTodayOrDate } from "@/utils/dateUtils";
import { useUndoStore } from "@/stores/undoStore";
import { useCompletedStore } from "@/stores/completedStore";
import { useTasks } from "@/hooks/useTasks";
import { useFilterStore } from "@/stores/filterStore";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import type { RecurringTask, RecurringTaskCompletion, Task } from "@/types/app.types";

export function useRecurringTasks(householdId: string | undefined) {
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
      return (data ?? []) as RecurringTask[];
    },
    enabled: !!householdId,
  });
}

// Live count of tasks that are overdue or due today across both recurring and
// one-off tasks, honoring the member filter + personal-task visibility rules
// used by the Home and Tasks tabs. Derives from the same TanStack query caches
// so optimistic setQueryData updates re-render the badge instantly.
export function useOverdueOrDueTodayCount(householdId: string | undefined): number {
  const { data: recurring } = useRecurringTasks(householdId);
  const { data: oneOff } = useTasks(householdId);
  const struckIds = useCompletedStore((s) => s.ids);
  const selectedMembers = useFilterStore((s) => s.memberFilter);
  const members = useHouseholdStore((s) => s.members);
  const user = useAuthStore((s) => s.user);
  const currentMemberId = members.find((m) => m.user_id === user?.id)?.id;

  const matchesMember = (memberId: string | null | undefined) => {
    if (selectedMembers.length === 0) return true;
    if (memberId == null) return selectedMembers.includes("__unassigned__");
    return selectedMembers.includes(memberId);
  };
  const isVisible = (memberId: string | null | undefined, isPersonal: boolean | null | undefined) => {
    if (!isPersonal) return true;
    return memberId === currentMemberId;
  };

  const fromRecurring = (recurring ?? []).filter(
    (t: RecurringTask) =>
      !struckIds[t.id] &&
      isVisible(t.assigned_member_id, t.is_personal) &&
      matchesMember(t.assigned_member_id) &&
      (isOverdue(t.next_due_date) || isDueToday(t.next_due_date))
  ).length;
  const fromOneOff = (oneOff ?? []).filter(
    (t: Task) =>
      !struckIds[t.id] &&
      !!t.due_date &&
      isVisible(t.assigned_member_id, t.is_personal) &&
      matchesMember(t.assigned_member_id) &&
      (isOverdue(t.due_date) || isDueToday(t.due_date))
  ).length;

  return fromRecurring + fromOneOff;
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
      // If the task is overdue at completion time, advance from today instead
      // of from the missed due date — otherwise a 2-day repeat completed 1 day
      // late would land tomorrow instead of two days from now.
      const newDueDate = isNoRepeat
        ? task.next_due_date
        : calculateNextDueDate(
            task.frequency_type,
            task.frequency_days,
            laterOfTodayOrDate(task.next_due_date),
            {
              daysOfWeek: (task as any).days_of_week ?? null,
              nthWeek: (task as any).nth_week ?? null,
              nthWeekday: (task as any).nth_weekday ?? null,
            }
          );

      // Cross-off pattern: keep the task visible (rendered struck-through via
      // completedStore) instead of hiding it behind a 2-second undo bar. We
      // leave the cache row as-is (original due date) and do NOT invalidate the
      // active ["recurring_tasks"] query, so the struck row stays until the next
      // real refetch — at which point it reappears with its advanced due date
      // (or drops off, for no-repeat).
      void index; // retained for clarity; no longer used for cache splicing

      // Captured after the write so the undo closure can delete the log row.
      let logId: string | null = null;

      useCompletedStore.getState().markCompleted(task.id, async () => {
        // Reverse the completion: restore the task's prior schedule state and
        // delete the completion log we inserted.
        const { error: restoreErr } = await supabase
          .from("recurring_tasks")
          .update({
            last_completed_at: task.last_completed_at,
            next_due_date: task.next_due_date,
            is_active: task.is_active,
          })
          .eq("id", task.id);
        if (restoreErr) throw restoreErr;
        if (logId) {
          await supabase.from("recurring_task_completions").delete().eq("id", logId);
        }
      });

      (async () => {
        const now = new Date().toISOString();

        const { data: logRow, error: logErr } = await supabase
          .from("recurring_task_completions")
          .insert({
            recurring_task_id: task.id,
            completed_by: completedBy,
            completed_at: now,
            notes: null,
          })
          .select("id")
          .single();
        if (logErr) {
          console.error(logErr);
          useCompletedStore.getState().unmark(task.id);
          return;
        }
        logId = logRow?.id ?? null;

        const taskUpdate = isNoRepeat
          ? { last_completed_at: now, is_active: false }
          : { last_completed_at: now, next_due_date: newDueDate };

        const { error: updateErr } = await supabase
          .from("recurring_tasks")
          .update(taskUpdate)
          .eq("id", task.id);
        if (updateErr) {
          console.error(updateErr);
          useCompletedStore.getState().unmark(task.id);
        }
      })();
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
