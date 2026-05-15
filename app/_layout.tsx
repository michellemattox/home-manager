import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient, asyncStoragePersister } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useHouseholdStore } from "@/stores/householdStore";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { UndoToast } from "@/components/ui/UndoToast";
import { LoadingScreen } from "@/components/LoadingScreen";
import { View, Platform, AppState } from "react-native";
import type { HouseholdMember } from "@/types/app.types";
import { useFonts, Lobster_400Regular } from "@expo-google-fonts/lobster";

/** Rejects if the given promise doesn't resolve within `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

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
            // Run member lookup with an 8s timeout — without this, a slow RLS
            // check or cold Supabase connection could hang the spinner forever.
            const [memberRes] = await withTimeout(
              Promise.all([
                supabase
                  .from("household_members")
                  .select("*")
                  .eq("user_id", newSession.user.id)
                  .is("invite_token", null)
                  .maybeSingle(),
              ]),
              8000
            );

            const member = memberRes.data as HouseholdMember | null;
            if (member) {
              const { setHousehold, setMembers, setCurrentMember } =
                useHouseholdStore.getState();
              setCurrentMember(member);

              const [householdRes, membersRes] = await withTimeout(
                Promise.all([
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
                ]),
                8000
              );
              if (householdRes.data) setHousehold(householdRes.data as any);
              setMembers((membersRes.data ?? []) as any);
            }
          } catch (err) {
            // Transient network/RLS failure or timeout — routing proceeds to the
            // appropriate screen; the user can pull-to-refresh once connected.
            console.warn("[AuthGate] Household lookup failed:", err);
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

    // Fast path: if a household is already hydrated from persisted storage,
    // route to the app immediately. The household lookup will validate in
    // the background and clear/replace state if anything has changed.
    if (household) {
      const inApp = segments[0] === "(app)";
      if (!inApp) router.replace("/(app)/(home)");
      return;
    }

    // No persisted household yet — wait for the live lookup to complete.
    if (!householdChecked) return;

    // Logged in, no household → onboarding (but allow /join through)
    const inOnboarding =
      segments[0] === "(auth)" && (segments as string[])[1] === "onboarding";
    const inJoin = segments[0] === "join";
    if (!inOnboarding && !inJoin) router.replace("/(auth)/onboarding");
  }, [authReady, session, segments, householdChecked, household]);

  // Cover the entire pre-routed window with a branded loading screen so the
  // login page never flashes during cold start. Three states route here:
  //   1. Auth not yet ready (INITIAL_SESSION still in flight)
  //   2. Signed in, no persisted household, lookup hasn't finished yet
  //   3. Signed in + household known, router.replace hasn't landed in (app) yet
  const inJoin = segments[0] === "join";
  const inApp = segments[0] === "(app)";
  const showLoading =
    !authReady ||
    (!!session && !household && !householdChecked && !inJoin) ||
    (!!session && !!household && !inApp && !inJoin);

  if (showLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lobster_400Regular });

  // Branded loading screen while fonts load — same screen used by AuthGate so
  // the visual stays consistent across the entire pre-routed window.
  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          // Keep persisted cache for 24h — matches gcTime so cold starts always
          // have data to show while background refetches run.
          maxAge: 24 * 60 * 60 * 1000,
        }}
      >
        <WebContainer>
          <AuthGate>
            <View className="flex-1">
              <StatusBar style="auto" />
              <OfflineBanner />
              <Stack screenOptions={{ headerShown: false }} />
              <UndoToast />
            </View>
          </AuthGate>
        </WebContainer>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
