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
import { View, ActivityIndicator, Platform, AppState } from "react-native";
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
    // Safety net: if INITIAL_SESSION never fires (Supabase auth lock stuck after
    // background kill), unblock routing after 10 seconds so the user isn't frozen
    // on a blank loading screen. With no session set, routing redirects to login.
    const authTimeout = setTimeout(() => {
      if (!useAuthStore.getState().authReady) {
        setAuthReady();
      }
    }, 10000);

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
          // Push registration is non-critical — fire and forget, never block startup.
          registerForPushNotificationsAsync(newSession.user.id).catch(() => {});

          try {
            // Run member + household + members list in parallel to cut load time.
            const [memberRes] = await Promise.all([
              supabase
                .from("household_members")
                .select("*")
                .eq("user_id", newSession.user.id)
                .is("invite_token", null)
                .maybeSingle(),
            ]);

            const member = memberRes.data as HouseholdMember | null;
            if (member) {
              const { setHousehold, setMembers, setCurrentMember } =
                useHouseholdStore.getState();
              setCurrentMember(member);

              const [householdRes, membersRes] = await Promise.all([
                supabase
                  .from("households")
                  .select("*")
                  .eq("id", member.household_id)
                  .maybeSingle(),
                supabase
                  .from("household_members")
                  .select("*")
                  .eq("household_id", member.household_id)
                  .is("invite_token", null),
              ]);
              if (householdRes.data) setHousehold(householdRes.data as any);
              setMembers((membersRes.data ?? []) as any);
            }
          } catch {
            // Transient network/RLS failure — let UI guide recovery.
          } finally {
            useHouseholdStore.getState().setHouseholdChecked(true);
            setAuthReady();
          }
        } else {
          // No session (or session without user) — reset household state and
          // ensure auth is unblocked so routing can redirect appropriately.
          setHouseholdChecked(false);
          setAuthReady();
        }
      }
    );

    return () => {
      clearTimeout(authTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  // Refresh the Supabase session whenever the app comes back to the foreground.
  // This prevents stale/expired tokens causing silent 401s after the app has
  // been backgrounded overnight or for several hours.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            // Session gone (signed out on another device, token fully expired).
            // Use signOut({ scope: "local" }) so the SIGNED_OUT event fires through
            // onAuthStateChange, which properly clears state and redirects to login.
            // Previously calling clearHousehold() directly left householdChecked=false
            // while session was still set, causing the routing effect to wait forever.
            supabase.auth.signOut({ scope: "local" }).catch(() => {});
          }
        });
      }
    });
    return () => sub.remove();
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

  // Prevent blank screen on cold start: render a spinner until auth is ready
  // rather than mounting the Stack with no route to show (there is no app/index.tsx).
  // Without this, the user sees a completely empty screen while INITIAL_SESSION
  // fires + the household lookup completes, which can take several seconds.
  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFED" }}>
        <ActivityIndicator size="large" color="#FC9853" />
      </View>
    );
  }

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
