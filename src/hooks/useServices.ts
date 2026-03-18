import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ServiceRecord } from "@/types/app.types";

export function useServiceRecords(householdId: string | undefined) {
  return useQuery({
    queryKey: ["service_records", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("household_id", householdId)
        .order("service_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRecord[];
    },
    enabled: !!householdId,
  });
}

export function useCreateServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      record: Omit<ServiceRecord, "id" | "created_at">
    ) => {
      const { data, error } = await supabase
        .from("service_records")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as ServiceRecord;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["service_records", data.household_id] }),
  });
}

export function useUpdateServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceRecord> }) => {
      const { data, error } = await supabase
        .from("service_records")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ServiceRecord;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["service_records", data.household_id] }),
  });
}

export function useDeleteServiceRecord() {
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
        .from("service_records")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["service_records", householdId] }),
  });
}
