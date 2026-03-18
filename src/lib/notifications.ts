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

export interface NotificationPrefs {
  overdueEnabled: boolean;
  dueSoonEnabled: boolean;
  reminderHour: number; // 0-23
}

// Schedule a daily reminder at the configured hour if there are relevant items.
// Call this each time the app loads or data refreshes.
export async function scheduleItemReminders(
  counts: ReminderCounts,
  prefs: NotificationPrefs
): Promise<void> {
  if (Platform.OS === "web") return;

  const Notifications = require("expo-notifications");

  // Cancel all previously scheduled reminders so we don't accumulate
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { overdueProjects, dueSoonProjects, overdueTasks, dueSoonTasks } = counts;
  const totalOverdue = overdueProjects + overdueTasks;
  const totalDueSoon = dueSoonProjects + dueSoonTasks;

  // Schedule overdue reminder
  if (prefs.overdueEnabled && totalOverdue > 0) {
    const trigger = nextTriggerAt(prefs.reminderHour);
    await Notifications.scheduleNotificationAsync({
      identifier: "overdue-reminder",
      content: {
        title: `${totalOverdue} overdue item${totalOverdue !== 1 ? "s" : ""}`,
        body: buildBody(overdueProjects, overdueTasks, "overdue"),
        sound: true,
      },
      trigger,
    });
  }

  // Schedule due-soon reminder (offset by 1 minute so both can coexist)
  if (prefs.dueSoonEnabled && totalDueSoon > 0) {
    const trigger = nextTriggerAt(prefs.reminderHour, 1);
    await Notifications.scheduleNotificationAsync({
      identifier: "due-soon-reminder",
      content: {
        title: `${totalDueSoon} item${totalDueSoon !== 1 ? "s" : ""} coming up`,
        body: buildBody(dueSoonProjects, dueSoonTasks, "due soon"),
        sound: false,
      },
      trigger,
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = require("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Returns seconds until the next occurrence of the target hour (+ optional minute offset)
function nextTriggerAt(hour: number, minuteOffset = 0): { seconds: number; repeats: boolean } {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minuteOffset, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // tomorrow
  const seconds = Math.floor((next.getTime() - now.getTime()) / 1000);
  return { seconds, repeats: false };
}

function buildBody(projectCount: number, taskCount: number, label: string): string {
  const parts: string[] = [];
  if (projectCount > 0) parts.push(`${projectCount} project${projectCount !== 1 ? "s" : ""}`);
  if (taskCount > 0) parts.push(`${taskCount} maintenance task${taskCount !== 1 ? "s" : ""}`);
  return parts.join(" and ") + ` ${label}.`;
}
