import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useHouseholdStore } from "@/stores/householdStore";
import { useRecurringTasks, useCompleteRecurringTask } from "@/hooks/useRecurringTasks";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { isOverdue, isDueSoon, formatDate } from "@/utils/dateUtils";
import { frequencyLabel as getFreqLabel } from "@/utils/scheduleUtils";
import type { RecurringTask } from "@/types/app.types";

function TaskCard({ task, onComplete }: { task: RecurringTask; onComplete: () => void }) {
  const { members } = useHouseholdStore();
  const assignee = members.find((m) => m.id === task.assigned_member_id);
  const overdue = isOverdue(task.next_due_date);
  const dueSoon = isDueSoon(task.next_due_date);

  const badgeVariant = overdue ? "danger" : dueSoon ? "warning" : "default";
  const badgeLabel = overdue
    ? "Overdue"
    : dueSoon
    ? "Due soon"
    : formatDate(task.next_due_date);

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-gray-900">{task.title}</Text>
          {task.category && (
            <Text className="text-sm text-gray-400 mt-0.5">{task.category}</Text>
          )}
          <View className="flex-row items-center mt-2 gap-2">
            <Badge label={badgeLabel} variant={badgeVariant} size="sm" />
            <Text className="text-xs text-gray-400">
              {getFreqLabel(task.frequency_type, task.frequency_days)}
            </Text>
          </View>
        </View>
        <View className="items-end gap-2">
          {assignee && <MemberAvatar member={assignee} size="sm" />}
          <TouchableOpacity
            onPress={onComplete}
            className="bg-green-100 rounded-xl px-3 py-1.5"
          >
            <Text className="text-green-700 text-sm font-semibold">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { user } = useAuthStore();
  const { data: tasks, isLoading, refetch } = useRecurringTasks(household?.id);
  const { members } = useHouseholdStore();
  const completeTask = useCompleteRecurringTask();

  const handleComplete = async (task: RecurringTask) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const currentMember = members.find((m) => m.user_id === user?.id);
    if (!currentMember) return;

    try {
      await completeTask.mutateAsync({
        task,
        completedBy: currentMember.id,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const overdue = tasks?.filter((t) => isOverdue(t.next_due_date)) ?? [];
  const upcoming = tasks?.filter((t) => !isOverdue(t.next_due_date)) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Maintenance</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tasks)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...overdue, ...upcoming]}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          overdue.length > 0 ? (
            <Text className="text-sm font-semibold text-red-500 mb-2 mt-2">
              {overdue.length} OVERDUE
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TaskCard task={item} onComplete={() => handleComplete(item)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No maintenance tasks"
              subtitle="Add recurring tasks to track home maintenance."
              actionLabel="Add Task"
              onAction={() => router.push("/(app)/(tasks)/new")}
              icon="🔔"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
