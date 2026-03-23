import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { useHouseholdStore } from "@/stores/householdStore";
import { useGardenWeather } from "@/hooks/useGardenWeather";
import { useGardenWeatherLogs, useGardenPlantingsForHousehold } from "@/hooks/useGarden";

function owmIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function mmToIn(mm: number) {
  return (mm / 25.4).toFixed(2);
}

function windDir(deg: number) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function WeatherScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const zipCode = household?.zip_code ?? null;
  const householdId = household?.id;

  const {
    data: weather,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useGardenWeather(zipCode, householdId);

  const { data: logs = [] } = useGardenWeatherLogs(householdId);
  const { data: plantings = [] } = useGardenPlantingsForHousehold(householdId);

  // Rainfall since planting per plant
  const rainfallByPlanting = useMemo(() => {
    return (plantings as any[]).map((p: any) => {
      if (!p.date_planted) return null;
      const total = logs
        .filter((l) => l.log_date >= p.date_planted!)
        .reduce((sum, l) => sum + (l.rainfall_mm ?? 0), 0);
      return { plant_name: p.plant_name, date_planted: p.date_planted, totalMm: total };
    }).filter(Boolean);
  }, [plantings, logs]);

  if (!zipCode) {
    return (
      <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
        <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-green-700 text-base">← Back</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">🌦 Weather</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">📍</Text>
          <Text className="text-base font-semibold text-gray-700 text-center">No zip code set</Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            Add your zip code in household settings to enable weather and rainfall tracking.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(app)/settings")}
            className="mt-5 bg-green-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🌦 Weather</Text>
        <TouchableOpacity onPress={() => refetch()} className="px-3 py-1 bg-blue-50 rounded-xl">
          <Text className="text-blue-600 text-sm font-medium">Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" size="large" />
          <Text className="text-gray-400 mt-3 text-sm">Fetching weather for {zipCode}…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">⛅</Text>
          <Text className="text-base font-semibold text-gray-700 text-center">Weather unavailable</Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            {(error as Error).message?.includes("OPENWEATHERMAP_API_KEY")
              ? "Add your OpenWeatherMap API key — see setup instructions below."
              : (error as Error).message}
          </Text>
          {(error as Error).message?.includes("OPENWEATHERMAP_API_KEY") && (
            <View className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 w-full">
              <Text className="text-amber-800 text-sm font-semibold mb-2">Setup Instructions</Text>
              <Text className="text-amber-700 text-xs leading-5">
                1. Sign up at openweathermap.org (free tier){"\n"}
                2. Copy your API key{"\n"}
                3. Go to Supabase Dashboard → Edge Functions → garden-weather → Secrets{"\n"}
                4. Add secret: OPENWEATHERMAP_API_KEY = your key{"\n"}
                5. Tap Refresh above
              </Text>
            </View>
          )}
        </View>
      ) : weather ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={{ padding: 16, gap: 16 }}
        >
          {/* ── Current conditions ─────────────────────────────────────────── */}
          <Card className="bg-gradient-to-b from-blue-500 to-blue-700 p-0 overflow-hidden border-0">
            <View className="bg-blue-600 px-5 py-5">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-5xl font-bold">{weather.current.temp}°F</Text>
                  <Text className="text-blue-100 text-base capitalize mt-0.5">{weather.current.description}</Text>
                  <Text className="text-blue-200 text-sm mt-0.5">
                    Feels like {weather.current.feelsLike}°F · {weather.current.cityName}
                  </Text>
                </View>
                {weather.current.icon ? (
                  <Image
                    source={{ uri: owmIconUrl(weather.current.icon) }}
                    style={{ width: 80, height: 80 }}
                  />
                ) : null}
              </View>
              <View className="flex-row gap-4 mt-4 pt-4 border-t border-blue-500">
                <View className="flex-1 items-center">
                  <Text className="text-blue-200 text-xs">High / Low</Text>
                  <Text className="text-white text-sm font-semibold">{weather.current.tempMax}° / {weather.current.tempMin}°</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-blue-200 text-xs">Humidity</Text>
                  <Text className="text-white text-sm font-semibold">{weather.current.humidity}%</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-blue-200 text-xs">Wind</Text>
                  <Text className="text-white text-sm font-semibold">{weather.current.windSpeed} mph</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-blue-200 text-xs">Rain today</Text>
                  <Text className="text-white text-sm font-semibold">
                    {weather.current.rainfallMm > 0 ? `${mmToIn(weather.current.rainfallMm)}"` : "None"}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* ── 5-Day forecast ─────────────────────────────────────────────── */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">5-Day Forecast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {weather.forecast.map((day) => {
                  const d = new Date(day.date + "T12:00:00");
                  return (
                    <Card key={day.date} className="items-center min-w-[80px] py-3 px-3">
                      <Text className="text-xs font-semibold text-gray-600">{DAY_LABELS[d.getDay()]}</Text>
                      <Text className="text-xs text-gray-400">{format(d, "M/d")}</Text>
                      {day.icon ? (
                        <Image source={{ uri: owmIconUrl(day.icon) }} style={{ width: 44, height: 44 }} />
                      ) : (
                        <Text className="text-2xl my-1">☁️</Text>
                      )}
                      <Text className="text-sm font-bold text-gray-900">{day.tempMax}°</Text>
                      <Text className="text-xs text-gray-400">{day.tempMin}°</Text>
                      {day.precipMm > 0 && (
                        <Text className="text-xs text-blue-500 mt-1">💧 {mmToIn(day.precipMm)}"</Text>
                      )}
                    </Card>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* ── Rainfall log ───────────────────────────────────────────────── */}
          {logs.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Rainfall Log — Last 30 Days
              </Text>
              <Card>
                {logs.slice(0, 14).map((log) => {
                  const maxBar = 25; // mm
                  const barPct = Math.min((log.rainfall_mm ?? 0) / maxBar, 1);
                  return (
                    <View key={log.id} className="flex-row items-center gap-3 py-1.5">
                      <Text className="text-xs text-gray-500 w-20">{log.log_date}</Text>
                      <View className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <View
                          className="bg-blue-400 h-full rounded-full"
                          style={{ width: `${barPct * 100}%` }}
                        />
                      </View>
                      <Text className="text-xs text-gray-700 w-14 text-right">
                        {log.rainfall_mm && log.rainfall_mm > 0
                          ? `${mmToIn(log.rainfall_mm)}" (${log.rainfall_mm?.toFixed(1)}mm)`
                          : "No rain"}
                      </Text>
                    </View>
                  );
                })}
                {logs.length > 14 && (
                  <Text className="text-gray-400 text-xs mt-2 text-center">
                    Showing most recent 14 days
                  </Text>
                )}
              </Card>
            </View>
          )}

          {/* ── Rainfall since planting ─────────────────────────────────────── */}
          {rainfallByPlanting.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Rainfall Since Planting
              </Text>
              <Card>
                <View className="gap-2">
                  {rainfallByPlanting.map((item: any, i: number) => (
                    <View key={i} className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900">{item.plant_name}</Text>
                        <Text className="text-xs text-gray-400">Planted {item.date_planted}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-bold text-blue-600">
                          {item.totalMm > 0 ? `${mmToIn(item.totalMm)}"` : '0"'}
                        </Text>
                        <Text className="text-xs text-gray-400">{item.totalMm?.toFixed(1)} mm</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-400">
                    Rainfall totals are tracked from when the weather integration was first set up.
                    Historical data fills in as each day's weather is fetched.
                  </Text>
                </View>
              </Card>
            </View>
          )}

          {logs.length === 0 && (
            <Card className="items-center py-5">
              <Text className="text-gray-400 text-sm text-center">
                Rainfall log will build up as you refresh daily.{"\n"}
                Come back tomorrow to see your first day logged!
              </Text>
            </Card>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
