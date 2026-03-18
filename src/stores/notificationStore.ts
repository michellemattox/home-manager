import { create } from "zustand";

interface NotificationState {
  overdueTaskCount: number;
  setOverdueTaskCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  overdueTaskCount: 0,
  setOverdueTaskCount: (count) => set({ overdueTaskCount: count }),
}));
