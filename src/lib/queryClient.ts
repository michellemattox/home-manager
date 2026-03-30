import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds — avoids blank tabs on navigation
      gcTime: 5 * 60 * 1000, // 5 minutes in-memory only
      retry: 1,
      refetchOnWindowFocus: false,
      // Show cached data immediately when offline instead of perpetual loading spinner.
      networkMode: "offlineFirst",
    },
    mutations: {
      // "always" fires mutations regardless of connectivity (same behaviour as before)
      // but doesn't swallow the resulting server error. Switched from "offlineFirst"
      // which was causing silent auth failures when the session was stale.
      networkMode: "always",
      retry: 0, // surface errors immediately rather than retrying on auth failures
    },
  },
});
