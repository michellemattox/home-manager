import { useEffect } from "react";
import { useHouseholdStore } from "@/stores/householdStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useProjects } from "@/hooks/useProjects";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useGoals } from "@/hooks/useGoals";
import { scheduleItemReminders } from "@/lib/notifications";
import { isOverdue, isDueSoon } from "@/utils/dateUtils";

export function useNotificationScheduler() {
  const { household } = useHouseholdStore();
  const {
    overdueEnabled,
    dueSoonEnabled,
    summaryEnabled,
    reminderHour,
    reminderFrequency,
  } = useNotificationStore();

  const { data: projects } = useProjects(household?.id);
  const { data: tasks } = useRecurringTasks(household?.id);
  const { data: goals } = useGoals(household?.id);

  useEffect(() => {
    const activeProjects = (projects ?? []).filter(
      (p) => p.status !== "completed" && p.status !== "finished"
    );
    const activeGoals = (goals ?? []).filter((g) => g.status === "active");

    const counts = {
      overdueProjects: activeProjects.filter(
        (p) => p.expected_date && isOverdue(p.expected_date)
      ).length,
      dueSoonProjects: activeProjects.filter(
        (p) => p.expected_date && !isOverdue(p.expected_date) && isDueSoon(p.expected_date, 14)
      ).length,
      overdueTasks: (tasks ?? []).filter((t) => isOverdue(t.next_due_date)).length,
      dueSoonTasks: (tasks ?? []).filter(
        (t) => !isOverdue(t.next_due_date) && isDueSoon(t.next_due_date, 7)
      ).length,
      overdueGoals: activeGoals.filter(
        (g) => g.due_date && isOverdue(g.due_date)
      ).length,
    };

    scheduleItemReminders(counts, {
      overdueEnabled,
      dueSoonEnabled,
      summaryEnabled,
      reminderHour,
      reminderFrequency,
    });
  }, [projects, tasks, goals, overdueEnabled, dueSoonEnabled, summaryEnabled, reminderHour, reminderFrequency]);
}
