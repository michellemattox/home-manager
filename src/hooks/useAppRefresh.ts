import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

// Pull-to-refresh that refreshes the entire app, not just the current tab.
// On web we do a full page reload so the latest deployed JS bundle is
// picked up alongside fresh data — otherwise a cached PWA would just
// re-render the old code with new data. On native, invalidating every
// cached query is sufficient.
export function useAppRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
      return; // reload unmounts everything; no need to clear refreshing
    }
    try {
      await qc.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  return { refreshing, onRefresh };
}
