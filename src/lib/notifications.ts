import { Platform } from "react-native";
import { supabase } from "./supabase";

// No-op on web — push notifications require a native device
export async function registerForPushNotificationsAsync(
  userId: string
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const Device = require("expo-device");
  const Notifications = require("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS as "ios" | "android",
    },
    { onConflict: "user_id,expo_push_token" }
  );

  return token;
}

export interface ReminderCounts {
  overdueProjects: number;
  dueSoonProjects: number;
  overdueTasks: number;
  dueSoonTasks: number;
  overdueGoals: number;
}

export type ReminderFrequency = "daily" | "every_other_day" | "weekly" | "monthly";

export interface NotificationPrefs {
  overdueEnabled: boolean;
  dueSoonEnabled: boolean;
  summaryEnabled: boolean;
  reminderHour: number; // 0-23
  reminderFrequency: ReminderFrequency;
}

export async function scheduleItemReminders(
  counts: ReminderCounts,
  prefs: NotificationPrefs
): Promise<void> {
  if (Platform.OS === "web") return;

  const Notifications = require("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { overdueProjects, dueSoonProjects, overdueTasks, dueSoonTasks, overdueGoals } = counts;
  const totalOverdue = overdueProjects + overdueTasks + overdueGoals;
  const totalDueSoon = dueSoonProjects + dueSoonTasks;

  let title: string;
  let body: string;

  if (prefs.summaryEnabled) {
    // Summary digest — always send, even if nothing is overdue
    const parts: string[] = [];
    if (totalOverdue > 0) parts.push(`${totalOverdue} overdue`);
    if (totalDueSoon > 0) parts.push(`${totalDueSoon} due soon`);
    title = "🏠 Home Summary";
    body =
      parts.length > 0
        ? parts.join(", ") + " across tasks, projects & goals"
        : "Everything is up to date — great job!";
  } else {
    const wantOverdue = prefs.overdueEnabled && totalOverdue > 0;
    const wantDueSoon = prefs.dueSoonEnabled && totalDueSoon > 0;
    if (!wantOverdue && !wantDueSoon) return;

    const titleParts: string[] = [];
    if (wantOverdue) titleParts.push(`${totalOverdue} overdue`);
    if (wantDueSoon) titleParts.push(`${totalDueSoon} due soon`);
    title =
      titleParts.join(", ") +
      ` item${totalOverdue + totalDueSoon !== 1 ? "s" : ""}`;

    const bodyParts: string[] = [];
    if (wantOverdue) bodyParts.push(buildBody(overdueProjects, overdueTasks, overdueGoals, "overdue"));
    if (wantDueSoon) bodyParts.push(buildBody(dueSoonProjects, dueSoonTasks, 0, "due soon"));
    body = bodyParts.join(" ");
  }

  const trigger = buildTrigger(prefs.reminderHour, prefs.reminderFrequency);

  await Notifications.scheduleNotificationAsync({
    identifier: "home-reminder",
    content: { title, body, sound: true },
    trigger,
  });
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = require("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Build the expo-notifications trigger for the given hour and frequency.
 *
 * - daily:          Calendar trigger — fires every day at `hour:00` regardless of when scheduled.
 * - every_other_day: One-shot firing 2 days from now at `hour:00`; rescheduled on next app open.
 * - weekly:          One-shot firing 7 days from now at `hour:00`.
 * - monthly:         One-shot firing 30 days from now at `hour:00`.
 *
 * The one-shot approach means non-daily frequencies fire at the correct clock time and
 * get rescheduled each time the app is opened (via useNotificationScheduler).
 */
function buildTrigger(hour: number, frequency: ReminderFrequency): object {
  if (frequency === "daily") {
    // DailyTriggerInput — repeats every day at the chosen hour, no drift
    return { hour, minute: 0, repeats: true };
  }

  const intervalDays =
    frequency === "monthly" ? 30 : frequency === "weekly" ? 7 : 2;

  // Schedule the one-shot for intervalDays from now at the chosen hour
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  next.setHours(hour, 0, 0, 0);

  const seconds = Math.max(60, Math.floor((next.getTime() - Date.now()) / 1000));
  return { seconds };
}

function buildBody(
  projectCount: number,
  taskCount: number,
  goalCount: number,
  label: string
): string {
  const parts: string[] = [];
  if (projectCount > 0) parts.push(`${projectCount} project${projectCount !== 1 ? "s" : ""}`);
  if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`);
  if (goalCount > 0) parts.push(`${goalCount} goal${goalCount !== 1 ? "s" : ""}`);
  return parts.join(", ") + ` ${label}.`;
}
