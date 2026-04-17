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
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
      clear: () => { Object.keys(mem).forEach((k) => delete mem[k]); },
      key: (i: number) => Object.keys(mem)[i] ?? null,
      length: 0,
    } as unknown as Storage;
  }
}

const storage =
  Platform.OS === "web"
    ? createJSONStorage(getWebStorage)
    : createJSONStorage(() => AsyncStorage);

interface CustomRemediesState {
  /** Map of pest/disease/deficiency name → user-added remedies. */
  byIssue: Record<string, string[]>;
  addRemedy: (issueName: string, remedy: string) => void;
  getRemedies: (issueName: string) => string[];
}

export const useCustomRemediesStore = create<CustomRemediesState>()(
  persist(
    (set, get) => ({
      byIssue: {},
      addRemedy: (issueName, remedy) => {
        const key = issueName.trim();
        const r = remedy.trim();
        if (!key || !r) return;
        const current = get().byIssue[key] ?? [];
        if (current.some((x) => x.toLowerCase() === r.toLowerCase())) return;
        set({ byIssue: { ...get().byIssue, [key]: [...current, r] } });
      },
      getRemedies: (issueName) => get().byIssue[issueName.trim()] ?? [],
    }),
    {
      name: "custom-remedies",
      storage,
      partialize: (state) => ({ byIssue: state.byIssue }),
    }
  )
);
