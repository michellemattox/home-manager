import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// These tables aren't in the auto-generated database.types yet, so the supabase
// client is cast to `any` at the call sites (same pattern as notification_preferences).
export type PackingTemplate = {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  created_at: string | null;
};

export type PackingTemplateItem = {
  id: string;
  template_id: string;
  title: string;
  sort_order: number;
  created_at: string | null;
};

export type PackingTemplateWithItems = PackingTemplate & {
  items: PackingTemplateItem[];
};

export function usePackingTemplates(householdId: string | undefined) {
  return useQuery({
    queryKey: ["packing_templates", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await (supabase as any)
        .from("packing_templates")
        .select("*, items:packing_template_items(*)")
        .eq("household_id", householdId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      // Sort nested items by sort_order (PostgREST doesn't order embedded rows for us).
      return ((data ?? []) as PackingTemplateWithItems[]).map((t) => ({
        ...t,
        items: [...(t.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
    enabled: !!householdId,
  });
}

const invalidate = (qc: ReturnType<typeof useQueryClient>, householdId: string) =>
  qc.invalidateQueries({ queryKey: ["packing_templates", householdId] });

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      name,
      sortOrder,
    }: {
      householdId: string;
      name: string;
      sortOrder: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from("packing_templates")
        .insert({ household_id: householdId, name, sort_order: sortOrder })
        .select()
        .single();
      if (error) throw error;
      return data as PackingTemplate;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useRenameTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; householdId: string; name: string }) => {
      const { error } = await (supabase as any)
        .from("packing_templates")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; householdId: string }) => {
      const { error } = await (supabase as any)
        .from("packing_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useReorderTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderedIds }: { householdId: string; orderedIds: string[] }) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          (supabase as any).from("packing_templates").update({ sort_order: idx }).eq("id", id)
        )
      );
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useAddTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      title,
      sortOrder,
    }: {
      templateId: string;
      householdId: string;
      title: string;
      sortOrder: number;
    }) => {
      const { error } = await (supabase as any)
        .from("packing_template_items")
        .insert({ template_id: templateId, title, sort_order: sortOrder });
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; householdId: string; title: string }) => {
      const { error } = await (supabase as any)
        .from("packing_template_items")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useDeleteTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; householdId: string }) => {
      const { error } = await (supabase as any)
        .from("packing_template_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

export function useReorderTemplateItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderedIds }: { householdId: string; orderedIds: string[] }) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          (supabase as any).from("packing_template_items").update({ sort_order: idx }).eq("id", id)
        )
      );
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}

// Bulk-create a template + its items in one shot (used to seed starter templates).
export function useCreateTemplateWithItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      householdId,
      name,
      items,
      sortOrder,
    }: {
      householdId: string;
      name: string;
      items: string[];
      sortOrder: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from("packing_templates")
        .insert({ household_id: householdId, name, sort_order: sortOrder })
        .select()
        .single();
      if (error) throw error;
      const template = data as PackingTemplate;
      const rows = items
        .map((t) => t.trim())
        .filter(Boolean)
        .map((title, idx) => ({ template_id: template.id, title, sort_order: idx }));
      if (rows.length > 0) {
        const { error: itemErr } = await (supabase as any)
          .from("packing_template_items")
          .insert(rows);
        if (itemErr) throw itemErr;
      }
      return template;
    },
    onSuccess: (_d, v) => invalidate(qc, v.householdId),
  });
}
