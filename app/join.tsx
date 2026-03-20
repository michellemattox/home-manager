import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showAlert } from "@/lib/alert";

export default function JoinScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { session } = useAuthStore();

  // Manual token entry when no deep link token was provided
  const [manualToken, setManualToken] = useState("");
  const [activeToken, setActiveToken] = useState<string | undefined>(tokenParam);

  const [checking, setChecking] = useState(!!tokenParam);
  const [invite, setInvite] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);

  // When tokenParam arrives (deep link), update activeToken
  useEffect(() => {
    if (tokenParam) setActiveToken(tokenParam);
  }, [tokenParam]);

  // Look up invite whenever activeToken changes
  useEffect(() => {
    if (!activeToken) { setChecking(false); return; }
    setChecking(true);
    supabase
      .from("household_invites")
      .select("*, households(name)")
      .eq("token", activeToken)
      .is("accepted_at", null)
      .maybeSingle()
      .then(({ data }) => {
        setInvite(data);
        if (data?.name) setDisplayName(data.name);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [activeToken]);

  const handleLookupToken = () => {
    const t = manualToken.trim();
    if (!t) return;
    setActiveToken(t);
  };

  const handleJoin = async () => {
    if (!activeToken || !invite || !session) return;
    setJoining(true);
    try {
      const { error: memberError } = await supabase
        .from("household_members")
        .insert({
          household_id: invite.household_id,
          user_id: session.user.id,
          display_name: displayName.trim(),
          role: invite.role ?? "editor",
        });
      if (memberError) throw memberError;

      await supabase
        .from("household_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", activeToken);

      router.replace("/(app)/(home)");
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setJoining(false);
    }
  };

  // ── No token yet — show manual entry form ───────────────────────────────────
  if (!activeToken) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <ScrollView contentContainerClassName="px-6 pt-12 pb-8" keyboardShouldPersistTaps="handled">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Join a Household</Text>
          <Text className="text-base text-gray-500 mb-8">
            Enter the invite code from your invitation email.
          </Text>
          <Input
            label="Invite Code"
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Paste your invite code here"
            autoFocus
            autoCapitalize="none"
          />
          <Button
            title="Look Up Invite"
            onPress={handleLookupToken}
            disabled={!manualToken.trim()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ── Invalid / expired invite ─────────────────────────────────────────────────
  if (!invite) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">Invalid invite</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          This invite link is invalid or has already been used.
        </Text>
        <Button
          title="Try a Different Code"
          variant="secondary"
          onPress={() => { setActiveToken(undefined); setManualToken(""); }}
        />
      </SafeAreaView>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">Sign in to join</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          You need to be signed in to accept this invite. Open the app and sign in, then tap the invite link again.
        </Text>
      </SafeAreaView>
    );
  }

  // ── Accept invite ────────────────────────────────────────────────────────────
  const householdName = invite.households?.name ?? "a household";

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView contentContainerClassName="px-6 pt-12 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-3xl font-bold text-gray-900 mb-2">You're invited!</Text>
        <Text className="text-base text-gray-500 mb-8">
          Join <Text className="font-semibold text-gray-800">{householdName}</Text> as a{" "}
          <Text className="font-semibold text-gray-800">{invite.role ?? "member"}</Text>.
        </Text>

        <Input
          label="Your display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Jane"
          autoFocus
        />

        <Button
          title="Join Household"
          onPress={handleJoin}
          loading={joining}
          disabled={!displayName.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
