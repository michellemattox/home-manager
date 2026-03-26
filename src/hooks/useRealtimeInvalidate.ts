import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Subscribes to Supabase Realtime changes on key home-dashboard tables
 * and invalidates the relevant TanStack Query caches so all household
 * members see updates instantly without polling.
 */
export function useHomeRealtime(householdId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`home-realtime-${householdId}`)
      // Recurring tasks due / completed
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_tasks", filter: `household_id=eq.${householdId}` },
        () => qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recurring_task_completions" },
        () => qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] })
      )
      // One-off tasks
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` },
        () => qc.invalidateQueries({ queryKey: ["tasks", householdId] })
      )
      // Projects
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `household_id=eq.${householdId}` },
        () => qc.invalidateQueries({ queryKey: ["projects", householdId] })
      )
      // Wow updates
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wow_updates", filter: `household_id=eq.${householdId}` },
        () => qc.invalidateQueries({ queryKey: ["wow_updates", householdId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);
}
