import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import { useProjects } from "@/hooks/useProjects";
import { useRecurringTasks, useCompleteRecurringTask } from "@/hooks/useRecurringTasks";
import { useServiceRecords } from "@/hooks/useServices";
import { isOverdue, isDueSoon, formatDate, formatDateShort } from "@/utils/dateUtils";
import { centsToDisplay } from "@/utils/currencyUtils";
import { showAlert } from "@/lib/alert";
import { notificationSuccess } from "@/lib/haptics";
import type { ProjectWithOwners } from "@/types/app.types";
import type { RecurringTask } from "@/types/app.types";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionHeader({ title, count, onSeeAll }: { title: string; count?: number; onSeeAll?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-2 mt-4">
      <View className="flex-row items-center gap-2">
        <Text className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</Text>
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
    ? Math.abs(Math.floor((new Date().getTime() - new Date(project.expected_date).getTime()) / 86400000))
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{project.title}</Text>
          {project.category && (
            <Text className="text-xs text-gray-500 mt-0.5">{project.category}</Text>
          )}
        </View>
        <View className="bg-red-100 rounded-lg px-2 py-0.5">
          <Text className="text-red-700 text-xs font-semibold">
            {daysOverdue}d overdue
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DueSoonProjectCard({ project, onPress }: { project: ProjectWithOwners; onPress: () => void }) {
  const days = project.expected_date
    ? Math.floor((new Date(project.expected_date).getTime() - new Date().getTime()) / 86400000)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{project.title}</Text>
          {project.category && (
            <Text className="text-xs text-gray-500 mt-0.5">{project.category}</Text>
          )}
        </View>
        <View className="bg-amber-100 rounded-lg px-2 py-0.5">
          <Text className="text-amber-700 text-xs font-semibold">
            {days === 0 ? "Due today" : `${days}d left`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function OverdueTaskRow({ task, onComplete }: { task: RecurringTask; onComplete: () => void }) {
  return (
    <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
      <View className="flex-1 mr-2">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{task.title}</Text>
        <Text className="text-xs text-red-600 mt-0.5">Due {formatDate(task.next_due_date)}</Text>
      </View>
      <TouchableOpacity
        onPress={onComplete}
        className="bg-green-100 rounded-lg px-3 py-1.5"
      >
        <Text className="text-green-700 text-xs font-semibold">Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function DueSoonTaskRow({ task, onComplete }: { task: RecurringTask; onComplete: () => void }) {
  return (
    <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
      <View className="flex-1 mr-2">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{task.title}</Text>
        <Text className="text-xs text-amber-700 mt-0.5">Due {formatDate(task.next_due_date)}</Text>
      </View>
      <TouchableOpacity
        onPress={onComplete}
        className="bg-green-100 rounded-lg px-3 py-1.5"
      >
        <Text className="text-green-700 text-xs font-semibold">Done</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View className={`flex-1 rounded-xl p-3 ${color}`}>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs font-semibold text-gray-700 mt-0.5">{label}</Text>
      {sub && <Text className="text-xs text-gray-500 mt-0.5">{sub}</Text>}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);

  useNotificationScheduler();

  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useProjects(household?.id);
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useRecurringTasks(household?.id);
  const { data: serviceRecords, refetch: refetchServices } = useServiceRecords(household?.id);
  const completeTask = useCompleteRecurringTask();

  const isLoading = loadingProjects || loadingTasks;

  const onRefresh = () => {
    refetchProjects();
    refetchTasks();
    refetchServices();
  };

  // Projects
  const activeProjects = (projects ?? []).filter(
    (p) => p.status !== "completed" && p.status !== "finished"
  );
  const overdueProjects = activeProjects.filter(
    (p) => p.expected_date && isOverdue(p.expected_date)
  );
  const dueSoonProjects = activeProjects.filter(
    (p) => p.expected_date && !isOverdue(p.expected_date) && isDueSoon(p.expected_date, 14)
  );

  // Tasks
  const overdueTasks = (tasks ?? []).filter((t) => isOverdue(t.next_due_date));
  const dueSoonTasks = (tasks ?? []).filter(
    (t) => !isOverdue(t.next_due_date) && isDueSoon(t.next_due_date, 7)
  );

  // Stats
  const totalAlerts = overdueProjects.length + overdueTasks.length;
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const monthlySpend = (serviceRecords ?? [])
    .filter((r) => new Date(r.service_date) >= thisMonthStart)
    .reduce((sum, r) => sum + r.cost_cents, 0);

  // Recent services
  const recentServices = (serviceRecords ?? []).slice(0, 3);

  const handleCompleteTask = async (task: RecurringTask) => {
    await notificationSuccess();
    if (!currentMember) return;
    try {
      await completeTask.mutateAsync({ task, completedBy: currentMember.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const hasAlerts = overdueProjects.length > 0 || overdueTasks.length > 0;
  const hasUpcoming = dueSoonProjects.length > 0 || dueSoonTasks.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">
            {greeting()}{currentMember ? `, ${currentMember.display_name.split(" ")[0]}` : ""}
          </Text>
          {household && (
            <Text className="text-sm text-gray-500 mt-0.5">{household.name}</Text>
          )}
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mt-3">
          <StatCard
            label="Active Projects"
            value={String(activeProjects.length)}
            color="bg-blue-50"
          />
          <StatCard
            label="Overdue"
            value={String(totalAlerts)}
            sub={totalAlerts > 0 ? "needs attention" : "all clear"}
            color={totalAlerts > 0 ? "bg-red-50" : "bg-green-50"}
          />
          <StatCard
            label="Spent This Month"
            value={centsToDisplay(monthlySpend, true)}
            color="bg-purple-50"
          />
        </View>

        {/* Needs Attention */}
        {hasAlerts && (
          <>
            <SectionHeader
              title="Needs Attention"
              count={totalAlerts}
            />
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
                onComplete={() => handleCompleteTask(t)}
              />
            ))}
          </>
        )}

        {/* Coming Up */}
        {hasUpcoming && (
          <>
            <SectionHeader
              title="Coming Up"
            />
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
                onComplete={() => handleCompleteTask(t)}
              />
            ))}
          </>
        )}

        {/* All clear banner */}
        {!hasAlerts && !hasUpcoming && (activeProjects.length > 0 || (tasks ?? []).length > 0) && (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 items-center">
            <Text className="text-2xl mb-1">✓</Text>
            <Text className="text-sm font-semibold text-green-800">All caught up!</Text>
            <Text className="text-xs text-green-600 mt-0.5">No overdue or upcoming items</Text>
          </View>
        )}

        {/* Quick Actions */}
        <SectionHeader title="Quick Add" />
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push("/(app)/(projects)/new")}
            className="flex-1 bg-white border border-gray-200 rounded-xl p-3 items-center"
          >
            <Text className="text-xl">🏗️</Text>
            <Text className="text-xs font-medium text-gray-700 mt-1">Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(tasks)/new")}
            className="flex-1 bg-white border border-gray-200 rounded-xl p-3 items-center"
          >
            <Text className="text-xl">🔔</Text>
            <Text className="text-xs font-medium text-gray-700 mt-1">Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(services)/new")}
            className="flex-1 bg-white border border-gray-200 rounded-xl p-3 items-center"
          >
            <Text className="text-xl">🔧</Text>
            <Text className="text-xs font-medium text-gray-700 mt-1">Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(travel)/new")}
            className="flex-1 bg-white border border-gray-200 rounded-xl p-3 items-center"
          >
            <Text className="text-xl">✈️</Text>
            <Text className="text-xs font-medium text-gray-700 mt-1">Trip</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Service Records */}
        {recentServices.length > 0 && (
          <>
            <SectionHeader
              title="Recent Services"
              onSeeAll={() => router.push("/(app)/(services)")}
            />
            {recentServices.map((r) => (
              <View key={r.id} className="bg-white border border-gray-100 rounded-xl p-3 mb-2 flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{r.vendor_name}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{r.service_type} · {formatDateShort(r.service_date)}</Text>
                </View>
                <Text className="text-sm font-semibold text-gray-700">{centsToDisplay(r.cost_cents)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
