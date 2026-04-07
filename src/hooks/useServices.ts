import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUndoStore } from "@/stores/undoStore";
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

export function useEventServiceRecords(
  eventType: "project" | "activity",
  eventId: string | undefined
) {
  return useQuery({
    queryKey: ["service_records_event", eventType, eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("event_type", eventType)
        .eq("event_id", eventId)
        .order("service_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRecord[];
    },
    enabled: !!eventId,
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
    mutationFn: async ({
      id,
      householdId,
      updates,
    }: {
      id: string;
      householdId: string;
      updates: Partial<ServiceRecord>;
    }) => {
      const { error } = await supabase
        .from("service_records")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["service_records", householdId] }),
  });
}

export function useDeleteServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) =>
      ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["service_records", householdId] as const;
      const items = qc.getQueryData<ServiceRecord[]>(queryKey);
      const item = items?.find((r) => r.id === id);
      const index = items?.findIndex((r) => r.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: ServiceRecord[] | undefined) =>
        old ? old.filter((r) => r.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Service record",
        restore: () =>
          qc.setQueryData(queryKey, (old: ServiceRecord[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("service_records").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}
