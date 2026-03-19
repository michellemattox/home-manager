import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Project, ProjectUpdate, ProjectWithOwners } from "@/types/app.types";

export function useProjects(householdId: string | undefined) {
  return useQuery({
    queryKey: ["projects", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_owners(member_id), project_updates(id, body, author_id, created_at), project_tasks(id, checklist_name)")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectWithOwners[];
    },
    enabled: !!householdId,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_owners(member_id), project_updates(*), project_tasks(*)")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data as ProjectWithOwners;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      project,
      ownerIds,
    }: {
      project: Omit<Project, "id" | "created_at" | "completed_at">;
      ownerIds: string[];
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(project)
        .select()
        .single();
      if (error) throw error;
      const p = data as Project;

      if (ownerIds.length > 0) {
        await supabase
          .from("project_owners")
          .insert(ownerIds.map((mid) => ({ project_id: p.id, member_id: mid })));
      }
      return p;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["projects", data.household_id] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Project>;
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project", data.id] });
      qc.invalidateQueries({ queryKey: ["projects", data.household_id] });
    },
  });
}

export function useAddProjectUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (update: Omit<ProjectUpdate, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("project_updates")
        .insert(update)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectUpdate;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project", data.project_id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useEditProjectUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
      projectId,
    }: {
      id: string;
      body: string;
      projectId: string;
    }) => {
      const { data, error } = await supabase
        .from("project_updates")
        .update({ body })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectUpdate;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project", data.project_id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["projects", householdId] }),
  });
}
