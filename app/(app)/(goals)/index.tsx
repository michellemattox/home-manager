import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import type { HouseholdMember } from "@/types/app.types";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useAddGoalUpdate,
  useDeleteGoalUpdate,
} from "@/hooks/useGoals";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatDateShort, formatDateTime, isOverdue } from "@/utils/dateUtils";
import type { Goal, GoalUpdate, GoalWithUpdates } from "@/types/app.types";

type UserTypeFilter = "all" | "family" | "individual";

// ─── GoalFormFields (defined outside screen to prevent focus loss) ─────────────
function GoalFormFields({
  title, setTitle,
  description, setDescription,
  userType, setUserType,
  memberId, setMemberId,
  dueDate, setDueDate,
  reminder, setReminder,
  members,
  userId,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  userType: "family" | "individual"; setUserType: (v: "family" | "individual") => void;
  memberId: string | null; setMemberId: (v: string | null) => void;
  dueDate: string; setDueDate: (v: string) => void;
  reminder: Goal["reminder_frequency"]; setReminder: (v: Goal["reminder_frequency"]) => void;
  members: HouseholdMember[];
  userId: string | undefined;
}) {
  return (
    <>
      <Text className="text-sm font-medium text-gray-700 mb-1">Title *</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Run a 5K this year"
        placeholderTextColor="#9ca3af"
        autoFocus
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Description (optional)</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4 min-h-[70px]"
        value={description}
        onChangeText={setDescription}
        placeholder="What does success look like?"
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
      />

      <Text className="text-sm font-medium text-gray-700 mb-2">Owner</Text>
      <View className="flex-row gap-2 mb-4">
        {(["family", "individual"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setUserType(t)}
            className={`flex-1 py-2.5 rounded-xl border items-center ${
              userType === t ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-sm font-semibold ${userType === t ? "text-white" : "text-gray-700"}`}>
              {t === "family" ? "👨‍👩‍👧 Family" : "👤 Individual"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {userType === "individual" && (
        <>
          <Text className="text-sm font-medium text-gray-700 mb-2">Who</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMemberId(m.id)}
                className={`px-3 py-1.5 rounded-full border ${
                  memberId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-sm font-medium ${memberId === m.id ? "text-white" : "text-gray-700"}`}>
                  {m.display_name}{m.user_id === userId ? " (You)" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <DateInput
        label="Due Date (optional)"
        value={dueDate}
        onChange={setDueDate}
        hint="Target completion date"
      />

      <Text className="text-sm font-medium text-gray-700 mb-2">Reminder Frequency</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {REMINDER_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            onPress={() => setReminder(reminder === r.value ? null : r.value)}
            className={`px-4 py-2 rounded-xl border ${
              reminder === r.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-sm font-medium ${reminder === r.value ? "text-white" : "text-gray-700"}`}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
        {reminder && (
          <TouchableOpacity
            onPress={() => setReminder(null)}
            className="px-4 py-2 rounded-xl border border-gray-200"
          >
            <Text className="text-sm text-gray-400">None</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const REMINDER_OPTIONS: { label: string; value: Goal["reminder_frequency"] }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const STATUS_COLORS: Record<Goal["status"], string> = {
  active: "info",
  completed: "success",
  paused: "warning",
};

function GoalCard({
  goal,
  members,
  currentMemberId,
  onAddUpdate,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  goal: GoalWithUpdates;
  members: { id: string; display_name: string }[];
  currentMemberId: string | undefined;
  onAddUpdate: (goalId: string) => void;
  onEdit: (goal: GoalWithUpdates) => void;
  onDelete: (goal: GoalWithUpdates) => void;
  onStatusChange: (goal: GoalWithUpdates, status: Goal["status"]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const ownerName =
    goal.user_type === "family"
      ? "Family"
      : members.find((m) => m.id === goal.member_id)?.display_name ?? "Individual";

  const sortedUpdates = [...(goal.goal_updates ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const overdue = goal.due_date && goal.status === "active" && isOverdue(goal.due_date);

  return (
    <Card className="mb-3">
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-semibold text-gray-900">{goal.title}</Text>
            {goal.description ? (
              <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={expanded ? undefined : 2}>
                {goal.description}
              </Text>
            ) : null}
          </View>
          <Badge
            label={goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            variant={STATUS_COLORS[goal.status] as any}
            size="sm"
          />
        </View>

        <View className="flex-row flex-wrap gap-2 items-center">
          <Text className="text-xs text-gray-400">
            {goal.user_type === "family" ? "👨‍👩‍👧 Family" : `👤 ${ownerName}`}
          </Text>
          {goal.due_date && (
            <Text className={`text-xs font-medium ${overdue ? "text-red-500" : "text-gray-400"}`}>
              Due {formatDateShort(goal.due_date)}{overdue ? " · overdue" : ""}
            </Text>
          )}
          {goal.reminder_frequency && (
            <Text className="text-xs text-gray-400">
              Reminder: {goal.reminder_frequency}
            </Text>
          )}
          {sortedUpdates.length > 0 && (
            <Text className="text-xs text-blue-500">
              {sortedUpdates.length} update{sortedUpdates.length !== 1 ? "s" : ""}
            </Text>
          )}
          <Text className="text-xs text-gray-300 ml-auto">{expanded ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          {/* Updates */}
          {sortedUpdates.length > 0 && (
            <View className="mb-3">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Updates
              </Text>
              {sortedUpdates.map((u) => {
                const authorName = u.author_id
                  ? members.find((m) => m.id === u.author_id)?.display_name
                  : undefined;
                return (
                  <View key={u.id} className="mb-2 bg-gray-50 rounded-xl px-3 py-2">
                    <Text className="text-sm text-gray-700">{u.body}</Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {formatDateTime(u.created_at)}{authorName ? ` · ${authorName}` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Action row */}
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => onAddUpdate(goal.id)}
              className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200"
            >
              <Text className="text-xs font-semibold text-blue-700">+ Add Update</Text>
            </TouchableOpacity>

            {goal.status !== "completed" && (
              <TouchableOpacity
                onPress={() => onStatusChange(goal, "completed")}
                className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200"
              >
                <Text className="text-xs font-semibold text-green-700">Mark Complete</Text>
              </TouchableOpacity>
            )}
            {goal.status === "active" && (
              <TouchableOpacity
                onPress={() => onStatusChange(goal, "paused")}
                className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200"
              >
                <Text className="text-xs font-semibold text-amber-700">Pause</Text>
              </TouchableOpacity>
            )}
            {goal.status === "paused" && (
              <TouchableOpacity
                onPress={() => onStatusChange(goal, "active")}
                className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200"
              >
                <Text className="text-xs font-semibold text-gray-600">Resume</Text>
              </TouchableOpacity>
            )}
            {goal.status === "completed" && (
              <TouchableOpacity
                onPress={() => onStatusChange(goal, "active")}
                className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200"
              >
                <Text className="text-xs font-semibold text-gray-600">Reopen</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => onEdit(goal)} className="px-3 py-1.5">
              <Text className="text-xs text-gray-400">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(goal)} className="px-3 py-1.5">
              <Text className="text-xs text-red-400">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
}

export default function GoalsScreen() {
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);

  const { data: goals = [], isLoading, refetch } = useGoals(household?.id);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addUpdate = useAddGoalUpdate();
  const deleteUpdate = useDeleteGoalUpdate();

  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>("all");
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // New goal modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUserType, setNewUserType] = useState<"family" | "individual">("family");
  const [newMemberId, setNewMemberId] = useState<string | null>(currentMember?.id ?? null);
  const [newDueDate, setNewDueDate] = useState("");
  const [newReminder, setNewReminder] = useState<Goal["reminder_frequency"]>(null);

  // Edit goal modal
  const [editingGoal, setEditingGoal] = useState<GoalWithUpdates | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUserType, setEditUserType] = useState<"family" | "individual">("family");
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminder, setEditReminder] = useState<Goal["reminder_frequency"]>(null);

  // Add update modal
  const [addUpdateGoalId, setAddUpdateGoalId] = useState<string | null>(null);
  const [updateBody, setUpdateBody] = useState("");

  // Filter logic
  const filteredGoals = goals.filter((g) => {
    if (!showCompleted && g.status === "completed") return false;
    if (userTypeFilter === "family") return g.user_type === "family";
    if (userTypeFilter === "individual") {
      if (memberFilter) return g.user_type === "individual" && g.member_id === memberFilter;
      return g.user_type === "individual";
    }
    if (memberFilter) return g.member_id === memberFilter || g.user_type === "family";
    return true;
  });

  const activeGoals = filteredGoals
    .filter((g) => g.status !== "completed")
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  const completedGoals = filteredGoals.filter((g) => g.status === "completed");

  const handleCreateGoal = async () => {
    if (!newTitle.trim() || !household || !currentMember) return;
    try {
      await createGoal.mutateAsync({
        household_id: household.id,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        user_type: newUserType,
        member_id: newUserType === "individual" ? (newMemberId ?? currentMember.id) : null,
        due_date: newDueDate || null,
        reminder_frequency: newReminder,
        status: "active",
        created_by: currentMember.id,
      });
      setShowNewModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewUserType("family");
      setNewMemberId(currentMember.id);
      setNewDueDate("");
      setNewReminder(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const openEditGoal = (goal: GoalWithUpdates) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? "");
    setEditUserType(goal.user_type);
    setEditMemberId(goal.member_id);
    setEditDueDate(goal.due_date ?? "");
    setEditReminder(goal.reminder_frequency);
  };

  const handleSaveEdit = async () => {
    if (!editingGoal || !editTitle.trim() || !household) return;
    try {
      await updateGoal.mutateAsync({
        id: editingGoal.id,
        householdId: household.id,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          user_type: editUserType,
          member_id: editUserType === "individual" ? editMemberId : null,
          due_date: editDueDate || null,
          reminder_frequency: editReminder,
        },
      });
      setEditingGoal(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleAddUpdate = async () => {
    if (!addUpdateGoalId || !updateBody.trim() || !household || !currentMember) return;
    try {
      await addUpdate.mutateAsync({
        goal_id: addUpdateGoalId,
        household_id: household.id,
        body: updateBody.trim(),
        author_id: currentMember.id,
      });
      setUpdateBody("");
      setAddUpdateGoalId(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleStatusChange = async (goal: GoalWithUpdates, status: Goal["status"]) => {
    if (!household) return;
    try {
      await updateGoal.mutateAsync({ id: goal.id, householdId: household.id, updates: { status } });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = (goal: GoalWithUpdates) => {
    if (!household) return;
    showConfirm(
      "Delete goal?",
      `"${goal.title}" and all its updates will be removed.`,
      () => deleteGoal.mutate({ id: goal.id, householdId: household.id }),
      true
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 py-3 border-b border-gray-100 bg-white flex-row items-center">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900">Goals</Text>
          <Text className="text-xs text-gray-400">Track family and personal goals.</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowNewModal(true)}
          className="bg-blue-600 rounded-full px-4 py-2"
        >
          <Text className="text-white text-sm font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View className="bg-white border-b border-gray-100 px-4 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {/* User type filter */}
          {(["all", "family", "individual"] as UserTypeFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => {
                setUserTypeFilter(f);
                if (f !== "individual") setMemberFilter(null);
              }}
              className={`px-3 py-1.5 rounded-full border mr-2 ${
                userTypeFilter === f ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-xs font-semibold ${userTypeFilter === f ? "text-white" : "text-gray-600"}`}>
                {f === "all" ? "All" : f === "family" ? "👨‍👩‍👧 Family" : "👤 Individual"}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Member filter (shown for individual / all) */}
          {userTypeFilter !== "family" && members.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
              className={`px-3 py-1.5 rounded-full border mr-2 ${
                memberFilter === m.id ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-xs font-semibold ${memberFilter === m.id ? "text-white" : "text-gray-600"}`}>
                {m.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-4 pb-12"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {activeGoals.length === 0 && completedGoals.length === 0 && (
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">🎯</Text>
            <Text className="text-base font-semibold text-gray-700">No goals yet</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">
              Tap + New to set your first goal.
            </Text>
          </View>
        )}

        {activeGoals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            members={members}
            currentMemberId={currentMember?.id}
            onAddUpdate={(goalId) => setAddUpdateGoalId(goalId)}
            onEdit={openEditGoal}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}

        {/* Completed section */}
        {goals.filter((g) => g.status === "completed").length > 0 && (
          <TouchableOpacity
            onPress={() => setShowCompleted(!showCompleted)}
            className="flex-row items-center justify-between mt-2 mb-3"
          >
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Completed ({goals.filter((g) => g.status === "completed").length})
            </Text>
            <Text className="text-xs text-gray-400">{showCompleted ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        )}
        {showCompleted && completedGoals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            members={members}
            currentMemberId={currentMember?.id}
            onAddUpdate={(goalId) => setAddUpdateGoalId(goalId)}
            onEdit={openEditGoal}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        ))}
      </ScrollView>

      {/* ── New Goal Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowNewModal(false)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">New Goal</Text>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <GoalFormFields
              title={newTitle} setTitle={setNewTitle}
              description={newDescription} setDescription={setNewDescription}
              userType={newUserType} setUserType={setNewUserType}
              memberId={newMemberId} setMemberId={setNewMemberId}
              dueDate={newDueDate} setDueDate={setNewDueDate}
              reminder={newReminder} setReminder={setNewReminder}
              members={members}
              userId={user?.id}
            />
            <TouchableOpacity
              onPress={handleCreateGoal}
              disabled={!newTitle.trim() || createGoal.isPending}
              className={`py-3 rounded-xl items-center ${newTitle.trim() ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${newTitle.trim() ? "text-white" : "text-gray-400"}`}>
                {createGoal.isPending ? "Saving..." : "Create Goal"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Edit Goal Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={!!editingGoal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingGoal(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingGoal(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Goal</Text>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <GoalFormFields
              title={editTitle} setTitle={setEditTitle}
              description={editDescription} setDescription={setEditDescription}
              userType={editUserType} setUserType={setEditUserType}
              memberId={editMemberId} setMemberId={setEditMemberId}
              dueDate={editDueDate} setDueDate={setEditDueDate}
              reminder={editReminder} setReminder={setEditReminder}
              members={members}
              userId={user?.id}
            />
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={!editTitle.trim() || updateGoal.isPending}
              className={`py-3 rounded-xl items-center ${editTitle.trim() ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${editTitle.trim() ? "text-white" : "text-gray-400"}`}>
                {updateGoal.isPending ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Add Update Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={!!addUpdateGoalId}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setAddUpdateGoalId(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => { setAddUpdateGoalId(null); setUpdateBody(""); }} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Add Update</Text>
          </View>
          <View className="px-4 py-4">
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 min-h-[120px]"
              value={updateBody}
              onChangeText={setUpdateBody}
              placeholder="What progress have you made? Any notes or milestones?"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity
              onPress={handleAddUpdate}
              disabled={!updateBody.trim() || addUpdate.isPending}
              className={`mt-4 py-3 rounded-xl items-center ${updateBody.trim() ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${updateBody.trim() ? "text-white" : "text-gray-400"}`}>
                {addUpdate.isPending ? "Saving..." : "Save Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
