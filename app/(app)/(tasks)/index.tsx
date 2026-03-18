import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { showAlert, showConfirm } from "@/lib/alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { notificationSuccess } from "@/lib/haptics";
import { useHouseholdStore } from "@/stores/householdStore";
import { useRecurringTasks, useCompleteRecurringTask, useUpdateRecurringTask, useDeleteRecurringTask } from "@/hooks/useRecurringTasks";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { isOverdue, isDueSoon, formatDate } from "@/utils/dateUtils";
import { frequencyLabel as getFreqLabel, frequencyToDays } from "@/utils/scheduleUtils";
import { TASK_CATEGORIES } from "@/types/app.types";
import type { RecurringTask, FrequencyType } from "@/types/app.types";

const FREQUENCIES: { label: string; value: FrequencyType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

function TaskCard({ task, onComplete, onEdit }: { task: RecurringTask; onComplete: () => void; onEdit: () => void }) {
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
    <TouchableOpacity onPress={onEdit}>
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
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const { data: tasks, isLoading, refetch } = useRecurringTasks(household?.id);
  const completeTask = useCompleteRecurringTask();
  const updateTask = useUpdateRecurringTask();
  const deleteTask = useDeleteRecurringTask();

  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<string | undefined>(undefined);
  const [editFreqType, setEditFreqType] = useState<FrequencyType>("monthly");
  const [editCustomDays, setEditCustomDays] = useState("");
  const [editAssignedId, setEditAssignedId] = useState<string | undefined>(undefined);

  const openEdit = (task: RecurringTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category ?? undefined);
    setEditFreqType(task.frequency_type);
    setEditCustomDays(String(task.frequency_days));
    setEditAssignedId(task.assigned_member_id ?? undefined);
  };

  const handleComplete = async (task: RecurringTask) => {
    await notificationSuccess();
    const currentMember = members.find((m) => m.user_id === user?.id);
    if (!currentMember) return;
    try {
      await completeTask.mutateAsync({ task, completedBy: currentMember.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editTitle.trim() || !household) return;
    const freqDays = editFreqType === "custom"
      ? parseInt(editCustomDays || "30", 10)
      : frequencyToDays(editFreqType);
    try {
      await updateTask.mutateAsync({
        id: editingTask.id,
        householdId: household.id,
        updates: {
          title: editTitle.trim(),
          category: editCategory ?? null,
          frequency_type: editFreqType,
          frequency_days: freqDays,
          assigned_member_id: editAssignedId ?? null,
        },
      });
      setEditingTask(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = () => {
    if (!editingTask || !household) return;
    showConfirm(
      "Delete task?",
      `Remove "${editingTask.title}"? This cannot be undone.`,
      async () => {
        try {
          await deleteTask.mutateAsync({ id: editingTask.id, householdId: household.id });
          setEditingTask(null);
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
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
          <TaskCard
            task={item}
            onComplete={() => handleComplete(item)}
            onEdit={() => openEdit(item)}
          />
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

      {/* Edit Modal */}
      <Modal
        visible={!!editingTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingTask(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingTask(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Task</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text className="text-blue-600 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input
              label="Task Name"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Change HVAC filter"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {TASK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditCategory(editCategory === cat ? undefined : cat)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${
                    editCategory === cat ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editCategory === cat ? "text-white" : "text-gray-700"}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-sm font-medium text-gray-700 mb-2">Frequency</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setEditFreqType(f.value)}
                  className={`px-4 py-2 rounded-xl border ${
                    editFreqType === f.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`font-medium ${editFreqType === f.value ? "text-white" : "text-gray-700"}`}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editFreqType === "custom" && (
              <Input
                label="Every how many days?"
                value={editCustomDays}
                onChangeText={setEditCustomDays}
                keyboardType="number-pad"
                placeholder="e.g. 45"
              />
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setEditAssignedId(editAssignedId === m.id ? undefined : m.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    editAssignedId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editAssignedId === m.id ? "text-white" : "text-gray-700"}`}>
                    {m.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Save Changes"
              onPress={handleSaveEdit}
              loading={updateTask.isPending}
            />
            <TouchableOpacity
              onPress={handleDelete}
              className="mt-3 items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
