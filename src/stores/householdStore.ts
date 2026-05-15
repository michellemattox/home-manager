import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Household, HouseholdMember } from "@/types/app.types";

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

const householdStorage =
  Platform.OS === "web"
    ? createJSONStorage(getWebStorage)
    : createJSONStorage(() => AsyncStorage);

interface HouseholdState {
  household: Household | null;
  members: HouseholdMember[];
  currentMember: HouseholdMember | null;
  householdChecked: boolean;
  setHousehold: (household: Household | null) => void;
  setMembers: (members: HouseholdMember[]) => void;
  setCurrentMember: (member: HouseholdMember | null) => void;
  setHouseholdChecked: (checked: boolean) => void;
  clearHousehold: () => void;
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      household: null,
      members: [],
      currentMember: null,
      householdChecked: false,
      setHousehold: (household) => set({ household }),
      setMembers: (members) => set({ members }),
      setCurrentMember: (currentMember) => set({ currentMember }),
      setHouseholdChecked: (householdChecked) => set({ householdChecked }),
      clearHousehold: () =>
        set({ household: null, members: [], currentMember: null, householdChecked: false }),
    }),
    {
      name: "household-cache",
      storage: householdStorage,
      // Only persist the household identity so cold start can render the app shell
      // without waiting on a network round-trip. householdChecked is intentionally
      // NOT persisted — AuthGate must re-validate membership against the live session.
      partialize: (state) => ({
        household: state.household,
        members: state.members,
        currentMember: state.currentMember,
      }),
    }
  )
);
