import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
} from "react-native";
import { showAlert, showConfirm } from "@/lib/alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { impactLight } from "@/lib/haptics";
import { useIdeas, useCreateIdea, useToggleIdeaPin, useDeleteIdea, useEditIdea } from "@/hooks/useIdeas";
import { useIdeaTopics } from "@/hooks/useIdeas";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { formatDateTime } from "@/utils/dateUtils";
import type { Idea } from "@/types/app.types";

function IdeaCard({
  idea,
  onPin,
  onDelete,
  onEdit,
}: {
  idea: Idea;
  onPin: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { members } = useHouseholdStore();
  const author = members.find((m) => m.id === idea.author_id);

  return (
    <Card className="mb-3">
      <View className="flex-row items-start">
        <View className="flex-1 mr-2">
          <Text className="text-gray-800 text-base leading-relaxed">
            {idea.body}
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            {author && <MemberAvatar member={author} size="sm" />}
            <Text className="text-xs text-gray-400">
              {formatDateTime(idea.created_at)}
            </Text>
          </View>
        </View>
        <View className="gap-2">
          <TouchableOpacity onPress={onPin}>
            <Text className={idea.is_pinned ? "text-yellow-400" : "text-gray-200"}>
              📌
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit}>
            <Text className="text-gray-300">✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Text className="text-gray-200">🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

export default function TopicIdeasScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const { data: ideas, isLoading, refetch } = useIdeas(topicId);
  const { data: topics } = useIdeaTopics(
    useHouseholdStore.getState().household?.id
  );
  const { members } = useHouseholdStore();
  const { user } = useAuthStore();
  const createIdea = useCreateIdea();
  const togglePin = useToggleIdeaPin();
  const deleteIdea = useDeleteIdea();
  const editIdea = useEditIdea();

  const [newIdeaText, setNewIdeaText] = useState("");
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editBody, setEditBody] = useState("");

  const topic = topics?.find((t) => t.id === topicId);
  const currentMember = members.find((m) => m.user_id === user?.id);

  const handleAdd = async () => {
    if (!newIdeaText.trim() || !topicId || !currentMember) return;
    await impactLight();
    try {
      await createIdea.mutateAsync({
        topic_id: topicId,
        body: newIdeaText.trim(),
        author_id: currentMember.id,
        is_pinned: false,
      });
      setNewIdeaText("");
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = (idea: Idea) => {
    showConfirm(
      "Delete idea?",
      undefined,
      () => deleteIdea.mutate({ id: idea.id, topicId: idea.topic_id }),
      true
    );
  };

  const openEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setEditBody(idea.body);
  };

  const handleSaveEdit = async () => {
    if (!editingIdea || !editBody.trim()) return;
    try {
      await editIdea.mutateAsync({
        id: editingIdea.id,
        body: editBody.trim(),
        topicId: editingIdea.topic_id,
      });
      setEditingIdea(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View
        className="flex-row items-center px-4 py-3 border-b border-gray-100"
        style={{ backgroundColor: topic?.color_hex ?? "#3b82f6" }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-white text-base opacity-80">←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-white" numberOfLines={1}>
          {topic?.title ?? "Ideas"}
        </Text>
      </View>

      {/* Add idea input */}
      <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center">
        <TextInput
          className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-base text-gray-900 mr-2"
          placeholder="Add an idea..."
          value={newIdeaText}
          onChangeText={setNewIdeaText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          onPress={handleAdd}
          className="bg-blue-600 rounded-xl px-3 py-2"
        >
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ideas ?? []}
        keyExtractor={(i) => i.id}
        contentContainerClassName="px-4 py-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <IdeaCard
            idea={item}
            onPin={() =>
              togglePin.mutate({
                id: item.id,
                topicId: item.topic_id,
                isPinned: !item.is_pinned,
              })
            }
            onDelete={() => handleDelete(item)}
            onEdit={() => openEdit(item)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">💡</Text>
              <Text className="text-gray-400 text-center">
                No ideas yet. Add your first one above!
              </Text>
            </View>
          ) : null
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={!!editingIdea}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingIdea(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingIdea(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Idea</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text className="text-blue-600 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 py-4">
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 min-h-32"
              value={editBody}
              onChangeText={setEditBody}
              multiline
              placeholder="Your idea..."
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
            <View className="mt-4">
              <Button
                title="Save Changes"
                onPress={handleSaveEdit}
                loading={editIdea.isPending}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
