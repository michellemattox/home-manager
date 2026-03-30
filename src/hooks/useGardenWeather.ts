import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WeatherResponse } from "@/types/app.types";

const FUNCTION_URL = "https://sjtlmvcxcffftsdleftf.supabase.co/functions/v1/garden-weather";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdGxtdmN4Y2ZmZnRzZGxlZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTg3NTEsImV4cCI6MjA4OTQzNDc1MX0.0WrpJr1KcZYdWQxSnq5jK05Ka-gpAvZKpCqgrfm9wRc";

export function useGardenWeather(zipCode: string | null | undefined, householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_weather", zipCode],
    queryFn: async (): Promise<WeatherResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        const res = await fetch(FUNCTION_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${session?.access_token ?? ANON_KEY}`,
          },
          body: JSON.stringify({ zipCode, householdId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `Weather error ${res.status}`);
        if (json?.error) throw new Error(json.error);
        return json as WeatherResponse;
      } finally {
        clearTimeout(timeout);
      }
    },
    enabled: !!zipCode && !!householdId,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}
