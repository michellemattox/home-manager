import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useGenerateInvite } from "@/hooks/useHousehold";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MemberAvatar } from "@/components/ui/MemberAvatar";

export default function SettingsScreen() {
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const generateInvite = useGenerateInvite();
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleSignOut = async () => {
    Alert.alert("Sign out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  const handleInvite = async () => {
    if (!household) return;
    setInviteLoading(true);
    try {
      const token = await generateInvite.mutateAsync(household.id);
      const link = `home-manager://invite/${token}`;
      await Share.share({
        message: `Join our household on Home Manager! Open this link: ${link}`,
        title: "Home Manager Invite",
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Household */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Household
        </Text>
        <Card className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {household?.name ?? "My Household"}
          </Text>
          {household?.zip_code && (
            <Text className="text-sm text-gray-400 mb-4">
              ZIP: {household.zip_code}
            </Text>
          )}

          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Members ({members.length})
          </Text>
          {members.map((m) => (
            <View
              key={m.id}
              className="flex-row items-center mb-3"
            >
              <MemberAvatar member={m} size="md" />
              <View className="ml-3 flex-1">
                <Text className="font-medium text-gray-900">
                  {m.display_name}
                  {m.user_id === user?.id ? " (You)" : ""}
                </Text>
                <Text className="text-xs text-gray-400">{m.user_id}</Text>
              </View>
              <Badge
                label={m.role === "admin" ? "Admin" : "Member"}
                variant={m.role === "admin" ? "info" : "default"}
                size="sm"
              />
            </View>
          ))}

          <Button
            title="Invite Member"
            variant="secondary"
            onPress={handleInvite}
            loading={inviteLoading}
            className="mt-2"
          />
        </Card>

        {/* Account */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Account
        </Text>
        <Card className="mb-6">
          <Text className="text-sm text-gray-500 mb-4">
            Signed in as {user?.email}
          </Text>
          <Button
            title="Sign Out"
            variant="danger"
            onPress={handleSignOut}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
