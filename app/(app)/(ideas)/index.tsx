import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useIdeaTopics, useCreateIdeaTopic } from "@/hooks/useIdeas";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { IdeaTopic } from "@/types/app.types";

const TOPIC_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#ef4444", "#06b6d4", "#84cc16",
];

function TopicCard({ topic }: { topic: IdeaTopic }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/(ideas)/${topic.id}`)}
      className="flex-1 m-1.5 rounded-2xl p-4 aspect-square items-start justify-end min-h-[120px]"
      style={{ backgroundColor: topic.color_hex }}
    >
      <Text className="text-white font-bold text-base" numberOfLines={2}>
        {topic.title}
      </Text>
    </TouchableOpacity>
  );
}

export default function IdeasScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { data: topics, isLoading, refetch } = useIdeaTopics(household?.id);
  const createTopic = useCreateIdeaTopic();

  const [showModal, setShowModal] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TOPIC_COLORS[0]);

  const handleCreate = async () => {
    if (!topicName.trim() || !household) return;
    try {
      await createTopic.mutateAsync({
        household_id: household.id,
        title: topicName.trim(),
        color_hex: selectedColor,
        sort_order: (topics?.length ?? 0) + 1,
      });
      setTopicName("");
      setShowModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const pairs = [];
  if (topics) {
    for (let i = 0; i < topics.length; i += 2) {
      pairs.push(topics.slice(i, i + 2));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Idea Box</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        contentContainerClassName="px-2.5 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item: pair }) => (
          <View className="flex-row">
            {pair.map((t) => (
              <TopicCard key={t.id} topic={t} />
            ))}
            {pair.length === 1 && <View className="flex-1 m-1.5" />}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No topics yet"
              subtitle="Create topic boards for your home ideas."
              actionLabel="Create Topic"
              onAction={() => setShowModal(true)}
              icon="💡"
            />
          ) : null
        }
      />

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">
              New Topic
            </Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text className="text-blue-600 text-base font-semibold">
                Create
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-900 mb-6"
            placeholder="Topic name (e.g. Kitchen Remodel)"
            value={topicName}
            onChangeText={setTopicName}
            autoFocus
            placeholderTextColor="#9ca3af"
          />

          <Text className="text-sm font-medium text-gray-700 mb-3">Color</Text>
          <View className="flex-row flex-wrap gap-3">
            {TOPIC_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                className={`w-10 h-10 rounded-full border-4 ${
                  selectedColor === c ? "border-gray-700" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
