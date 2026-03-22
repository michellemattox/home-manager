import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { WebForm } from "@/components/ui/WebForm";
import Logo from "../../assets/logo.svg";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onLogin = async (data: FormData) => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(data);
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      await AsyncStorage.setItem(
        "@mattox_remember_device",
        rememberDevice ? "true" : "false"
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-[#FFFFED]"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        className="bg-[#FFFFED]"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          <Logo width={100} height={100} style={{ marginBottom: 12 }} />
          <Text style={{ fontFamily: "Lobster_400Regular", fontSize: 26, color: "#4D86E3", letterSpacing: 0.5, lineHeight: 32, textAlign: "center" }}>
            Mattox Family
          </Text>
          <Text style={{ fontFamily: "Lobster_400Regular", fontSize: 26, color: "#4D86E3", letterSpacing: 0.5, lineHeight: 32, textAlign: "center" }}>
            Home Management
          </Text>
          <Text className="text-gray-500 mt-1">Sign in to your account</Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

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
                autoComplete="password"
                error={errors.password?.message}
                placeholder="••••••••"
              />
            )}
          />

          {/* Remember this device */}
          <TouchableOpacity
            onPress={() => setRememberDevice(!rememberDevice)}
            className="flex-row items-center mt-1 mb-4"
            activeOpacity={0.7}
          >
            <View
              className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                rememberDevice
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-gray-300"
              }`}
            >
              {rememberDevice && (
                <Text className="text-white text-xs font-bold leading-none">
                  ✓
                </Text>
              )}
            </View>
            <Text className="text-sm text-gray-600">Remember this device</Text>
          </TouchableOpacity>

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
