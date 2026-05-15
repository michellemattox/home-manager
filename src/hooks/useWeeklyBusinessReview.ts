import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface WbrIdea {
  id: string;
  subject: string;
  body: string | null;
  author_id: string | null;
  created_at: string;
}

export interface WbrTask {
  id: string;
  title: string;
  due_date: string;
  time_of_day: string | null;
  assigned_member_id: string | null;
  source: "task" | "recurring";
  bucket: "overdue" | "due_today" | "due_soon";
}

export interface WbrProjectUpcoming {
  id: string;
  title: string;
  expected_date: string;
  status: string;
  owner_ids: string[];
}

export interface WbrProjectTask {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  due_date: string;
  assigned_member_id: string | null;
}

export interface WbrProjectUpdate {
  id: string;
  title: string;
  latest_update_body: string;
  latest_update_author_id: string | null;
  latest_update_at: string;
}

export interface WbrActivity {
  id: string;
  title: string;
  destination: string | null;
  departure_date: string;
  return_date: string | null;
  assigned_to: string | null;
}

export interface WbrActivityTask {
  id: string;
  trip_id: string;
  trip_title: string;
  title: string;
  due_date: string;
  assigned_member_id: string | null;
}

export interface WbrActivityUpdate {
  id: string;
  title: string;
  latest_update_body: string;
  latest_update_author_id: string | null;
  latest_update_at: string;
}

export interface WbrSnapshot {
  ideas: WbrIdea[];
  tasks: WbrTask[];
  projects_upcoming: WbrProjectUpcoming[];
  project_tasks: WbrProjectTask[];
  projects_with_recent_updates: WbrProjectUpdate[];
  activities: WbrActivity[];
  activity_tasks?: WbrActivityTask[];
  activities_with_recent_updates?: WbrActivityUpdate[];
}

export interface WeeklyBusinessReview {
  id: string;
  household_id: string;
  week_start: string;
  snapshot: WbrSnapshot;
  generated_at: string;
}

export function useLatestWBR(householdId: string | undefined) {
  return useQuery({
    queryKey: ["weekly_business_reviews", householdId],
    queryFn: async () => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from("weekly_business_reviews")
        .select("*")
        .eq("household_id", householdId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as WeeklyBusinessReview | null;
    },
    enabled: !!householdId,
  });
}

/** Manually trigger generation (calls the edge function with force=true). */
export function useGenerateWBR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (householdId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-wbr", {
        body: { force: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, householdId) => {
      qc.invalidateQueries({ queryKey: ["weekly_business_reviews", householdId] });
    },
  });
}
