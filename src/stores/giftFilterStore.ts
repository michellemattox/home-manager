import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

function getWebStorage(): Storage {
  try {
    return localStorage;
  } catch {
    const mem: Record<string, string> = {};
    return {
      getItem: (k) => mem[k] ?? null,
      setItem: (k, v) => { mem[k] = v; },
      removeItem: (k) => { delete mem[k]; },
      clear: () => { Object.keys(mem).forEach((k) => delete mem[k]); },
      key: (i) => Object.keys(mem)[i] ?? null,
      length: 0,
    } as unknown as Storage;
  }
}

const storage =
  Platform.OS === "web"
    ? createJSONStorage(getWebStorage)
    : createJSONStorage(() => AsyncStorage);

export type GiftSortMode = "priority" | "price" | "date_added" | "store";

interface GiftFilterState {
  /** Recipient member id, "__home__" sentinel, or null = show all. */
  recipientFilter: string | null;
  sortMode: GiftSortMode;
  filtersOpen: boolean;
  setRecipientFilter: (id: string | null) => void;
  setSortMode: (mode: GiftSortMode) => void;
  setFiltersOpen: (open: boolean) => void;
}

export const useGiftFilterStore = create<GiftFilterState>()(
  persist(
    (set) => ({
      recipientFilter: null,
      sortMode: "priority",
      filtersOpen: false,
      setRecipientFilter: (id) => set({ recipientFilter: id }),
      setSortMode: (mode) => set({ sortMode: mode }),
      setFiltersOpen: (open) => set({ filtersOpen: open }),
    }),
    {
      name: "gift-filter-prefs",
      storage,
      partialize: (state) => ({
        recipientFilter: state.recipientFilter,
        sortMode: state.sortMode,
        filtersOpen: state.filtersOpen,
      }),
    }
  )
);
