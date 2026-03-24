import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { PLANT_FAMILIES } from "@/types/app.types";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenPlots,
  useGardenZonesByHousehold,
  useGardenAllPlantingsByHousehold,
} from "@/hooks/useGarden";
import { ROTATION_NEXT } from "@/utils/successionUtils";
import type { GardenZone, GardenPlanting, GardenPlot } from "@/types/app.types";

// ── 4-year rotation guide ──────────────────────────────────────────────────────
const ROTATION_STEPS = [
  { step: 1, label: "Heavy Feeders", families: ["Solanaceae", "Cucurbitaceae"], color: "#ea580c", bg: "#fff7ed", note: "Tomatoes, peppers, squash, cucumbers" },
  { step: 2, label: "Nitrogen Fixers", families: ["Leguminosae"], color: "#16a34a", bg: "#f0fdf4", note: "Beans, peas — rebuild soil nitrogen" },
  { step: 3, label: "Brassicas", families: ["Brassicaceae"], color: "#2563eb", bg: "#eff6ff", note: "Kale, cabbage, broccoli, arugula" },
  { step: 4, label: "Root Crops", families: ["Apiaceae", "Chenopodiaceae", "Alliaceae", "Asteraceae"], color: "#7c3aed", bg: "#f5f3ff", note: "Carrots, beets, onions, lettuce" },
];

function getRotationStep(family: string): number {
  for (const s of ROTATION_STEPS) {
    if (s.families.includes(family)) return s.step;
  }
  return 0;
}

function checkRotationHealth(plantings: GardenPlanting[]): "good" | "warning" | "violation" {
  if (plantings.length < 2) return "good";
  const byYear = new Map<number, string[]>();
  for (const p of plantings) {
    if (!p.plant_family) continue;
    const yr = p.season_year ?? new Date(p.date_planted ?? "").getFullYear();
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(p.plant_family);
  }
  const years = Array.from(byYear.keys()).sort();
  if (years.length < 2) return "good";
  for (let i = 1; i < years.length; i++) {
    const prev = byYear.get(years[i - 1]) ?? [];
    const curr = byYear.get(years[i]) ?? [];
    for (const f of curr) {
      if (prev.includes(f)) return f === "Other" ? "warning" : "violation";
    }
  }
  return "good";
}

export default function RotationScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const [showGuide, setShowGuide] = useState(false);

  const { data: plots = [], isLoading: plotsLoading } = useGardenPlots(householdId);
  const { data: zones = [], isLoading: zonesLoading } = useGardenZonesByHousehold(householdId);
  const { data: allPlantings = [], isLoading: plantingsLoading } = useGardenAllPlantingsByHousehold(householdId);

  const isLoading = plotsLoading || zonesLoading || plantingsLoading;

  // Group plantings by zone
  const plantingsByZone = useMemo(() => {
    const map = new Map<string, GardenPlanting[]>();
    for (const p of allPlantings) {
      if (!p.zone_id) continue;
      if (!map.has(p.zone_id)) map.set(p.zone_id, []);
      map.get(p.zone_id)!.push(p);
    }
    return map;
  }, [allPlantings]);

  // Zones with rotation data (skip walkways)
  const zoneData = useMemo(() => {
    return zones
      .filter(z => z.zone_type !== "walkway")
      .map(z => {
        const plot = plots.find(p => p.id === z.plot_id);
        const plantingHistory = plantingsByZone.get(z.id) ?? [];
        const sortedHistory = [...plantingHistory].sort((a, b) => (b.season_year ?? 0) - (a.season_year ?? 0));
        const health = checkRotationHealth(plantingHistory);
        const lastFamily = sortedHistory[0]?.plant_family ?? null;
        const suggestedFamilies = lastFamily ? (ROTATION_NEXT[lastFamily] ?? []) : [];
        return { zone: z, plot, sortedHistory, health, lastFamily, suggestedFamilies };
      });
  }, [zones, plots, plantingsByZone]);

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🔄 Crop Rotation</Text>
        <TouchableOpacity onPress={() => setShowGuide(!showGuide)} className="px-3 py-1 bg-green-50 rounded-xl">
          <Text className="text-green-700 text-sm font-medium">{showGuide ? "Hide guide" : "4-yr guide"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
        {/* 4-year rotation reference */}
        {showGuide && (
          <Card className="bg-green-50 border-green-200">
            <Text className="text-sm font-bold text-green-800 mb-3">Ideal 4-Year Rotation</Text>
            <View className="gap-2">
              {ROTATION_STEPS.map((step) => (
                <View key={step.step} className="flex-row items-start gap-3">
                  <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: step.bg }}>
                    <Text className="text-xs font-bold" style={{ color: step.color }}>{step.step}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-800">{step.label}</Text>
                    <Text className="text-xs text-gray-500">{step.note}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="mt-3 pt-3 border-t border-green-200">
              <Text className="text-xs text-green-700 leading-5">
                Rotate crops so the same plant family never occupies the same bed two years in a row. This breaks pest/disease cycles and maintains soil health.
              </Text>
            </View>
          </Card>
        )}

        {/* Summary row */}
        {!isLoading && zoneData.length > 0 && (
          <View className="flex-row gap-3">
            {[
              { label: "Good", count: zoneData.filter(z => z.health === "good").length, color: "#16a34a", bg: "#f0fdf4" },
              { label: "Warning", count: zoneData.filter(z => z.health === "warning").length, color: "#d97706", bg: "#fffbeb" },
              { label: "Violation", count: zoneData.filter(z => z.health === "violation").length, color: "#dc2626", bg: "#fef2f2" },
            ].map(s => (
              <View key={s.label} className="flex-1 rounded-xl p-3 items-center" style={{ backgroundColor: s.bg }}>
                <Text className="text-xl font-bold" style={{ color: s.color }}>{s.count}</Text>
                <Text className="text-xs font-medium" style={{ color: s.color }}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#16a34a" />
            <Text className="text-gray-400 text-sm mt-3">Loading garden history…</Text>
          </View>
        ) : zoneData.length === 0 ? (
          <View className="items-center py-16 px-4">
            <Text className="text-4xl mb-4">🌱</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">No zones yet</Text>
            <Text className="text-sm text-gray-400 mt-2 text-center">
              Create zones on your garden map and add plantings to track crop rotation.
            </Text>
          </View>
        ) : (
          zoneData.map(({ zone, plot, sortedHistory, health, lastFamily, suggestedFamilies }) => (
            <ZoneRotationCard
              key={zone.id}
              zone={zone}
              plotName={plot?.name ?? ""}
              history={sortedHistory}
              health={health}
              lastFamily={lastFamily}
              suggestedFamilies={suggestedFamilies}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ZoneRotationCard({
  zone,
  plotName,
  history,
  health,
  lastFamily,
  suggestedFamilies,
}: {
  zone: GardenZone;
  plotName: string;
  history: GardenPlanting[];
  health: "good" | "warning" | "violation";
  lastFamily: string | null;
  suggestedFamilies: string[];
}) {
  const healthConfig = {
    good:      { label: "Good rotation", color: "#16a34a", bg: "#f0fdf4", icon: "✓" },
    warning:   { label: "Watch rotation", color: "#d97706", bg: "#fffbeb", icon: "⚠" },
    violation: { label: "Same family repeated", color: "#dc2626", bg: "#fef2f2", icon: "✗" },
  }[health];

  return (
    <Card className="p-0 overflow-hidden">
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100">
        <View>
          <Text className="text-sm font-bold text-gray-900">{zone.name}</Text>
          <Text className="text-xs text-gray-500">{plotName}</Text>
        </View>
        <View className="flex-row items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: healthConfig.bg }}>
          <Text style={{ color: healthConfig.color }}>{healthConfig.icon}</Text>
          <Text className="text-xs font-semibold" style={{ color: healthConfig.color }}>{healthConfig.label}</Text>
        </View>
      </View>

      <View className="px-4 py-3 gap-3">
        {/* Planting history timeline */}
        {history.length > 0 ? (
          <View>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Planting History</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {history.slice(0, 6).map((p) => {
                  const fam = p.plant_family ?? "Other";
                  const famInfo = PLANT_FAMILIES[fam] ?? PLANT_FAMILIES.Other;
                  const rotStep = getRotationStep(fam);
                  return (
                    <View key={p.id} className="items-center" style={{ minWidth: 64 }}>
                      <View className="w-12 h-12 rounded-xl items-center justify-center mb-1" style={{ backgroundColor: famInfo.bg }}>
                        <Text className="text-xs font-bold" style={{ color: famInfo.color }}>
                          {rotStep > 0 ? `Y${rotStep}` : "–"}
                        </Text>
                      </View>
                      <Text className="text-xs text-center text-gray-700 font-medium" numberOfLines={2} style={{ maxWidth: 64 }}>
                        {p.plant_name}
                      </Text>
                      <Text className="text-xs text-gray-400">{p.season_year}</Text>
                      <View className="mt-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: famInfo.bg }}>
                        <Text style={{ color: famInfo.color, fontSize: 9 }}>{fam.slice(0, 8)}</Text>
                      </View>
                    </View>
                  );
                })}
                {history.length === 0 && (
                  <Text className="text-sm text-gray-400 py-2">No planting history</Text>
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
          <Text className="text-sm text-gray-400">No planting history yet</Text>
        )}

        {/* Next rotation suggestion */}
        {suggestedFamilies.length > 0 && (
          <View className="bg-green-50 rounded-xl p-3">
            <Text className="text-xs font-semibold text-green-700 mb-2">
              ✓ Plant next: rotate away from {lastFamily}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {suggestedFamilies.map((fam) => {
                const famInfo = PLANT_FAMILIES[fam] ?? PLANT_FAMILIES.Other;
                return (
                  <View key={fam} className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: famInfo.bg }}>
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: famInfo.color }} />
                    <Text className="text-xs font-medium" style={{ color: famInfo.color }}>{fam}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {history.length === 0 && (
          <View className="bg-gray-50 rounded-xl p-3">
            <Text className="text-xs text-gray-500 text-center">Add plantings to this zone to track rotation history</Text>
          </View>
        )}
      </View>
    </Card>
  );
}
