import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Button } from "@/components/ui/Button";
import { showAlert, showConfirm } from "@/lib/alert";
import { useHouseholdStore } from "@/stores/householdStore";
import { useCreateRecurringTask } from "@/hooks/useRecurringTasks";
import { TASK_CATEGORIES, type FrequencyType } from "@/types/app.types";
import { toISODateString } from "@/utils/dateUtils";
import { frequencyToDays } from "@/utils/scheduleUtils";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  anchorDate: z.string().optional(),
  frequencyType: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  customDays: z.string().optional(),
  assignedMemberId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const FREQUENCIES: { label: string; value: FrequencyType }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

export default function NewTaskScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const createTask = useCreateRecurringTask();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { frequencyType: "monthly", anchorDate: toISODateString(new Date()) },
  });

  const frequencyType = watch("frequencyType");

  const onSubmit = async (data: FormData) => {
    if (!household) return;
    const today = toISODateString(new Date());
    const anchorDate = data.anchorDate || today;
    const freqDays =
      data.frequencyType === "custom"
        ? parseInt(data.customDays ?? "30", 10)
        : frequencyToDays(data.frequencyType);

    try {
      await createTask.mutateAsync({
        household_id: household.id,
        title: data.title,
        description: null,
        category: data.category ?? null,
        frequency_type: data.frequencyType,
        frequency_days: freqDays,
        anchor_date: anchorDate,
        next_due_date: anchorDate,
        assigned_member_id: data.assignedMemberId ?? null,
        is_active: true,
      });
      router.back();
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
          New Recurring Task
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
              label="Task Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
              placeholder="e.g. Change HVAC filter"
            />
          )}
        />

        <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {TASK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => onChange(value === cat ? undefined : cat)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${
                    value === cat
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === cat ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        />

        <Controller
          control={control}
          name="anchorDate"
          render={({ field: { onChange, value } }) => (
            <DateInput
              label="Start / Due Date"
              value={value ?? ""}
              onChange={onChange}
              hint="First occurrence — frequency repeats from this date"
            />
          )}
        />

        <Text className="text-sm font-medium text-gray-700 mb-2">Frequency</Text>
        <Controller
          control={control}
          name="frequencyType"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => onChange(f.value)}
                  className={`px-4 py-2 rounded-xl border ${
                    value === f.value
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      value === f.value ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        {frequencyType === "custom" && (
          <Controller
            control={control}
            name="customDays"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Every how many days?"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="number-pad"
                placeholder="e.g. 45"
              />
            )}
          />
        )}

        <Text className="text-sm font-medium text-gray-700 mb-2">
          Assign To (optional)
        </Text>
        <Controller
          control={control}
          name="assignedMemberId"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2 mb-6">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => onChange(value === m.id ? undefined : m.id)}
                  className={`px-3 py-1.5 rounded-full border ${
                    value === m.id
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === m.id ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {m.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        <Button
          title="Create Task"
          onPress={handleSubmit(onSubmit)}
          loading={createTask.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
