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
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { WebForm } from "@/components/ui/WebForm";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onLogin = async (data: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(data);
    setLoading(false);
    if (error) Alert.alert("Login failed", error.message);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-4xl font-bold text-gray-900">🏠</Text>
          <Text className="text-3xl font-bold text-gray-900 mt-2">
            Home Manager
          </Text>
          <Text className="text-gray-500 mt-1">Sign in to your account</Text>
        </View>

        <WebForm onSubmit={handleSubmit(onLogin)}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
                placeholder="you@example.com"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoComplete="current-password"
                error={errors.password?.message}
                placeholder="••••••••"
              />
            )}
          />

          <Button
            title="Sign In"
            onPress={handleSubmit(onLogin)}
            loading={loading}
            className="mt-2"
          />
        </WebForm>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Don't have an account? </Text>
          <Text
            className="text-blue-600 font-semibold"
            onPress={() => router.push("/(auth)/signup")}
          >
            Sign up
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
