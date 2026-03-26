import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SeasonScore = {
  tasksThisMonth: number;
  tasksLastMonth: number;
  projectsThisMonth: number;
  projectsLastMonth: number;
  delta: number; // positive = doing better this month
};

export function useSeasonScore(householdId: string | undefined) {
  return useQuery({
    queryKey: ["season_score", householdId],
    queryFn: async (): Promise<SeasonScore> => {
      if (!householdId) return { tasksThisMonth: 0, tasksLastMonth: 0, projectsThisMonth: 0, projectsLastMonth: 0, delta: 0 };

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Task completions — all members of this household
      const membersRes = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .is("invite_token", null);
      const memberIds = (membersRes.data ?? []).map((m) => m.id);

      const [thisMonthCompletions, lastMonthCompletions, thisMonthProjects, lastMonthProjects] =
        await Promise.all([
          supabase
            .from("recurring_task_completions")
            .select("id", { count: "exact", head: true })
            .in("completed_by", memberIds)
            .gte("completed_at", thisMonthStart),
          supabase
            .from("recurring_task_completions")
            .select("id", { count: "exact", head: true })
            .in("completed_by", memberIds)
            .gte("completed_at", lastMonthStart)
            .lte("completed_at", lastMonthEnd),
          supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("household_id", householdId)
            .in("status", ["completed", "finished"])
            .gte("updated_at", thisMonthStart),
          supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("household_id", householdId)
            .in("status", ["completed", "finished"])
            .gte("updated_at", lastMonthStart)
            .lte("updated_at", lastMonthEnd),
        ]);

      const tasksThis   = thisMonthCompletions.count ?? 0;
      const tasksLast   = lastMonthCompletions.count ?? 0;
      const projectsThis = thisMonthProjects.count ?? 0;
      const projectsLast = lastMonthProjects.count ?? 0;

      return {
        tasksThisMonth: tasksThis,
        tasksLastMonth: tasksLast,
        projectsThisMonth: projectsThis,
        projectsLastMonth: projectsLast,
        delta: (tasksThis + projectsThis) - (tasksLast + projectsLast),
      };
    },
    enabled: !!householdId,
    staleTime: 5 * 60 * 1000,
  });
}
