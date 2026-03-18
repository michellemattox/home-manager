import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProject, useAddProjectUpdate, useUpdateProject } from "@/hooks/useProjects";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MemberAvatar, MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { formatDateTime, formatDate } from "@/utils/dateUtils";

const statusConfig: Record<string, { label: string; variant: any }> = {
  in_progress: { label: "In Progress", variant: "info" },
  planned: { label: "Planned", variant: "default" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading, refetch } = useProject(id);
  const { members } = useHouseholdStore();
  const { user } = useAuthStore();
  const addUpdate = useAddProjectUpdate();
  const updateProject = useUpdateProject();

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
        {
          event: "INSERT",
          schema: "public",
          table: "project_updates",
          filter: `project_id=eq.${id}`,
        },
        () => refetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

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
      Alert.alert("Error", e.message);
    }
  };

  const handleMarkComplete = async () => {
    if (!id) return;
    await updateProject.mutateAsync({
      id,
      updates: { status: "completed", completed_at: new Date().toISOString() },
    });
  };

  if (!project) return null;

  const owners = (project.project_owners ?? [])
    .map((po: any) => members.find((m) => m.id === po.member_id))
    .filter(Boolean) as any[];

  const sc = statusConfig[project.status];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900" numberOfLines={1}>
          {project.title}
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-24">
        <Card className="mb-4">
          <View className="flex-row items-start justify-between mb-3">
            <Badge label={sc.label} variant={sc.variant} />
            <MemberAvatarGroup members={owners} />
          </View>
          {project.description && (
            <Text className="text-gray-600 mb-3">{project.description}</Text>
          )}
          {project.expected_date && (
            <Text className="text-sm text-gray-400">
              Due: {formatDate(project.expected_date)}
            </Text>
          )}
          {project.status !== "completed" && (
            <Button
              title="Mark Complete"
              variant="secondary"
              size="sm"
              onPress={handleMarkComplete}
              className="mt-3"
            />
          )}
        </Card>

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Updates
        </Text>

        {(project.project_updates ?? [])
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .map((update: any) => {
            const author = members.find((m) => m.id === update.author_id);
            return (
              <Card key={update.id} className="mb-3">
                <View className="flex-row items-center mb-2">
                  {author && <MemberAvatar member={author} size="sm" />}
                  <View className="ml-2">
                    <Text className="text-sm font-semibold text-gray-800">
                      {author?.display_name ?? "Unknown"}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {formatDateTime(update.created_at)}
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-700">{update.body}</Text>
              </Card>
            );
          })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowUpdateModal(true)}
        className="absolute bottom-8 right-6 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </TouchableOpacity>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">
              Add Update
            </Text>
            <TouchableOpacity onPress={handleAddUpdate}>
              <Text className="text-blue-600 text-base font-semibold">Post</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl p-4 text-base text-gray-900 min-h-[120px]"
            placeholder="What's the latest?"
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
