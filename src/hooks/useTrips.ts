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
        .select("*, tasks:trip_tasks(*, trip_task_owners(member_id))")
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
      const { error } = await supabase.from("trip_tasks").insert(task);
      if (error) throw error;
      return { trip_id: task.trip_id };
    },
    onSuccess: ({ trip_id }) =>
      qc.invalidateQueries({ queryKey: ["trip", trip_id] }),
  });
}

export function useCompleteTripChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      task,
      completedByMemberId,
    }: {
      task: TripTask;
      completedByMemberId: string | null;
    }) => {
      const { error: archiveError } = await supabase
        .from("completed_checklist_items")
        .insert({
          source_type: "trip",
          source_id: task.trip_id,
          original_task_id: task.id,
          title: task.title,
          checklist_name: task.checklist_name ?? "General",
          assigned_member_id: task.assigned_member_id,
          due_date: task.due_date,
          completed_by: completedByMemberId,
        });
      if (archiveError) throw archiveError;

      const { error: deleteError } = await supabase
        .from("trip_tasks")
        .delete()
        .eq("id", task.id);
      if (deleteError) throw deleteError;

      return { trip_id: task.trip_id };
    },
    onSuccess: ({ trip_id }) => {
      qc.invalidateQueries({ queryKey: ["trip", trip_id] });
      qc.invalidateQueries({ queryKey: ["completed_checklist", "trip", trip_id] });
    },
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

export function useUpdateTripTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      tripId,
      updates,
    }: {
      id: string;
      tripId: string;
      updates: {
        title?: string;
        assigned_member_id?: string | null;
        due_date?: string | null;
        checklist_name?: string;
      };
    }) => {
      const { error } = await supabase
        .from("trip_tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return tripId;
    },
    onSuccess: (tripId) =>
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

export function useUpdateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Trip> }) => {
      const { data, error } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Trip;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["trip", data.id] });
      qc.invalidateQueries({ queryKey: ["trips", data.household_id] });
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["trips", householdId] }),
  });
}
