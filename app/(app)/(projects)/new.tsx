import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { useAuthStore } from "@/stores/authStore";
import { useCreateProject } from "@/hooks/useProjects";
import { usePreferredVendors } from "@/hooks/usePreferredVendors";
import { displayToCents } from "@/utils/currencyUtils";
import { PROJECT_CATEGORIES } from "@/types/app.types";
import type { ProjectStatus, ProjectPriority } from "@/types/app.types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "on_hold"]),
  priority: z.enum(["low", "medium", "high"]),
  ownerIds: z.array(z.string()),
  category: z.string().optional(),
  dueDate: z.string().optional(),        // ISO YYYY-MM-DD or ""
  estimatedCost: z.string().optional(),  // display dollars
  totalCost: z.string().optional(),      // display dollars
  notes: z.string().optional(),
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
  const { data: vendors = [] } = usePreferredVendors(household?.id);

  const currentMember = members.find((m) => m.user_id === user?.id);

  const [usesVendor, setUsesVendor] = useState<boolean | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [otherVendorName, setOtherVendorName] = useState("");

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
      dueDate: "",
      estimatedCost: "",
      totalCost: "",
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!household || !currentMember) return;

    const estimatedCents =
      data.estimatedCost?.trim() ? displayToCents(data.estimatedCost) : 0;
    const totalCents =
      data.totalCost?.trim() ? displayToCents(data.totalCost) : 0;

    try {
      await createProject.mutateAsync({
        project: {
          household_id: household.id,
          title: data.title,
          description: data.description ?? null,
          status: data.status,
          priority: data.priority,
          expected_date: data.dueDate || null,
          category: data.category ?? null,
          estimated_cost_cents: estimatedCents,
          total_cost_cents: totalCents,
          contractor_name: null,
          notes: data.notes?.trim() || null,
          created_by: currentMember.id,
          uses_vendor: usesVendor === true,
          primary_vendor_id: selectedVendorId === "__other__" ? null : selectedVendorId,
          contractor_name: selectedVendorId === "__other__" ? otherVendorName.trim() || null : null,
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

      <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
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
                    value === cat ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${value === cat ? "text-white" : "text-gray-600"}`}>
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
                    value === s.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${value === s.value ? "text-white" : "text-gray-700"}`}>
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
                    value === p.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${value === p.value ? "text-white" : "text-gray-700"}`}>
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
          render={({ field: { onChange, value } }) => (
            <DateInput
              label="Due Date (optional)"
              value={value ?? ""}
              onChange={onChange}
              hint="When do you want this done by?"
            />
          )}
        />

        {/* Budget */}
        <Controller
          control={control}
          name="estimatedCost"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Budget / Estimated Cost (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          )}
        />

        {/* Total / Actual Cost */}
        <Controller
          control={control}
          name="totalCost"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Total Cost — Actual (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="0.00"
              keyboardType="decimal-pad"
              hint="Enter when known; compared against budget"
            />
          )}
        />

        {/* Vendor prompt */}
        <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">
          Will a Vendor Be Used?
        </Text>
        <View className="flex-row gap-3 mb-4">
          {(["Yes", "No"] as const).map((opt) => {
            const val = opt === "Yes";
            const active = usesVendor === val;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setUsesVendor(val);
                  if (!val) setSelectedVendorId(null);
                }}
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {usesVendor && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Select Vendor (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {vendors.map((v) => {
                const active = selectedVendorId === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => { setSelectedVendorId(active ? null : v.id); setOtherVendorName(""); }}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-700"}`}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setSelectedVendorId(selectedVendorId === "__other__" ? null : "__other__")}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedVendorId === "__other__" ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-sm font-medium ${selectedVendorId === "__other__" ? "text-white" : "text-gray-700"}`}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
            {selectedVendorId === "__other__" && (
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                value={otherVendorName}
                onChangeText={setOtherVendorName}
                placeholder="Enter vendor name..."
                placeholderTextColor="#9ca3af"
                autoFocus
              />
            )}
            {vendors.length === 0 && selectedVendorId !== "__other__" && (
              <Text className="text-sm text-gray-400 mb-4">
                No saved vendors yet — select Other to enter a name, or add vendors in Projects → Vendors.
              </Text>
            )}
            {selectedVendorId === null && vendors.length > 0 && (
              <View className="mb-2" />
            )}
          </>
        )}

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Notes (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={4}
              placeholder="Paint color codes, model numbers, permit info..."
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
                      onChange(selected ? value.filter((id) => id !== m.id) : [...value, m.id])
                    }
                    className={`px-3 py-1.5 rounded-full border ${
                      selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}>
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
