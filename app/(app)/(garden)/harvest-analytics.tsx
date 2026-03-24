import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { useHouseholdStore } from "@/stores/householdStore";
import { useGardenAllHarvests, useGardenZonesByHousehold } from "@/hooks/useGarden";
import { PLANT_FAMILIES } from "@/types/app.types";

const UNIT_TO_LBS: Record<string, number> = {
  lbs: 1, oz: 0.0625, kg: 2.20462,
  quarts: 2.086, gallons: 8.344,
  // count, bunches, bags, other — skip weight conversion
};

function toOz(qty: number, unit: string): number | null {
  const factor = UNIT_TO_LBS[unit];
  return factor != null ? qty * factor * 16 : null; // oz for sorting
}

type Season = "all" | number;

export default function HarvestAnalyticsScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: harvests = [], isLoading } = useGardenAllHarvests(householdId);
  const { data: zones = [] } = useGardenZonesByHousehold(householdId);

  const currentYear = new Date().getFullYear();
  const [season, setSeason] = useState<Season>(currentYear);

  const seasons = useMemo(() => {
    const years = new Set<number>();
    harvests.forEach((h) => {
      if (h.date) years.add(parseInt(h.date.split("-")[0]));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [harvests]);

  const filtered = useMemo(() =>
    season === "all" ? harvests : harvests.filter((h) => h.date?.startsWith(String(season))),
    [harvests, season]
  );

  // ── By plant ────────────────────────────────────────────────────────────────
  const byPlant = useMemo(() => {
    const map = new Map<string, { count: number; totalOz: number | null; units: Set<string>; family: string | null }>();
    filtered.forEach((h) => {
      const name = h.garden_plantings?.plant_name ?? "Unknown";
      const existing = map.get(name) ?? { count: 0, totalOz: null, units: new Set<string>(), family: h.garden_plantings?.plant_family ?? null };
      existing.count += 1;
      if (h.quantity_value && h.quantity_unit) {
        const oz = toOz(h.quantity_value, h.quantity_unit);
        if (oz != null) {
          existing.totalOz = (existing.totalOz ?? 0) + oz;
        }
        existing.units.add(h.quantity_unit);
      }
      map.set(name, existing);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => (b.totalOz ?? 0) - (a.totalOz ?? 0));
  }, [filtered]);

  // ── By month ────────────────────────────────────────────────────────────────
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((h) => {
      if (!h.date) return;
      const month = h.date.slice(0, 7); // "2026-03"
      map.set(month, (map.get(month) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const maxMonthCount = Math.max(1, ...byMonth.map(([, c]) => c));

  // ── By zone ─────────────────────────────────────────────────────────────────
  const byZone = useMemo(() => {
    const map = new Map<string, { count: number; plants: Set<string> }>();
    filtered.forEach((h) => {
      const zoneId = h.garden_plantings?.zone_id ?? null;
      const zoneName = zoneId ? (zones.find((z) => z.id === zoneId)?.name ?? "Unknown Zone") : "No zone";
      const existing = map.get(zoneName) ?? { count: 0, plants: new Set<string>() };
      existing.count += 1;
      if (h.garden_plantings?.plant_name) existing.plants.add(h.garden_plantings.plant_name);
      map.set(zoneName, existing);
    });
    return Array.from(map.entries())
      .map(([zone, d]) => ({ zone, count: d.count, plants: Array.from(d.plants) }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, zones]);

  const totalHarvests = filtered.length;
  const totalWeightOz = filtered.reduce((sum, h) => {
    if (!h.quantity_value || !h.quantity_unit) return sum;
    const oz = toOz(h.quantity_value, h.quantity_unit);
    return sum + (oz ?? 0);
  }, 0);

  function fmtWeight(oz: number) {
    if (oz >= 16) return `${(oz / 16).toFixed(1)} lbs`;
    return `${oz.toFixed(0)} oz`;
  }

  const MONTH_LABELS: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🌾 Harvest Analytics</Text>
      </View>

      {/* Season selector */}
      <View className="px-4 py-2 bg-white border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSeason("all")}
              className={`px-3 py-1.5 rounded-xl border ${season === "all" ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
            >
              <Text className={`text-sm font-medium ${season === "all" ? "text-white" : "text-gray-700"}`}>All Time</Text>
            </TouchableOpacity>
            {seasons.map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => setSeason(y)}
                className={`px-3 py-1.5 rounded-xl border ${season === y ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
              >
                <Text className={`text-sm font-medium ${season === y ? "text-white" : "text-gray-700"}`}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading harvests…</Text>
        </View>
      ) : totalHarvests === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">🌱</Text>
          <Text className="text-gray-500 text-sm font-medium text-center">No harvests logged yet</Text>
          <Text className="text-gray-400 text-xs mt-1 text-center">
            Log harvests from your garden map to track yield over time.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* ── Summary row ───────────────────────────────────────────────── */}
          <View className="flex-row gap-3">
            <Card className="flex-1 items-center py-4">
              <Text className="text-2xl font-bold text-green-700">{totalHarvests}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Harvests</Text>
            </Card>
            {totalWeightOz > 0 && (
              <Card className="flex-1 items-center py-4">
                <Text className="text-2xl font-bold text-green-700">{fmtWeight(totalWeightOz)}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Total Yield</Text>
              </Card>
            )}
            <Card className="flex-1 items-center py-4">
              <Text className="text-2xl font-bold text-green-700">{byPlant.length}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Plants</Text>
            </Card>
          </View>

          {/* ── By plant ──────────────────────────────────────────────────── */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Yield by Plant</Text>
            <Card>
              <View className="gap-3">
                {byPlant.map((p, i) => {
                  const fam = p.family ? PLANT_FAMILIES[p.family] : PLANT_FAMILIES.Other;
                  const maxOz = byPlant[0]?.totalOz ?? 1;
                  const barPct = p.totalOz != null && maxOz > 0 ? p.totalOz / maxOz : 0;
                  return (
                    <View key={p.name}>
                      <View className="flex-row items-center gap-2 mb-1">
                        <View style={{ backgroundColor: fam.color }} className="w-2 h-2 rounded-full" />
                        <Text className="flex-1 text-sm font-medium text-gray-800">{p.name}</Text>
                        <Text className="text-xs text-gray-400">{p.count} harvest{p.count !== 1 ? "s" : ""}</Text>
                        {p.totalOz != null && (
                          <Text className="text-xs font-semibold text-green-700 w-16 text-right">
                            {fmtWeight(p.totalOz)}
                          </Text>
                        )}
                      </View>
                      {p.totalOz != null && (
                        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-4">
                          <View
                            style={{ width: `${barPct * 100}%`, backgroundColor: fam.color }}
                            className="h-full rounded-full"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>

          {/* ── Monthly trend ─────────────────────────────────────────────── */}
          {byMonth.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Harvests by Month</Text>
              <Card>
                <View className="flex-row items-end gap-2 h-24">
                  {byMonth.map(([month, count]) => {
                    const pct = count / maxMonthCount;
                    const [, mm] = month.split("-");
                    return (
                      <View key={month} className="flex-1 items-center gap-1">
                        <Text className="text-green-700 text-xs font-semibold">{count}</Text>
                        <View
                          style={{ height: Math.max(4, pct * 64) }}
                          className="w-full bg-green-400 rounded-t-sm"
                        />
                        <Text className="text-xs text-gray-400">{MONTH_LABELS[mm] ?? mm}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </View>
          )}

          {/* ── By zone ───────────────────────────────────────────────────── */}
          {byZone.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Harvests by Zone</Text>
              <Card>
                <View className="gap-2.5">
                  {byZone.map(({ zone, count, plants }) => {
                    const zoneInfo = zones.find((z) => z.name === zone);
                    return (
                      <View key={zone} className="flex-row items-center gap-3">
                        {zoneInfo && (
                          <View style={{ backgroundColor: zoneInfo.color }} className="w-3 h-3 rounded-sm" />
                        )}
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-800">{zone}</Text>
                          <Text className="text-xs text-gray-400" numberOfLines={1}>
                            {plants.slice(0, 4).join(", ")}
                            {plants.length > 4 ? ` +${plants.length - 4}` : ""}
                          </Text>
                        </View>
                        <View className="bg-green-100 rounded-lg px-2.5 py-1">
                          <Text className="text-green-800 text-xs font-semibold">
                            {count} harvest{count !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </View>
          )}

          {/* ── Recent harvests ────────────────────────────────────────────── */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Recent Harvests</Text>
            <Card>
              <View className="gap-2">
                {filtered.slice(0, 20).map((h) => (
                  <View key={h.id} className="flex-row items-center gap-2 py-1">
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-800">
                        {h.garden_plantings?.plant_name ?? "Unknown"}
                        {h.garden_plantings?.variety ? ` · ${h.garden_plantings.variety}` : ""}
                      </Text>
                      <Text className="text-xs text-gray-400">{h.date}</Text>
                    </View>
                    {h.quantity_value != null && (
                      <Text className="text-sm font-semibold text-green-700">
                        {h.quantity_value} {h.quantity_unit ?? ""}
                      </Text>
                    )}
                  </View>
                ))}
                {filtered.length > 20 && (
                  <Text className="text-xs text-gray-400 text-center mt-1">
                    Showing 20 of {filtered.length} harvests
                  </Text>
                )}
              </View>
            </Card>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
