import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateHousehold } from "@/hooks/useHousehold";
import { useAuthStore } from "@/stores/authStore";
import { useHouseholdStore } from "@/stores/householdStore";

const schema = z.object({
  householdName: z.string().min(1, "Enter a household name"),
  displayName: z.string().min(1, "Enter your name"),
  zipCode: z.string().min(5, "Enter a valid zip code"),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setHousehold, setCurrentMember, setMembers } = useHouseholdStore();
  const createHousehold = useCreateHousehold();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      const household = await createHousehold.mutateAsync({
        name: data.householdName,
        zipCode: data.zipCode,
        userId: user.id,
        displayName: data.displayName,
      });
      router.replace("/(app)/(tasks)");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-3xl font-bold text-gray-900">
            Set up your household
          </Text>
          <Text className="text-gray-500 mt-2">
            Let's get your home organized. You can invite family members later.
          </Text>
        </View>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Your Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              error={errors.displayName?.message}
              placeholder="e.g. Sarah"
            />
          )}
        />

        <Controller
          control={control}
          name="householdName"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Household Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              error={errors.householdName?.message}
              placeholder="e.g. The Johnson Home"
            />
          )}
        />

        <Controller
          control={control}
          name="zipCode"
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="ZIP Code"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="number-pad"
              error={errors.zipCode?.message}
              placeholder="e.g. 90210"
              hint="Used to find local vendors"
            />
          )}
        />

        <Button
          title="Create Household"
          onPress={handleSubmit(onSubmit)}
          loading={createHousehold.isPending}
          className="mt-4"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
