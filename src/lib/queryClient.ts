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
      // Mutations also fire immediately offline; the server error is surfaced to the UI.
      networkMode: "offlineFirst",
    },
  },
});
