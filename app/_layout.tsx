import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useHouseholdStore } from "@/stores/householdStore";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { View } from "react-native";
import type { HouseholdMember } from "@/types/app.types";

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, setSession } = useAuthStore();
  const { clearHousehold } = useHouseholdStore();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === "SIGNED_OUT") {
          clearHousehold();
          router.replace("/(auth)/login");
          return;
        }

        if (newSession?.user) {
          // Register push notifications
          await registerForPushNotificationsAsync(newSession.user.id);

          // Load household membership
          const { data: member } = await supabase
            .from("household_members")
            .select("*")
            .eq("user_id", newSession.user.id)
            .is("invite_token", null)
            .single();

          if (member) {
            const m = member as HouseholdMember;
            const { setHousehold, setMembers, setCurrentMember } =
              useHouseholdStore.getState();
            setCurrentMember(m);

            const { data: household } = await supabase
              .from("households")
              .select("*")
              .eq("id", m.household_id)
              .single();
            if (household) setHousehold(household as any);

            const { data: members } = await supabase
              .from("household_members")
              .select("*")
              .eq("household_id", m.household_id);
            setMembers((members ?? []) as any);
          }
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) {
      const inAuth = segments[0] === "(auth)";
      if (!inAuth) router.replace("/(auth)/login");
    } else {
      const inApp = segments[0] === "(app)";
      if (!inApp) router.replace("/(app)/(tasks)");
    }
  }, [session, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <View className="flex-1">
          <StatusBar style="auto" />
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </AuthGate>
    </QueryClientProvider>
  );
}
