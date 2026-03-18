import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Trip, TripTask, TripWithTasks } from "@/types/app.types";

export function useTrips(householdId: string | undefined) {
  return useQuery({
    queryKey: ["trips", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("household_id", householdId)
        .order("departure_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trip[];
    },
    enabled: !!householdId,
  });
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      if (!tripId) return null;
      const { data, error } = await supabase
        .from("trips")
        .select("*, trip_tasks(*, trip_task_owners(member_id))")
        .eq("id", tripId)
        .single();
      if (error) throw error;
      return data as TripWithTasks;
    },
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trip: Omit<Trip, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("trips")
        .insert(trip)
        .select()
        .single();
      if (error) throw error;
      return data as Trip;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["trips", data.household_id] }),
  });
}

export function useCreateTripTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Omit<TripTask, "id">) => {
      const { data, error } = await supabase
        .from("trip_tasks")
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data as TripTask;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["trip", data.trip_id] }),
  });
}

export function useToggleTripTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      tripId,
      isCompleted,
    }: {
      taskId: string;
      tripId: string;
      isCompleted: boolean;
    }) => {
      const { error } = await supabase
        .from("trip_tasks")
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
      if (error) throw error;
      return { taskId, tripId, isCompleted };
    },
    onSuccess: ({ tripId }) =>
      qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}

export function useDeleteTripTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, tripId }: { taskId: string; tripId: string }) => {
      const { error } = await supabase
        .from("trip_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
      return tripId;
    },
    onSuccess: (tripId) =>
      qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}
