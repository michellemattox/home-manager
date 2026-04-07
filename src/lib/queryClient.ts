import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes — stale data still shows instantly while a background refetch runs.
      staleTime: 5 * 60 * 1000,
      // 24 hours — cache survives overnight so cold start always has data to show.
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Show cached data immediately when offline instead of perpetual loading spinner.
      networkMode: "offlineFirst",
    },
    mutations: {
      // "always" fires mutations regardless of connectivity but surfaces server errors.
      networkMode: "always",
      retry: 0,
    },
  },
});

// Persists the query cache to AsyncStorage so it survives app kills overnight.
// PersistQueryClientProvider in _layout.tsx restores this on cold start before
// rendering children, eliminating the blank/spinning state on first daily open.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});
