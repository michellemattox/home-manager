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
import { useAuthStore } from "@/stores/authStore";
import { useCreateTrip } from "@/hooks/useTrips";
import { usePreferredVendors } from "@/hooks/usePreferredVendors";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  destination: z.string().min(1, "Destination is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().min(1, "Return date is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewActivityScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const createTrip = useCreateTrip();
  const currentMember = members.find((m) => m.user_id === user?.id);

  const { data: vendors = [] } = usePreferredVendors(household?.id);

  const [usesVendor, setUsesVendor] = useState<boolean | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      departureDate: new Date().toISOString().slice(0, 10),
      returnDate: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!household || !currentMember) return;
    try {
      const trip = await createTrip.mutateAsync({
        household_id: household.id,
        title: data.title,
        destination: data.destination,
        departure_date: data.departureDate,
        return_date: data.returnDate,
        notes: data.notes ?? null,
        created_by: currentMember.id,
        uses_vendor: usesVendor === true,
        primary_vendor_id: selectedVendorId,
      });
      router.replace(`/(app)/(activity)/${trip.id}`);
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
          New Activity
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
              label="Activity Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
              placeholder="e.g. Summer Vacation"
            />
          )}
        />

        <Controller
          control={control}
          name="destination"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Destination"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.destination?.message}
              placeholder="e.g. Paris, France"
            />
          )}
        />

        <Controller
          control={control}
          name="departureDate"
          render={({ field: { onChange, value } }) => (
            <DateInput
              label="Start Date"
              value={value}
              onChange={onChange}
              error={errors.departureDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="returnDate"
          render={({ field: { onChange, value } }) => (
            <DateInput
              label="End Date"
              value={value}
              onChange={onChange}
              error={errors.returnDate?.message}
            />
          )}
        />

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
              numberOfLines={3}
              placeholder="Hotel info, packing reminders..."
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
            {vendors.length === 0 ? (
              <Text className="text-sm text-gray-400 mb-4">
                No vendors saved yet. Add vendors in Projects → Vendors.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {vendors.map((v) => {
                  const active = selectedVendorId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => setSelectedVendorId(active ? null : v.id)}
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
              </View>
            )}
          </>
        )}

        <Button
          title="Create Activity"
          onPress={handleSubmit(onSubmit)}
          loading={createTrip.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
