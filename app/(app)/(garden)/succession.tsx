import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/Card";
import { PLANT_FAMILIES } from "@/types/app.types";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenPlots,
  useGardenZonesByHousehold,
  useGardenPlantingsForHousehold,
} from "@/hooks/useGarden";
import {
  SUCCESSION_CROPS,
  CROP_STATUS_LABELS,
  getFrostDates,
  getStartIndoorsWindow,
  getDirectSowSpringWindow,
  getDirectSowFallWindow,
  getSuccessionSchedule,
  getCropStatus,
  getZoneRecommendations,
  type ZoneRecommendation,
} from "@/utils/successionUtils";

const TODAY = new Date();

function relativeLabel(date: Date): string {
  const days = differenceInDays(date, TODAY);
  if (days === 0) return "today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
}

export default function SuccessionScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const [tab, setTab] = useState<"guide" | "garden">("guide");
  const [selectedId, setSelectedId] = useState<string | null>("peas_snap");

  const { lastSpringFrost, firstFallFrost } = getFrostDates(TODAY.getFullYear());

  // ── Guide tab data ─────────────────────────────────────────────────────────
  const selectedCrop = SUCCESSION_CROPS.find((c) => c.id === selectedId) ?? null;
  const indoorsWindow  = selectedCrop ? getStartIndoorsWindow(selectedCrop, TODAY) : null;
  const springWindow   = selectedCrop ? getDirectSowSpringWindow(selectedCrop, TODAY) : null;
  const fallWindow     = selectedCrop ? getDirectSowFallWindow(selectedCrop, TODAY) : null;
  const status         = selectedCrop ? getCropStatus(selectedCrop, TODAY) : null;
  const statusInfo     = status ? CROP_STATUS_LABELS[status] : null;
  const successionStart = springWindow?.earliest ?? fallWindow?.earliest ?? TODAY;
  const successions = selectedCrop
    ? getSuccessionSchedule(selectedCrop, TODAY, successionStart)
    : [];
  const familyInfo = selectedCrop ? (PLANT_FAMILIES[selectedCrop.family] ?? PLANT_FAMILIES.Other) : null;

  // ── My Garden tab data ─────────────────────────────────────────────────────
  const { data: plots = [], isLoading: plotsLoading } = useGardenPlots(householdId);
  const { data: zones = [], isLoading: zonesLoading } = useGardenZonesByHousehold(householdId);
  const { data: plantings = [], isLoading: plantingsLoading } = useGardenPlantingsForHousehold(householdId);

  const gardenLoading = plotsLoading || zonesLoading || plantingsLoading;

  const recommendations = useMemo<ZoneRecommendation[]>(() => {
    if (!plots.length || !zones.length) return [];
    return getZoneRecommendations(
      plots.map(p => ({ id: p.id, name: p.name })),
      zones.map(z => ({ id: z.id, plotId: z.plot_id, name: z.name, zoneType: z.zone_type })),
      (plantings as any[]).map((p: any) => ({
        id: p.id,
        plotId: p.plot_id,
        zoneId: p.zone_id,
        plantName: p.plant_name,
        plantFamily: p.plant_family,
        datePlanted: p.date_planted,
        dateRemoved: p.date_removed,
      })),
      TODAY
    );
  }, [plots, zones, plantings]);

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🌱 Succession Planner</Text>
      </View>

      {/* Zone reference bar */}
      <View className="bg-green-700 px-4 py-2 flex-row items-center gap-4">
        <Text className="text-green-100 text-xs font-medium">Zone 8b / Seattle</Text>
        <Text className="text-green-200 text-xs">
          Last frost: {format(lastSpringFrost, "MMM d")}
        </Text>
        <Text className="text-green-200 text-xs">
          First fall frost: {format(firstFallFrost, "MMM d")}
        </Text>
      </View>

      {/* Tab switcher */}
      <View className="flex-row px-4 pt-3 pb-1 gap-2">
        <TouchableOpacity
          onPress={() => setTab("guide")}
          className={`flex-1 py-2 rounded-xl border items-center ${tab === "guide" ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
        >
          <Text className={`text-sm font-semibold ${tab === "guide" ? "text-white" : "text-gray-700"}`}>
            📋 Crop Guide
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("garden")}
          className={`flex-1 py-2 rounded-xl border items-center ${tab === "garden" ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
        >
          <Text className={`text-sm font-semibold ${tab === "garden" ? "text-white" : "text-gray-700"}`}>
            🗺 My Garden
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Crop Guide tab ─────────────────────────────────────────────────────── */}
      {tab === "guide" && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="pt-2 pb-1">
            <Text className="text-xs font-semibold text-gray-500 px-4 mb-2">SELECT A CROP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {SUCCESSION_CROPS.map((crop) => {
                const s = getCropStatus(crop, TODAY);
                const isActive = ["start_indoors_now","direct_sow_now","fall_sow_now","start_indoors_soon","direct_sow_soon","fall_sow_soon"].includes(s);
                const isSel = selectedId === crop.id;
                return (
                  <TouchableOpacity
                    key={crop.id}
                    onPress={() => setSelectedId(crop.id)}
                    className={`px-3 py-2 rounded-xl border ${isSel ? "border-green-600 bg-green-600" : isActive ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}
                  >
                    <Text className={`text-sm font-medium ${isSel ? "text-white" : isActive ? "text-green-700" : "text-gray-600"}`}>
                      {crop.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {selectedCrop && statusInfo && familyInfo ? (
            <View className="px-4 pt-3 gap-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-gray-900">{selectedCrop.name}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="flex-row items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: familyInfo.bg }}>
                      <View style={{ backgroundColor: familyInfo.color }} className="w-2 h-2 rounded-full" />
                      <Text className="text-xs" style={{ color: familyInfo.color }}>{selectedCrop.family}</Text>
                    </View>
                    <Text className="text-xs text-gray-400">
                      {selectedCrop.daysToMaturity[0]}–{selectedCrop.daysToMaturity[1]} days to maturity
                    </Text>
                  </View>
                </View>
                <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: statusInfo.bg }}>
                  <Text className="text-xs font-semibold" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
                </View>
              </View>

              {indoorsWindow && (
                <Card>
                  <Text className="text-sm font-semibold text-gray-800 mb-2">🪴 Start Indoors</Text>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-bold text-green-700">
                        {format(indoorsWindow.earliest, "MMM d")} – {format(indoorsWindow.latest, "MMM d")}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        Target: {format(indoorsWindow.earliest, "MMM d")} ({relativeLabel(indoorsWindow.earliest)})
                      </Text>
                    </View>
                    <Text className="text-2xl">🌿</Text>
                  </View>
                </Card>
              )}

              {springWindow && (
                <Card>
                  <Text className="text-sm font-semibold text-gray-800 mb-2">
                    {selectedCrop.startIndoorsWeeks ? "🌱 Transplant Outdoors" : "🌱 Direct Sow — Spring"}
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-bold text-green-700">
                        {format(springWindow.earliest, "MMM d")} – {format(springWindow.latest, "MMM d")}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {selectedCrop.directSowSpring?.label} ({relativeLabel(springWindow.earliest)})
                      </Text>
                      <Text className="text-xs text-gray-400 mt-0.5">
                        Expected harvest: {format(new Date(springWindow.earliest.getTime() + selectedCrop.daysToMaturity[0] * 86400000), "MMM d")}
                        {" – "}{format(new Date(springWindow.latest.getTime() + selectedCrop.daysToMaturity[1] * 86400000), "MMM d")}
                      </Text>
                    </View>
                    <Text className="text-2xl">🌤️</Text>
                  </View>
                </Card>
              )}

              {fallWindow && (
                <Card>
                  <Text className="text-sm font-semibold text-gray-800 mb-2">🍂 Direct Sow — Fall</Text>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-bold text-amber-600">
                        {format(fallWindow.earliest, "MMM d")} – {format(fallWindow.latest, "MMM d")}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {selectedCrop.directSowFall?.label} ({relativeLabel(fallWindow.earliest)})
                      </Text>
                    </View>
                    <Text className="text-2xl">🍁</Text>
                  </View>
                </Card>
              )}

              {successions.length > 0 && (
                <Card>
                  <Text className="text-sm font-semibold text-gray-800 mb-1">🔄 Succession Schedule</Text>
                  <Text className="text-xs text-gray-400 mb-3">
                    Sow every {selectedCrop.successionIntervalDays} days for continuous harvest
                  </Text>
                  <View className="gap-2">
                    {successions.map((s) => (
                      <View key={s.number} className="flex-row items-center gap-3">
                        <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                          <Text className="text-green-700 text-xs font-bold">{s.number}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-900">
                            Sow {format(s.sowDate, "MMM d")}
                            <Text className="text-gray-400 font-normal text-xs"> ({relativeLabel(s.sowDate)})</Text>
                          </Text>
                          <Text className="text-xs text-green-600">
                            Harvest {format(s.harvestStart, "MMM d")} – {format(s.harvestEnd, "MMM d")}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              <Card className="bg-green-50 border-green-200">
                <Text className="text-sm font-semibold text-green-800 mb-1">📍 Zone 8b Notes</Text>
                <Text className="text-sm text-green-700 leading-5">{selectedCrop.zone8bNotes}</Text>
              </Card>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-8 py-16">
              <Text className="text-4xl mb-4">🥬</Text>
              <Text className="text-base font-semibold text-gray-700 text-center">Select a crop above</Text>
              <Text className="text-sm text-gray-400 mt-2 text-center">
                Tap any crop chip to see Zone 8b planting windows and succession schedule.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── My Garden tab ──────────────────────────────────────────────────────── */}
      {tab === "garden" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          {gardenLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#16a34a" />
              <Text className="text-gray-400 text-sm mt-3">Loading your garden…</Text>
            </View>
          ) : recommendations.length === 0 ? (
            <View className="items-center py-16 px-4">
              <Text className="text-4xl mb-4">🗺</Text>
              <Text className="text-base font-semibold text-gray-700 text-center">No garden zones yet</Text>
              <Text className="text-sm text-gray-400 mt-2 text-center">
                Create zones on your garden map to get planting recommendations here.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {recommendations.length} zone{recommendations.length !== 1 ? "s" : ""} · what to plant next
              </Text>
              {recommendations.map((rec) => (
                <ZoneRecommendationCard key={rec.zoneKey} rec={rec} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ZoneRecommendationCard({ rec }: { rec: ZoneRecommendation }) {
  const [expanded, setExpanded] = useState(false);

  const headerColor = rec.isAlreadyFree
    ? "bg-green-600"
    : rec.daysUntilFree <= 30
    ? "bg-blue-600"
    : "bg-gray-500";

  const statusLabel = rec.isAlreadyFree
    ? "Available now"
    : rec.daysUntilFree <= 30
    ? `Free in ~${rec.daysUntilFree} days`
    : rec.estimatedFreeDate
    ? `Free ~${format(rec.estimatedFreeDate, "MMM d")}`
    : "Occupied";

  return (
    <Card className="p-0 overflow-hidden">
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View className={`${headerColor} px-4 py-3`}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-sm font-bold">{rec.zoneName}</Text>
              <Text className="text-white opacity-80 text-xs">{rec.plotName}</Text>
            </View>
            <View className="items-end">
              <View className="bg-white/20 rounded-lg px-2 py-0.5 mb-1">
                <Text className="text-white text-xs font-medium">{statusLabel}</Text>
              </View>
              <Text className="text-white opacity-70 text-xs">{expanded ? "▲ hide" : "▼ show crops"}</Text>
            </View>
          </View>
          {rec.currentPlanting && (
            <View className="mt-2 flex-row items-center gap-2">
              <Text className="text-white opacity-80 text-xs">
                🌱 {rec.currentPlanting.plantName}
                {rec.currentFamily ? ` · ${rec.currentFamily}` : ""}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 py-3 gap-3">
          {rec.currentPlanting && rec.estimatedFreeDate && (
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-xs font-semibold text-gray-600 mb-1">Currently Growing</Text>
              <Text className="text-sm font-medium text-gray-900">{rec.currentPlanting.plantName}</Text>
              {rec.currentPlanting.datePlanted && (
                <Text className="text-xs text-gray-500">
                  Planted {rec.currentPlanting.datePlanted}
                  {" · "}Est. harvest by {format(rec.estimatedFreeDate, "MMM d, yyyy")}
                </Text>
              )}
            </View>
          )}

          {rec.isAlreadyFree && (
            <View className="bg-green-50 rounded-xl p-3">
              <Text className="text-xs font-semibold text-green-700">✓ This zone is ready to plant</Text>
            </View>
          )}

          {rec.recommendedCrops.length > 0 ? (
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Recommended next crops
              </Text>
              <View className="gap-2">
                {rec.recommendedCrops.map((r) => {
                  const statusInfo = CROP_STATUS_LABELS[r.status];
                  const famInfo = PLANT_FAMILIES[r.crop.family] ?? PLANT_FAMILIES.Other;
                  return (
                    <View key={r.crop.id} className="flex-row items-start gap-3 bg-gray-50 rounded-xl p-3">
                      {r.rotationScore === 3 && (
                        <Text className="text-lg mt-0.5">⭐</Text>
                      )}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-sm font-semibold text-gray-900">{r.crop.name}</Text>
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: famInfo.bg }}>
                            <Text className="text-xs" style={{ color: famInfo.color }}>{r.crop.family}</Text>
                          </View>
                          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: statusInfo.bg }}>
                            <Text className="text-xs font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
                          </View>
                        </View>
                        <Text className="text-xs text-gray-500 mt-1">{r.reasonText}</Text>
                        {r.sowDate && (
                          <Text className="text-xs text-green-600 mt-0.5">
                            Sow: {format(r.sowDate, "MMM d")} ({relativeLabel(r.sowDate)})
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text className="text-sm text-gray-400 text-center py-2">No recommendations available</Text>
          )}
        </View>
      )}
    </Card>
  );
}
