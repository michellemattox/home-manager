// Garden Map v2 data layer — areas, beds, hardscape, supports, crops, and the
// once-per-crop carry-over history choice. Follows the app's standard
// useQuery/useMutation + invalidate pattern (see useGarden.ts). Coordinates are
// stored in feet; see src/lib/gardenCatalog.ts for spacing/capacity helpers.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { normalizeCropKey } from "@/lib/gardenCatalog";
import type {
  GardenArea, GardenBed, GardenHardscape, GardenSupport, GardenCrop,
  GardenCropHistoryChoice,
} from "@/types/app.types";
import type { Database } from "@/types/database.types";

type AreaInsert = Database["public"]["Tables"]["garden_areas"]["Insert"];
type BedInsert = Database["public"]["Tables"]["garden_beds"]["Insert"];
type HardscapeInsert = Database["public"]["Tables"]["garden_hardscape"]["Insert"];
type SupportInsert = Database["public"]["Tables"]["garden_supports"]["Insert"];
type CropInsert = Database["public"]["Tables"]["garden_crops"]["Insert"];

// ── Areas ─────────────────────────────────────────────────────────────────────
export function useGardenAreas(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_areas", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_areas")
        .select("*")
        .eq("household_id", householdId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenArea[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGardenArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (area: AreaInsert) => {
      const { data, error } = await supabase.from("garden_areas").insert(area).select().single();
      if (error) throw error;
      return data as GardenArea;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_areas", data.household_id] }),
  });
}

export function useUpdateGardenArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId, updates }: { id: string; householdId: string; updates: Partial<GardenArea> }) => {
      const { error } = await supabase.from("garden_areas").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_areas", householdId] }),
  });
}

export function useDeleteGardenArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("garden_areas").delete().eq("id", id);
      if (error) throw error;
      return { id, householdId };
    },
    onSuccess: ({ id, householdId }) => {
      qc.invalidateQueries({ queryKey: ["garden_areas", householdId] });
      ["garden_beds", "garden_hardscape", "garden_supports", "garden_crops"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k, id] })
      );
    },
  });
}

// ── Beds ────────────────────────────────────────────────────────────────────
export function useGardenBeds(areaId: string | undefined) {
  return useQuery({
    queryKey: ["garden_beds", areaId],
    queryFn: async () => {
      if (!areaId) return [];
      const { data, error } = await supabase
        .from("garden_beds").select("*").eq("area_id", areaId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenBed[];
    },
    enabled: !!areaId,
  });
}

export function useCreateGardenBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bed: BedInsert) => {
      const { data, error } = await supabase.from("garden_beds").insert(bed).select().single();
      if (error) throw error;
      return data as GardenBed;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_beds", data.area_id] }),
  });
}

export function useUpdateGardenBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId, updates }: { id: string; areaId: string; updates: Partial<GardenBed> }) => {
      const { error } = await supabase.from("garden_beds").update(updates).eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => qc.invalidateQueries({ queryKey: ["garden_beds", areaId] }),
  });
}

export function useDeleteGardenBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId }: { id: string; areaId: string }) => {
      const { error } = await supabase.from("garden_beds").delete().eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => {
      // bed_id on crops/supports is ON DELETE SET NULL — refresh both.
      qc.invalidateQueries({ queryKey: ["garden_beds", areaId] });
      qc.invalidateQueries({ queryKey: ["garden_crops", areaId] });
      qc.invalidateQueries({ queryKey: ["garden_supports", areaId] });
    },
  });
}

// ── Hardscape ─────────────────────────────────────────────────────────────────
export function useGardenHardscape(areaId: string | undefined) {
  return useQuery({
    queryKey: ["garden_hardscape", areaId],
    queryFn: async () => {
      if (!areaId) return [];
      const { data, error } = await supabase
        .from("garden_hardscape").select("*").eq("area_id", areaId)
        .order("z_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenHardscape[];
    },
    enabled: !!areaId,
  });
}

export function useCreateGardenHardscape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: HardscapeInsert) => {
      const { data, error } = await supabase.from("garden_hardscape").insert(h).select().single();
      if (error) throw error;
      return data as GardenHardscape;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_hardscape", data.area_id] }),
  });
}

export function useUpdateGardenHardscape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId, updates }: { id: string; areaId: string; updates: Partial<GardenHardscape> }) => {
      const { error } = await supabase.from("garden_hardscape").update(updates).eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => qc.invalidateQueries({ queryKey: ["garden_hardscape", areaId] }),
  });
}

export function useDeleteGardenHardscape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId }: { id: string; areaId: string }) => {
      const { error } = await supabase.from("garden_hardscape").delete().eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => qc.invalidateQueries({ queryKey: ["garden_hardscape", areaId] }),
  });
}

// ── Supports ──────────────────────────────────────────────────────────────────
export function useGardenSupports(areaId: string | undefined) {
  return useQuery({
    queryKey: ["garden_supports", areaId],
    queryFn: async () => {
      if (!areaId) return [];
      const { data, error } = await supabase
        .from("garden_supports").select("*").eq("area_id", areaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenSupport[];
    },
    enabled: !!areaId,
  });
}

export function useCreateGardenSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: SupportInsert) => {
      const { data, error } = await supabase.from("garden_supports").insert(s).select().single();
      if (error) throw error;
      return data as GardenSupport;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_supports", data.area_id] }),
  });
}

export function useUpdateGardenSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId, updates }: { id: string; areaId: string; updates: Partial<GardenSupport> }) => {
      const { error } = await supabase.from("garden_supports").update(updates).eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => qc.invalidateQueries({ queryKey: ["garden_supports", areaId] }),
  });
}

/**
 * Delete a support. Because garden_crops.support_id is ON DELETE SET NULL, its
 * plants are detached (not destroyed) by default. Pass removePlants: true to
 * also delete the attached plants (the UI asks first).
 */
export function useDeleteGardenSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId, removePlants }: { id: string; areaId: string; removePlants?: boolean }) => {
      if (removePlants) {
        const { error: cropErr } = await supabase.from("garden_crops").delete().eq("support_id", id);
        if (cropErr) throw cropErr;
      }
      const { error } = await supabase.from("garden_supports").delete().eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => {
      qc.invalidateQueries({ queryKey: ["garden_supports", areaId] });
      qc.invalidateQueries({ queryKey: ["garden_crops", areaId] });
    },
  });
}

// ── Crops (one marker per plant) ──────────────────────────────────────────────
export function useGardenCrops(areaId: string | undefined) {
  return useQuery({
    queryKey: ["garden_crops", areaId],
    queryFn: async () => {
      if (!areaId) return [];
      const { data, error } = await supabase
        .from("garden_crops").select("*").eq("area_id", areaId)
        .is("date_removed", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenCrop[];
    },
    enabled: !!areaId,
  });
}

export function useCreateGardenCrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (crop: CropInsert) => {
      const { data, error } = await supabase.from("garden_crops").insert(crop).select().single();
      if (error) throw error;
      return data as GardenCrop;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_crops", data.area_id] }),
  });
}

/** Bulk-insert crops — used by Fill bed / Fill row. */
export function useCreateGardenCrops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (crops: CropInsert[]) => {
      if (crops.length === 0) return [] as GardenCrop[];
      const { data, error } = await supabase.from("garden_crops").insert(crops).select();
      if (error) throw error;
      return (data ?? []) as GardenCrop[];
    },
    onSuccess: (rows) => {
      const areaId = rows[0]?.area_id;
      if (areaId) qc.invalidateQueries({ queryKey: ["garden_crops", areaId] });
    },
  });
}

export function useUpdateGardenCrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId, updates }: { id: string; areaId: string; updates: Partial<GardenCrop> }) => {
      const { error } = await supabase.from("garden_crops").update(updates).eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => qc.invalidateQueries({ queryKey: ["garden_crops", areaId] }),
  });
}

export function useDeleteGardenCrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, areaId }: { id: string; areaId: string }) => {
      const { error } = await supabase.from("garden_crops").delete().eq("id", id);
      if (error) throw error;
      return areaId;
    },
    onSuccess: (areaId) => qc.invalidateQueries({ queryKey: ["garden_crops", areaId] }),
  });
}

// ── Per-crop harvests (garden_harvests linked by crop_id) ─────────────────────
type HarvestInsert = Database["public"]["Tables"]["garden_harvests"]["Insert"];
export type GardenHarvestRow = Database["public"]["Tables"]["garden_harvests"]["Row"];

export function useCropHarvests(cropId: string | undefined) {
  return useQuery({
    queryKey: ["garden_crop_harvests", cropId],
    queryFn: async () => {
      if (!cropId) return [];
      const { data, error } = await supabase
        .from("garden_harvests").select("*").eq("crop_id", cropId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenHarvestRow[];
    },
    enabled: !!cropId,
  });
}

export function useAddCropHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: HarvestInsert & { crop_id: string }) => {
      const { data, error } = await supabase.from("garden_harvests").insert(h).select().single();
      if (error) throw error;
      return data as GardenHarvestRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["garden_crop_harvests", row.crop_id] });
      qc.invalidateQueries({ queryKey: ["garden_all_harvests", row.household_id] });
    },
  });
}

export function useDeleteCropHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; cropId: string }) => {
      const { error } = await supabase.from("garden_harvests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { cropId }) => qc.invalidateQueries({ queryKey: ["garden_crop_harvests", cropId] }),
  });
}

// ── Carry-over history choices (once per crop) ────────────────────────────────
export function useGardenHistoryChoices(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_history_choices", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_crop_history_choices").select("*").eq("household_id", householdId);
      if (error) throw error;
      return (data ?? []) as GardenCropHistoryChoice[];
    },
    enabled: !!householdId,
  });
}

export function useRecordHistoryChoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ householdId, cropName, decision }: {
      householdId: string; cropName: string; decision: "carried" | "declined";
    }) => {
      const { error } = await supabase
        .from("garden_crop_history_choices")
        .upsert(
          { household_id: householdId, crop_key: normalizeCropKey(cropName), decision },
          { onConflict: "household_id,crop_key" }
        );
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_history_choices", householdId] }),
  });
}
