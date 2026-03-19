import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/app.types";

// Fetch active (new) and waitlisted ideas for the household.
// topic_id column stores household_id for backward compatibility.
export function useIdeas(householdId: string | undefined) {
  return useQuery({
    queryKey: ["ideas", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("topic_id", householdId)
        .in("status", ["new", "waitlisted"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Idea[];
    },
    enabled: !!householdId,
  });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      subject,
      description,
      authorId,
    }: {
      householdId: string;
      subject: string;
      description?: string;
      authorId: string;
    }) => {
      const { data, error } = await supabase
        .from("ideas")
        .insert({
          topic_id: householdId,
          body: subject,
          subject,
          description: description ?? null,
          author_id: authorId,
          status: "new",
          is_pinned: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Idea;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["ideas", data.topic_id] }),
  });
}

export function useUpdateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      updates,
    }: {
      id: string;
      householdId: string;
      updates: Partial<Pick<Idea, "subject" | "description" | "status" | "converted_to_type" | "converted_to_id">>;
    }) => {
      const bodyUpdate = updates.subject ? { body: updates.subject } : {};
      const { error } = await supabase
        .from("ideas")
        .update({ ...updates, ...bodyUpdate })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["ideas", householdId] }),
  });
}

export function useWaitlistIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase
        .from("ideas")
        .update({ status: "waitlisted" })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["ideas", householdId] }),
  });
}

export function useConvertIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      convertedToType,
      convertedToId,
    }: {
      id: string;
      householdId: string;
      convertedToType: "task" | "project" | "activity";
      convertedToId: string;
    }) => {
      const { error } = await supabase
        .from("ideas")
        .update({
          status: "converted",
          converted_to_type: convertedToType,
          converted_to_id: convertedToId,
        })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["ideas", householdId] }),
  });
}

export function useDeleteIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("ideas").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["ideas", householdId] }),
  });
}
