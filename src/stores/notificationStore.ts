import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReminderFrequency = "daily" | "every_other_day" | "weekly" | "monthly";

interface NotificationState {
  overdueTaskCount: number;
  setOverdueTaskCount: (count: number) => void;

  // User preferences (persisted)
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

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "notification-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist runtime state — only user preferences
      partialize: (state) => ({
        overdueEnabled: state.overdueEnabled,
        dueSoonEnabled: state.dueSoonEnabled,
        summaryEnabled: state.summaryEnabled,
        reminderHour: state.reminderHour,
        reminderFrequency: state.reminderFrequency,
      }),
    }
  )
);
