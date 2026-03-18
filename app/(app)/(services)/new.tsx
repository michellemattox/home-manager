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
import { useCreateServiceRecord } from "@/hooks/useServices";
import { usePreferredVendors } from "@/hooks/usePreferredVendors";
import { SERVICE_TYPES } from "@/types/app.types";
import { displayToCents } from "@/utils/currencyUtils";

const schema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  serviceType: z.string().min(1, "Service type is required"),
  serviceDate: z.string().min(1, "Date is required"),
  cost: z.string().min(1, "Cost is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewServiceScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const createRecord = useCreateServiceRecord();
  const { data: preferredVendors } = usePreferredVendors(household?.id);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceDate: new Date().toISOString().slice(0, 10), serviceType: "Other" },
  });

  const vendorName = watch("vendorName");

  const onSubmit = async (data: FormData) => {
    if (!household) return;
    try {
      await createRecord.mutateAsync({
        household_id: household.id,
        vendor_name: data.vendorName,
        service_type: data.serviceType,
        service_date: data.serviceDate,
        cost_cents: displayToCents(data.cost),
        notes: data.notes ?? null,
        receipt_url: null,
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
          Add Service Record
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="vendorName"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Vendor / Company Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.vendorName?.message}
              placeholder="e.g. ABC Plumbing"
            />
          )}
        />

        {(preferredVendors ?? []).length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-4 -mt-2">
            {(preferredVendors ?? []).map((pv) => (
              <TouchableOpacity
                key={pv.id}
                onPress={() => {
                  setValue("vendorName", vendorName === pv.name ? "" : pv.name);
                  if (pv.service_type) {
                    setValue("serviceType", pv.service_type);
                  }
                }}
                className={`px-3 py-1 rounded-full border ${
                  vendorName === pv.name ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-xs font-medium ${vendorName === pv.name ? "text-white" : "text-gray-600"}`}>
                  {pv.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text className="text-sm font-medium text-gray-700 mb-2">
          Service Type
        </Text>
        <Controller
          control={control}
          name="serviceType"
          render={({ field: { onChange, value } }) => (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-1"
              >
                {SERVICE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => onChange(type)}
                    className={`mr-2 px-3 py-1.5 rounded-full border ${
                      value === type
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        value === type ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors.serviceType && (
                <Text className="text-red-500 text-xs mb-3">{errors.serviceType.message}</Text>
              )}
              {!errors.serviceType && <View className="mb-3" />}
            </>
          )}
        />

        <Controller
          control={control}
          name="serviceDate"
          render={({ field: { onChange, value } }) => (
            <DateInput
              label="Service Date"
              value={value}
              onChange={onChange}
              error={errors.serviceDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="cost"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Total Cost"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              error={errors.cost?.message}
              placeholder="125.00"
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
              placeholder="What was repaired, warranty info..."
            />
          )}
        />

        <Button
          title="Save Record"
          onPress={handleSubmit(onSubmit)}
          loading={createRecord.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
