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
}

export type ReminderFrequency = "daily" | "every_other_day" | "weekly";

export interface NotificationPrefs {
  overdueEnabled: boolean;
  dueSoonEnabled: boolean;
  reminderHour: number; // 0-23
  reminderFrequency: ReminderFrequency;
}

// Schedule a single combined reminder. Call whenever app data changes.
export async function scheduleItemReminders(
  counts: ReminderCounts,
  prefs: NotificationPrefs
): Promise<void> {
  if (Platform.OS === "web") return;

  const Notifications = require("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { overdueProjects, dueSoonProjects, overdueTasks, dueSoonTasks } = counts;
  const totalOverdue = overdueProjects + overdueTasks;
  const totalDueSoon = dueSoonProjects + dueSoonTasks;

  const wantOverdue = prefs.overdueEnabled && totalOverdue > 0;
  const wantDueSoon = prefs.dueSoonEnabled && totalDueSoon > 0;

  if (!wantOverdue && !wantDueSoon) return;

  // Build a single combined notification
  const parts: string[] = [];
  if (wantOverdue) parts.push(`${totalOverdue} overdue`);
  if (wantDueSoon) parts.push(`${totalDueSoon} due soon`);
  const title = parts.join(", ") + ` item${(totalOverdue + totalDueSoon) !== 1 ? "s" : ""}`;

  const bodyParts: string[] = [];
  if (wantOverdue) bodyParts.push(buildBody(overdueProjects, overdueTasks, "overdue"));
  if (wantDueSoon) bodyParts.push(buildBody(dueSoonProjects, dueSoonTasks, "due soon"));

  const trigger = buildTrigger(prefs.reminderHour, prefs.reminderFrequency);

  await Notifications.scheduleNotificationAsync({
    identifier: "home-reminder",
    content: {
      title,
      body: bodyParts.join(" "),
      sound: true,
    },
    trigger,
  });
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = require("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function buildTrigger(hour: number, frequency: ReminderFrequency): { seconds: number; repeats: boolean } {
  const frequencyDays = frequency === "weekly" ? 7 : frequency === "every_other_day" ? 2 : 1;
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  // For non-daily, if next occurrence would be sooner than the interval, push it out
  const seconds = Math.floor((next.getTime() - now.getTime()) / 1000);
  // We schedule repeating at the interval in seconds; expo-notifications handles repeat
  const intervalSeconds = frequencyDays * 24 * 3600;
  return { seconds: Math.max(seconds, intervalSeconds), repeats: true };
}

function buildBody(projectCount: number, taskCount: number, label: string): string {
  const parts: string[] = [];
  if (projectCount > 0) parts.push(`${projectCount} project${projectCount !== 1 ? "s" : ""}`);
  if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`);
  return parts.join(" & ") + ` ${label}.`;
}
