import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { IdeaTopic, Idea } from "@/types/app.types";

export function useIdeaTopics(householdId: string | undefined) {
  return useQuery({
    queryKey: ["idea_topics", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("idea_topics")
        .select("*")
        .eq("household_id", householdId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as IdeaTopic[];
    },
    enabled: !!householdId,
  });
}

export function useIdeas(topicId: string | undefined) {
  return useQuery({
    queryKey: ["ideas", topicId],
    queryFn: async () => {
      if (!topicId) return [];
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("topic_id", topicId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Idea[];
    },
    enabled: !!topicId,
  });
}

export function useCreateIdeaTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topic: Omit<IdeaTopic, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("idea_topics")
        .insert(topic)
        .select()
        .single();
      if (error) throw error;
      return data as IdeaTopic;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["idea_topics", data.household_id] }),
  });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idea: Omit<Idea, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("ideas")
        .insert(idea)
        .select()
        .single();
      if (error) throw error;
      return data as Idea;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["ideas", data.topic_id] }),
  });
}

export function useToggleIdeaPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      topicId,
      isPinned,
    }: {
      id: string;
      topicId: string;
      isPinned: boolean;
    }) => {
      const { error } = await supabase
        .from("ideas")
        .update({ is_pinned: isPinned })
        .eq("id", id);
      if (error) throw error;
      return topicId;
    },
    onSuccess: (topicId) =>
      qc.invalidateQueries({ queryKey: ["ideas", topicId] }),
  });
}

export function useDeleteIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, topicId }: { id: string; topicId: string }) => {
      const { error } = await supabase.from("ideas").delete().eq("id", id);
      if (error) throw error;
      return topicId;
    },
    onSuccess: (topicId) =>
      qc.invalidateQueries({ queryKey: ["ideas", topicId] }),
  });
}
