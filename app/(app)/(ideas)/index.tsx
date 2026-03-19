import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import {
  useIdeas,
  useCreateIdea,
  useUpdateIdea,
  useWaitlistIdea,
  useConvertIdea,
  useDeleteIdea,
} from "@/hooks/useIdeas";
import { useCreateTask } from "@/hooks/useTasks";
import { useCreateProject } from "@/hooks/useProjects";
import { useCreateTrip } from "@/hooks/useTrips";
import { Card } from "@/components/ui/Card";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatDateShort } from "@/utils/dateUtils";
import type { Idea } from "@/types/app.types";

function IdeaCard({
  idea,
  householdId,
  onWaitlist,
  onConvert,
  onEdit,
  onDelete,
}: {
  idea: Idea;
  householdId: string;
  onWaitlist: () => void;
  onConvert: (type: "task" | "project" | "activity") => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-sm font-semibold text-gray-900 flex-1 mr-2">
          {idea.subject ?? idea.body}
        </Text>
        <Text className="text-xs text-gray-400">
          {formatDateShort(idea.created_at)}
        </Text>
      </View>
      {idea.description ? (
        <Text className="text-sm text-gray-600 mb-3">{idea.description}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2 mt-1">
        <TouchableOpacity
          onPress={() => onConvert("task")}
          className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200"
        >
          <Text className="text-xs font-semibold text-amber-700">→ Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onConvert("project")}
          className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200"
        >
          <Text className="text-xs font-semibold text-blue-700">→ Project</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onConvert("activity")}
          className="px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200"
        >
          <Text className="text-xs font-semibold text-purple-700">→ Activity</Text>
        </TouchableOpacity>
        {idea.status === "new" && (
          <TouchableOpacity
            onPress={onWaitlist}
            className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200"
          >
            <Text className="text-xs font-semibold text-gray-500">Waitlist</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onEdit} className="px-3 py-1.5">
          <Text className="text-xs text-gray-400">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} className="px-3 py-1.5">
          <Text className="text-xs text-red-400">Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function IdeasScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);

  const { data: ideas = [], isLoading, refetch } = useIdeas(household?.id);
  const createIdea = useCreateIdea();
  const updateIdea = useUpdateIdea();
  const waitlistIdea = useWaitlistIdea();
  const convertIdea = useConvertIdea();
  const deleteIdea = useDeleteIdea();
  const createTask = useCreateTask();
  const createProject = useCreateProject();
  const createTrip = useCreateTrip();

  // Intake form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Collapsed waitlist
  const [showWaitlisted, setShowWaitlisted] = useState(false);

  const activeIdeas = ideas.filter((i) => i.status === "new");
  const waitlistedIdeas = ideas.filter((i) => i.status === "waitlisted");

  const handleSaveIdea = async () => {
    if (!subject.trim() || !household || !currentMember) return;
    try {
      await createIdea.mutateAsync({
        householdId: household.id,
        subject: subject.trim(),
        description: description.trim() || undefined,
        authorId: currentMember.id,
      });
      setSubject("");
      setDescription("");
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleConvert = async (idea: Idea, type: "task" | "project" | "activity") => {
    if (!household || !currentMember) return;
    const title = idea.subject ?? idea.body ?? "Untitled";
    const desc = idea.description ?? undefined;
    try {
      let convertedId = "";

      if (type === "task") {
        const task = await createTask.mutateAsync({
          household_id: household.id,
          title,
          notes: desc ?? null,
          due_date: null,
          due_time: null,
          assigned_member_id: null,
          linked_event_type: null,
          linked_event_id: null,
        });
        convertedId = task.id;
      } else if (type === "project") {
        const project = await createProject.mutateAsync({
          household_id: household.id,
          title,
          description: desc ?? null,
          status: "planned",
          priority: "medium",
          created_by: currentMember.id,
          estimated_cost_cents: 0,
          total_cost_cents: 0,
        });
        convertedId = project.id;
        // Add current member as owner
        await (await import("@/lib/supabase")).supabase
          .from("project_owners")
          .insert({ project_id: project.id, member_id: currentMember.id });
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const trip = await createTrip.mutateAsync({
          household_id: household.id,
          title,
          destination: desc ?? "",
          departure_date: today,
          return_date: today,
          notes: null,
          created_by: currentMember.id,
          uses_vendor: false,
          primary_vendor_id: null,
        });
        convertedId = trip.id;
      }

      await convertIdea.mutateAsync({
        id: idea.id,
        householdId: household.id,
        convertedToType: type,
        convertedToId: convertedId,
      });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleWaitlist = async (idea: Idea) => {
    if (!household) return;
    try {
      await waitlistIdea.mutateAsync({ id: idea.id, householdId: household.id });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = (idea: Idea) => {
    if (!household) return;
    showConfirm(
      "Delete idea?",
      `"${idea.subject ?? idea.body}" will be removed.`,
      () => deleteIdea.mutate({ id: idea.id, householdId: household.id }),
      true
    );
  };

  const startEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setEditSubject(idea.subject ?? idea.body ?? "");
    setEditDescription(idea.description ?? "");
  };

  const saveEdit = async (idea: Idea) => {
    if (!household || !editSubject.trim()) return;
    try {
      await updateIdea.mutateAsync({
        id: idea.id,
        householdId: household.id,
        updates: { subject: editSubject.trim(), description: editDescription.trim() || null },
      });
      setEditingId(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const renderIdea = (idea: Idea) => {
    if (editingId === idea.id) {
      return (
        <Card key={idea.id} className="mb-3">
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mb-2"
            value={editSubject}
            onChangeText={setEditSubject}
            placeholder="Subject"
            placeholderTextColor="#9ca3af"
            autoFocus
          />
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mb-3 min-h-[60px]"
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => saveEdit(idea)}
              disabled={!editSubject.trim()}
              className={`flex-1 py-2 rounded-xl items-center ${editSubject.trim() ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${editSubject.trim() ? "text-white" : "text-gray-400"}`}>
                Save
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditingId(null)}
              className="flex-1 py-2 rounded-xl border border-gray-200 items-center"
            >
              <Text className="text-sm text-gray-600">Cancel</Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }

    return (
      <IdeaCard
        key={idea.id}
        idea={idea}
        householdId={household?.id ?? ""}
        onWaitlist={() => handleWaitlist(idea)}
        onConvert={(type) => handleConvert(idea, type)}
        onEdit={() => startEdit(idea)}
        onDelete={() => handleDelete(idea)}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 py-3 border-b border-gray-100 bg-white">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Ideas</Text>
        <Text className="text-xs text-gray-400">Capture an idea, then move it where it belongs.</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-4 pb-12"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intake form */}
        <Card className="mb-5">
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-2"
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject *"
            placeholderTextColor="#9ca3af"
            returnKeyType="next"
          />
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-3 min-h-[70px]"
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={handleSaveIdea}
            disabled={!subject.trim() || createIdea.isPending}
            className={`py-2.5 rounded-xl items-center ${subject.trim() ? "bg-blue-600" : "bg-gray-200"}`}
          >
            <Text className={`text-sm font-semibold ${subject.trim() ? "text-white" : "text-gray-400"}`}>
              Save Idea
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Active ideas */}
        {activeIdeas.length > 0 && (
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Ideas ({activeIdeas.length})
          </Text>
        )}
        {activeIdeas.map(renderIdea)}

        {activeIdeas.length === 0 && waitlistedIdeas.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">💡</Text>
            <Text className="text-base font-semibold text-gray-700">No ideas yet</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">
              Use the form above to capture your first idea.
            </Text>
          </View>
        )}

        {/* Waitlisted ideas */}
        {waitlistedIdeas.length > 0 && (
          <View className="mt-4">
            <TouchableOpacity
              onPress={() => setShowWaitlisted(!showWaitlisted)}
              className="flex-row items-center justify-between mb-3"
            >
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Waitlisted Ideas ({waitlistedIdeas.length})
              </Text>
              <Text className="text-gray-400 text-xs">
                {showWaitlisted ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
            {showWaitlisted && waitlistedIdeas.map(renderIdea)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
