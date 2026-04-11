import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useProjects } from "@/hooks/useProjects";
import { useRecurringTasks, useCompleteRecurringTask } from "@/hooks/useRecurringTasks";
import { useTasks, useCompleteTask } from "@/hooks/useTasks";
import { useServiceRecords } from "@/hooks/useServices";
import { useAllProjectTasks } from "@/hooks/useProjectTasks";
import { useAllTripTasks } from "@/hooks/useTrips";
import { isOverdue, isDueSoon, daysUntilDue, formatDate, formatDateShort, taskBadgeLabel } from "@/utils/dateUtils";
import { centsToDisplay } from "@/utils/currencyUtils";
import { showAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";
import { notificationSuccess } from "@/lib/haptics";
import type { ProjectWithOwners, RecurringTask, Task, ProjectTask, TripTask } from "@/types/app.types";
import { AppHeader } from "@/components/ui/AppHeader";
import { useWowUpdates, useGenerateWow, type WowUpdate } from "@/hooks/useWowUpdates";
import {
  useGardenAdvisorRecs,
  useGenerateGardenAdvisor,
  useDismissAdvisorRec,
  useAcceptAdvisorRec,
  type AdvisorRec,
} from "@/hooks/useGardenAdvisor";
import { useHomeRealtime } from "@/hooks/useRealtimeInvalidate";
import { useSeasonScore } from "@/hooks/useSeasonScore";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionHeader({ title, count, onSeeAll, raw }: { title: string; count?: number; onSeeAll?: () => void; raw?: boolean }) {
  return (
    <View className="flex-row items-center justify-between mb-2 mt-4">
      <View className="flex-row items-center gap-2">
        <Text className={`text-sm font-bold text-gray-700 tracking-wide${raw ? "" : " uppercase"}`}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View className="bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
            <Text className="text-white text-xs font-bold">{count}</Text>
          </View>
        )}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text className="text-blue-600 text-sm">See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function OverdueProjectCard({ project, onPress }: { project: ProjectWithOwners; onPress: () => void }) {
  const daysOverdue = project.expected_date
    ? Math.abs(daysUntilDue(project.expected_date))
    : 0;

  return (
    <TouchableOpacity onPress={onPress} className="rounded-xl p-3 mb-2" style={{ backgroundColor: "#F05665" }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-white" numberOfLines={1}>{project.title}</Text>
          {project.category && <Text className="text-xs text-white/70 mt-0.5">{project.category}</Text>}
        </View>
        <View className="bg-black/20 rounded-lg px-2 py-0.5">
          <Text className="text-white text-xs font-semibold">{daysOverdue}d overdue</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DueSoonProjectCard({ project, onPress }: { project: ProjectWithOwners; onPress: () => void }) {
  const days = project.expected_date ? daysUntilDue(project.expected_date) : 0;

  return (
    <TouchableOpacity onPress={onPress} className="rounded-xl p-3 mb-2" style={{ backgroundColor: "#F5F55F" }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{project.title}</Text>
          {project.category && <Text className="text-xs text-gray-600 mt-0.5">{project.category}</Text>}
        </View>
        <View className="bg-black/10 rounded-lg px-2 py-0.5">
          <Text className="text-gray-800 text-xs font-semibold">
            {days === 0 ? "Due today" : `${days}d left`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function OverdueTaskRow({
  task,
  onComplete,
  onPress,
}: { task: RecurringTask; onComplete: () => void; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
      <View className="flex-row items-center">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{task.title}</Text>
          <Text className="text-xs text-red-600 mt-0.5">{taskBadgeLabel(task.next_due_date, (task as any).time_of_day)}</Text>
        </View>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onComplete(); }}
          className="bg-green-100 rounded-lg px-3 py-1.5"
        >
          <Text className="text-green-700 text-xs font-semibold">Done</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function DueSoonTaskRow({
  task,
  onComplete,
  onPress,
}: { task: RecurringTask; onComplete: () => void; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
      <View className="flex-row items-center">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{task.title}</Text>
          <Text className="text-xs text-amber-700 mt-0.5">{taskBadgeLabel(task.next_due_date, (task as any).time_of_day)}</Text>
        </View>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onComplete(); }}
          className="bg-green-100 rounded-lg px-3 py-1.5"
        >
          <Text className="text-green-700 text-xs font-semibold">Done</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function OneOffTaskRow({
  task,
  onComplete,
  variant,
}: { task: Task; onComplete: () => void; variant: "overdue" | "due-soon" }) {
  const bg = variant === "overdue" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const dateColor = variant === "overdue" ? "text-red-600" : "text-amber-700";
  return (
    <View className={`border rounded-xl p-3 mb-2 flex-row items-center ${bg}`}>
      <View className="flex-1 mr-2">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{task.title}</Text>
        {task.due_date && (
          <Text className={`text-xs mt-0.5 ${dateColor}`}>{taskBadgeLabel(task.due_date)}</Text>
        )}
      </View>
      <TouchableOpacity onPress={onComplete} className="bg-green-100 rounded-lg px-3 py-1.5">
        <Text className="text-green-700 text-xs font-semibold">Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function ChecklistItemRow({
  title,
  parentTitle,
  dueDate,
  variant,
  onPress,
}: {
  title: string;
  parentTitle: string;
  dueDate: string;
  variant: "overdue" | "due-soon";
  onPress: () => void;
}) {
  const bg = variant === "overdue" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const dateColor = variant === "overdue" ? "text-red-600" : "text-amber-700";
  const badge = taskBadgeLabel(dueDate);
  return (
    <TouchableOpacity onPress={onPress} className={`border rounded-xl p-3 mb-2 ${bg}`}>
      <View className="flex-row items-center">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{title}</Text>
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{parentTitle}</Text>
          <Text className={`text-xs mt-0.5 ${dateColor}`}>{badge}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ADVISOR_PRIORITY_COLORS: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
  urgent: { bg: "#FFF1F2", border: "#FCA5A5", badge: "#EF4444", badgeText: "white" },
  normal:  { bg: "#F0FDF4", border: "#86EFAC", badge: "#22C55E", badgeText: "white" },
  info:    { bg: "#EFF6FF", border: "#93C5FD", badge: "#3B82F6", badgeText: "white" },
};

const ACTION_TYPE_ICONS: Record<string, string> = {
  watering: "💧",
  pests: "🐛",
  garden: "🌱",
  tasks: "✅",
  harvest: "🥬",
};

function AdvisorRecCard({
  rec,
  onAccept,
  onDismiss,
  accepting,
  dismissing,
}: {
  rec: AdvisorRec;
  onAccept: () => void;
  onDismiss: () => void;
  accepting: boolean;
  dismissing: boolean;
}) {
  const colors = ADVISOR_PRIORITY_COLORS[rec.priority] ?? ADVISOR_PRIORITY_COLORS.normal;
  const icon = ACTION_TYPE_ICONS[rec.action_type] ?? "🌿";
  return (
    <View
      className="rounded-xl p-3 mb-2 border"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <View className="flex-row items-start gap-2 mb-2">
        <Text className="text-base mt-0.5">{icon}</Text>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.badge }}>
              <Text className="text-xs font-bold" style={{ color: colors.badgeText }}>
                {rec.priority.toUpperCase()}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {rec.action_label}
            </Text>
          </View>
          <Text className="text-sm text-gray-800 leading-5">{rec.recommendation}</Text>
        </View>
      </View>
      <View className="flex-row gap-2 mt-1">
        <TouchableOpacity
          onPress={onAccept}
          disabled={accepting || dismissing}
          className="flex-1 bg-green-600 rounded-lg py-2 items-center"
        >
          <Text className="text-white text-xs font-semibold">
            {accepting ? "Adding…" : "Accept → Tasks"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDismiss}
          disabled={accepting || dismissing}
          className="flex-1 bg-white border border-gray-200 rounded-lg py-2 items-center"
        >
          <Text className="text-gray-500 text-xs font-semibold">
            {dismissing ? "Dismissing…" : "Dismiss"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const WOW_COLORS: Record<string, string> = {
  idea: "#FBFCCF",
  project: "#EBFAFC",
  activity: "#FADCDF",
  goal: "#F5E7D3",
  task: "#F6EDFF",
};
const WOW_LABELS: Record<string, string> = {
  idea: "Idea", project: "Project", activity: "Activity", goal: "Goal", task: "Task",
};

function WowCard({ entry, onPress }: { entry: WowUpdate; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-xl p-3 mb-2"
      style={{ backgroundColor: WOW_COLORS[entry.source_type] ?? "#f9fafb" }}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          {WOW_LABELS[entry.source_type]}
        </Text>
        <Text className="text-gray-400 text-sm">›</Text>
      </View>
      <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{entry.title}</Text>
      <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={2}>{entry.summary}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, sub, color, bgColor, onPress }: {
  label: string; value: string; sub?: string; color: string; bgColor?: string; onPress?: () => void;
}) {
  const content = (
    <View className={`flex-1 rounded-xl p-3 ${color}`} style={bgColor ? { backgroundColor: bgColor } : undefined}>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs font-semibold text-gray-700 mt-0.5">{label}</Text>
      {sub && <Text className="text-xs text-gray-500 mt-0.5">{sub}</Text>}
    </View>
  );
  return onPress ? <TouchableOpacity className="flex-1" onPress={onPress}>{content}</TouchableOpacity> : content;
}

function SeasonScoreCard({ householdId }: { householdId: string | undefined }) {
  const { data: score } = useSeasonScore(householdId);
  if (!score) return null;
  const total = score.tasksThisMonth + score.projectsThisMonth;
  const lastTotal = score.tasksLastMonth + score.projectsLastMonth;
  if (total === 0 && lastTotal === 0) return null;

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
  const emoji = score.delta > 0 ? "🔥" : score.delta < 0 ? "📉" : "➡️";
  const deltaText = score.delta > 0
    ? `+${score.delta} more than last month`
    : score.delta < 0
    ? `${score.delta} vs last month`
    : "Same as last month";

  return (
    <View className="rounded-xl p-4 mt-4 border border-amber-200" style={{ backgroundColor: "#FFFBEB" }}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-bold text-amber-700 uppercase tracking-wide">
          {emoji} {monthName} Score
        </Text>
        <Text className="text-xs text-amber-600 font-medium">{deltaText}</Text>
      </View>
      <View className="flex-row gap-4">
        <View className="flex-1 items-center bg-white rounded-xl py-3 border border-amber-100">
          <Text className="text-2xl font-bold text-amber-700">{score.tasksThisMonth}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Tasks done</Text>
          {score.tasksLastMonth > 0 && (
            <Text className="text-xs text-gray-400">{score.tasksLastMonth} last mo.</Text>
          )}
        </View>
        <View className="flex-1 items-center bg-white rounded-xl py-3 border border-amber-100">
          <Text className="text-2xl font-bold text-amber-700">{score.projectsThisMonth}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Projects done</Text>
          {score.projectsLastMonth > 0 && (
            <Text className="text-xs text-gray-400">{score.projectsLastMonth} last mo.</Text>
          )}
        </View>
        <View className="flex-1 items-center bg-white rounded-xl py-3 border border-amber-100">
          <Text className="text-2xl font-bold text-amber-700">{total}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Total wins</Text>
          {lastTotal > 0 && (
            <Text className="text-xs text-gray-400">{lastTotal} last mo.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // empty = All

  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects(household?.id);
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useRecurringTasks(household?.id);
  const { data: oneOffTasks = [], refetch: refetchOneOff } = useTasks(household?.id);
  const { data: serviceRecords, refetch: refetchServices } = useServiceRecords(household?.id);
  const { data: allProjectTasks = [], refetch: refetchProjectTasks } = useAllProjectTasks(household?.id);
  const { data: allTripTasks = [], refetch: refetchTripTasks } = useAllTripTasks(household?.id);
  const completeRecurring = useCompleteRecurringTask();
  const completeOneOff = useCompleteTask();
  const { data: wowUpdates = [], refetch: refetchWow } = useWowUpdates(household?.id);
  const generateWow = useGenerateWow();
  const [generatingWow, setGeneratingWow] = useState(false);

  // Garden Advisor
  const { data: advisorRecs = [], refetch: refetchAdvisor } = useGardenAdvisorRecs(household?.id);
  const generateAdvisor = useGenerateGardenAdvisor();
  const dismissRec = useDismissAdvisorRec();
  const acceptRec = useAcceptAdvisorRec();
  const [generatingAdvisor, setGeneratingAdvisor] = useState(false);
  const [advisorPending, setAdvisorPending] = useState<Record<string, "accepting" | "dismissing">>({});
  // Track which entries have been seen — dismissed on manual refresh if unchanged
  const [dismissedHashes, setDismissedHashes] = useState<Set<string>>(new Set());

  const wowEntryHash = (e: WowUpdate) =>
    `${e.source_type}:${e.source_id ?? ""}:${e.summary}`;

  // Ordered: idea → task → project → activity → goal
  const WOW_ORDER: Record<string, number> = { idea: 0, task: 1, project: 2, activity: 3, goal: 4 };
  const visibleWow = wowUpdates
    .filter((e) => !dismissedHashes.has(wowEntryHash(e)))
    .sort((a, b) => (WOW_ORDER[a.source_type] ?? 9) - (WOW_ORDER[b.source_type] ?? 9));

  const handleGenerateWow = async () => {
    if (!household) return;
    setGeneratingWow(true);
    try {
      // Mark everything currently shown as dismissed before regenerating
      const newDismissed = new Set(dismissedHashes);
      wowUpdates.forEach((e) => newDismissed.add(wowEntryHash(e)));
      setDismissedHashes(newDismissed);
      await generateWow(household.id);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setGeneratingWow(false);
    }
  };

  const handleGenerateAdvisor = async () => {
    if (!household) return;
    setGeneratingAdvisor(true);
    try {
      await generateAdvisor(household.id);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setGeneratingAdvisor(false);
    }
  };

  const handleAcceptRec = async (rec: AdvisorRec) => {
    setAdvisorPending((p) => ({ ...p, [rec.id]: "accepting" }));
    try {
      await acceptRec.mutateAsync(rec.id);
      // Navigate to tasks after accepting — user can create the task there
      router.push("/(app)/(tasks)/new");
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setAdvisorPending((p) => { const n = { ...p }; delete n[rec.id]; return n; });
    }
  };

  const handleDismissRec = async (recId: string) => {
    setAdvisorPending((p) => ({ ...p, [recId]: "dismissing" }));
    try {
      await dismissRec.mutateAsync(recId);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setAdvisorPending((p) => { const n = { ...p }; delete n[recId]; return n; });
    }
  };

  const handleWowPress = (entry: WowUpdate) => {
    if (entry.source_type === "project" && entry.source_id) {
      router.push(`/(app)/(projects)/${entry.source_id}?from=wow`);
    } else if (entry.source_type === "activity" && entry.source_id) {
      router.push(`/(app)/(activity)/${entry.source_id}?from=wow`);
    } else if (entry.source_tab === "ideas") {
      router.push("/(app)/(ideas)");
    } else if (entry.source_tab === "tasks") {
      router.push("/(app)/(tasks)");
    } else if (entry.source_tab === "goals") {
      router.push("/(app)/(goals)");
    }
  };

  // Realtime subscriptions — all members see changes instantly
  useHomeRealtime(household?.id);

  const [connectingReminderId, setConnectingReminderId] = useState<string | null>(null);

  const handleConnectToProject = async (reminderId: string, projectId: string) => {
    const { error } = await supabase
      .from("service_records")
      .update({ event_type: "project", event_id: projectId })
      .eq("id", reminderId);
    if (error) { showAlert("Error", error.message); return; }
    refetchServices();
    setConnectingReminderId(null);
  };

  const isLoading = loadingProjects || loadingTasks;

  const onRefresh = () => {
    refetchProjects();
    refetchTasks();
    refetchOneOff();
    refetchServices();
    refetchProjectTasks();
    refetchTripTasks();
    refetchWow();
    refetchAdvisor();
  };

  // Member filter helper — empty array = show all
  const matchesMember = (memberId: string | null | undefined) =>
    selectedMembers.length === 0 || (memberId != null && selectedMembers.includes(memberId));

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  // Projects
  const activeProjects = (projects ?? []).filter(
    (p) => p.status !== "completed" && p.status !== "finished"
  );
  const filteredProjects = activeProjects.filter((p) =>
    selectedMembers.length === 0 ||
    (p.project_owners ?? []).some((po: any) => selectedMembers.includes(po.member_id))
  );
  const overdueProjects = filteredProjects.filter(
    (p) => p.expected_date && isOverdue(p.expected_date)
  );
  const dueSoonProjects = filteredProjects.filter(
    (p) => p.expected_date && !isOverdue(p.expected_date) && isDueSoon(p.expected_date, 14)
  );

  // Recurring tasks
  const filteredRecurring = (tasks ?? []).filter((t) => matchesMember(t.assigned_member_id));
  const overdueTasks = filteredRecurring.filter((t) => isOverdue(t.next_due_date));
  const dueSoonTasks = filteredRecurring.filter(
    (t) => !isOverdue(t.next_due_date) && isDueSoon(t.next_due_date, 7)
  );

  // One-off tasks with due dates
  const filteredOneOff = oneOffTasks.filter((t) => matchesMember(t.assigned_member_id));
  const overdueOneOff = filteredOneOff.filter((t) => t.due_date && isOverdue(t.due_date));
  const dueSoonOneOff = filteredOneOff.filter(
    (t) => t.due_date && !isOverdue(t.due_date) && isDueSoon(t.due_date, 7)
  );

  // Project checklist items with due dates
  const filteredProjectTasks = allProjectTasks.filter((t) => t.due_date && matchesMember(t.assigned_member_id));
  const overdueProjectTasks = filteredProjectTasks.filter((t) => isOverdue(t.due_date!));
  const dueSoonProjectTasks = filteredProjectTasks.filter(
    (t) => !isOverdue(t.due_date!) && isDueSoon(t.due_date!, 7)
  );

  // Trip checklist items with due dates
  const filteredTripTasks = allTripTasks.filter((t) => t.due_date && matchesMember(t.assigned_member_id));
  const overdueTripTasks = filteredTripTasks.filter((t) => isOverdue(t.due_date!));
  const dueSoonTripTasks = filteredTripTasks.filter(
    (t) => !isOverdue(t.due_date!) && isDueSoon(t.due_date!, 7)
  );

  // Stats — year-to-date spend (Jan 1 of current year)
  const totalAlerts = overdueProjects.length + overdueTasks.length + overdueOneOff.length
    + overdueProjectTasks.length + overdueTripTasks.length;
  const thisYearStart = new Date(new Date().getFullYear(), 0, 1);
  const yearlySpend = (serviceRecords ?? [])
    .filter((r) => new Date(r.service_date) >= thisYearStart)
    .reduce((sum, r) => sum + r.cost_cents, 0);

  // Upcoming service reminders — records with frequency that are coming due within 60 days
  const now = new Date();
  const upcomingServiceReminders = (serviceRecords ?? [])
    .filter((r) => {
      if (!r.frequency) return false;
      if (r.event_type === "project" && r.event_id) return false; // connected to a project — shown there instead
      const days = r.frequency === "monthly" ? 30 : r.frequency === "quarterly" ? 90 : r.frequency === "bi-annually" ? 180 : 365;
      const nextDue = new Date(new Date(r.service_date).getTime() + days * 86400000);
      const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000);
      return daysUntil <= 60 && daysUntil >= -14; // show within 60 days or up to 2 weeks overdue
    })
    .map((r) => {
      const days = r.frequency === "monthly" ? 30 : r.frequency === "quarterly" ? 90 : r.frequency === "bi-annually" ? 180 : 365;
      const nextDue = new Date(new Date(r.service_date).getTime() + days * 86400000);
      return { ...r, nextDue };
    })
    .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());

  const handleCompleteRecurring = async (task: RecurringTask) => {
    await notificationSuccess();
    if (!currentMember) return;
    try {
      await completeRecurring.mutateAsync({ task, completedBy: currentMember.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCompleteOneOff = async (task: Task) => {
    await notificationSuccess();
    try {
      await completeOneOff.mutateAsync({ id: task.id, householdId: household!.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const hasAlerts = overdueProjects.length > 0 || overdueTasks.length > 0 || overdueOneOff.length > 0
    || overdueProjectTasks.length > 0 || overdueTripTasks.length > 0;
  const hasUpcoming = dueSoonProjects.length > 0 || dueSoonTasks.length > 0 || dueSoonOneOff.length > 0
    || dueSoonProjectTasks.length > 0 || dueSoonTripTasks.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#E4F2E4]" edges={["top"]}>
      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        {/* App header */}
        <AppHeader />

        {/* Greeting */}
        <View className="pb-2">
          <Text className="text-lg font-semibold text-gray-800">
            {greeting()}{currentMember ? `, ${currentMember.display_name.split(" ")[0]}` : ""}
          </Text>
          {household && (
            <Text className="text-sm text-gray-500 mt-0.5">{household.name}</Text>
          )}
        </View>

        {/* Member Filter */}
        <View className="flex-row flex-wrap gap-2 mb-1">
          <TouchableOpacity
            onPress={() => setSelectedMembers([])}
            className={`px-3 py-1 rounded-full border ${selectedMembers.length === 0 ? "bg-gray-700 border-gray-700" : "bg-white border-gray-300"}`}
          >
            <Text className={`text-xs font-semibold ${selectedMembers.length === 0 ? "text-white" : "text-gray-600"}`}>All</Text>
          </TouchableOpacity>
          {members.map((m) => {
            const active = selectedMembers.includes(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => toggleMember(m.id)}
                className={`px-3 py-1 rounded-full border ${active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>{m.display_name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mt-3">
          <StatCard
            label="Active Projects"
            value={String(activeProjects.length)}
            color=""
            bgColor="#1BC9E0"
            onPress={() => router.push("/(app)/(projects)")}
          />
          <StatCard
            label="Overdue"
            value={String(totalAlerts)}
            sub={totalAlerts > 0 ? "needs attention" : "all clear"}
            color=""
            bgColor={totalAlerts > 0 ? "#F05665" : "#ABF7AD"}
            onPress={() => router.push("/(app)/(tasks)")}
          />
          <StatCard
            label={`Spent ${new Date().getFullYear()}`}
            value={centsToDisplay(yearlySpend, true)}
            color=""
            bgColor="#FA9B75"
            onPress={() => router.push("/(app)/(services)")}
          />
        </View>

        {/* Needs Attention */}
        {hasAlerts && (
          <>
            <SectionHeader title="Needs Attention" count={totalAlerts} />
            {overdueProjects.map((p) => (
              <OverdueProjectCard
                key={p.id}
                project={p}
                onPress={() => router.push(`/(app)/(projects)/${p.id}`)}
              />
            ))}
            {overdueTasks.map((t) => (
              <OverdueTaskRow
                key={t.id}
                task={t}
                onPress={() => router.push(`/(app)/(tasks)?openTaskId=${t.id}`)}
                onComplete={() => handleCompleteRecurring(t)}
              />
            ))}
            {overdueOneOff.map((t) => (
              <OneOffTaskRow
                key={t.id}
                task={t}
                variant="overdue"
                onComplete={() => handleCompleteOneOff(t)}
              />
            ))}
            {overdueProjectTasks.map((t) => (
              <ChecklistItemRow
                key={`pt-${t.id}`}
                title={t.title}
                parentTitle={(t as any).project_title ?? "Project"}
                dueDate={t.due_date!}
                variant="overdue"
                onPress={() => router.push(`/(app)/(projects)/${t.project_id}`)}
              />
            ))}
            {overdueTripTasks.map((t) => (
              <ChecklistItemRow
                key={`tt-${t.id}`}
                title={t.title}
                parentTitle={(t as any).trip_title ?? "Trip"}
                dueDate={t.due_date!}
                variant="overdue"
                onPress={() => router.push(`/(app)/(activity)/${t.trip_id}`)}
              />
            ))}
          </>
        )}

        {/* Coming Up */}
        {hasUpcoming && (
          <>
            <SectionHeader title="Coming Up" />
            {dueSoonProjects.map((p) => (
              <DueSoonProjectCard
                key={p.id}
                project={p}
                onPress={() => router.push(`/(app)/(projects)/${p.id}`)}
              />
            ))}
            {dueSoonTasks.map((t) => (
              <DueSoonTaskRow
                key={t.id}
                task={t}
                onPress={() => router.push(`/(app)/(tasks)?openTaskId=${t.id}`)}
                onComplete={() => handleCompleteRecurring(t)}
              />
            ))}
            {dueSoonOneOff.map((t) => (
              <OneOffTaskRow
                key={t.id}
                task={t}
                variant="due-soon"
                onComplete={() => handleCompleteOneOff(t)}
              />
            ))}
            {dueSoonProjectTasks.map((t) => (
              <ChecklistItemRow
                key={`pt-${t.id}`}
                title={t.title}
                parentTitle={(t as any).project_title ?? "Project"}
                dueDate={t.due_date!}
                variant="due-soon"
                onPress={() => router.push(`/(app)/(projects)/${t.project_id}`)}
              />
            ))}
            {dueSoonTripTasks.map((t) => (
              <ChecklistItemRow
                key={`tt-${t.id}`}
                title={t.title}
                parentTitle={(t as any).trip_title ?? "Trip"}
                dueDate={t.due_date!}
                variant="due-soon"
                onPress={() => router.push(`/(app)/(activity)/${t.trip_id}`)}
              />
            ))}
          </>
        )}

        {/* WoW Updates */}
        <View className="flex-row items-center justify-between mt-4 mb-1">
          <SectionHeader title="WoW Updates" count={visibleWow.length} raw />
          <TouchableOpacity
            onPress={handleGenerateWow}
            disabled={generatingWow}
            className="px-3 py-1 rounded-full bg-white/60 border border-gray-200"
          >
            <Text className="text-xs font-semibold text-gray-500">
              {generatingWow ? "Generating…" : "↻ Refresh"}
            </Text>
          </TouchableOpacity>
        </View>
        {visibleWow.length === 0 ? (
          <View className="rounded-xl p-4 mb-2 items-center bg-white/50 border border-gray-100">
            <Text className="text-sm text-gray-400">No updates yet for this week.</Text>
            <Text className="text-xs text-gray-300 mt-1">Tap ↻ Refresh to generate.</Text>
          </View>
        ) : (
          visibleWow.map((entry) => (
            <WowCard key={entry.id} entry={entry} onPress={() => handleWowPress(entry)} />
          ))
        )}

        {/* Garden Today — AI Advisor */}
        <View className="flex-row items-center justify-between mt-4 mb-1">
          <SectionHeader title="Garden Today" count={advisorRecs.length} raw />
          <TouchableOpacity
            onPress={handleGenerateAdvisor}
            disabled={generatingAdvisor}
            className="px-3 py-1 rounded-full bg-white/60 border border-gray-200"
          >
            <Text className="text-xs font-semibold text-gray-500">
              {generatingAdvisor ? "Thinking…" : "↻ Refresh"}
            </Text>
          </TouchableOpacity>
        </View>
        {advisorRecs.length === 0 ? (
          <View className="rounded-xl p-4 mb-2 items-center bg-white/50 border border-gray-100">
            <Text className="text-sm text-gray-400">No garden advice yet for today.</Text>
            <Text className="text-xs text-gray-300 mt-1">Tap ↻ Refresh to generate.</Text>
          </View>
        ) : (
          advisorRecs.map((rec) => (
            <AdvisorRecCard
              key={rec.id}
              rec={rec}
              onAccept={() => handleAcceptRec(rec)}
              onDismiss={() => handleDismissRec(rec.id)}
              accepting={advisorPending[rec.id] === "accepting"}
              dismissing={advisorPending[rec.id] === "dismissing"}
            />
          ))
        )}

        {/* Season Score */}
        <SeasonScoreCard householdId={household?.id} />

        {/* All clear banner */}
        {!hasAlerts && !hasUpcoming && (activeProjects.length > 0 || (tasks ?? []).length > 0) && (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 items-center">
            <Text className="text-2xl mb-1">✓</Text>
            <Text className="text-sm font-semibold text-green-800">All caught up!</Text>
            <Text className="text-xs text-green-600 mt-0.5">No overdue or upcoming items</Text>
          </View>
        )}

        {/* Upcoming Service Reminders */}
        {upcomingServiceReminders.length > 0 && (
          <>
            <SectionHeader
              title="Service Reminders"
              onSeeAll={() => router.push("/(app)/(services)")}
            />
            {upcomingServiceReminders.map((r) => {
              const daysUntil = Math.ceil((r.nextDue.getTime() - now.getTime()) / 86400000);
              const isOverdueService = daysUntil < 0;
              return (
                <View
                  key={r.id}
                  className={`rounded-xl p-3 mb-2 border ${isOverdueService ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                        {r.vendor_name}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {r.service_type} · {isOverdueService ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "Due today" : `Due in ${daysUntil}d`}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400">{formatDateShort(r.nextDue.toISOString().slice(0, 10))}</Text>
                  </View>
                  <View className="flex-row gap-2 flex-wrap">
                    <TouchableOpacity
                      onPress={() => setConnectingReminderId(r.id)}
                      className="bg-indigo-600 rounded-lg px-3 py-1.5"
                    >
                      <Text className="text-white text-xs font-semibold">Connect to Project</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push(`/(app)/(projects)/new?title=${encodeURIComponent(r.vendor_name + " — " + r.service_type)}`)}
                      className="bg-blue-600 rounded-lg px-3 py-1.5"
                    >
                      <Text className="text-white text-xs font-semibold">+ Create Project</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Settings */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/settings")}
          className="flex-row items-center justify-center mt-6 mb-2 py-3 gap-2"
        >
          <Text className="text-base">⚙️</Text>
          <Text className="text-sm text-gray-400 font-medium">Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Connect Service Reminder to Project Modal */}
      <Modal
        visible={!!connectingReminderId}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setConnectingReminderId(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <Text className="flex-1 text-base font-semibold text-gray-900">Connect to Project</Text>
            <TouchableOpacity onPress={() => setConnectingReminderId(null)}>
              <Text className="text-blue-600 text-sm font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-400 px-4 pt-3 pb-1">
            Select a project to link this service reminder to. They will share the same record for reporting.
          </Text>
          <ScrollView>
            {activeProjects.length === 0 && (
              <Text className="text-sm text-gray-400 text-center py-8">No active projects found.</Text>
            )}
            {activeProjects.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => connectingReminderId && handleConnectToProject(connectingReminderId, p.id)}
                className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>{p.title}</Text>
                  {p.category && <Text className="text-xs text-gray-400 mt-0.5">{p.category}</Text>}
                </View>
                <Text className="text-gray-400 text-base">→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
