import { create } from "zustand";

export type ReminderFrequency = "daily" | "every_other_day" | "weekly" | "monthly";

interface NotificationState {
  overdueTaskCount: number;
  setOverdueTaskCount: (count: number) => void;

  // User preferences
  overdueEnabled: boolean;
  dueSoonEnabled: boolean;
  summaryEnabled: boolean; // single digest covering all item types
  reminderHour: number; // 0-23, default 8 AM
  reminderFrequency: ReminderFrequency;
  setOverdueEnabled: (v: boolean) => void;
  setDueSoonEnabled: (v: boolean) => void;
  setSummaryEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  setReminderFrequency: (f: ReminderFrequency) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  overdueTaskCount: 0,
  setOverdueTaskCount: (count) => set({ overdueTaskCount: count }),

  overdueEnabled: true,
  dueSoonEnabled: true,
  summaryEnabled: false,
  reminderHour: 8,
  reminderFrequency: "daily",
  setOverdueEnabled: (v) => set({ overdueEnabled: v }),
  setDueSoonEnabled: (v) => set({ dueSoonEnabled: v }),
  setSummaryEnabled: (v) => set({ summaryEnabled: v }),
  setReminderHour: (h) => set({ reminderHour: h }),
  setReminderFrequency: (f) => set({ reminderFrequency: f }),
}));
