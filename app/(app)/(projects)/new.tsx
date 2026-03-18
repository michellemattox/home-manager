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
import { showAlert } from "@/lib/alert";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useCreateProject } from "@/hooks/useProjects";
import { displayToCents } from "@/utils/currencyUtils";
import { PROJECT_CATEGORIES } from "@/types/app.types";
import type { ProjectStatus, ProjectPriority } from "@/types/app.types";

// Accepts MM/DD/YYYY or YYYY-MM-DD, returns YYYY-MM-DD or null
function parseDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // MM/DD/YYYY
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "on_hold"]),
  priority: z.enum(["low", "medium", "high"]),
  ownerIds: z.array(z.string()),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedCost: z.string().optional(),
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
      category: undefined,
      dueDate: "",
      estimatedCost: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!household || !currentMember) return;

    const isoDate = data.dueDate ? parseDateInput(data.dueDate) : null;
    if (data.dueDate && !isoDate) {
      showAlert("Invalid date", "Use MM/DD/YYYY format, e.g. 06/15/2025");
      return;
    }

    const estimatedCents =
      data.estimatedCost && data.estimatedCost.trim()
        ? displayToCents(data.estimatedCost)
        : 0;

    try {
      await createProject.mutateAsync({
        project: {
          household_id: household.id,
          title: data.title,
          description: data.description ?? null,
          status: data.status,
          priority: data.priority,
          expected_date: isoDate,
          category: data.category ?? null,
          estimated_cost_cents: estimatedCents,
          created_by: currentMember.id,
        },
        ownerIds: data.ownerIds,
      });
      router.replace("/(app)/(projects)");
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

        {/* Category */}
        <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PROJECT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => onChange(value === cat ? undefined : cat)}
                  className={`px-3 py-1.5 rounded-full border ${
                    value === cat
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === cat ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        {/* Status */}
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

        {/* Priority */}
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

        {/* Due Date */}
        <Controller
          control={control}
          name="dueDate"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Due Date (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="MM/DD/YYYY"
              keyboardType="numbers-and-punctuation"
              hint="When do you want this done by?"
            />
          )}
        />

        {/* Estimated Cost */}
        <Controller
          control={control}
          name="estimatedCost"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Estimated Cost (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="0.00"
              keyboardType="decimal-pad"
              hint="Your budget for this project"
            />
          )}
        />

        {/* Owners */}
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
