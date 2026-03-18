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
import { useAuthStore } from "@/stores/authStore";
import { useCreateTrip } from "@/hooks/useTrips";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  destination: z.string().min(1, "Destination is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().min(1, "Return date is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewTripScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const createTrip = useCreateTrip();
  const currentMember = members.find((m) => m.user_id === user?.id);

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
      });
      router.replace(`/(app)/(travel)/${trip.id}`);
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
          Plan a Trip
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
              label="Trip Name"
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
              label="Departure Date"
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
              label="Return Date"
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

        <Button
          title="Create Trip"
          onPress={handleSubmit(onSubmit)}
          loading={createTrip.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
