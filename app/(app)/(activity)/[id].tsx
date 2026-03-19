import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { showAlert, showConfirm } from "@/lib/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { impactLight } from "@/lib/haptics";
import {
  useTrip,
  useCreateTripTask,
  useCompleteTripChecklistItem,
  useDeleteTripTask,
  useUpdateTrip,
  useDeleteTrip,
} from "@/hooks/useTrips";
import {
  useCompletedChecklistItems,
  useDeleteCompletedChecklistItem,
} from "@/hooks/useChecklistItems";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { formatDateShort } from "@/utils/dateUtils";
import type { TripTask } from "@/types/app.types";

// ─── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  visible,
  checklistName,
  members,
  onAdd,
  onClose,
}: {
  visible: boolean;
  checklistName: string;
  members: { id: string; display_name: string; color_hex: string }[];
  onAdd: (title: string, assignedMemberId: string | null, dueDate: string | null) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setTitle("");
    setAssignedId(null);
    setDueDate("");
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), assignedId, dueDate || null);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={handleClose} className="mr-4">
            <Text className="text-blue-600 text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="flex-1 text-base font-semibold text-gray-900">
            Add to "{checklistName}"
          </Text>
          <TouchableOpacity onPress={handleAdd} disabled={!title.trim()}>
            <Text className={`text-base font-semibold ${title.trim() ? "text-blue-600" : "text-gray-300"}`}>
              Add
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
          <Input
            label="Task"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Pack sunscreen"
            autoFocus
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Assign to (optional)</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setAssignedId(assignedId === m.id ? null : m.id)}
                className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full border ${
                  assignedId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <MemberAvatar member={m as any} size="sm" />
                <Text className={`text-sm font-medium ${assignedId === m.id ? "text-white" : "text-gray-700"}`}>
                  {m.display_name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <DateInput
            label="Due Date (optional)"
            value={dueDate}
            onChange={setDueDate}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  members,
  onComplete,
  onDelete,
}: {
  task: TripTask;
  members: { id: string; display_name: string; color_hex: string }[];
  onComplete: () => void;
  onDelete: () => void;
}) {
  const assignedMember = task.assigned_member_id
    ? members.find((m) => m.id === task.assigned_member_id)
    : null;

  return (
    <View className="flex-row items-start py-2.5 border-b border-gray-100">
      <TouchableOpacity
        onPress={onComplete}
        className="w-5 h-5 rounded border-2 border-gray-300 mr-3 mt-0.5 items-center justify-center"
      />
      <View className="flex-1">
        <Text className="text-sm text-gray-800">{task.title}</Text>
        <View className="flex-row items-center gap-2 mt-1 flex-wrap">
          {assignedMember && (
            <View className="flex-row items-center gap-1">
              <MemberAvatar member={assignedMember as any} size="sm" />
              <Text className="text-xs text-gray-400">{assignedMember.display_name.split(" ")[0]}</Text>
            </View>
          )}
          {task.due_date && (
            <Text className="text-xs text-gray-400">{formatDateShort(task.due_date)}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} className="p-1 ml-2 mt-0.5">
        <Text className="text-gray-300 text-base">×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, refetch } = useTrip(id);
  const { members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);

  const createTask = useCreateTripTask();
  const completeTask = useCompleteTripChecklistItem();
  const deleteTask = useDeleteTripTask();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();
  const deleteCompleted = useDeleteCompletedChecklistItem();

  const { data: completedItems = [] } = useCompletedChecklistItems("trip", id);

  // Edit trip modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editDeparture, setEditDeparture] = useState("");
  const [editReturn, setEditReturn] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Add checklist modal
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [localChecklists, setLocalChecklists] = useState<string[]>(["General"]);

  // Add item modal
  const [addItemChecklist, setAddItemChecklist] = useState<string | null>(null);

  // Completed section toggle
  const [showCompleted, setShowCompleted] = useState(false);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`trip_tasks:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_tasks", filter: `trip_id=eq.${id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const openEdit = () => {
    if (!trip) return;
    setEditTitle(trip.title);
    setEditDestination(trip.destination);
    setEditDeparture(trip.departure_date);
    setEditReturn(trip.return_date);
    setEditNotes(trip.notes ?? "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!trip || !editTitle.trim()) return;
    try {
      await updateTrip.mutateAsync({
        id: trip.id,
        updates: {
          title: editTitle.trim(),
          destination: editDestination.trim(),
          departure_date: editDeparture,
          return_date: editReturn,
          notes: editNotes.trim() || null,
        },
      });
      setShowEditModal(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDeleteTrip = () => {
    if (!trip) return;
    showConfirm(
      "Delete trip?",
      `Remove "${trip.title}"? This cannot be undone.`,
      async () => {
        try {
          await deleteTrip.mutateAsync({ id: trip.id, householdId: trip.household_id });
          router.back();
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  const handleAddChecklist = () => {
    const name = newChecklistName.trim();
    if (!name) return;
    if (!localChecklists.includes(name)) {
      setLocalChecklists((prev) => [...prev, name]);
    }
    setNewChecklistName("");
    setShowAddChecklist(false);
    // Immediately open the add-task modal so the checklist is saved via a task
    setAddItemChecklist(name);
  };

  const handleAddItem = async (
    title: string,
    assignedMemberId: string | null,
    dueDate: string | null
  ) => {
    if (!addItemChecklist || !id) return;
    const tasks = trip?.tasks ?? [];
    const groupTasks = tasks.filter((t) => t.checklist_name === addItemChecklist);
    const nextOrder = groupTasks.length > 0
      ? Math.max(...groupTasks.map((t) => t.sort_order)) + 1
      : 0;
    try {
      await createTask.mutateAsync({
        trip_id: id,
        title,
        is_completed: false,
        completed_at: null,
        sort_order: nextOrder,
        checklist_name: addItemChecklist,
        assigned_member_id: assignedMemberId,
        due_date: dueDate,
      });
      setAddItemChecklist(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleComplete = async (task: TripTask) => {
    await impactLight();
    try {
      await completeTask.mutateAsync({
        task,
        completedByMemberId: currentMember?.id ?? null,
      });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = (task: TripTask) => {
    showConfirm(
      "Remove task?",
      `"${task.title}" will be removed.`,
      () => deleteTask.mutate({ taskId: task.id, tripId: task.trip_id }),
      true
    );
  };

  if (!trip) return null;

  const allTasks = trip.tasks ?? [];

  // Merge server-side checklist names with local ones
  const serverNames = Array.from(new Set(allTasks.map((t) => t.checklist_name ?? "General")));
  const checklistNames = Array.from(new Set([...localChecklists, ...serverNames]));

  const tasksByChecklist: Record<string, TripTask[]> = {};
  for (const name of checklistNames) {
    tasksByChecklist[name] = allTasks
      .filter((t) => (t.checklist_name ?? "General") === name)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  const totalActive = allTasks.length;
  const daysUntil = Math.ceil(
    (new Date(trip.departure_date).getTime() - Date.now()) / 86400000
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Nav */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
            {trip.title}
          </Text>
          <Text className="text-xs text-gray-400">
            {trip.destination} · {formatDateShort(trip.departure_date)} – {formatDateShort(trip.return_date)}
            {daysUntil > 0 ? ` · ${daysUntil}d away` : daysUntil === 0 ? " · Today!" : " · Past"}
          </Text>
        </View>
        <TouchableOpacity onPress={openEdit} className="ml-2">
          <Text className="text-blue-600 text-sm font-medium">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-16">
        {trip.notes && (
          <Card className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</Text>
            <Text className="text-sm text-gray-700">{trip.notes}</Text>
          </Card>
        )}

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-blue-50 rounded-xl p-3">
            <Text className="text-xl font-bold text-gray-900">{totalActive}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Active tasks</Text>
          </View>
          <View className="flex-1 bg-green-50 rounded-xl p-3">
            <Text className="text-xl font-bold text-gray-900">{completedItems.length}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Completed</Text>
          </View>
          <View className={`flex-1 rounded-xl p-3 ${daysUntil > 7 ? "bg-gray-50" : daysUntil >= 0 ? "bg-amber-50" : "bg-red-50"}`}>
            <Text className="text-xl font-bold text-gray-900">
              {daysUntil >= 0 ? daysUntil : Math.abs(daysUntil)}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {daysUntil >= 0 ? "Days away" : "Days ago"}
            </Text>
          </View>
        </View>

        {/* Checklists */}
        {checklistNames.map((name) => (
          <View key={name} className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                {name}
              </Text>
              <TouchableOpacity
                onPress={() => setAddItemChecklist(name)}
                className="bg-blue-600 rounded-full px-3 py-0.5"
              >
                <Text className="text-white text-xs font-semibold">+ Add</Text>
              </TouchableOpacity>
            </View>
            <Card>
              {tasksByChecklist[name].length === 0 ? (
                <Text className="text-gray-400 text-sm text-center py-3">
                  No tasks yet — tap + Add
                </Text>
              ) : (
                tasksByChecklist[name].map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onComplete={() => handleComplete(task)}
                    onDelete={() => handleDelete(task)}
                  />
                ))
              )}
            </Card>
          </View>
        ))}

        {/* Add Checklist */}
        {showAddChecklist ? (
          <View className="flex-row items-center gap-2 mb-4">
            <TextInput
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
              placeholder="Checklist name (e.g. Packing)"
              value={newChecklistName}
              onChangeText={setNewChecklistName}
              onSubmitEditing={handleAddChecklist}
              autoFocus
              returnKeyType="done"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              onPress={handleAddChecklist}
              disabled={!newChecklistName.trim()}
              className={`px-3 py-2 rounded-xl ${newChecklistName.trim() ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${newChecklistName.trim() ? "text-white" : "text-gray-400"}`}>
                Create
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowAddChecklist(false); setNewChecklistName(""); }}
            >
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowAddChecklist(true)}
            className="flex-row items-center gap-2 mb-4 py-2"
          >
            <Text className="text-blue-600 text-sm font-medium">+ Add Checklist</Text>
          </TouchableOpacity>
        )}

        {/* Completed items */}
        {completedItems.length > 0 && (
          <View className="mb-4">
            <TouchableOpacity
              onPress={() => setShowCompleted(!showCompleted)}
              className="flex-row items-center justify-between mb-2"
            >
              <Text className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                Completed ({completedItems.length})
              </Text>
              <Text className="text-gray-400 text-xs">{showCompleted ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            {showCompleted && (
              <Card>
                {completedItems.map((item) => (
                  <View key={item.id} className="flex-row items-center py-2 border-b border-gray-50">
                    <View className="w-5 h-5 rounded bg-green-500 mr-3 items-center justify-center">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-400 line-through">{item.title}</Text>
                      {item.checklist_name && item.checklist_name !== "General" && (
                        <Text className="text-xs text-gray-300">{item.checklist_name}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        deleteCompleted.mutate({ id: item.id, sourceType: "trip", sourceId: id! })
                      }
                      className="ml-2 p-1"
                    >
                      <Text className="text-gray-300 text-sm">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <AddItemModal
        visible={addItemChecklist !== null}
        checklistName={addItemChecklist ?? ""}
        members={members}
        onAdd={handleAddItem}
        onClose={() => setAddItemChecklist(null)}
      />

      {/* Edit Trip Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowEditModal(false)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Trip</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text className="text-blue-600 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input label="Trip Title" value={editTitle} onChangeText={setEditTitle} placeholder="e.g. Summer Vacation" />
            <Input label="Destination" value={editDestination} onChangeText={setEditDestination} placeholder="e.g. Paris, France" />
            <DateInput label="Departure Date" value={editDeparture} onChange={setEditDeparture} />
            <DateInput label="Return Date" value={editReturn} onChange={setEditReturn} />
            <Input
              label="Notes (optional)"
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              numberOfLines={3}
              placeholder="Packing notes, reservations, etc..."
            />
            <Button title="Save Changes" onPress={handleSaveEdit} loading={updateTrip.isPending} />
            <TouchableOpacity onPress={handleDeleteTrip} className="mt-3 items-center py-3">
              <Text className="text-red-500 font-medium">Delete Trip</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
