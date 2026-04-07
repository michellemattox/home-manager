import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUndoStore } from "@/stores/undoStore";
import type { GardenPlot, GardenZone, GardenCell, GardenPlanting, GardenHarvest, GardenAmendment, GardenWeatherLog, GardenPestLog, GardenSeedInventory, GardenJournalEntry, GardenWateringLog } from "@/types/app.types";

// ── Plots ──────────────────────────────────────────────────────────────────────

export function useGardenPlots(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_plots", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_plots")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenPlot[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGardenPlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plot: Omit<GardenPlot, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_plots")
        .insert(plot)
        .select()
        .single();
      if (error) throw error;
      return data as GardenPlot;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_plots", data.household_id] }),
  });
}

export function useUpdateGardenPlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId, updates }: { id: string; householdId: string; updates: Partial<GardenPlot> }) => {
      const { error } = await supabase.from("garden_plots").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_plots", householdId] }),
  });
}

export function useDeleteGardenPlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("garden_plots").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => {
      qc.invalidateQueries({ queryKey: ["garden_plots", householdId] });
      qc.invalidateQueries({ queryKey: ["garden_zones", householdId] });
      qc.invalidateQueries({ queryKey: ["garden_cells"] });
      qc.invalidateQueries({ queryKey: ["garden_plantings"] });
    },
  });
}

// ── Zones ──────────────────────────────────────────────────────────────────────

export function useGardenZones(plotId: string | undefined, householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_zones", plotId],
    queryFn: async () => {
      if (!plotId) return [];
      const { data, error } = await supabase
        .from("garden_zones")
        .select("*")
        .eq("plot_id", plotId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenZone[];
    },
    enabled: !!plotId,
  });
}

export function useCreateGardenZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (zone: Omit<GardenZone, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_zones")
        .insert(zone)
        .select()
        .single();
      if (error) throw error;
      return data as GardenZone;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_zones", data.plot_id] }),
  });
}

export function useUpdateGardenZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId, updates }: { id: string; plotId: string; updates: Partial<GardenZone> }) => {
      const { error } = await supabase.from("garden_zones").update(updates).eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_zones", plotId] }),
  });
}

export function useDeleteGardenZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => {
      const { error } = await supabase.from("garden_zones").delete().eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => {
      qc.invalidateQueries({ queryKey: ["garden_zones", plotId] });
      qc.invalidateQueries({ queryKey: ["garden_cells", plotId] });
    },
  });
}

// ── Cells ──────────────────────────────────────────────────────────────────────

export function useGardenCells(plotId: string | undefined) {
  return useQuery({
    queryKey: ["garden_cells", plotId],
    queryFn: async () => {
      if (!plotId) return [];
      const { data, error } = await supabase
        .from("garden_cells")
        .select("*")
        .eq("plot_id", plotId);
      if (error) throw error;
      return (data ?? []) as GardenCell[];
    },
    enabled: !!plotId,
  });
}

// Upsert a batch of cells for a zone (handles create + re-assign)
export function useUpsertGardenCells() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cells: Omit<GardenCell, "id" | "created_at">[]) => {
      if (!cells.length) return null;
      const { error } = await supabase
        .from("garden_cells")
        .upsert(cells, { onConflict: "plot_id,col,row" });
      if (error) throw error;
      return cells[0].plot_id;
    },
    onSuccess: (plotId) => {
      if (plotId) qc.invalidateQueries({ queryKey: ["garden_cells", plotId] });
    },
  });
}

// Delete specific cells (remove zone assignment)
export function useDeleteGardenCells() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plotId, cellIds }: { plotId: string; cellIds: string[] }) => {
      const { error } = await supabase
        .from("garden_cells")
        .delete()
        .in("id", cellIds);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_cells", plotId] }),
  });
}

// ── Plantings ──────────────────────────────────────────────────────────────────

export function useGardenPlantings(plotId: string | undefined) {
  return useQuery({
    queryKey: ["garden_plantings", plotId],
    queryFn: async () => {
      if (!plotId) return [];
      const { data, error } = await supabase
        .from("garden_plantings")
        .select("*")
        .eq("plot_id", plotId)
        .order("date_planted", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenPlanting[];
    },
    enabled: !!plotId,
  });
}

export function useCreateGardenPlanting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planting: Omit<GardenPlanting, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_plantings")
        .insert(planting)
        .select()
        .single();
      if (error) throw error;
      return data as GardenPlanting;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_plantings", data.plot_id] }),
  });
}

export function useUpdateGardenPlanting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId, updates }: { id: string; plotId: string; updates: Partial<GardenPlanting> }) => {
      const { error } = await supabase.from("garden_plantings").update(updates).eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_plantings", plotId] }),
  });
}

export function useDeleteGardenPlanting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => ({ id, plotId }),
    onSuccess: ({ id, plotId }) => {
      const queryKey = ["garden_plantings", plotId] as const;
      const items = qc.getQueryData<GardenPlanting[]>(queryKey);
      const item = items?.find((p) => p.id === id);
      const index = items?.findIndex((p) => p.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenPlanting[] | undefined) =>
        old ? old.filter((p) => p.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Planting",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenPlanting[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_plantings").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
          qc.invalidateQueries({ queryKey: ["garden_harvests", plotId] });
        },
      });
    },
  });
}

// ── Harvests ───────────────────────────────────────────────────────────────────

export function useGardenHarvests(plotId: string | undefined) {
  return useQuery({
    queryKey: ["garden_harvests", plotId],
    queryFn: async () => {
      if (!plotId) return [];
      const { data, error } = await supabase
        .from("garden_harvests")
        .select("*")
        .eq("plot_id", plotId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenHarvest[];
    },
    enabled: !!plotId,
  });
}

export function useCreateGardenHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (harvest: Omit<GardenHarvest, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_harvests")
        .insert(harvest)
        .select()
        .single();
      if (error) throw error;
      return data as GardenHarvest;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_harvests", data.plot_id] }),
  });
}

export function useUpdateGardenHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId, updates }: { id: string; plotId: string; updates: Partial<GardenHarvest> }) => {
      const { error } = await supabase.from("garden_harvests").update(updates).eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_harvests", plotId] }),
  });
}

export function useDeleteGardenHarvest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => ({ id, plotId }),
    onSuccess: ({ id, plotId }) => {
      const queryKey = ["garden_harvests", plotId] as const;
      const items = qc.getQueryData<GardenHarvest[]>(queryKey);
      const item = items?.find((h) => h.id === id);
      const index = items?.findIndex((h) => h.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenHarvest[] | undefined) =>
        old ? old.filter((h) => h.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Harvest",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenHarvest[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_harvests").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

// ── Amendments ─────────────────────────────────────────────────────────────────

export function useGardenAmendments(plotId: string | undefined) {
  return useQuery({
    queryKey: ["garden_amendments", plotId],
    queryFn: async () => {
      if (!plotId) return [];
      const { data, error } = await supabase
        .from("garden_amendments")
        .select("*")
        .eq("plot_id", plotId)
        .order("application_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenAmendment[];
    },
    enabled: !!plotId,
  });
}

export function useCreateGardenAmendment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amendment: Omit<GardenAmendment, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_amendments")
        .insert(amendment)
        .select()
        .single();
      if (error) throw error;
      return data as GardenAmendment;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_amendments", data.plot_id] }),
  });
}

export function useUpdateGardenAmendment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId, updates }: { id: string; plotId: string; updates: Partial<GardenAmendment> }) => {
      const { error } = await supabase.from("garden_amendments").update(updates).eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_amendments", plotId] }),
  });
}

export function useDeleteGardenAmendment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => ({ id, plotId }),
    onSuccess: ({ id, plotId }) => {
      const queryKey = ["garden_amendments", plotId] as const;
      const items = qc.getQueryData<GardenAmendment[]>(queryKey);
      const item = items?.find((a) => a.id === id);
      const index = items?.findIndex((a) => a.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenAmendment[] | undefined) =>
        old ? old.filter((a) => a.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Amendment",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenAmendment[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_amendments").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

// ── Weather Logs ───────────────────────────────────────────────────────────────

export function useGardenWeatherLogs(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_weather_logs", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("garden_weather_logs")
        .select("*")
        .eq("household_id", householdId)
        .gte("log_date", cutoffStr)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenWeatherLog[];
    },
    enabled: !!householdId,
  });
}

// Household-wide plantings (for rainfall-since-planting calculations on weather screen)
export function useGardenPlantingsForHousehold(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_plantings_household", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_plantings")
        .select("*")
        .eq("household_id", householdId)
        .is("date_removed", null)
        .not("date_planted", "is", null)
        .order("date_planted", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenPlanting[];
    },
    enabled: !!householdId,
  });
}

// All plantings including removed ones (for rotation history)
export function useGardenAllPlantingsByHousehold(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_plantings_all", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_plantings")
        .select("*")
        .eq("household_id", householdId)
        .order("date_planted", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenPlanting[];
    },
    enabled: !!householdId,
  });
}

// All zones across the household (for succession recommendations + rotation)
export function useGardenZonesByHousehold(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_zones_household", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_zones")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenZone[];
    },
    enabled: !!householdId,
  });
}

// ── Pest Logs ──────────────────────────────────────────────────────────────────

export function useGardenPestLogs(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_pest_logs", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_pest_logs")
        .select("*")
        .eq("household_id", householdId)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenPestLog[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGardenPestLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<GardenPestLog, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_pest_logs")
        .insert(log)
        .select()
        .single();
      if (error) throw error;
      return data as GardenPestLog;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_pest_logs", data.household_id] }),
  });
}

export function useUpdateGardenPestLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId, updates }: { id: string; householdId: string; updates: Partial<GardenPestLog> }) => {
      const { error } = await supabase.from("garden_pest_logs").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_pest_logs", householdId] }),
  });
}

export function useDeleteGardenPestLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["garden_pest_logs", householdId] as const;
      const items = qc.getQueryData<GardenPestLog[]>(queryKey);
      const item = items?.find((p) => p.id === id);
      const index = items?.findIndex((p) => p.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenPestLog[] | undefined) =>
        old ? old.filter((p) => p.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Pest log",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenPestLog[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_pest_logs").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

// ── Seed Inventory ─────────────────────────────────────────────────────────────

export function useGardenSeeds(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_seeds", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_seed_inventory")
        .select("*")
        .eq("household_id", householdId)
        .order("plant_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GardenSeedInventory[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGardenSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seed: Omit<GardenSeedInventory, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_seed_inventory")
        .insert(seed)
        .select()
        .single();
      if (error) throw error;
      return data as GardenSeedInventory;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_seeds", data.household_id] }),
  });
}

export function useUpdateGardenSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId, updates }: { id: string; householdId: string; updates: Partial<GardenSeedInventory> }) => {
      const { error } = await supabase.from("garden_seed_inventory").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_seeds", householdId] }),
  });
}

export function useDeleteGardenSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["garden_seeds", householdId] as const;
      const items = qc.getQueryData<GardenSeedInventory[]>(queryKey);
      const item = items?.find((s) => s.id === id);
      const index = items?.findIndex((s) => s.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenSeedInventory[] | undefined) =>
        old ? old.filter((s) => s.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Seed",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenSeedInventory[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_seed_inventory").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

// ── Garden Journal ─────────────────────────────────────────────────────────────

export function useGardenJournal(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_journal", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_journal_entries")
        .select("*")
        .eq("household_id", householdId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenJournalEntry[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGardenJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<GardenJournalEntry, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_journal_entries")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data as GardenJournalEntry;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_journal", data.household_id] }),
  });
}

export function useUpdateGardenJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId, updates }: { id: string; householdId: string; updates: Partial<GardenJournalEntry> }) => {
      const { error } = await supabase.from("garden_journal_entries").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_journal", householdId] }),
  });
}

export function useDeleteGardenJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["garden_journal", householdId] as const;
      const items = qc.getQueryData<GardenJournalEntry[]>(queryKey);
      const item = items?.find((e) => e.id === id);
      const index = items?.findIndex((e) => e.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenJournalEntry[] | undefined) =>
        old ? old.filter((e) => e.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Journal entry",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenJournalEntry[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_journal_entries").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

// ── Garden Watering Logs ───────────────────────────────────────────────────────

export function useGardenWatering(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_watering", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_watering_logs")
        .select("*")
        .eq("household_id", householdId)
        .order("water_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GardenWateringLog[];
    },
    enabled: !!householdId,
  });
}

export function useCreateGardenWateringLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<GardenWateringLog, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("garden_watering_logs")
        .insert(log)
        .select()
        .single();
      if (error) throw error;
      return data as GardenWateringLog;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["garden_watering", data.household_id] }),
  });
}

export function useUpdateGardenWateringLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId, updates }: { id: string; householdId: string; updates: Partial<GardenWateringLog> }) => {
      const { error } = await supabase.from("garden_watering_logs").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => qc.invalidateQueries({ queryKey: ["garden_watering", householdId] }),
  });
}

export function useDeleteGardenWateringLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => ({ id, householdId }),
    onSuccess: ({ id, householdId }) => {
      const queryKey = ["garden_watering", householdId] as const;
      const items = qc.getQueryData<GardenWateringLog[]>(queryKey);
      const item = items?.find((w) => w.id === id);
      const index = items?.findIndex((w) => w.id === id) ?? -1;

      qc.setQueryData(queryKey, (old: GardenWateringLog[] | undefined) =>
        old ? old.filter((w) => w.id !== id) : old
      );

      useUndoStore.getState().schedule({
        label: "Watering log",
        restore: () =>
          qc.setQueryData(queryKey, (old: GardenWateringLog[] | undefined) => {
            if (!old || !item) return old;
            const arr = [...old];
            arr.splice(Math.min(index < 0 ? arr.length : index, arr.length), 0, item);
            return arr;
          }),
        execute: async () => {
          const { error } = await supabase.from("garden_watering_logs").delete().eq("id", id);
          if (error) throw error;
          qc.invalidateQueries({ queryKey });
        },
      });
    },
  });
}

// ── Harvest analytics helpers ──────────────────────────────────────────────────

export function useGardenAllHarvests(householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_all_harvests", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("garden_harvests")
        .select("*, garden_plantings(plant_name, variety, zone_id, plant_family)")
        .eq("household_id", householdId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (GardenHarvest & { garden_plantings: { plant_name: string; variety: string | null; zone_id: string | null; plant_family: string | null } | null })[];
    },
    enabled: !!householdId,
  });
}
