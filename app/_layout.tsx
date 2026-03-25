import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useHouseholdStore } from "@/stores/householdStore";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { View, ActivityIndicator, Platform } from "react-native";
import type { HouseholdMember } from "@/types/app.types";
import { useFonts, Lobster_400Regular } from "@expo-google-fonts/lobster";

// On desktop web, center the app in a mobile-width column so it doesn't
// stretch across a wide viewport. On native, renders children as-is.
function WebContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: "#d1d5db" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 480, backgroundColor: "#FFFFED" }}>
        {children}
      </View>
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, authReady, setSession, setAuthReady } = useAuthStore();
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
        // If this is the initial session load, check whether the user chose
        // not to be remembered. If so, sign them out immediately.
        if (event === "INITIAL_SESSION") {
          if (newSession) {
            const remember = await AsyncStorage.getItem("@mattox_remember_device");
            if (remember === "false") {
              await AsyncStorage.removeItem("@mattox_remember_device");
              await supabase.auth.signOut();
              setHouseholdChecked(false);
              setAuthReady();
              return;
            }
          } else {
            // No stored session — mark auth as ready so routing can proceed to login.
            setAuthReady();
          }
        }

        setSession(newSession);

        if (event === "SIGNED_OUT") {
          clearHousehold();
          setHouseholdChecked(false);
          router.replace("/(auth)/login");
          return;
        }

        if (newSession?.user) {
          try {
            // Don't block auth navigation on push token registration.
            await Promise.race([
              registerForPushNotificationsAsync(newSession.user.id),
              new Promise<void>((resolve) => setTimeout(resolve, 5000)),
            ]);
          } catch {
            // Push registration is non-critical for core app navigation.
          }

          try {
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
          } catch {
            // If household lookup fails (transient RLS/network), we'll still
            // allow navigation and let the UI guide onboarding.
          } finally {
            // Always mark check complete, whether or not a household was found.
            useHouseholdStore.getState().setHouseholdChecked(true);
            // Auth is fully resolved — allow routing decisions.
            setAuthReady();
          }
        } else {
          // No session - reset check state for next login
          setHouseholdChecked(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Wait until the initial auth state has been resolved before making
    // any routing decisions — prevents a flash to the login screen when
    // the app restarts with a valid stored session.
    if (!authReady) return;

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
  }, [authReady, session, segments, householdChecked, household]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lobster_400Regular });

  // Show a centered spinner instead of a blank white screen while fonts load.
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFED" }}>
        <ActivityIndicator size="large" color="#FC9853" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebContainer>
          <AuthGate>
            <View className="flex-1">
              <StatusBar style="auto" />
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </AuthGate>
        </WebContainer>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
