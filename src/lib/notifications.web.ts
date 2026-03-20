// Web stub — expo-notifications does not support web and its top-level
// async initialisation code (token registration, network calls) causes the
// web bundle to hang and show a blank screen. Metro automatically picks
// this file over notifications.ts when building for web, completely
// excluding expo-notifications from the web bundle.

export async function registerForPushNotificationsAsync(): Promise<null> {
  return null;
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
  reminderHour: number;
  reminderFrequency: ReminderFrequency;
}

export async function scheduleItemReminders(): Promise<void> {}

export async function cancelAllReminders(): Promise<void> {}
