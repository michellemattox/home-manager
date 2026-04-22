import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Pull-to-refresh that refreshes the entire app, not just the current tab.
// Invalidates every cached query so the active screen refetches now and any
// other tab re-fetches on next visit.
export function useAppRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  return { refreshing, onRefresh };
}
