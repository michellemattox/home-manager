import { useEffect } from "react";
import { useSegments } from "expo-router";
import { useNavStore, resolveTabGroup, tabGroupRoute } from "@/stores/navStore";

/**
 * Records the last "tab list" the user was on (e.g. /(app)/(home)). Detail
 * screens read this to override Back so it returns to the previous tab,
 * regardless of which tab the detail technically belongs to.
 *
 * Only updates when the user is at a tab's index (segments.length === 2),
 * not when they're inside a detail — that way navigating Home → Project
 * detail leaves `lastTabRoute` pointing at Home.
 */
export function useTrackLastTab() {
  const segments = useSegments() as string[];
  const setLastTabRoute = useNavStore((s) => s.setLastTabRoute);

  useEffect(() => {
    const group = resolveTabGroup(segments);
    if (!group) return;
    if (segments.length !== 2) return; // only record when on the tab's index
    setLastTabRoute(tabGroupRoute(group));
  }, [segments, setLastTabRoute]);
}
