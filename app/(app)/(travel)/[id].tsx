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
import { useTrip, useCreateTripTask, useToggleTripTask, useDeleteTripTask, useUpdateTrip, useDeleteTrip } from "@/hooks/useTrips";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { formatDateShort } from "@/utils/dateUtils";
import type { TripTask } from "@/types/app.types";

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: TripTask;
  onToggle: (isCompleted: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <View className="flex-row items-center py-2 border-b border-gray-100">
      <TouchableOpacity
        onPress={() => onToggle(!task.is_completed)}
        className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
          task.is_completed
            ? "bg-green-500 border-green-500"
            : "border-gray-300"
        }`}
      >
        {task.is_completed && (
          <Text className="text-white text-xs font-bold">✓</Text>
        )}
      </TouchableOpacity>
      <Text
        className={`flex-1 text-base ${
          task.is_completed ? "text-gray-400 line-through" : "text-gray-800"
        }`}
      >
        {task.title}
      </Text>
      <TouchableOpacity onPress={onDelete} className="p-1 ml-2">
        <Text className="text-gray-300 text-lg">×</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, refetch } = useTrip(id);
  const { members } = useHouseholdStore();
  const { user } = useAuthStore();
  const createTask = useCreateTripTask();
  const toggleTask = useToggleTripTask();
  const deleteTask = useDeleteTripTask();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editDeparture, setEditDeparture] = useState("");
  const [editReturn, setEditReturn] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`trip_tasks:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_tasks",
          filter: `trip_id=eq.${id}`,
        },
        () => refetch()
      )
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

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !id) return;
    const maxOrder = Math.max(
      0,
      ...(trip?.tasks ?? []).map((t) => t.sort_order)
    );
    try {
      await createTask.mutateAsync({
        trip_id: id,
        title: newTaskTitle.trim(),
        is_completed: false,
        completed_at: null,
        sort_order: maxOrder + 1,
      });
      setNewTaskTitle("");
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleToggle = async (task: TripTask, isCompleted: boolean) => {
    await impactLight();
    toggleTask.mutate({ taskId: task.id, tripId: task.trip_id, isCompleted });
  };

  const handleDelete = (task: TripTask) => {
    showConfirm(
      "Delete task?",
      `Remove "${task.title}"?`,
      () => deleteTask.mutate({ taskId: task.id, tripId: task.trip_id }),
      true
    );
  };

  if (!trip) return null;

  const sortedTasks = [...(trip.tasks ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const completedCount = sortedTasks.filter((t) => t.is_completed).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
            {trip.title}
          </Text>
          <Text className="text-sm text-gray-400">
            {trip.destination} · {formatDateShort(trip.departure_date)} –{" "}
            {formatDateShort(trip.return_date)}
          </Text>
        </View>
        <TouchableOpacity onPress={openEdit} className="ml-2">
          <Text className="text-blue-600 text-base">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-8">
        {trip.notes && (
          <Card className="mb-4">
            <Text className="text-sm font-semibold text-gray-500 mb-1">Notes</Text>
            <Text className="text-gray-700">{trip.notes}</Text>
          </Card>
        )}

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Checklist
          </Text>
          <Text className="text-sm text-gray-400">
            {completedCount}/{sortedTasks.length} done
          </Text>
        </View>

        <Card>
          {sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(isCompleted) => handleToggle(task, isCompleted)}
              onDelete={() => handleDelete(task)}
            />
          ))}
          <View className="flex-row items-center pt-3">
            <TextInput
              className="flex-1 text-base text-gray-800"
              placeholder="Add a task..."
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={handleAddTask}
              returnKeyType="done"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              onPress={handleAddTask}
              className="ml-2 bg-blue-600 rounded-lg px-3 py-1.5"
            >
              <Text className="text-white text-sm font-semibold">Add</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* Edit Modal */}
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
            <Input
              label="Trip Title"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Summer Vacation"
            />

            <Input
              label="Destination"
              value={editDestination}
              onChangeText={setEditDestination}
              placeholder="e.g. Paris, France"
            />

            <DateInput
              label="Departure Date"
              value={editDeparture}
              onChange={setEditDeparture}
            />

            <DateInput
              label="Return Date"
              value={editReturn}
              onChange={setEditReturn}
            />

            <Input
              label="Notes (optional)"
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              numberOfLines={3}
              placeholder="Packing notes, reservations, etc..."
            />

            <Button
              title="Save Changes"
              onPress={handleSaveEdit}
              loading={updateTrip.isPending}
            />
            <TouchableOpacity
              onPress={handleDeleteTrip}
              className="mt-3 items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Trip</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
