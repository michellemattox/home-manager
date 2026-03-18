import { create } from "zustand";

interface NotificationState {
  overdueTaskCount: number;
  setOverdueTaskCount: (count: number) => void;

  // User preferences
  overdueEnabled: boolean;
  dueSoonEnabled: boolean;
  reminderHour: number; // 0-23, default 8 AM
  setOverdueEnabled: (v: boolean) => void;
  setDueSoonEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  overdueTaskCount: 0,
  setOverdueTaskCount: (count) => set({ overdueTaskCount: count }),

  overdueEnabled: true,
  dueSoonEnabled: true,
  reminderHour: 8,
  setOverdueEnabled: (v) => set({ overdueEnabled: v }),
  setDueSoonEnabled: (v) => set({ dueSoonEnabled: v }),
  setReminderHour: (h) => set({ reminderHour: h }),
}));
