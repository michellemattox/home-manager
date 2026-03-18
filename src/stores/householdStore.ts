import { create } from "zustand";
import type { Household, HouseholdMember } from "@/types/app.types";

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

export const useHouseholdStore = create<HouseholdState>((set) => ({
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
}));
