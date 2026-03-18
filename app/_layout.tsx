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
import { View, ActivityIndicator } from "react-native";
import type { HouseholdMember } from "@/types/app.types";

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, setSession } = useAuthStore();
  const { household, householdChecked, clearHousehold, setHouseholdChecked } =
    useHouseholdStore();

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
          await registerForPushNotificationsAsync(newSession.user.id);

          const { data: member } = await supabase
            .from("household_members")
            .select("*")
            .eq("user_id", newSession.user.id)
            .is("invite_token", null)
            .maybeSingle();

          if (member) {
            const m = member as HouseholdMember;
            const { setHousehold, setMembers, setCurrentMember } =
              useHouseholdStore.getState();
            setCurrentMember(m);

            const { data: householdData } = await supabase
              .from("households")
              .select("*")
              .eq("id", m.household_id)
              .maybeSingle();
            if (householdData) setHousehold(householdData as any);

            const { data: members } = await supabase
              .from("household_members")
              .select("*")
              .eq("household_id", m.household_id);
            setMembers((members ?? []) as any);
          }

          // Always mark check complete, whether or not a household was found
          useHouseholdStore.getState().setHouseholdChecked(true);
        } else {
          // No session - reset check state for next login
          setHouseholdChecked(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Not logged in → always go to login
    if (session === null) {
      const inAuth = segments[0] === "(auth)";
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    // Logged in but household check still in flight → wait
    if (!householdChecked) return;

    // Logged in, no household → onboarding
    if (!household) {
      const inOnboarding =
        segments[0] === "(auth)" && (segments as string[])[1] === "onboarding";
      if (!inOnboarding) router.replace("/(auth)/onboarding");
      return;
    }

    // Logged in + has household → main app
    const inApp = segments[0] === "(app)";
    if (!inApp) router.replace("/(app)/(home)");
  }, [session, segments, householdChecked, household]);

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
