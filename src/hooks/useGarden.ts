import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GardenPlot, GardenZone, GardenCell, GardenPlanting, GardenHarvest, GardenAmendment, GardenWeatherLog } from "@/types/app.types";

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
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => {
      const { error } = await supabase.from("garden_plantings").delete().eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => {
      qc.invalidateQueries({ queryKey: ["garden_plantings", plotId] });
      qc.invalidateQueries({ queryKey: ["garden_harvests", plotId] });
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
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => {
      const { error } = await supabase.from("garden_harvests").delete().eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_harvests", plotId] }),
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
    mutationFn: async ({ id, plotId }: { id: string; plotId: string }) => {
      const { error } = await supabase.from("garden_amendments").delete().eq("id", id);
      if (error) throw error;
      return plotId;
    },
    onSuccess: (plotId) => qc.invalidateQueries({ queryKey: ["garden_amendments", plotId] }),
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
      return (data ?? []) as GardenAmendment[];
    },
    enabled: !!householdId,
  });
}
