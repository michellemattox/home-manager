import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { showAlert, showConfirm } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import {
  useHouseholdInvites,
  useSendInvite,
  useResendInvite,
  useDeleteInvite,
  useDeleteMember,
  useUpdateMemberRole,
} from "@/hooks/useHousehold";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import type { MemberRole } from "@/types/app.types";

const ROLES: { label: string; value: "admin" | "editor" | "viewer" }[] = [
  { label: "Admin", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
];

const roleBadgeVariant = (role: string) => {
  if (role === "admin") return "info" as const;
  if (role === "editor") return "warning" as const;
  return "default" as const;
};

export default function SettingsScreen() {
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = true; // any member can manage others in a household

  const {
    overdueEnabled, setOverdueEnabled,
    dueSoonEnabled, setDueSoonEnabled,
    summaryEnabled, setSummaryEnabled,
    reminderHour, setReminderHour,
    reminderFrequency, setReminderFrequency,
    notifyMemberIds, setNotifyMemberIds,
  } = useNotificationStore();

  const isAllMembers = notifyMemberIds.includes("all") || notifyMemberIds.length === 0;

  const [testReminderLoading, setTestReminderLoading] = useState(false);
  const handleTestReminder = useCallback(async () => {
    setTestReminderLoading(true);
    try {
      const res = await fetch(
        "https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/send-reminders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testEmail: "michellemattox1@gmail.com" }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
      showAlert("Test Sent", "A test reminder email was sent to michellemattox1@gmail.com.");
    } catch (err: any) {
      showAlert("Error", err?.message ?? "Failed to send test reminder.");
    } finally {
      setTestReminderLoading(false);
    }
  }, []);

  const toggleMember = (id: string) => {
    if (id === "all") {
      setNotifyMemberIds(["all"]);
      return;
    }
    // Deselect "all", toggle this individual member
    const current = notifyMemberIds.filter((x) => x !== "all");
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    // If all individuals are now selected, collapse back to "all"
    setNotifyMemberIds(next.length === 0 ? ["all"] : next.length === members.length ? ["all"] : next);
  };

  const { data: invites = [] } = useHouseholdInvites(household?.id);
  const sendInvite = useSendInvite();
  const resendInvite = useResendInvite();
  const deleteInvite = useDeleteInvite();
  const deleteMember = useDeleteMember();
  const updateMemberRole = useUpdateMemberRole();

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");

  const handleSendInvite = async () => {
    if (!household || !currentMember || !inviteEmail.trim() || !inviteName.trim()) return;
    try {
      const result = await sendInvite.mutateAsync({
        householdId: household.id,
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim(),
        role: inviteRole,
        invitedBy: currentMember.id,
      });
      setShowInviteModal(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("editor");
      if ((result as any).existingUser) {
        const token = (result as any).invite?.token ?? "";
        await Clipboard.setStringAsync(token);
        showAlert(
          "Invite code copied!",
          `${inviteName} already has an account — no email was sent.\n\nThe invite code has been copied to your clipboard. Paste it into a text or email to send manually.\n\nThey open the app → "Join a Household" → enter the code.`
        );
      } else if ((result as any).emailSent) {
        showAlert("Invite sent", `${inviteName} will receive an email to join.`);
      } else {
        const errDetail = (result as any).fnErrorMessage
          ? `\n\nError from email service:\n"${(result as any).fnErrorMessage}"`
          : "";
        showAlert(
          "Invite saved — email not sent",
          `The invite record was created for ${inviteName} but the email could not be delivered.${errDetail}\n\nCheck the Edge Function logs in your Supabase dashboard → Edge Functions → invite-member → Logs.`
        );
      }
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleResendInvite = async (inv: { email: string; name: string; token: string }) => {
    if (!household) return;
    try {
      const result = await resendInvite.mutateAsync({ ...inv, householdId: household.id });
      if ((result as any)?.existingUser) {
        await Clipboard.setStringAsync(inv.token);
        showAlert(
          "Invite code copied!",
          `${inv.name} already has an account — no email was sent.\n\nThe invite code has been copied to your clipboard. Paste it into a text or email to send manually.\n\nThey open the app → "Join a Household" → enter the code.`
        );
      } else {
        showAlert("Sent", `Invite re-sent to ${inv.email}`);
      }
    } catch (e: any) {
      showAlert("Error", e.message ?? "Could not send email.");
    }
  };

  const handleDeleteInvite = (id: string, email: string) => {
    if (!household) return;
    showConfirm(
      "Cancel invite?",
      `Remove pending invite for ${email}?`,
      () => deleteInvite.mutate({ id, householdId: household.id }),
      true
    );
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (!household) return;
    showConfirm(
      "Remove member?",
      `Remove ${name} from this household?`,
      async () => {
        try {
          await deleteMember.mutateAsync({ id, householdId: household.id });
        } catch (e: any) {
          showAlert("Error", e.message || "Failed to remove member. Ensure migration 016 has been run in Supabase.");
        }
      },
      true
    );
  };

  const handleRoleChange = (id: string, role: MemberRole) => {
    if (!household) return;
    updateMemberRole.mutate({ id, householdId: household.id, role });
  };

  const handleSignOut = async () => {
    showConfirm(
      "Sign out?",
      "You'll need to sign in again.",
      () => supabase.auth.signOut(),
      true
    );
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
            <Text className="text-sm text-gray-400 mb-4">ZIP: {household.zip_code}</Text>
          )}

          {/* Members */}
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Members ({members.length})
          </Text>
          {members.map((m) => {
            const isMe = m.user_id === user?.id;
            return (
              <View key={m.id} className="flex-row items-center mb-3">
                <MemberAvatar member={m} size="md" />
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-gray-900">
                    {m.display_name}{isMe ? " (You)" : ""}
                  </Text>
                  <Text className="text-xs text-gray-400">{m.role}</Text>
                </View>
                {isAdmin && !isMe ? (
                  <View className="flex-row items-center gap-2">
                    {/* Role picker */}
                    <TouchableOpacity
                      onPress={() => {
                        const roles: MemberRole[] = ["admin", "editor", "viewer", "member"];
                        const next = roles[(roles.indexOf(m.role) + 1) % roles.length];
                        handleRoleChange(m.id, next);
                      }}
                    >
                      <Badge
                        label={m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                        variant={roleBadgeVariant(m.role)}
                        size="sm"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteMember(m.id, m.display_name)}
                      className="ml-1 px-2 py-1"
                    >
                      <Text className="text-red-400 text-xs font-medium">Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Badge
                    label={m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    variant={roleBadgeVariant(m.role)}
                    size="sm"
                  />
                )}
              </View>
            );
          })}

          {/* Pending Invites */}
          {invites.length > 0 && (
            <>
              <Text className="text-sm font-semibold text-gray-700 mt-4 mb-3">
                Pending Invites ({invites.length})
              </Text>
              {invites.map((inv) => (
                <View key={inv.id} className="mb-3 bg-gray-50 rounded-xl px-3 py-2">
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-800">{inv.name}</Text>
                      <Text className="text-xs text-gray-400">{inv.email}</Text>
                    </View>
                    <Badge
                      label={inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      variant={roleBadgeVariant(inv.role)}
                      size="sm"
                    />
                  </View>
                  <View className="flex-row gap-3 mt-2">
                    <TouchableOpacity
                      onPress={() => handleResendInvite({ email: inv.email, name: inv.name, token: inv.token })}
                      disabled={resendInvite.isPending}
                      className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <Text className="text-blue-600 text-xs font-medium">Resend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteInvite(inv.id, inv.email)}
                      className="px-3 py-1 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <Text className="text-red-500 text-xs font-medium">Cancel Invite</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {isAdmin && (
            <Button
              title="Invite Member"
              variant="secondary"
              onPress={() => setShowInviteModal(true)}
              className="mt-3"
            />
          )}
        </Card>

        {/* Notifications */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Notifications
        </Text>
        <Card className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-gray-900">Summary digest</Text>
              <Text className="text-xs text-gray-400 mt-0.5">One combined reminder covering tasks, projects, activities, and goals</Text>
            </View>
            <Switch
              value={summaryEnabled}
              onValueChange={setSummaryEnabled}
              trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
              thumbColor="#fff"
            />
          </View>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className={`text-sm font-semibold ${summaryEnabled ? "text-gray-400" : "text-gray-900"}`}>Overdue alerts</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Notify when projects or tasks are past due</Text>
            </View>
            <Switch
              value={overdueEnabled}
              onValueChange={setOverdueEnabled}
              disabled={summaryEnabled}
              trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
              thumbColor="#fff"
            />
          </View>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text className={`text-sm font-semibold ${summaryEnabled ? "text-gray-400" : "text-gray-900"}`}>Due soon alerts</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Notify for items due within 7–14 days</Text>
            </View>
            <Switch
              value={dueSoonEnabled}
              onValueChange={setDueSoonEnabled}
              disabled={summaryEnabled}
              trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
              thumbColor="#fff"
            />
          </View>
          {/* Member filter */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">Notify me about</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {/* All chip */}
            <TouchableOpacity
              onPress={() => toggleMember("all")}
              className={`px-3 py-1.5 rounded-xl border ${
                isAllMembers ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-sm font-medium ${isAllMembers ? "text-white" : "text-gray-700"}`}>
                All
              </Text>
            </TouchableOpacity>
            {/* Individual member chips */}
            {members.map((m) => {
              const selected = !isAllMembers && notifyMemberIds.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => toggleMember(m.id)}
                  className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <View
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selected ? "#fff" : (m.color_hex ?? "#3b82f6") }}
                  />
                  <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}>
                    {m.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-sm font-semibold text-gray-700 mb-2">Reminder time</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {[7, 8, 9, 12, 17, 20].map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setReminderHour(h)}
                className={`px-3 py-1.5 rounded-xl border ${
                  reminderHour === h ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-sm font-medium ${reminderHour === h ? "text-white" : "text-gray-700"}`}>
                  {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-sm font-semibold text-gray-700 mb-2">Frequency</Text>
          <View className="flex-row flex-wrap gap-2">
            {([
              { label: "Daily", value: "daily" },
              { label: "Every 2 Days", value: "every_other_day" },
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
            ] as const).map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setReminderFrequency(f.value)}
                className={`px-4 py-2 rounded-xl border items-center ${
                  reminderFrequency === f.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-xs font-medium ${reminderFrequency === f.value ? "text-white" : "text-gray-700"}`}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Test Reminder */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Test
        </Text>
        <Card className="mb-6">
          <Text className="text-sm font-semibold text-gray-800 mb-1">Test Reminder Email</Text>
          <Text className="text-xs text-gray-500 mb-4">
            Send a sample daily digest to michellemattox1@gmail.com to preview the reminder format.
          </Text>
          <TouchableOpacity
            onPress={handleTestReminder}
            disabled={testReminderLoading}
            className={`rounded-xl py-2.5 px-4 items-center ${testReminderLoading ? "bg-gray-100" : "bg-orange-50 border border-orange-200"}`}
          >
            <Text style={{ color: testReminderLoading ? "#9ca3af" : "#FC9853" }} className="text-sm font-semibold">
              {testReminderLoading ? "Sending…" : "Send Test Reminder"}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Account */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Account
        </Text>
        <Card className="mb-6">
          <Text className="text-sm text-gray-500 mb-4">Signed in as {user?.email}</Text>
          <Button title="Sign Out" variant="danger" onPress={handleSignOut} />
        </Card>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowInviteModal(false)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Invite Member</Text>
          </View>

          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-1">Name</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="e.g. Jane Smith"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="jane@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Role</Text>
            <View className="flex-row gap-2 mb-6">
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => setInviteRole(r.value)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    inviteRole === r.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${inviteRole === r.value ? "text-white" : "text-gray-700"}`}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-gray-100 rounded-xl p-3 mb-6">
              <Text className="text-xs text-gray-500 font-semibold mb-1">Role permissions</Text>
              <Text className="text-xs text-gray-400">Admin — full access, can manage members</Text>
              <Text className="text-xs text-gray-400">Editor — create and edit everything</Text>
              <Text className="text-xs text-gray-400">Viewer — read-only access</Text>
            </View>

            <Button
              title="Send Invite"
              onPress={handleSendInvite}
              loading={sendInvite.isPending}
              disabled={!inviteName.trim() || !inviteEmail.trim()}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
