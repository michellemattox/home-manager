import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useProject,
  useAddProjectUpdate,
  useEditProjectUpdate,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useProjects";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { showAlert, showConfirm } from "@/lib/alert";
import { MemberAvatar, MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { formatDateTime, formatDate } from "@/utils/dateUtils";
import { centsToDisplay, displayToCents } from "@/utils/currencyUtils";
import { PROJECT_CATEGORIES } from "@/types/app.types";
import type { ProjectStatus, ProjectPriority } from "@/types/app.types";

// Accepts MM/DD/YYYY or YYYY-MM-DD, returns YYYY-MM-DD or null
function parseDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: any }> = {
  planned: { label: "Planned", variant: "default" },
  in_progress: { label: "In Progress", variant: "info" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  finished: { label: "Finished", variant: "success" },
};

const EDITABLE_STATUSES: ProjectStatus[] = [
  "planned",
  "in_progress",
  "on_hold",
  "finished",
];

const PRIORITIES: { label: string; value: ProjectPriority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading, refetch } = useProject(id);
  const { members } = useHouseholdStore();
  const { user } = useAuthStore();
  const addUpdate = useAddProjectUpdate();
  const editUpdate = useEditProjectUpdate();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  // Add update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState("");

  // Edit update modal
  const [editingUpdate, setEditingUpdate] = useState<{ id: string; body: string } | null>(null);
  const [editUpdateText, setEditUpdateText] = useState("");

  // Edit project modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<ProjectPriority>("medium");
  const [editCategory, setEditCategory] = useState<string | undefined>(undefined);
  const [editDueDate, setEditDueDate] = useState("");
  const [editCost, setEditCost] = useState("");

  const currentMember = members.find((m) => m.user_id === user?.id);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`project_updates:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_updates", filter: `project_id=eq.${id}` },
        () => refetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Seed edit fields when modal opens
  useEffect(() => {
    if (showEditModal && project) {
      setEditTitle(project.title);
      setEditDescription(project.description ?? "");
      setEditPriority(project.priority as ProjectPriority);
      setEditCategory(project.category ?? undefined);
      setEditDueDate(project.expected_date ? isoToDisplay(project.expected_date) : "");
      setEditCost(project.estimated_cost_cents ? (project.estimated_cost_cents / 100).toFixed(2) : "");
    }
  }, [showEditModal]);

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !currentMember || !id) return;
    try {
      await addUpdate.mutateAsync({
        project_id: id,
        author_id: currentMember.id,
        body: updateText.trim(),
      });
      setUpdateText("");
      setShowUpdateModal(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleSaveEditUpdate = async () => {
    if (!editingUpdate || !editUpdateText.trim()) return;
    try {
      await editUpdate.mutateAsync({
        id: editingUpdate.id,
        body: editUpdateText.trim(),
        projectId: id!,
      });
      setEditingUpdate(null);
      setEditUpdateText("");
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleSaveEditProject = async () => {
    if (!editTitle.trim() || !id) return;
    const isoDate = editDueDate ? parseDateInput(editDueDate) : null;
    if (editDueDate && !isoDate) {
      showAlert("Invalid date", "Use MM/DD/YYYY format");
      return;
    }
    const estimatedCents = editCost.trim() ? displayToCents(editCost) : 0;
    try {
      await updateProject.mutateAsync({
        id,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          category: editCategory ?? null,
          expected_date: isoDate,
          estimated_cost_cents: estimatedCents,
        },
      });
      setShowEditModal(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!id || !project) return;
    const updates: any = { status: newStatus };
    if (newStatus === "finished" || newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }
    try {
      await updateProject.mutateAsync({ id, updates });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = () => {
    if (!project) return;
    showConfirm(
      "Delete project?",
      `"${project.title}" and all its updates will be permanently removed.`,
      async () => {
        try {
          await deleteProject.mutateAsync({ id: project.id, householdId: project.household_id });
          router.back();
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  if (!project) return null;

  const owners = (project.project_owners ?? [])
    .map((po: any) => members.find((m) => m.id === po.member_id))
    .filter(Boolean) as any[];

  const sortedUpdates = [...(project.project_updates ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const isFinished = project.status === "finished" || project.status === "completed";
  const sc = STATUS_CONFIG[project.status];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Nav bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900" numberOfLines={1}>
          {project.title}
        </Text>
        {!isFinished && (
          <TouchableOpacity onPress={() => setShowEditModal(true)} className="ml-3">
            <Text className="text-blue-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDelete} className="ml-3">
          <Text className="text-gray-300 text-lg">🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-28">
        {/* Meta card */}
        <Card className="mb-4">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-row gap-2 flex-wrap flex-1 mr-2">
              <Badge label={sc.label} variant={sc.variant} />
              <Badge
                label={project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                variant={project.priority === "high" ? "danger" : project.priority === "medium" ? "warning" : "default"}
              />
              {project.category && (
                <Badge label={project.category} variant="default" />
              )}
            </View>
            <MemberAvatarGroup members={owners} />
          </View>

          {project.description && (
            <Text className="text-gray-600 mb-3">{project.description}</Text>
          )}

          {/* Dates + cost */}
          <View className="gap-1 mb-3">
            <Text className="text-xs text-gray-400">
              Added {formatDateTime(project.created_at)}
            </Text>
            {project.expected_date && (
              <Text className="text-xs text-gray-500 font-medium">
                Due {formatDate(project.expected_date)}
              </Text>
            )}
            {project.estimated_cost_cents > 0 && (
              <Text className="text-xs text-gray-500">
                Budget: {centsToDisplay(project.estimated_cost_cents)}
              </Text>
            )}
            {isFinished && project.completed_at && (
              <Text className="text-xs text-green-600 font-medium">
                Finished {formatDateTime(project.completed_at)}
              </Text>
            )}
          </View>

          {/* Status chips */}
          {!isFinished && (
            <View>
              <Text className="text-xs font-medium text-gray-500 mb-2">Change status</Text>
              <View className="flex-row flex-wrap gap-2">
                {EDITABLE_STATUSES.map((s) => {
                  const active = project.status === s;
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => !active && handleStatusChange(s)}
                      className={`px-3 py-1.5 rounded-xl border ${
                        active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {isFinished && (
            <TouchableOpacity
              onPress={() => handleStatusChange("in_progress")}
              className="mt-3 self-start px-3 py-1.5 rounded-xl border border-gray-200 bg-white"
            >
              <Text className="text-sm text-gray-600">Reopen project</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Updates */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Updates ({sortedUpdates.length})
          </Text>
          {!isFinished && (
            <TouchableOpacity
              onPress={() => setShowUpdateModal(true)}
              className="bg-blue-600 rounded-full px-3 py-1"
            >
              <Text className="text-white text-sm font-medium">+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {sortedUpdates.length === 0 ? (
          <Card>
            <Text className="text-gray-400 text-sm text-center py-3">
              No updates yet.{!isFinished ? " Tap + Add to post the first one." : ""}
            </Text>
          </Card>
        ) : (
          sortedUpdates.map((update: any) => {
            const author = members.find((m) => m.id === update.author_id);
            const isMyUpdate = currentMember && update.author_id === currentMember.id;
            return (
              <Card key={update.id} className="mb-3">
                <View className="flex-row items-center mb-2">
                  {author && <MemberAvatar member={author} size="sm" />}
                  <View className="ml-2 flex-1">
                    <Text className="text-xs text-gray-400">
                      {formatDateTime(update.created_at)}
                      {author ? ` · ${author.display_name}` : ""}
                    </Text>
                  </View>
                  {isMyUpdate && !isFinished && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingUpdate({ id: update.id, body: update.body });
                        setEditUpdateText(update.body);
                      }}
                    >
                      <Text className="text-blue-500 text-xs font-medium">Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">
                  {update.body}
                </Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      {!isFinished && (
        <TouchableOpacity
          onPress={() => setShowUpdateModal(true)}
          className="absolute bottom-8 right-6 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </TouchableOpacity>
      )}

      {/* Add Update modal */}
      <Modal visible={showUpdateModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => { setShowUpdateModal(false); setUpdateText(""); }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Add Update</Text>
            <TouchableOpacity onPress={handleAddUpdate} disabled={!updateText.trim() || addUpdate.isPending}>
              <Text className={`text-base font-semibold ${updateText.trim() ? "text-blue-600" : "text-gray-300"}`}>
                Post
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-400 mb-3">
            Posting as {currentMember?.display_name ?? "you"}
          </Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl p-4 text-base text-gray-900 min-h-[120px]"
            placeholder="What's the latest on this project?"
            value={updateText}
            onChangeText={setUpdateText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </View>
      </Modal>

      {/* Edit Update modal */}
      <Modal visible={!!editingUpdate} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => { setEditingUpdate(null); setEditUpdateText(""); }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Edit Update</Text>
            <TouchableOpacity onPress={handleSaveEditUpdate} disabled={!editUpdateText.trim() || editUpdate.isPending}>
              <Text className={`text-base font-semibold ${editUpdateText.trim() ? "text-blue-600" : "text-gray-300"}`}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl p-4 text-base text-gray-900 min-h-[120px]"
            value={editUpdateText}
            onChangeText={setEditUpdateText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </View>
      </Modal>

      {/* Edit Project modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Edit Project</Text>
            <TouchableOpacity onPress={handleSaveEditProject} disabled={!editTitle.trim() || updateProject.isPending}>
              <Text className={`text-base font-semibold ${editTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4 min-h-[80px]"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
              placeholder="Optional"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PROJECT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditCategory(editCategory === cat ? undefined : cat)}
                  className={`px-3 py-1.5 rounded-full border ${
                    editCategory === cat ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editCategory === cat ? "text-white" : "text-gray-700"}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Priority</Text>
            <View className="flex-row gap-2 mb-4">
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setEditPriority(p.value)}
                  className={`px-3 py-1.5 rounded-xl border flex-1 items-center ${
                    editPriority === p.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editPriority === p.value ? "text-white" : "text-gray-700"}`}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Due Date</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={editDueDate}
              onChangeText={setEditDueDate}
              placeholder="MM/DD/YYYY"
              keyboardType="numbers-and-punctuation"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Estimated Cost</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-6"
              value={editCost}
              onChangeText={setEditCost}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
