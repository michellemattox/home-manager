import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use localStorage on web, AsyncStorage on native
const notifStorage =
  Platform.OS === "web"
    ? createJSONStorage(() => localStorage)
    : createJSONStorage(() => AsyncStorage);

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
  // Member filter: ["all"] means all members; otherwise list of member IDs
  notifyMemberIds: string[];
  setOverdueEnabled: (v: boolean) => void;
  setDueSoonEnabled: (v: boolean) => void;
  setSummaryEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  setReminderFrequency: (f: ReminderFrequency) => void;
  setNotifyMemberIds: (ids: string[]) => void;
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
      notifyMemberIds: ["all"],
      setOverdueEnabled: (v) => set({ overdueEnabled: v }),
      setDueSoonEnabled: (v) => set({ dueSoonEnabled: v }),
      setSummaryEnabled: (v) => set({ summaryEnabled: v }),
      setReminderHour: (h) => set({ reminderHour: h }),
      setReminderFrequency: (f) => set({ reminderFrequency: f }),
      setNotifyMemberIds: (ids) => set({ notifyMemberIds: ids }),
    }),
    {
      name: "notification-prefs",
      storage: notifStorage,
      // Don't persist runtime state — only user preferences
      partialize: (state) => ({
        overdueEnabled: state.overdueEnabled,
        dueSoonEnabled: state.dueSoonEnabled,
        summaryEnabled: state.summaryEnabled,
        reminderHour: state.reminderHour,
        reminderFrequency: state.reminderFrequency,
        notifyMemberIds: state.notifyMemberIds,
      }),
    }
  )
);
