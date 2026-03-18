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
import { useProject, useAddProjectUpdate, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/alert";
import { MemberAvatar, MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { formatDateTime, formatDate } from "@/utils/dateUtils";
import type { ProjectStatus } from "@/types/app.types";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: any }> = {
  planned: { label: "Planned", variant: "default" },
  in_progress: { label: "In Progress", variant: "info" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  finished: { label: "Finished", variant: "success" },
};

// Statuses the user can switch to from the detail screen
const EDITABLE_STATUSES: ProjectStatus[] = [
  "planned",
  "in_progress",
  "on_hold",
  "finished",
];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading, refetch } = useProject(id);
  const { members } = useHouseholdStore();
  const { user } = useAuthStore();
  const addUpdate = useAddProjectUpdate();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState("");

  const currentMember = members.find((m) => m.user_id === user?.id);

  // Realtime subscription for project updates
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

  // Auto-open update modal for newly created projects with no updates yet
  useEffect(() => {
    if (project && (project.project_updates ?? []).length === 0) {
      const created = new Date(project.created_at).getTime();
      const age = Date.now() - created;
      // Only prompt if project was created in the last 60 seconds
      if (age < 60_000) setShowUpdateModal(true);
    }
  }, [project?.id]);

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

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!id || !project) return;
    const updates: any = { status: newStatus };
    if (newStatus === "finished" || newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    } else {
      // Reopening — clear the completion date
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

  const isFinished =
    project.status === "finished" || project.status === "completed";
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
        <TouchableOpacity onPress={handleDelete} className="ml-3">
          <Text className="text-gray-300 text-lg">🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-28">
        {/* Meta card */}
        <Card className="mb-4">
          <View className="flex-row items-start justify-between mb-3">
            <Badge label={sc.label} variant={sc.variant} />
            <MemberAvatarGroup members={owners} />
          </View>

          {project.description && (
            <Text className="text-gray-600 mb-3">{project.description}</Text>
          )}

          {/* Dates */}
          <View className="gap-1 mb-3">
            <Text className="text-xs text-gray-400">
              Added {formatDateTime(project.created_at)}
            </Text>
            {project.expected_date && (
              <Text className="text-xs text-gray-400">
                Target date: {formatDate(project.expected_date)}
              </Text>
            )}
            {isFinished && project.completed_at && (
              <Text className="text-xs text-green-600 font-medium">
                Finished {formatDateTime(project.completed_at)}
              </Text>
            )}
          </View>

          {/* Status chips — only show on open projects */}
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
                        active
                          ? "bg-blue-600 border-blue-600"
                          : s === "finished"
                          ? "bg-green-50 border-green-300"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active
                            ? "text-white"
                            : s === "finished"
                            ? "text-green-700"
                            : "text-gray-700"
                        }`}
                      >
                        {cfg.label}
                        {s === "finished" ? " ✓" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Reopen button for finished projects */}
          {isFinished && (
            <TouchableOpacity
              onPress={() => handleStatusChange("in_progress")}
              className="mt-3 self-start px-3 py-1.5 rounded-xl border border-gray-200 bg-white"
            >
              <Text className="text-sm text-gray-600">Reopen project</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Updates section */}
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
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">
                  {update.body}
                </Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FAB — only on open projects */}
      {!isFinished && (
        <TouchableOpacity
          onPress={() => setShowUpdateModal(true)}
          className="absolute bottom-8 right-6 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </TouchableOpacity>
      )}

      {/* Update modal */}
      <Modal
        visible={showUpdateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => { setShowUpdateModal(false); setUpdateText(""); }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">
              Add Update
            </Text>
            <TouchableOpacity
              onPress={handleAddUpdate}
              disabled={!updateText.trim() || addUpdate.isPending}
            >
              <Text
                className={`text-base font-semibold ${
                  updateText.trim() ? "text-blue-600" : "text-gray-300"
                }`}
              >
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
    </SafeAreaView>
  );
}
