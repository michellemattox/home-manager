import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, addDays } from "date-fns";
import { calculateNextDueDate } from "@/utils/scheduleUtils";
import { useUndoStore } from "@/stores/undoStore";
import type { Goal, GoalUpdate, GoalWithUpdates } from "@/types/app.types";

function buildPeriodMessage(frequencyType: string, frequencyDays: number, dueDate: string): string {
  const date = new Date(dueDate + "T12:00:00");
  switch (frequencyType) {
    case "daily":
      return `Goal achieved for ${format(date, "MMMM d, yyyy")}! 🎉`;
    case "weekly": {
      const start = addDays(date, -6);
      return `Goal achieved for the week of ${format(start, "MMM d")}–${format(date, "MMM d, yyyy")}! 🎉`;
    }
    case "monthly":
      return `Goal achieved for ${format(date, "MMMM yyyy")}! 🎉`;
    case "yearly":
      return `Goal achieved for ${format(date, "yyyy")}! 🎉`;
    default:
      return `Goal achieved for the ${frequencyDays}-day period ending ${format(date, "MMM d, yyyy")}! 🎉`;
  }
}

export function useGoals(householdId: string | undefined) {
  return useQuery({
    queryKey: ["goals", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*, goal_updates(*)")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GoalWithUpdates[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      goal: Omit<Goal, "id" | "created_at">
    ) => {
      const { data, error } = await supabase
        .from("goals")
        .insert(goal)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["goals", data.household_id] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      updates,
    }: {
      id: string;
      householdId: string;
      updates: Partial<Goal>;
    }) => {
      const { error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["goals", householdId] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["goals", householdId] }),
  });
}

export function useAddGoalUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (update: Omit<GoalUpdate, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("goal_updates")
        .insert(update)
        .select()
        .single();
      if (error) throw error;
      return data as GoalUpdate;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["goals", data.household_id] }),
  });
}

// Complete one recurring period: auto-insert an update and advance the due_date
export function useCompleteGoalPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goal,
      householdId,
      authorId,
    }: {
      goal: Goal;
      householdId: string;
      authorId: string;
    }) => {
      const freqType = (goal as any).frequency_type ?? "weekly";
      const freqDays = (goal as any).frequency_days ?? 7;
      const currentDue = goal.due_date ?? new Date().toISOString().split("T")[0];

      const body = buildPeriodMessage(freqType, freqDays, currentDue);
      const nextDue = calculateNextDueDate(freqType, freqDays, new Date(currentDue + "T12:00:00"));

      const { error: updateErr } = await supabase
        .from("goal_updates")
        .insert({ goal_id: goal.id, household_id: householdId, body, author_id: authorId });
      if (updateErr) throw updateErr;

      const { error: goalErr } = await supabase
        .from("goals")
        .update({ due_date: nextDue })
        .eq("id", goal.id);
      if (goalErr) throw goalErr;

      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["goals", householdId] }),
  });
}

export function useEditGoalUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, householdId }: { id: string; body: string; householdId: string }) => {
      const { error } = await supabase.from("goal_updates").update({ body }).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["goals", householdId] }),
  });
}

export function useDeleteGoalUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) =>
      ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["goals", householdId] as const;
      // goal_updates are nested inside GoalWithUpdates; capture from the goals cache
      const goals = qc.getQueryData<GoalWithUpdates[]>(queryKey);
      let item: GoalUpdate | undefined;
      let goalId: string | undefined;
      let index = -1;
      for (const g of goals ?? []) {
        const idx = g.goal_updates?.findIndex((u) => u.id === id) ?? -1;
        if (idx >= 0) {
          item = g.goal_updates?.[idx];
          goalId = g.id;
          index = idx;
          break;
        }
      }

      // Optimistically remove the update from the nested cache
      qc.setQueryData(queryKey, (old: GoalWithUpdates[] | undefined) =>
        old
          ? old.map((g) =>
              g.id === goalId
                ? { ...g, goal_updates: g.goal_updates?.filter((u) => u.id !== id) ?? [] }
                : g
            )
          : old
      );

      useUndoStore.getState().schedule({
        label: "Goal update",
        restore: () =>
          qc.setQueryData(queryKey, (old: GoalWithUpdates[] | undefined) =>
            old
              ? old.map((g) => {
                  if (g.id !== goalId || !item) return g;
                  const updates = [...(g.goal_updates ?? [])];
                  updates.splice(Math.min(index < 0 ? updates.length : index, updates.length), 0, item);
                  return { ...g, goal_updates: updates };
                })
              : old
          ),
        execute: async () => {
          const { error } = await supabase.from("goal_updates").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}
