import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Goal, GoalUpdate, GoalWithUpdates } from "@/types/app.types";

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
    mutationFn: async ({
      id,
      householdId,
    }: {
      id: string;
      householdId: string;
    }) => {
      const { error } = await supabase.from("goal_updates").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["goals", householdId] }),
  });
}
