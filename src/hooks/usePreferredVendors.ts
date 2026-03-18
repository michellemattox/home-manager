import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PreferredVendor } from "@/types/app.types";

export function usePreferredVendors(householdId: string | undefined) {
  return useQuery({
    queryKey: ["preferred_vendors", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("preferred_vendors")
        .select("*")
        .eq("household_id", householdId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as PreferredVendor[];
    },
    enabled: !!householdId,
  });
}

export function useAddPreferredVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: Omit<PreferredVendor, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("preferred_vendors")
        .insert(vendor)
        .select()
        .single();
      if (error) throw error;
      return data as PreferredVendor;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["preferred_vendors", data.household_id] }),
  });
}

export function useUpdatePreferredVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates, householdId }: { id: string; updates: Partial<PreferredVendor>; householdId: string }) => {
      const { data, error } = await supabase
        .from("preferred_vendors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as PreferredVendor, householdId };
    },
    onSuccess: ({ householdId }) =>
      qc.invalidateQueries({ queryKey: ["preferred_vendors", householdId] }),
  });
}

export function useDeletePreferredVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("preferred_vendors").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["preferred_vendors", householdId] }),
  });
}
