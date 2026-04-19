import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Single global realtime subscription for the entire authenticated app.
 * Called once from app/(app)/_layout.tsx so every tab gets live updates
 * without each screen having to set up its own channel.
 *
 * When any row changes, we invalidate the relevant TanStack Query key so
 * all household members see updates instantly without manual pull-to-refresh.
 */
export function useGlobalRealtime(householdId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!householdId) return;

    const hf = `household_id=eq.${householdId}`;

    const channel = supabase
      .channel(`global-realtime-${householdId}`)

      // ── Home dashboard ───────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_tasks", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recurring_task_completions" },
        () => qc.invalidateQueries({ queryKey: ["recurring_tasks", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "wow_updates", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["wow_updates", householdId] }))

      // ── Tasks ────────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: hf },
        () => {
          qc.invalidateQueries({ queryKey: ["tasks", householdId] });
          qc.invalidateQueries({ queryKey: ["tasks_completed", householdId] });
        })

      // ── Projects ─────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: hf },
        () => {
          qc.invalidateQueries({ queryKey: ["projects", householdId] });
          qc.invalidateQueries({ queryKey: ["project"] }); // invalidates all ["project", id] keys
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_updates" },
        () => {
          qc.invalidateQueries({ queryKey: ["project"] });
          qc.invalidateQueries({ queryKey: ["projects", householdId] });
        })

      // ── Ideas ────────────────────────────────────────────────────────────────
      // ideas uses topic_id as the household_id column (legacy naming)
      .on("postgres_changes", { event: "*", schema: "public", table: "ideas", filter: `topic_id=eq.${householdId}` },
        () => qc.invalidateQueries({ queryKey: ["ideas", householdId] }))

      // ── Service records ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "service_records", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["service_records", householdId] }))

      // ── Travel ───────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["trips", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_tasks" },
        () => qc.invalidateQueries({ queryKey: ["trip"] }))

      // ── Goals ────────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["goals", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_updates", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["goals", householdId] }))

      // ── Gifts ────────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "gifts", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["gifts", householdId] }))

      // ── Checklist items ───────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" },
        () => {
          qc.invalidateQueries({ queryKey: ["project"] });
          qc.invalidateQueries({ queryKey: ["all_project_tasks"] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "completed_checklist_items" },
        () => {
          qc.invalidateQueries({ queryKey: ["completed_checklist"] });
          qc.invalidateQueries({ queryKey: ["project"] });
          qc.invalidateQueries({ queryKey: ["trip"] });
        })

      // ── Vendors ──────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "preferred_vendors", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["preferred_vendors", householdId] }))

      // ── Household ────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "household_members", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["household_members", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "household_invites", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["household_invites", householdId] }))

      // ── Garden ───────────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_plots", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_plots", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_zones", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_zones"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_plantings", filter: hf },
        () => {
          qc.invalidateQueries({ queryKey: ["garden_plantings"] });
          qc.invalidateQueries({ queryKey: ["garden_plantings_household", householdId] });
          qc.invalidateQueries({ queryKey: ["garden_plantings_all", householdId] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_harvests", filter: hf },
        () => {
          qc.invalidateQueries({ queryKey: ["garden_harvests"] });
          qc.invalidateQueries({ queryKey: ["garden_all_harvests", householdId] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_amendments", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_amendments"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_journal_entries", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_journal", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_pest_logs", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_pest_logs", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_seed_inventory", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_seeds", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_watering_logs", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_watering", householdId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_weather_logs", filter: hf },
        () => qc.invalidateQueries({ queryKey: ["garden_weather_logs", householdId] }))

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);
}

/** @deprecated Use useGlobalRealtime from app/(app)/_layout.tsx instead. */
export const useHomeRealtime = useGlobalRealtime;
