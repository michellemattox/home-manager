import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/alert";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useCreateProject } from "@/hooks/useProjects";
import type { ProjectStatus, ProjectPriority } from "@/types/app.types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "on_hold"]),
  priority: z.enum(["low", "medium", "high"]),
  ownerIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

const STATUSES: { label: string; value: ProjectStatus }[] = [
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "On Hold", value: "on_hold" },
];

const PRIORITIES: { label: string; value: ProjectPriority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function NewProjectScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const createProject = useCreateProject();

  const currentMember = members.find((m) => m.user_id === user?.id);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "planned",
      priority: "medium",
      ownerIds: currentMember ? [currentMember.id] : [],
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!household || !currentMember) return;
    try {
      const newProject = await createProject.mutateAsync({
        project: {
          household_id: household.id,
          title: data.title,
          description: data.description ?? null,
          status: data.status,
          priority: data.priority,
          expected_date: null,
          created_by: currentMember.id,
        },
        ownerIds: data.ownerIds,
      });
      // Navigate to detail so owner is prompted to add the first update
      router.replace(`/(app)/(projects)/${newProject.id}`);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900">
          New Project
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Project Title"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
              placeholder="e.g. Repaint living room"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Description (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              placeholder="Add more details..."
            />
          )}
        />

        <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2 mb-4">
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => onChange(s.value)}
                  className={`px-3 py-1.5 rounded-xl border flex-1 items-center ${
                    value === s.value
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === s.value ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Text className="text-sm font-medium text-gray-700 mb-2">Priority</Text>
        <Controller
          control={control}
          name="priority"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2 mb-4">
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => onChange(p.value)}
                  className={`px-3 py-1.5 rounded-xl border flex-1 items-center ${
                    value === p.value
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === p.value ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Text className="text-sm font-medium text-gray-700 mb-2">Owners</Text>
        <Controller
          control={control}
          name="ownerIds"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2 mb-6">
              {members.map((m) => {
                const selected = value.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() =>
                      onChange(
                        selected
                          ? value.filter((id) => id !== m.id)
                          : [...value, m.id]
                      )
                    }
                    className={`px-3 py-1.5 rounded-full border ${
                      selected
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {m.display_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />

        <Button
          title="Create Project"
          onPress={handleSubmit(onSubmit)}
          loading={createProject.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
