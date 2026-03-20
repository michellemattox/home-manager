import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
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
  const { household, householdChecked, clearHousehold, setHouseholdChecked } =
    useHouseholdStore();

  // Handle deep links (e.g. home-manager://join?token=xxx#access_token=...)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Extract auth session from hash fragment (Supabase puts it there after invite verification)
      const hash = url.split("#")[1] ?? "";
      if (hash.includes("access_token=")) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
      // Navigate to join screen if path is /join
      const parsed = Linking.parse(url);
      const joinToken = parsed.queryParams?.token as string | undefined;
      if ((parsed.path === "join" || url.includes("//join")) && joinToken) {
        router.push(`/join?token=${joinToken}`);
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

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
              .eq("household_id", m.household_id)
              .is("invite_token", null);
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
    // Not logged in → always go to login (but allow /join through)
    if (session === null) {
      const inAuth = segments[0] === "(auth)";
      const inJoin = segments[0] === "join";
      if (!inAuth && !inJoin) router.replace("/(auth)/login");
      return;
    }

    // Logged in but household check still in flight → wait
    if (!householdChecked) return;

    // Logged in, no household → onboarding (but allow /join through)
    if (!household) {
      const inOnboarding =
        segments[0] === "(auth)" && (segments as string[])[1] === "onboarding";
      const inJoin = segments[0] === "join";
      if (!inOnboarding && !inJoin) router.replace("/(auth)/onboarding");
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
