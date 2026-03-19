import React, { useState } from "react";
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
import { DateInput } from "@/components/ui/DateInput";
import { Button } from "@/components/ui/Button";
import { showAlert } from "@/lib/alert";
import { useHouseholdStore } from "@/stores/householdStore";
import { useCreateTask } from "@/hooks/useTasks";
import { useCreateRecurringTask } from "@/hooks/useRecurringTasks";
import { useProjects } from "@/hooks/useProjects";
import { useTrips } from "@/hooks/useTrips";
import { TASK_CATEGORIES, type FrequencyType } from "@/types/app.types";
import { toISODateString } from "@/utils/dateUtils";
import { frequencyToDays } from "@/utils/scheduleUtils";

type TaskMode = "one-off" | "recurring";

// ── One-off schema ────────────────────────────────────────────────────────────
const oneOffSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  assignedMemberId: z.string().optional(),
  linkedEventType: z.enum(["project", "activity"]).optional(),
  linkedEventId: z.string().optional(),
});
type OneOffFormData = z.infer<typeof oneOffSchema>;

// ── Recurring schema ──────────────────────────────────────────────────────────
const recurringSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  anchorDate: z.string().optional(),
  frequencyType: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  customDays: z.string().optional(),
  assignedMemberId: z.string().optional(),
});
type RecurringFormData = z.infer<typeof recurringSchema>;

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
  const createOneOff = useCreateTask();
  const createRecurring = useCreateRecurringTask();

  const { data: projects = [] } = useProjects(household?.id);
  const { data: trips = [] } = useTrips(household?.id);

  const [mode, setMode] = useState<TaskMode>("one-off");
  const [linkedEventType, setLinkedEventType] = useState<"project" | "activity" | null>(null);
  const [linkedEventId, setLinkedEventId] = useState<string | null>(null);

  // ── One-off form ────────────────────────────────────────────────────────────
  const {
    control: ooControl,
    handleSubmit: ooHandleSubmit,
    formState: { errors: ooErrors },
  } = useForm<OneOffFormData>({
    resolver: zodResolver(oneOffSchema),
  });

  const onSubmitOneOff = async (data: OneOffFormData) => {
    if (!household) return;
    try {
      await createOneOff.mutateAsync({
        household_id: household.id,
        title: data.title,
        notes: data.notes?.trim() || null,
        due_date: data.dueDate || null,
        due_time: data.dueTime?.trim() || null,
        assigned_member_id: data.assignedMemberId ?? null,
        linked_event_type: linkedEventType,
        linked_event_id: linkedEventId,
      });
      router.back();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  // ── Recurring form ──────────────────────────────────────────────────────────
  const {
    control: recControl,
    handleSubmit: recHandleSubmit,
    watch: recWatch,
    formState: { errors: recErrors },
  } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: { frequencyType: "monthly", anchorDate: toISODateString(new Date()) },
  });

  const frequencyType = recWatch("frequencyType");

  const onSubmitRecurring = async (data: RecurringFormData) => {
    if (!household) return;
    const today = toISODateString(new Date());
    const anchorDate = data.anchorDate || today;
    const freqDays =
      data.frequencyType === "custom"
        ? parseInt(data.customDays ?? "30", 10)
        : frequencyToDays(data.frequencyType);
    try {
      await createRecurring.mutateAsync({
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

  const isPending = createOneOff.isPending || createRecurring.isPending;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900">New Task</Text>
      </View>

      {/* Mode toggle */}
      <View className="flex-row bg-gray-100 rounded-xl mx-4 mt-4 p-1">
        {(["one-off", "recurring"] as TaskMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg items-center ${mode === m ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-sm font-semibold ${mode === m ? "text-gray-900" : "text-gray-500"}`}>
              {m === "one-off" ? "One-Off" : "Recurring"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">

        {/* ── ONE-OFF FORM ────────────────────────────────────────────────── */}
        {mode === "one-off" && (
          <>
            <Controller
              control={ooControl}
              name="title"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Title"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={ooErrors.title?.message}
                  placeholder="e.g. Call the plumber"
                />
              )}
            />

            <Controller
              control={ooControl}
              name="notes"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Notes (optional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={3}
                  placeholder="Add details..."
                />
              )}
            />

            <Controller
              control={ooControl}
              name="dueDate"
              render={({ field: { onChange, value } }) => (
                <DateInput
                  label="Due Date (optional)"
                  value={value ?? ""}
                  onChange={onChange}
                />
              )}
            />

            <Controller
              control={ooControl}
              name="dueTime"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Time of Day (optional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. 9:00 AM"
                  hint="Used for reminder notification"
                />
              )}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To (optional)</Text>
            <Controller
              control={ooControl}
              name="assignedMemberId"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => onChange(value === m.id ? undefined : m.id)}
                      className={`px-3 py-1.5 rounded-full border ${
                        value === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${value === m.id ? "text-white" : "text-gray-700"}`}>
                        {m.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            {/* Link to Event */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Link to Event (optional)</Text>
            <View className="flex-row gap-3 mb-3">
              {(["project", "activity"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setLinkedEventType(linkedEventType === type ? null : type);
                    setLinkedEventId(null);
                  }}
                  className={`flex-1 py-2 rounded-xl border items-center ${
                    linkedEventType === type ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${linkedEventType === type ? "text-white" : "text-gray-700"}`}>
                    {type === "project" ? "Project" : "Activity"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {linkedEventType === "project" && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setLinkedEventId(linkedEventId === p.id ? null : p.id)}
                    className={`px-3 py-1.5 rounded-full border ${
                      linkedEventId === p.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${linkedEventId === p.id ? "text-white" : "text-gray-700"}`}>
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                ))}
                {projects.length === 0 && (
                  <Text className="text-sm text-gray-400">No projects yet.</Text>
                )}
              </View>
            )}

            {linkedEventType === "activity" && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {trips.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setLinkedEventId(linkedEventId === t.id ? null : t.id)}
                    className={`px-3 py-1.5 rounded-full border ${
                      linkedEventId === t.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${linkedEventId === t.id ? "text-white" : "text-gray-700"}`}>
                      {t.title}
                    </Text>
                  </TouchableOpacity>
                ))}
                {trips.length === 0 && (
                  <Text className="text-sm text-gray-400">No activities yet.</Text>
                )}
              </View>
            )}

            <Button
              title="Create Task"
              onPress={ooHandleSubmit(onSubmitOneOff)}
              loading={createOneOff.isPending}
            />
          </>
        )}

        {/* ── RECURRING FORM ──────────────────────────────────────────────── */}
        {mode === "recurring" && (
          <>
            <Controller
              control={recControl}
              name="title"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Task Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={recErrors.title?.message}
                  placeholder="e.g. Change HVAC filter"
                />
              )}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
            <Controller
              control={recControl}
              name="category"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  {TASK_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => onChange(value === cat ? undefined : cat)}
                      className={`mr-2 px-3 py-1.5 rounded-full border ${
                        value === cat ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${value === cat ? "text-white" : "text-gray-700"}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            />

            <Controller
              control={recControl}
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
              control={recControl}
              name="frequencyType"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f.value}
                      onPress={() => onChange(f.value)}
                      className={`px-4 py-2 rounded-xl border ${
                        value === f.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`font-medium ${value === f.value ? "text-white" : "text-gray-700"}`}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            {frequencyType === "custom" && (
              <Controller
                control={recControl}
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

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To (optional)</Text>
            <Controller
              control={recControl}
              name="assignedMemberId"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => onChange(value === m.id ? undefined : m.id)}
                      className={`px-3 py-1.5 rounded-full border ${
                        value === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${value === m.id ? "text-white" : "text-gray-700"}`}>
                        {m.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            <Button
              title="Create Recurring Task"
              onPress={recHandleSubmit(onSubmitRecurring)}
              loading={createRecurring.isPending}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
