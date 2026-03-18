import { useEffect } from "react";
import { useHouseholdStore } from "@/stores/householdStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useProjects } from "@/hooks/useProjects";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { scheduleItemReminders } from "@/lib/notifications";
import { isOverdue, isDueSoon } from "@/utils/dateUtils";

export function useNotificationScheduler() {
  const { household } = useHouseholdStore();
  const { overdueEnabled, dueSoonEnabled, reminderHour } = useNotificationStore();

  const { data: projects } = useProjects(household?.id);
  const { data: tasks } = useRecurringTasks(household?.id);

  useEffect(() => {
    const activeProjects = (projects ?? []).filter(
      (p) => p.status !== "completed" && p.status !== "finished"
    );

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
    };

    scheduleItemReminders(counts, { overdueEnabled, dueSoonEnabled, reminderHour });
  }, [projects, tasks, overdueEnabled, dueSoonEnabled, reminderHour]);
}
