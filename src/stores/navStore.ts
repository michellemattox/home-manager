import { create } from "zustand";

// Known tab roots — any route inside one of these groups is considered "in" that tab.
// Order matters only for documentation; the lookup is by exact group name.
const TAB_GROUPS = [
  "(home)",
  "(ideas)",
  "(tasks)",
  "(projects)",
  "(activity)",
  "(gifts)",
  "(goals)",
  "(garden)",
  "(travel)",
  "(services)",
  "(vendors)",
] as const;

type TabGroup = (typeof TAB_GROUPS)[number];

const TAB_GROUP_SET = new Set<string>(TAB_GROUPS);

/**
 * Resolve which tab group a segments array belongs to. Returns null for
 * non-tab routes (auth, settings, etc.). Expo Router segments look like
 * ["(app)", "(projects)", "[id]"] — we want the group at index 1.
 */
export function resolveTabGroup(segments: string[]): TabGroup | null {
  if (segments[0] !== "(app)") return null;
  const g = segments[1];
  return g && TAB_GROUP_SET.has(g) ? (g as TabGroup) : null;
}

/** Map a tab group to its tab list route. */
export function tabGroupRoute(group: TabGroup): string {
  return `/(app)/${group}`;
}

interface NavState {
  /** The last tab list the user was actually viewing (not a detail screen). */
  lastTabRoute: string;
  setLastTabRoute: (route: string) => void;
}

export const useNavStore = create<NavState>((set) => ({
  lastTabRoute: "/(app)/(home)",
  setLastTabRoute: (route) => set({ lastTabRoute: route }),
}));
