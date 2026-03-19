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
import { useTasks, useCompleteTask, useDeleteTask } from "@/hooks/useTasks";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { isOverdue, isDueSoon, formatDate, formatDateShort, toISODateString } from "@/utils/dateUtils";
import { frequencyLabel as getFreqLabel, frequencyToDays } from "@/utils/scheduleUtils";
import { TASK_CATEGORIES } from "@/types/app.types";
import type { RecurringTask, Task, FrequencyType } from "@/types/app.types";

const FREQUENCIES: { label: string; value: FrequencyType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

function OneOffTaskCard({
  task,
  onComplete,
  onDelete,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const { members } = useHouseholdStore();
  const assignee = task.assigned_member_id
    ? members.find((m) => m.id === task.assigned_member_id)
    : null;
  const overdue = task.due_date ? isOverdue(task.due_date) : false;
  const dueSoon = task.due_date ? isDueSoon(task.due_date) : false;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <TouchableOpacity
          onPress={onComplete}
          className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3 mt-1 items-center justify-center"
        />
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-gray-900">{task.title}</Text>
          {task.notes ? (
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>{task.notes}</Text>
          ) : null}
          <View className="flex-row items-center mt-1.5 gap-2 flex-wrap">
            {task.due_date && (
              <Badge
                label={overdue ? "Overdue" : dueSoon ? "Due soon" : formatDateShort(task.due_date)}
                variant={overdue ? "danger" : dueSoon ? "warning" : "default"}
                size="sm"
              />
            )}
            {assignee && (
              <View className="flex-row items-center gap-1">
                <MemberAvatar member={assignee} size="sm" />
                <Text className="text-xs text-gray-400">{assignee.display_name.split(" ")[0]}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={onDelete} className="p-1 mt-0.5">
          <Text className="text-gray-300 text-sm">✕</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function RecurringTaskCard({
  task,
  onComplete,
  onEdit,
}: {
  task: RecurringTask;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const { members } = useHouseholdStore();
  const assignee = members.find((m) => m.id === task.assigned_member_id);
  const overdue = isOverdue(task.next_due_date);
  const dueSoon = isDueSoon(task.next_due_date);

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
              <Badge
                label={overdue ? "Overdue" : dueSoon ? "Due soon" : formatDate(task.next_due_date)}
                variant={overdue ? "danger" : dueSoon ? "warning" : "default"}
                size="sm"
              />
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

  // One-off tasks
  const { data: oneOffTasks = [], isLoading: loadingOneOff, refetch: refetchOneOff } = useTasks(household?.id);
  const completeOneOff = useCompleteTask();
  const deleteOneOff = useDeleteTask();

  // Recurring tasks
  const { data: recurringTasks, isLoading: loadingRecurring, refetch: refetchRecurring } = useRecurringTasks(household?.id);
  const completeRecurring = useCompleteRecurringTask();
  const updateRecurring = useUpdateRecurringTask();
  const deleteRecurring = useDeleteRecurringTask();

  const [showCompleted, setShowCompleted] = useState(false);

  // Edit recurring task modal state
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<string | undefined>(undefined);
  const [editAnchorDate, setEditAnchorDate] = useState("");
  const [editFreqType, setEditFreqType] = useState<FrequencyType>("monthly");
  const [editCustomDays, setEditCustomDays] = useState("");
  const [editAssignedId, setEditAssignedId] = useState<string | undefined>(undefined);

  const openEdit = (task: RecurringTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category ?? undefined);
    setEditAnchorDate(task.anchor_date);
    setEditFreqType(task.frequency_type);
    setEditCustomDays(String(task.frequency_days));
    setEditAssignedId(task.assigned_member_id ?? undefined);
  };

  const handleCompleteOneOff = async (task: Task) => {
    await notificationSuccess();
    try {
      await completeOneOff.mutateAsync({ id: task.id, householdId: household!.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDeleteOneOff = (task: Task) => {
    showConfirm(
      "Delete task?",
      `Remove "${task.title}"?`,
      () => deleteOneOff.mutate({ id: task.id, householdId: household!.id }),
      true
    );
  };

  const handleCompleteRecurring = async (task: RecurringTask) => {
    await notificationSuccess();
    const currentMember = members.find((m) => m.user_id === user?.id);
    if (!currentMember) return;
    try {
      await completeRecurring.mutateAsync({ task, completedBy: currentMember.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleSaveEditRecurring = async () => {
    if (!editingTask || !editTitle.trim() || !household) return;
    const freqDays = editFreqType === "custom"
      ? parseInt(editCustomDays || "30", 10)
      : frequencyToDays(editFreqType);
    try {
      await updateRecurring.mutateAsync({
        id: editingTask.id,
        householdId: household.id,
        updates: {
          title: editTitle.trim(),
          category: editCategory ?? null,
          anchor_date: editAnchorDate || toISODateString(new Date()),
          next_due_date: editAnchorDate || toISODateString(new Date()),
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

  const handleDeleteRecurring = () => {
    if (!editingTask || !household) return;
    showConfirm(
      "Delete recurring task?",
      `Remove "${editingTask.title}"? This cannot be undone.`,
      async () => {
        try {
          await deleteRecurring.mutateAsync({ id: editingTask.id, householdId: household.id });
          setEditingTask(null);
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  const isLoading = loadingOneOff || loadingRecurring;
  const refetch = () => { refetchOneOff(); refetchRecurring(); };

  const overdueRecurring = recurringTasks?.filter((t) => isOverdue(t.next_due_date)) ?? [];
  const upcomingRecurring = recurringTasks?.filter((t) => !isOverdue(t.next_due_date)) ?? [];

  const overdueOneOff = oneOffTasks.filter((t) => t.due_date && isOverdue(t.due_date));
  const otherOneOff = oneOffTasks.filter((t) => !t.due_date || !isOverdue(t.due_date));

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <Text className="text-2xl font-bold text-gray-900">Tasks</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tasks)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* One-Off Tasks */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3">
          Tasks
        </Text>

        {overdueOneOff.length > 0 && (
          <Text className="text-sm font-semibold text-red-500 mb-2">
            {overdueOneOff.length} OVERDUE
          </Text>
        )}

        {[...overdueOneOff, ...otherOneOff].map((task) => (
          <OneOffTaskCard
            key={task.id}
            task={task}
            onComplete={() => handleCompleteOneOff(task)}
            onDelete={() => handleDeleteOneOff(task)}
          />
        ))}

        {oneOffTasks.length === 0 && (
          <Card className="mb-4">
            <Text className="text-gray-400 text-sm text-center py-3">
              No tasks yet. Tap + to add one.
            </Text>
          </Card>
        )}

        {/* Recurring Tasks */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3">
          Recurring
        </Text>

        {overdueRecurring.length > 0 && (
          <Text className="text-sm font-semibold text-red-500 mb-2">
            {overdueRecurring.length} OVERDUE
          </Text>
        )}

        {[...overdueRecurring, ...upcomingRecurring].map((task) => (
          <RecurringTaskCard
            key={task.id}
            task={task}
            onComplete={() => handleCompleteRecurring(task)}
            onEdit={() => openEdit(task)}
          />
        ))}

        {(recurringTasks?.length ?? 0) === 0 && (
          <Card className="mb-4">
            <Text className="text-gray-400 text-sm text-center py-3">
              No recurring tasks yet. Tap + to add one.
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Edit Recurring Task Modal */}
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
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Recurring Task</Text>
            <TouchableOpacity onPress={handleSaveEditRecurring}>
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

            <DateInput
              label="Start / Due Date"
              value={editAnchorDate}
              onChange={setEditAnchorDate}
              hint="First occurrence — frequency repeats from this date"
            />

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
              onPress={handleSaveEditRecurring}
              loading={updateRecurring.isPending}
            />
            <TouchableOpacity
              onPress={handleDeleteRecurring}
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
