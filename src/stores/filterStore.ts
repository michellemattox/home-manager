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

const filterStorage =
  Platform.OS === "web"
    ? createJSONStorage(getWebStorage)
    : createJSONStorage(() => AsyncStorage);

interface FilterState {
  /** Member IDs to filter by. Empty array = show all. */
  memberFilter: string[];
  setMemberFilter: (ids: string[]) => void;
  toggleMember: (id: string) => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      memberFilter: [],
      setMemberFilter: (ids) => set({ memberFilter: ids }),
      toggleMember: (id) => {
        const current = get().memberFilter;
        if (current.includes(id)) {
          set({ memberFilter: current.filter((m) => m !== id) });
        } else {
          set({ memberFilter: [...current, id] });
        }
      },
    }),
    {
      name: "filter-prefs",
      storage: filterStorage,
      partialize: (state) => ({
        memberFilter: state.memberFilter,
      }),
    }
  )
);
