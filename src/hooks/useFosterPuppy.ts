import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getTodayPT } from "@/utils/dateUtils";
import type {
  FosterPuppy,
  FosterPottyLog,
  FosterFeedingLog,
  PottyKind,
  PottyLocation,
  FeedingKind,
} from "@/types/app.types";

/** How far back the log queries reach. The report shows 7 days; the projection
 *  model reads more history than that so a fresh week still has signal. */
export const LOG_WINDOW_DAYS = 21;

function windowStartISO(): string {
  return new Date(Date.now() - LOG_WINDOW_DAYS * 86400000).toISOString();
}

// ── Profiles ─────────────────────────────────────────────────────────────────

/** All puppies for the household, active first, newest arrival first. */
export function useFosterPuppies(householdId: string | undefined) {
  return useQuery({
    queryKey: ["foster_puppies", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("foster_puppies")
        .select("*")
        .eq("household_id", householdId)
        .order("active", { ascending: false })
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FosterPuppy[];
    },
    enabled: !!householdId,
  });
}

/** The puppy marked current — the one the Home "Potty Log" button logs against. */
export function useCurrentPuppy(householdId: string | undefined): FosterPuppy | null {
  const { data = [] } = useFosterPuppies(householdId);
  return data.find((p) => p.is_current && p.active) ?? null;
}

export function useCreateFosterPuppy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (puppy: {
      household_id: string;
      name: string;
      dob: string | null;
      dob_is_estimate?: boolean;
      arrival_date: string;
      notes?: string | null;
      /** Make this the current puppy on creation (default true). */
      makeCurrent?: boolean;
    }) => {
      const { makeCurrent = true, ...row } = puppy;
      // The one-current-per-household unique index means the old current has to
      // be cleared before the insert, not after.
      if (makeCurrent) await clearCurrent(row.household_id);
      const { data, error } = await supabase
        .from("foster_puppies")
        .insert({ ...row, is_current: makeCurrent })
        .select()
        .single();
      if (error) throw error;
      return data as FosterPuppy;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["foster_puppies", data.household_id] }),
  });
}

export function useUpdateFosterPuppy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      updates,
    }: {
      id: string;
      householdId: string;
      updates: Partial<FosterPuppy>;
    }) => {
      const { error } = await supabase.from("foster_puppies").update(updates).eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["foster_puppies", householdId] }),
  });
}

async function clearCurrent(householdId: string) {
  const { error } = await supabase
    .from("foster_puppies")
    .update({ is_current: false })
    .eq("household_id", householdId)
    .eq("is_current", true);
  if (error) throw error;
}

/** Select which puppy the log buttons act on. */
export function useSetCurrentPuppy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      await clearCurrent(householdId);
      const { error } = await supabase
        .from("foster_puppies")
        .update({ is_current: true, active: true })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["foster_puppies", householdId] }),
  });
}

/**
 * Deactivate — the puppy is no longer with us. Keeps every log row; the profile
 * drops out of the picker and stops being current. `departedOn` defaults to today.
 */
export function useDeactivateFosterPuppy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      departedOn,
    }: {
      id: string;
      householdId: string;
      departedOn?: string;
    }) => {
      const { error } = await supabase
        .from("foster_puppies")
        .update({
          active: false,
          is_current: false,
          // getTodayPT, not toISOString() — the UTC date is already tomorrow
          // during a Pacific evening, which would stamp the wrong departure day.
          departed_on: departedOn ?? getTodayPT(),
        })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["foster_puppies", householdId] }),
  });
}

/** Bring a departed puppy back (a foster returning, or an accidental deactivate). */
export function useReactivateFosterPuppy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase
        .from("foster_puppies")
        .update({ active: true, departed_on: null })
        .eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) =>
      qc.invalidateQueries({ queryKey: ["foster_puppies", householdId] }),
  });
}

export function useDeleteFosterPuppy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, householdId }: { id: string; householdId: string }) => {
      const { error } = await supabase.from("foster_puppies").delete().eq("id", id);
      if (error) throw error;
      return householdId;
    },
    onSuccess: (householdId) => {
      qc.invalidateQueries({ queryKey: ["foster_puppies", householdId] });
      qc.invalidateQueries({ queryKey: ["foster_potty_logs"] });
      qc.invalidateQueries({ queryKey: ["foster_feeding_logs"] });
    },
  });
}

// ── Potty logs ───────────────────────────────────────────────────────────────

export function useFosterPottyLogs(puppyId: string | undefined) {
  return useQuery({
    queryKey: ["foster_potty_logs", puppyId],
    queryFn: async () => {
      if (!puppyId) return [];
      const { data, error } = await supabase
        .from("foster_potty_logs")
        .select("*")
        .eq("puppy_id", puppyId)
        .gte("occurred_at", windowStartISO())
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FosterPottyLog[];
    },
    enabled: !!puppyId,
  });
}

export function useLogPotty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      household_id: string;
      puppy_id: string;
      kind: PottyKind;
      location: PottyLocation;
      /** Actual event time — back-dated entries pass an earlier value. */
      occurred_at: string;
      notes?: string | null;
      logged_by_member_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("foster_potty_logs")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data as FosterPottyLog;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["foster_potty_logs", data.puppy_id] }),
  });
}

/** Edit a logged potty entry — kind, location, or the time it happened. */
export function useUpdatePottyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      puppyId,
      updates,
    }: {
      id: string;
      puppyId: string;
      updates: Partial<Pick<FosterPottyLog, "kind" | "location" | "occurred_at" | "notes">>;
    }) => {
      const { error } = await supabase.from("foster_potty_logs").update(updates).eq("id", id);
      if (error) throw error;
      return puppyId;
    },
    onSuccess: (puppyId) =>
      qc.invalidateQueries({ queryKey: ["foster_potty_logs", puppyId] }),
  });
}

export function useDeletePottyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, puppyId }: { id: string; puppyId: string }) => {
      const { error } = await supabase.from("foster_potty_logs").delete().eq("id", id);
      if (error) throw error;
      return puppyId;
    },
    onSuccess: (puppyId) =>
      qc.invalidateQueries({ queryKey: ["foster_potty_logs", puppyId] }),
  });
}

// ── Food / water logs ────────────────────────────────────────────────────────

export function useFosterFeedingLogs(puppyId: string | undefined) {
  return useQuery({
    queryKey: ["foster_feeding_logs", puppyId],
    queryFn: async () => {
      if (!puppyId) return [];
      const { data, error } = await supabase
        .from("foster_feeding_logs")
        .select("*")
        .eq("puppy_id", puppyId)
        .gte("occurred_at", windowStartISO())
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FosterFeedingLog[];
    },
    enabled: !!puppyId,
  });
}

export function useLogFeeding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      household_id: string;
      puppy_id: string;
      kind: FeedingKind;
      amount?: string | null;
      occurred_at: string;
      notes?: string | null;
      logged_by_member_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("foster_feeding_logs")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data as FosterFeedingLog;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["foster_feeding_logs", data.puppy_id] }),
  });
}

/** Edit a logged food/water entry — kind, amount, or the time it happened. */
export function useUpdateFeedingLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      puppyId,
      updates,
    }: {
      id: string;
      puppyId: string;
      updates: Partial<Pick<FosterFeedingLog, "kind" | "amount" | "occurred_at" | "notes">>;
    }) => {
      const { error } = await supabase.from("foster_feeding_logs").update(updates).eq("id", id);
      if (error) throw error;
      return puppyId;
    },
    onSuccess: (puppyId) =>
      qc.invalidateQueries({ queryKey: ["foster_feeding_logs", puppyId] }),
  });
}

export function useDeleteFeedingLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, puppyId }: { id: string; puppyId: string }) => {
      const { error } = await supabase.from("foster_feeding_logs").delete().eq("id", id);
      if (error) throw error;
      return puppyId;
    },
    onSuccess: (puppyId) =>
      qc.invalidateQueries({ queryKey: ["foster_feeding_logs", puppyId] }),
  });
}
