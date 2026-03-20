import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { showAlert, showConfirm } from "@/lib/alert";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { notificationSuccess } from "@/lib/haptics";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useRecurringTasks,
  useCompleteRecurringTask,
  useUpdateRecurringTask,
  useDeleteRecurringTask,
} from "@/hooks/useRecurringTasks";
import { useTasks, useCompleteTask, useDeleteTask } from "@/hooks/useTasks";
import {
  useAllProjectTasks,
  useUpdateProjectTask,
  useDeleteProjectTask,
  useCompleteProjectChecklistItem,
} from "@/hooks/useProjectTasks";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { isOverdue, isDueSoon, formatDate, formatDateShort, toISODateString } from "@/utils/dateUtils";
import { frequencyLabel as getFreqLabel, frequencyToDays } from "@/utils/scheduleUtils";
import type { RecurringTask, Task, ProjectTask, FrequencyType } from "@/types/app.types";

type TaskMode = "low-lift" | "project-adjacent";

const FREQUENCIES: { label: string; value: FrequencyType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

// ── Low-Lift Card ─────────────────────────────────────────────────────────────
function LowLiftCard({ task, onPress }: { task: RecurringTask; onPress: () => void }) {
  const { members } = useHouseholdStore();
  const assignee = members.find((m) => m.id === task.assigned_member_id);
  const overdue = isOverdue(task.next_due_date);
  const dueSoon = isDueSoon(task.next_due_date);

  return (
    <TouchableOpacity onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-gray-900">{task.title}</Text>
            {task.description ? (
              <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>{task.description}</Text>
            ) : null}
            <View className="flex-row items-center mt-1.5 gap-2 flex-wrap">
              <Badge
                label={overdue ? "Overdue" : dueSoon ? "Due soon" : formatDate(task.next_due_date)}
                variant={overdue ? "danger" : dueSoon ? "warning" : "default"}
                size="sm"
              />
              <Text className="text-xs text-gray-400">
                {getFreqLabel(task.frequency_type, task.frequency_days)}
              </Text>
              {(task as any).time_of_day && (
                <Text className="text-xs text-gray-400">⏰ {(task as any).time_of_day}</Text>
              )}
            </View>
          </View>
          {assignee && <MemberAvatar member={assignee} size="sm" />}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Project Adjacent Card ─────────────────────────────────────────────────────
function ProjectAdjacentCard({
  task,
  projectTitle,
  onPress,
}: {
  task: ProjectTask & { notes?: string | null };
  projectTitle?: string;
  onPress: () => void;
}) {
  const { members } = useHouseholdStore();
  const assignee = task.assigned_member_id
    ? members.find((m) => m.id === task.assigned_member_id)
    : null;
  const overdue = task.due_date ? isOverdue(task.due_date) : false;
  const dueSoon = task.due_date ? isDueSoon(task.due_date) : false;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900">{task.title}</Text>
            {projectTitle && (
              <Text className="text-xs text-blue-500 mt-0.5 font-medium">
                {projectTitle} · {task.checklist_name ?? "General"}
              </Text>
            )}
            {(task as any).notes ? (
              <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>
                {(task as any).notes}
              </Text>
            ) : null}
            {task.due_date && (
              <View className="mt-1.5">
                <Badge
                  label={overdue ? "Overdue" : dueSoon ? "Due soon" : formatDateShort(task.due_date)}
                  variant={overdue ? "danger" : dueSoon ? "warning" : "default"}
                  size="sm"
                />
              </View>
            )}
          </View>
          {assignee && <MemberAvatar member={assignee} size="sm" />}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Standalone Task Card ──────────────────────────────────────────────────────
function StandaloneTaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const { members } = useHouseholdStore();
  const assignee = task.assigned_member_id
    ? members.find((m) => m.id === task.assigned_member_id)
    : null;
  const overdue = task.due_date ? isOverdue(task.due_date) : false;
  const dueSoon = task.due_date ? isDueSoon(task.due_date) : false;

  return (
    <TouchableOpacity onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900">{task.title}</Text>
            {task.notes ? (
              <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>{task.notes}</Text>
            ) : null}
            {task.due_date && (
              <View className="mt-1.5">
                <Badge
                  label={overdue ? "Overdue" : dueSoon ? "Due soon" : formatDateShort(task.due_date)}
                  variant={overdue ? "danger" : dueSoon ? "warning" : "default"}
                  size="sm"
                />
              </View>
            )}
          </View>
          {assignee && <MemberAvatar member={assignee} size="sm" />}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();

  const [mode, setMode] = useState<TaskMode>("low-lift");
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null); // null = All

  const currentMember = members.find((m) => m.user_id === user?.id);

  // Low-Lift (Recurring)
  const { data: recurringTasks = [], isLoading: loadingRecurring, refetch: refetchRecurring } =
    useRecurringTasks(household?.id);
  const completeRecurring = useCompleteRecurringTask();
  const updateRecurring = useUpdateRecurringTask();
  const deleteRecurring = useDeleteRecurringTask();

  // Project Adjacent — project_tasks across household
  const { data: projectTasks = [], isLoading: loadingPA, refetch: refetchPA } =
    useAllProjectTasks(household?.id);
  const updateProjectTask = useUpdateProjectTask();
  const deleteProjectTask = useDeleteProjectTask();
  const completeProjectTask = useCompleteProjectChecklistItem();

  // Standalone tasks (no project link)
  const { data: standaloneTasks = [], isLoading: loadingStandalone, refetch: refetchStandalone } =
    useTasks(household?.id);
  const completeStandalone = useCompleteTask();
  const deleteStandalone = useDeleteTask();

  const isLoading = loadingRecurring || loadingPA || loadingStandalone;
  const refetch = () => { refetchRecurring(); refetchPA(); refetchStandalone(); };

  // ── Low-Lift edit modal ───────────────────────────────────────────────────
  const [editingLowLift, setEditingLowLift] = useState<RecurringTask | null>(null);
  const [llTitle, setLlTitle] = useState("");
  const [llNotes, setLlNotes] = useState("");
  const [llAnchorDate, setLlAnchorDate] = useState("");
  const [llTimeOfDay, setLlTimeOfDay] = useState("");
  const [llFreqType, setLlFreqType] = useState<FrequencyType>("monthly");
  const [llCustomDays, setLlCustomDays] = useState("");
  const [llAssignedId, setLlAssignedId] = useState<string | undefined>(undefined);

  const openLowLiftEdit = (task: RecurringTask) => {
    setEditingLowLift(task);
    setLlTitle(task.title);
    setLlNotes(task.description ?? "");
    setLlAnchorDate(task.anchor_date);
    setLlTimeOfDay((task as any).time_of_day ?? "");
    setLlFreqType(task.frequency_type);
    setLlCustomDays(String(task.frequency_days));
    setLlAssignedId(task.assigned_member_id ?? undefined);
  };

  const handleSaveLowLift = async () => {
    if (!editingLowLift || !llTitle.trim() || !household) return;
    const freqDays = llFreqType === "custom"
      ? parseInt(llCustomDays || "30", 10)
      : frequencyToDays(llFreqType);
    try {
      await updateRecurring.mutateAsync({
        id: editingLowLift.id,
        householdId: household.id,
        updates: {
          title: llTitle.trim(),
          description: llNotes.trim() || null,
          anchor_date: llAnchorDate || toISODateString(new Date()),
          next_due_date: llAnchorDate || toISODateString(new Date()),
          frequency_type: llFreqType,
          frequency_days: freqDays,
          assigned_member_id: llAssignedId ?? null,
          time_of_day: llTimeOfDay.trim() || null,
        },
      });
      setEditingLowLift(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCompleteLowLift = async (task: RecurringTask) => {
    await notificationSuccess();
    if (!currentMember) return;
    try {
      await completeRecurring.mutateAsync({ task, completedBy: currentMember.id });
      setEditingLowLift(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDeleteLowLift = (task: RecurringTask) => {
    if (!household) return;
    showConfirm(
      "Delete task?",
      `Remove "${task.title}"?`,
      async () => {
        try {
          await deleteRecurring.mutateAsync({ id: task.id, householdId: household.id });
          setEditingLowLift(null);
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  // ── Project Adjacent edit modal ──────────────────────────────────────────
  const [editingPA, setEditingPA] = useState<(ProjectTask & { notes?: string | null; project_title?: string }) | null>(null);
  const [paTitle, setPaTitle] = useState("");
  const [paNotes, setPaNotes] = useState("");
  const [paDueDate, setPaDueDate] = useState("");
  const [paAssignedId, setPaAssignedId] = useState<string | undefined>(undefined);

  // Standalone task edit modal
  const [editingStandalone, setEditingStandalone] = useState<Task | null>(null);
  const [stTitle, setStTitle] = useState("");
  const [stNotes, setStNotes] = useState("");
  const [stDueDate, setStDueDate] = useState("");
  const [stAssignedId, setStAssignedId] = useState<string | undefined>(undefined);

  const openPAEdit = (task: ProjectTask & { notes?: string | null; project_title?: string }) => {
    setEditingPA(task);
    setPaTitle(task.title);
    setPaNotes((task as any).notes ?? "");
    setPaDueDate(task.due_date ?? "");
    setPaAssignedId(task.assigned_member_id ?? undefined);
  };

  const openStandaloneEdit = (task: Task) => {
    setEditingStandalone(task);
    setStTitle(task.title);
    setStNotes(task.notes ?? "");
    setStDueDate(task.due_date ?? "");
    setStAssignedId(task.assigned_member_id ?? undefined);
  };

  const handleSavePA = async () => {
    if (!editingPA || !paTitle.trim()) return;
    try {
      await updateProjectTask.mutateAsync({
        id: editingPA.id,
        project_id: editingPA.project_id,
        updates: {
          title: paTitle.trim(),
          notes: paNotes.trim() || null,
          due_date: paDueDate || null,
          assigned_member_id: paAssignedId ?? null,
        },
      });
      setEditingPA(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCompletePA = async (task: ProjectTask) => {
    await notificationSuccess();
    try {
      await completeProjectTask.mutateAsync({ task, completedByMemberId: currentMember?.id ?? null });
      setEditingPA(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDeletePA = (task: ProjectTask) => {
    showConfirm(
      "Delete task?",
      `Remove "${task.title}" from the checklist?`,
      async () => {
        try {
          await deleteProjectTask.mutateAsync({ id: task.id, project_id: task.project_id });
          setEditingPA(null);
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  const handleSaveStandalone = async () => {
    if (!editingStandalone || !stTitle.trim() || !household) return;
    try {
      // useUpdateTask from useTasks
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("tasks")
        .update({ title: stTitle.trim(), notes: stNotes.trim() || null, due_date: stDueDate || null, assigned_member_id: stAssignedId ?? null })
        .eq("id", editingStandalone.id);
      if (error) throw error;
      refetchStandalone();
      setEditingStandalone(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCompleteStandalone = async (task: Task) => {
    await notificationSuccess();
    try {
      await completeStandalone.mutateAsync({ id: task.id, householdId: household!.id });
      setEditingStandalone(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDeleteStandalone = (task: Task) => {
    showConfirm(
      "Delete task?",
      `Remove "${task.title}"?`,
      async () => {
        try {
          await deleteStandalone.mutateAsync({ id: task.id, householdId: household!.id });
          setEditingStandalone(null);
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  // Personal task visibility — only show is_personal=true tasks to the assignee
  const isVisible = (assignedMemberId: string | null | undefined, isPersonal: boolean) => {
    if (!isPersonal) return true;
    return assignedMemberId === currentMember?.id;
  };

  // Apply owner filter + personal task visibility
  const visibleRecurring = recurringTasks.filter((t) => {
    if (!isVisible(t.assigned_member_id, t.is_personal)) return false;
    if (ownerFilter && t.assigned_member_id !== ownerFilter) return false;
    return true;
  });

  const visibleProjectTasks = projectTasks.filter((t) => {
    const personal = (t as any).is_personal ?? false;
    if (!isVisible(t.assigned_member_id, personal)) return false;
    if (ownerFilter && t.assigned_member_id !== ownerFilter) return false;
    return true;
  });

  const visibleStandalone = standaloneTasks.filter((t) => {
    if (!isVisible(t.assigned_member_id, t.is_personal)) return false;
    if (ownerFilter && t.assigned_member_id !== ownerFilter) return false;
    return true;
  });

  const overdueRecurring = visibleRecurring
    .filter((t) => isOverdue(t.next_due_date))
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
  const upcomingRecurring = visibleRecurring
    .filter((t) => !isOverdue(t.next_due_date))
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

  const sortedProjectTasks = [...visibleProjectTasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const sortedStandalone = [...visibleStandalone].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

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

      {/* Tab toggle — Low-Lift left/default */}
      <View className="flex-row bg-gray-100 rounded-xl mx-4 mt-3 p-1">
        {(["low-lift", "project-adjacent"] as TaskMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg items-center ${mode === m ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-sm font-semibold ${mode === m ? "text-gray-900" : "text-gray-500"}`}>
              {m === "low-lift" ? "Low-Lift" : "Project Adjacent"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Owner filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row gap-2 px-4 py-2"
      >
        <TouchableOpacity
          onPress={() => setOwnerFilter(null)}
          className={`px-3 py-1.5 rounded-full border ${
            ownerFilter === null ? "bg-gray-800 border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <Text className={`text-xs font-semibold ${ownerFilter === null ? "text-white" : "text-gray-600"}`}>
            All
          </Text>
        </TouchableOpacity>
        {members.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setOwnerFilter(ownerFilter === m.id ? null : m.id)}
            className={`px-3 py-1.5 rounded-full border ${
              ownerFilter === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-xs font-semibold ${ownerFilter === m.id ? "text-white" : "text-gray-600"}`}>
              {m.display_name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-8"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* ── LOW-LIFT TAB ─────────────────────────────────────────────── */}
        {mode === "low-lift" && (
          <>
            {overdueRecurring.length > 0 && (
              <Text className="text-sm font-semibold text-red-500 mb-2">
                {overdueRecurring.length} OVERDUE
              </Text>
            )}
            {[...overdueRecurring, ...upcomingRecurring].map((task) => (
              <LowLiftCard key={task.id} task={task} onPress={() => openLowLiftEdit(task)} />
            ))}

            {visibleRecurring.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-4xl mb-3">🔄</Text>
                <Text className="text-base font-semibold text-gray-700">No low-lift tasks</Text>
                <Text className="text-sm text-gray-400 mt-1 text-center">
                  Recurring tasks you can knock out quickly.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── PROJECT ADJACENT TAB ─────────────────────────────────────── */}
        {mode === "project-adjacent" && (
          <>
            {sortedProjectTasks.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Checklist Items
                </Text>
                {sortedProjectTasks.map((task) => (
                  <ProjectAdjacentCard
                    key={task.id}
                    task={task as any}
                    projectTitle={(task as any).project_title}
                    onPress={() => openPAEdit(task as any)}
                  />
                ))}
              </>
            )}

            {sortedStandalone.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-2">
                  Standalone
                </Text>
                {sortedStandalone.map((task) => (
                  <StandaloneTaskCard
                    key={task.id}
                    task={task}
                    onPress={() => openStandaloneEdit(task)}
                  />
                ))}
              </>
            )}

            {visibleProjectTasks.length === 0 && visibleStandalone.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-4xl mb-3">📋</Text>
                <Text className="text-base font-semibold text-gray-700">No project adjacent tasks</Text>
                <Text className="text-sm text-gray-400 mt-1 text-center">
                  Tasks tied to projects or activities.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── LOW-LIFT EDIT MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={!!editingLowLift}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingLowLift(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingLowLift(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Task</Text>
            <TouchableOpacity onPress={handleSaveLowLift} disabled={!llTitle.trim() || updateRecurring.isPending}>
              <Text className={`text-base font-semibold ${llTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input label="Task Name" value={llTitle} onChangeText={setLlTitle} placeholder="e.g. Change HVAC filter" />
            <Input
              label="Notes (optional)"
              value={llNotes}
              onChangeText={setLlNotes}
              multiline
              numberOfLines={3}
              placeholder="Add details..."
            />
            <DateInput label="Start / Due Date" value={llAnchorDate} onChange={setLlAnchorDate}
              hint="Frequency repeats from this date" />
            <Input
              label="Time of Day (optional)"
              value={llTimeOfDay}
              onChangeText={setLlTimeOfDay}
              placeholder="e.g. 9:00 AM"
              hint="Used for reminder notification"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Frequency</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setLlFreqType(f.value)}
                  className={`px-4 py-2 rounded-xl border ${
                    llFreqType === f.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`font-medium ${llFreqType === f.value ? "text-white" : "text-gray-700"}`}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {llFreqType === "custom" && (
              <Input label="Every how many days?" value={llCustomDays} onChangeText={setLlCustomDays}
                keyboardType="number-pad" placeholder="e.g. 45" />
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setLlAssignedId(llAssignedId === m.id ? undefined : m.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    llAssignedId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${llAssignedId === m.id ? "text-white" : "text-gray-700"}`}>
                    {m.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => editingLowLift && handleCompleteLowLift(editingLowLift)}
              className="bg-green-50 border border-green-200 rounded-xl py-3 items-center mb-3"
            >
              <Text className="text-green-700 font-semibold">Mark Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => editingLowLift && handleDeleteLowLift(editingLowLift)}
              className="items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── PROJECT ADJACENT EDIT MODAL ─────────────────────────────────── */}
      <Modal
        visible={!!editingPA}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingPA(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingPA(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Task</Text>
            <TouchableOpacity onPress={handleSavePA} disabled={!paTitle.trim() || updateProjectTask.isPending}>
              <Text className={`text-base font-semibold ${paTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            {editingPA?.project_title && (
              <View className="bg-blue-50 rounded-xl px-3 py-2 mb-4">
                <Text className="text-xs text-blue-600 font-medium">
                  {editingPA.project_title} · {editingPA.checklist_name ?? "General"}
                </Text>
              </View>
            )}
            <Input label="Title" value={paTitle} onChangeText={setPaTitle} placeholder="Task title" />
            <Input
              label="Notes (optional)"
              value={paNotes}
              onChangeText={setPaNotes}
              multiline
              numberOfLines={3}
              placeholder="Add details..."
            />
            <DateInput label="Due Date (optional)" value={paDueDate} onChange={setPaDueDate} />

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setPaAssignedId(paAssignedId === m.id ? undefined : m.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    paAssignedId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${paAssignedId === m.id ? "text-white" : "text-gray-700"}`}>
                    {m.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => editingPA && handleCompletePA(editingPA)}
              className="bg-green-50 border border-green-200 rounded-xl py-3 items-center mb-3"
            >
              <Text className="text-green-700 font-semibold">Mark Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => editingPA && handleDeletePA(editingPA)}
              className="items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── STANDALONE TASK EDIT MODAL ──────────────────────────────────── */}
      <Modal
        visible={!!editingStandalone}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingStandalone(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingStandalone(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Task</Text>
            <TouchableOpacity onPress={handleSaveStandalone} disabled={!stTitle.trim()}>
              <Text className={`text-base font-semibold ${stTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input label="Title" value={stTitle} onChangeText={setStTitle} placeholder="Task title" />
            <Input
              label="Notes (optional)"
              value={stNotes}
              onChangeText={setStNotes}
              multiline
              numberOfLines={3}
              placeholder="Add details..."
            />
            <DateInput label="Due Date (optional)" value={stDueDate} onChange={setStDueDate} />

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setStAssignedId(stAssignedId === m.id ? undefined : m.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    stAssignedId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${stAssignedId === m.id ? "text-white" : "text-gray-700"}`}>
                    {m.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => editingStandalone && handleCompleteStandalone(editingStandalone)}
              className="bg-green-50 border border-green-200 rounded-xl py-3 items-center mb-3"
            >
              <Text className="text-green-700 font-semibold">Mark Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => editingStandalone && handleDeleteStandalone(editingStandalone)}
              className="items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
