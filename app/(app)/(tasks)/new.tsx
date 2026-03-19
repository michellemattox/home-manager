import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
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
import { useAddProjectTask } from "@/hooks/useProjectTasks";
import { useProjects } from "@/hooks/useProjects";
import { type FrequencyType } from "@/types/app.types";
import { toISODateString } from "@/utils/dateUtils";
import { frequencyToDays } from "@/utils/scheduleUtils";
import type { ProjectWithOwners } from "@/types/app.types";

type TaskMode = "low-lift" | "project-adjacent";

// ── Low-Lift (Recurring) schema ───────────────────────────────────────────────
const lowLiftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  anchorDate: z.string().optional(),
  timeOfDay: z.string().optional(),
  frequencyType: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  customDays: z.string().optional(),
  assignedMemberId: z.string().optional(),
});
type LowLiftFormData = z.infer<typeof lowLiftSchema>;

// ── Project Adjacent schema ───────────────────────────────────────────────────
const paSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  assignedMemberId: z.string().optional(),
});
type PAFormData = z.infer<typeof paSchema>;

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
  const createTask = useCreateTask();
  const createRecurring = useCreateRecurringTask();
  const addProjectTask = useAddProjectTask();

  const { data: projects = [] } = useProjects(household?.id);

  const [mode, setMode] = useState<TaskMode>("low-lift");

  // Personal task toggles
  const [llIsPersonal, setLlIsPersonal] = useState(false);
  const [paIsPersonal, setPaIsPersonal] = useState(false);

  // Project Adjacent — project + checklist selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedChecklistName, setSelectedChecklistName] = useState<string>("General");

  const selectedProject = projects.find((p) => p.id === selectedProjectId) as ProjectWithOwners | undefined;

  // ── Low-Lift form ────────────────────────────────────────────────────────────
  const {
    control: llControl,
    handleSubmit: llHandleSubmit,
    watch: llWatch,
    formState: { errors: llErrors },
  } = useForm<LowLiftFormData>({
    resolver: zodResolver(lowLiftSchema),
    defaultValues: {
      frequencyType: "monthly",
      anchorDate: toISODateString(new Date()),
    },
  });

  const frequencyType = llWatch("frequencyType");

  const onSubmitLowLift = async (data: LowLiftFormData) => {
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
        description: data.notes?.trim() || null,
        category: null,
        frequency_type: data.frequencyType,
        frequency_days: freqDays,
        anchor_date: anchorDate,
        next_due_date: anchorDate,
        assigned_member_id: data.assignedMemberId ?? null,
        is_active: true,
        time_of_day: data.timeOfDay?.trim() || null,
        is_personal: llIsPersonal,
      });
      router.back();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  // ── Project Adjacent form ─────────────────────────────────────────────────
  const {
    control: paControl,
    handleSubmit: paHandleSubmit,
    formState: { errors: paErrors },
  } = useForm<PAFormData>({
    resolver: zodResolver(paSchema),
  });

  const onSubmitPA = async (data: PAFormData) => {
    if (!household) return;
    try {
      if (selectedProjectId) {
        // Goes directly into the project checklist
        await addProjectTask.mutateAsync({
          project_id: selectedProjectId,
          title: data.title,
          sort_order: 9999, // will be sorted by due_date in display
          checklist_name: selectedChecklistName,
          assigned_member_id: data.assignedMemberId ?? null,
          due_date: data.dueDate || null,
          notes: data.notes?.trim() || null,
        });
      } else {
        // Standalone task (no project link)
        await createTask.mutateAsync({
          household_id: household.id,
          title: data.title,
          notes: data.notes?.trim() || null,
          due_date: data.dueDate || null,
          due_time: null,
          assigned_member_id: data.assignedMemberId ?? null,
          linked_event_type: null,
          linked_event_id: null,
          is_personal: paIsPersonal,
        });
      }
      router.back();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const isPending = createRecurring.isPending || createTask.isPending || addProjectTask.isPending;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900">New Task</Text>
      </View>

      {/* Mode toggle — Low-Lift left/default */}
      <View className="flex-row bg-gray-100 rounded-xl mx-4 mt-4 p-1">
        {(["low-lift", "project-adjacent"] as TaskMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg items-center ${mode === m ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-sm font-semibold ${mode === m ? "text-gray-900" : "text-gray-500"}`}>
              {m === "low-lift" ? "Low-Lift" : "Project Adjacent"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">

        {/* ── LOW-LIFT FORM ──────────────────────────────────────────────── */}
        {mode === "low-lift" && (
          <>
            <Controller
              control={llControl}
              name="title"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Task Name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={llErrors.title?.message}
                  placeholder="e.g. Change HVAC filter"
                />
              )}
            />

            <Controller
              control={llControl}
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
              control={llControl}
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

            <Controller
              control={llControl}
              name="timeOfDay"
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

            <Text className="text-sm font-medium text-gray-700 mb-2">Frequency</Text>
            <Controller
              control={llControl}
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
                control={llControl}
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

            <View className="flex-row items-center justify-between mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-gray-900">Personal Task</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Only visible to the assigned person</Text>
              </View>
              <Switch
                value={llIsPersonal}
                onValueChange={setLlIsPersonal}
                trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
                thumbColor="#fff"
              />
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To (optional)</Text>
            <Controller
              control={llControl}
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
              title="Create Low-Lift Task"
              onPress={llHandleSubmit(onSubmitLowLift)}
              loading={createRecurring.isPending}
            />
          </>
        )}

        {/* ── PROJECT ADJACENT FORM ─────────────────────────────────────── */}
        {mode === "project-adjacent" && (
          <>
            <Controller
              control={paControl}
              name="title"
              render={({ field: { onChange, value, onBlur } }) => (
                <Input
                  label="Title"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={paErrors.title?.message}
                  placeholder="e.g. Get permits"
                />
              )}
            />

            <Controller
              control={paControl}
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
              control={paControl}
              name="dueDate"
              render={({ field: { onChange, value } }) => (
                <DateInput
                  label="Due Date (optional)"
                  value={value ?? ""}
                  onChange={onChange}
                />
              )}
            />

            <View className="flex-row items-center justify-between mb-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-gray-900">Personal Task</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Only visible to the assigned person</Text>
              </View>
              <Switch
                value={paIsPersonal}
                onValueChange={setPaIsPersonal}
                trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
                thumbColor="#fff"
              />
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign To (optional)</Text>
            <Controller
              control={paControl}
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

            {/* Project picker */}
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Link to Project (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {projects.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    setSelectedProjectId(selectedProjectId === p.id ? null : p.id);
                    setSelectedChecklistName("General");
                  }}
                  className={`px-3 py-1.5 rounded-full border ${
                    selectedProjectId === p.id
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${selectedProjectId === p.id ? "text-white" : "text-gray-700"}`}>
                    {p.title}
                  </Text>
                </TouchableOpacity>
              ))}
              {projects.length === 0 && (
                <Text className="text-sm text-gray-400">No active projects.</Text>
              )}
            </View>

            {/* Checklist section picker — shown once a project is selected */}
            {selectedProjectId && selectedProject && (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Checklist Section
                </Text>
                {(() => {
                  const existingNames = Array.from(
                    new Set(
                      ((selectedProject as any).project_tasks ?? []).map(
                        (t: any) => t.checklist_name ?? "General"
                      )
                    )
                  ) as string[];
                  const sections = existingNames.length > 0 ? existingNames : ["General"];
                  return (
                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {sections.map((name) => (
                        <TouchableOpacity
                          key={name}
                          onPress={() => setSelectedChecklistName(name)}
                          className={`px-3 py-1.5 rounded-full border ${
                            selectedChecklistName === name
                              ? "bg-indigo-600 border-indigo-600"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <Text className={`text-sm font-medium ${selectedChecklistName === name ? "text-white" : "text-gray-700"}`}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}
              </>
            )}

            <Button
              title="Create Task"
              onPress={paHandleSubmit(onSubmitPA)}
              loading={createTask.isPending || addProjectTask.isPending}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
