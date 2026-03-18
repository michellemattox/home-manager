import React, { useEffect, useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAcceptInvite } from "@/hooks/useHousehold";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  displayName: z.string().min(1, "Enter your name"),
});

type FormData = z.infer<typeof schema>;

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const acceptInvite = useAcceptInvite();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onAccept = async (data: FormData) => {
    if (!user || !token) return;
    try {
      await acceptInvite.mutateAsync({
        token,
        userId: user.id,
        displayName: data.displayName,
      });
      router.replace("/(app)/(tasks)");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600 mb-4">
          Please sign in to accept the invite
        </Text>
        <Button title="Sign In" onPress={() => router.replace("/(auth)/login")} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-6 justify-center">
      <Text className="text-3xl font-bold text-gray-900 mb-2">
        You're invited!
      </Text>
      <Text className="text-gray-500 mb-8">
        Enter your name to join the household.
      </Text>

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
            placeholder="e.g. Mike"
          />
        )}
      />

      <Button
        title="Join Household"
        onPress={handleSubmit(onAccept)}
        loading={acceptInvite.isPending}
      />
    </View>
  );
}
