import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
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
import { useProjects } from "@/hooks/useProjects";
import { useCreateTrip } from "@/hooks/useTrips";
import { useCreateRecurringTask } from "@/hooks/useRecurringTasks";
import { useAddProjectTask } from "@/hooks/useProjectTasks";
import { Card } from "@/components/ui/Card";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatDateShort } from "@/utils/dateUtils";
import { toISODateString } from "@/utils/dateUtils";
import { frequencyToDays } from "@/utils/scheduleUtils";
import type { Idea, ProjectWithOwners, FrequencyType } from "@/types/app.types";

type TaskMode = "low-lift" | "project-adjacent";

const FREQUENCIES: { label: string; value: FrequencyType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

function IdeaCard({
  idea,
  householdId,
  authorName,
  onWaitlist,
  onConvertProject,
  onConvertActivity,
  onConvertTask,
  onEdit,
  onDelete,
}: {
  idea: Idea;
  householdId: string;
  authorName?: string;
  onWaitlist: () => void;
  onConvertProject: () => void;
  onConvertActivity: () => void;
  onConvertTask: () => void;
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
        <Text className="text-sm text-gray-600 mb-1">{idea.description}</Text>
      ) : null}
      {authorName ? (
        <Text className="text-xs text-gray-400 mb-2">by {authorName}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2 mt-1">
        <TouchableOpacity
          onPress={onConvertTask}
          className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200"
        >
          <Text className="text-xs font-semibold text-amber-700">→ Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConvertProject}
          className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200"
        >
          <Text className="text-xs font-semibold text-blue-700">→ Project</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConvertActivity}
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
  const { data: projects = [] } = useProjects(household?.id);
  const createIdea = useCreateIdea();
  const updateIdea = useUpdateIdea();
  const waitlistIdea = useWaitlistIdea();
  const convertIdea = useConvertIdea();
  const deleteIdea = useDeleteIdea();
  const createTask = useCreateTask();
  const createProject = useCreateProject();
  const createTrip = useCreateTrip();
  const createRecurring = useCreateRecurringTask();
  const addProjectTask = useAddProjectTask();

  // Intake form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | undefined>(currentMember?.id);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Collapsed waitlist
  const [showWaitlisted, setShowWaitlisted] = useState(false);

  // ── Task conversion modal ──────────────────────────────────────────────────
  const [taskModalIdea, setTaskModalIdea] = useState<Idea | null>(null);
  const [taskMode, setTaskMode] = useState<TaskMode>("low-lift");

  // Low-Lift fields
  const [llFrequency, setLlFrequency] = useState<FrequencyType>("monthly");
  const [llCustomDays, setLlCustomDays] = useState("");
  const [llAnchorDate, setLlAnchorDate] = useState(toISODateString(new Date()));
  const [llAssignedId, setLlAssignedId] = useState<string | null>(null);

  // Project Adjacent fields
  const [paSelectedProjectId, setPaSelectedProjectId] = useState<string | null>(null);
  const [paChecklistName, setPaChecklistName] = useState("General");
  const [paDueDate, setPaDueDate] = useState("");
  const [paAssignedId, setPaAssignedId] = useState<string | null>(null);

  const activeIdeas = ideas.filter((i) => i.status === "new");
  const waitlistedIdeas = ideas.filter((i) => i.status === "waitlisted");

  const handleSaveIdea = async () => {
    if (!subject.trim() || !household || !currentMember) return;
    try {
      await createIdea.mutateAsync({
        householdId: household.id,
        subject: subject.trim(),
        description: description.trim() || undefined,
        authorId: selectedAuthorId ?? currentMember.id,
      });
      setSubject("");
      setDescription("");
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const openTaskModal = (idea: Idea) => {
    setTaskModalIdea(idea);
    setTaskMode("low-lift");
    setLlFrequency("monthly");
    setLlCustomDays("");
    setLlAnchorDate(toISODateString(new Date()));
    setLlAssignedId(null);
    setPaSelectedProjectId(null);
    setPaChecklistName("General");
    setPaDueDate("");
    setPaAssignedId(null);
  };

  const handleConvertToTask = async () => {
    if (!taskModalIdea || !household || !currentMember) return;
    const title = taskModalIdea.subject ?? taskModalIdea.body ?? "Untitled";
    const notes = taskModalIdea.description ?? null;
    try {
      let convertedId = "";
      if (taskMode === "low-lift") {
        const today = toISODateString(new Date());
        const anchorDate = llAnchorDate || today;
        const freqDays = llFrequency === "custom"
          ? parseInt(llCustomDays || "30", 10)
          : frequencyToDays(llFrequency);
        const rt = await createRecurring.mutateAsync({
          household_id: household.id,
          title,
          description: notes,
          category: null,
          frequency_type: llFrequency,
          frequency_days: freqDays,
          anchor_date: anchorDate,
          next_due_date: anchorDate,
          assigned_member_id: llAssignedId,
          is_active: true,
          time_of_day: null,
          is_personal: false,
        });
        convertedId = rt.id;
      } else {
        if (paSelectedProjectId) {
          await addProjectTask.mutateAsync({
            project_id: paSelectedProjectId,
            title,
            sort_order: 9999,
            checklist_name: paChecklistName,
            assigned_member_id: paAssignedId,
            due_date: paDueDate || null,
            notes,
          });
          convertedId = paSelectedProjectId;
        } else {
          const t = await createTask.mutateAsync({
            household_id: household.id,
            title,
            notes,
            due_date: paDueDate || null,
            due_time: null,
            assigned_member_id: paAssignedId,
            linked_event_type: null,
            linked_event_id: null,
            is_personal: false,
          });
          convertedId = t.id;
        }
      }
      await convertIdea.mutateAsync({
        id: taskModalIdea.id,
        householdId: household.id,
        convertedToType: "task",
        convertedToId: convertedId,
      });
      setTaskModalIdea(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleConvertToProject = async (idea: Idea) => {
    if (!household || !currentMember) return;
    const title = idea.subject ?? idea.body ?? "Untitled";
    const desc = idea.description ?? null;
    try {
      const project = await createProject.mutateAsync({
        project: {
          household_id: household.id,
          title,
          description: desc,
          status: "planned",
          priority: "medium",
          created_by: currentMember.id,
          estimated_cost_cents: 0,
          total_cost_cents: 0,
          category: null,
          expected_date: null,
          completed_at: null,
          notes: null,
          contractor_name: null,
          uses_vendor: false,
          primary_vendor_id: null,
        },
        ownerIds: [currentMember.id],
      });
      await convertIdea.mutateAsync({
        id: idea.id,
        householdId: household.id,
        convertedToType: "project",
        convertedToId: project.id,
      });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleConvertToActivity = async (idea: Idea) => {
    if (!household || !currentMember) return;
    const title = idea.subject ?? idea.body ?? "Untitled";
    const desc = idea.description ?? "";
    try {
      const today = new Date().toISOString().slice(0, 10);
      const trip = await createTrip.mutateAsync({
        household_id: household.id,
        title,
        destination: desc || "",
        departure_date: today,
        return_date: today,
        notes: null,
        created_by: currentMember.id,
        uses_vendor: false,
        primary_vendor_id: null,
      });
      await convertIdea.mutateAsync({
        id: idea.id,
        householdId: household.id,
        convertedToType: "activity",
        convertedToId: trip.id,
      });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleWaitlist = async (idea: Idea) => {
    if (!household) return;
    try {
      await waitlistIdea.mutateAsync({ id: idea.id, householdId: household.id });
      setShowWaitlisted(true);
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

    const authorName = idea.author_id
      ? members.find((m) => m.id === idea.author_id)?.display_name
      : undefined;

    return (
      <IdeaCard
        key={idea.id}
        idea={idea}
        householdId={household?.id ?? ""}
        authorName={authorName}
        onWaitlist={() => handleWaitlist(idea)}
        onConvertTask={() => openTaskModal(idea)}
        onConvertProject={() => handleConvertToProject(idea)}
        onConvertActivity={() => handleConvertToActivity(idea)}
        onEdit={() => startEdit(idea)}
        onDelete={() => handleDelete(idea)}
      />
    );
  };

  // Project Adjacent checklist sections for the selected project
  const paProject = projects.find((p) => p.id === paSelectedProjectId) as ProjectWithOwners | undefined;
  const paSections = paProject
    ? Array.from(new Set(((paProject as any).project_tasks ?? []).map((t: any) => t.checklist_name ?? "General"))) as string[]
    : ["General"];

  const isConverting = createRecurring.isPending || createTask.isPending || addProjectTask.isPending || createProject.isPending || convertIdea.isPending;

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
          <Text className="text-sm font-medium text-gray-700 mb-2">Owner</Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSelectedAuthorId(m.id)}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedAuthorId === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-sm font-medium ${selectedAuthorId === m.id ? "text-white" : "text-gray-700"}`}>
                  {m.display_name}{m.user_id === user?.id ? " (You)" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            Open Ideas ({activeIdeas.length})
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

      {/* ── Task Conversion Modal ──────────────────────────────────────────── */}
      <Modal
        visible={!!taskModalIdea}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTaskModalIdea(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setTaskModalIdea(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Convert to Task</Text>
          </View>

          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            {taskModalIdea && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-sm font-semibold text-amber-900">
                  {taskModalIdea.subject ?? taskModalIdea.body}
                </Text>
                {taskModalIdea.description ? (
                  <Text className="text-xs text-amber-700 mt-1">{taskModalIdea.description}</Text>
                ) : null}
              </View>
            )}

            {/* Mode toggle */}
            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-5">
              {(["low-lift", "project-adjacent"] as TaskMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setTaskMode(m)}
                  className={`flex-1 py-2 rounded-lg items-center ${taskMode === m ? "bg-white shadow-sm" : ""}`}
                >
                  <Text className={`text-sm font-semibold ${taskMode === m ? "text-gray-900" : "text-gray-500"}`}>
                    {m === "low-lift" ? "Low-Lift" : "Project Adjacent"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── LOW-LIFT ───────────────────────────────────────────────── */}
            {taskMode === "low-lift" && (
              <>
                <DateInput
                  label="Start / Due Date"
                  value={llAnchorDate}
                  onChange={setLlAnchorDate}
                  hint="First occurrence — frequency repeats from this date"
                />

                <Text className="text-sm font-medium text-gray-700 mb-2">Frequency</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f.value}
                      onPress={() => setLlFrequency(f.value)}
                      className={`px-4 py-2 rounded-xl border ${
                        llFrequency === f.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`font-medium text-sm ${llFrequency === f.value ? "text-white" : "text-gray-700"}`}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {llFrequency === "custom" && (
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                    value={llCustomDays}
                    onChangeText={setLlCustomDays}
                    placeholder="Every how many days? e.g. 45"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                )}

                <Text className="text-sm font-medium text-gray-700 mb-2">Assign To (optional)</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setLlAssignedId(llAssignedId === m.id ? null : m.id)}
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
              </>
            )}

            {/* ── PROJECT ADJACENT ───────────────────────────────────────── */}
            {taskMode === "project-adjacent" && (
              <>
                <DateInput
                  label="Due Date (optional)"
                  value={paDueDate}
                  onChange={setPaDueDate}
                />

                <Text className="text-sm font-medium text-gray-700 mb-2">Assign To (optional)</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setPaAssignedId(paAssignedId === m.id ? null : m.id)}
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

                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Link to Project (optional)
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {projects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        setPaSelectedProjectId(paSelectedProjectId === p.id ? null : p.id);
                        setPaChecklistName("General");
                      }}
                      className={`px-3 py-1.5 rounded-full border ${
                        paSelectedProjectId === p.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${paSelectedProjectId === p.id ? "text-white" : "text-gray-700"}`}>
                        {p.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {projects.length === 0 && (
                    <Text className="text-sm text-gray-400">No active projects — task will be standalone.</Text>
                  )}
                </View>

                {paSelectedProjectId && (
                  <>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Checklist Section</Text>
                    <View className="flex-row flex-wrap gap-2 mb-6">
                      {(paSections.length > 0 ? paSections : ["General"]).map((name) => (
                        <TouchableOpacity
                          key={name}
                          onPress={() => setPaChecklistName(name)}
                          className={`px-3 py-1.5 rounded-full border ${
                            paChecklistName === name ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                          }`}
                        >
                          <Text className={`text-sm font-medium ${paChecklistName === name ? "text-white" : "text-gray-700"}`}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            <TouchableOpacity
              onPress={handleConvertToTask}
              disabled={isConverting}
              className={`py-3 rounded-xl items-center ${isConverting ? "bg-gray-200" : "bg-amber-500"}`}
            >
              <Text className={`text-sm font-semibold ${isConverting ? "text-gray-400" : "text-white"}`}>
                {isConverting ? "Converting..." : "Convert to Task"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
