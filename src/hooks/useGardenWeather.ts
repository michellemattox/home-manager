import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WeatherResponse } from "@/types/app.types";

export function useGardenWeather(zipCode: string | null | undefined, householdId: string | undefined) {
  return useQuery({
    queryKey: ["garden_weather", zipCode],
    queryFn: async (): Promise<WeatherResponse> => {
      const { data, error } = await supabase.functions.invoke("garden-weather", {
        body: { zipCode, householdId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as WeatherResponse;
    },
    enabled: !!zipCode && !!householdId,
    staleTime: 15 * 60 * 1000, // 15 min
    retry: 1,
  });
}
