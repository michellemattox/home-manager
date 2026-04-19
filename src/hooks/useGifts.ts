import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Gift } from "@/types/app.types";

export function useGifts(householdId: string | undefined) {
  return useQuery({
    queryKey: ["gifts", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Gift[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gift: Omit<Gift, "id" | "created_at" | "bought" | "bought_by_member_id" | "bought_at" | "totals_cleared_at">) => {
      const { data, error } = await supabase
        .from("gifts")
        .insert(gift)
        .select()
        .single();
      if (error) throw error;
      return data as Gift;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["gifts", data.household_id] }),
  });
}

export function useUpdateGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      updates,
    }: {
      id: string;
      householdId: string;
      updates: Partial<Gift>;
    }) => {
      const { error } = await supabase.from("gifts").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["gifts", householdId] }),
  });
}

export function useMarkGiftBought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      buyerId,
      bought,
    }: {
      id: string;
      householdId: string;
      buyerId: string;
      bought: boolean;
    }) => {
      const updates = bought
        ? { bought: true, bought_by_member_id: buyerId, bought_at: new Date().toISOString() }
        : { bought: false, bought_by_member_id: null, bought_at: null };
      const { error } = await supabase.from("gifts").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["gifts", householdId] }),
  });
}

export function useDeleteGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("gifts").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["gifts", householdId] }),
  });
}

export function useClearGiftTotals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (householdId: string) => {
      const { error } = await supabase
        .from("gifts")
        .update({ totals_cleared_at: new Date().toISOString() })
        .eq("household_id", householdId)
        .eq("bought", true)
        .is("totals_cleared_at", null);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["gifts", householdId] }),
  });
}
