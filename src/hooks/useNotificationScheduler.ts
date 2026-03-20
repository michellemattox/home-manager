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
    notifyMemberIds,
  } = useNotificationStore();

  const { data: projects } = useProjects(household?.id);
  const { data: tasks } = useRecurringTasks(household?.id);
  const { data: goals } = useGoals(household?.id);

  useEffect(() => {
    const isAllMembers = notifyMemberIds.includes("all") || notifyMemberIds.length === 0;

    const activeProjects = (projects ?? []).filter(
      (p) => p.status !== "completed" && p.status !== "finished"
    );
    const activeGoals = (goals ?? []).filter((g) => g.status === "active");

    // Apply member filter
    const filteredProjects = isAllMembers
      ? activeProjects
      : activeProjects.filter((p) =>
          (p.project_owners ?? []).some((o) => notifyMemberIds.includes(o.member_id))
        );
    const filteredTasks = isAllMembers
      ? (tasks ?? [])
      : (tasks ?? []).filter((t) => notifyMemberIds.includes(t.assigned_member_id ?? ""));
    const filteredGoals = isAllMembers
      ? activeGoals
      : activeGoals.filter((g) => notifyMemberIds.includes((g as any).member_id ?? ""));

    const counts = {
      overdueProjects: filteredProjects.filter(
        (p) => p.expected_date && isOverdue(p.expected_date)
      ).length,
      dueSoonProjects: filteredProjects.filter(
        (p) => p.expected_date && !isOverdue(p.expected_date) && isDueSoon(p.expected_date, 14)
      ).length,
      overdueTasks: filteredTasks.filter((t) => isOverdue(t.next_due_date)).length,
      dueSoonTasks: filteredTasks.filter(
        (t) => !isOverdue(t.next_due_date) && isDueSoon(t.next_due_date, 7)
      ).length,
      overdueGoals: filteredGoals.filter(
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
  }, [projects, tasks, goals, overdueEnabled, dueSoonEnabled, summaryEnabled, reminderHour, reminderFrequency, notifyMemberIds]);
}
