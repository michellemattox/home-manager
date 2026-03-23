import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/Card";
import { PLANT_FAMILIES } from "@/types/app.types";
import {
  SUCCESSION_CROPS,
  CROP_STATUS_LABELS,
  getFrostDates,
  getStartIndoorsWindow,
  getDirectSowSpringWindow,
  getDirectSowFallWindow,
  getSuccessionSchedule,
  getCropStatus,
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
  const [selectedId, setSelectedId] = useState<string | null>("peas_snap");

  const { lastSpringFrost, firstFallFrost } = getFrostDates(TODAY.getFullYear());

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

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Crop picker */}
        <View className="pt-3 pb-1">
          <Text className="text-xs font-semibold text-gray-500 px-4 mb-2">
            SELECT A CROP
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {SUCCESSION_CROPS.map((crop) => {
              const s = getCropStatus(crop, TODAY);
              const isActive = ["start_indoors_now","direct_sow_now","fall_sow_now","start_indoors_soon","direct_sow_soon","fall_sow_soon"].includes(s);
              const isSelected = selectedId === crop.id;
              return (
                <TouchableOpacity
                  key={crop.id}
                  onPress={() => setSelectedId(crop.id)}
                  className={`px-3 py-2 rounded-xl border ${isSelected ? "border-green-600 bg-green-600" : isActive ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}
                >
                  <Text className={`text-sm font-medium ${isSelected ? "text-white" : isActive ? "text-green-700" : "text-gray-600"}`}>
                    {crop.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedCrop && statusInfo && familyInfo ? (
          <View className="px-4 pt-3 gap-4">
            {/* Crop header */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-bold text-gray-900">{selectedCrop.name}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View
                    className="flex-row items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ backgroundColor: familyInfo.bg }}
                  >
                    <View style={{ backgroundColor: familyInfo.color }} className="w-2 h-2 rounded-full" />
                    <Text className="text-xs" style={{ color: familyInfo.color }}>{selectedCrop.family}</Text>
                  </View>
                  <Text className="text-xs text-gray-400">
                    {selectedCrop.daysToMaturity[0]}–{selectedCrop.daysToMaturity[1]} days to maturity
                  </Text>
                </View>
              </View>
              <View
                className="px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: statusInfo.bg }}
              >
                <Text className="text-xs font-semibold" style={{ color: statusInfo.color }}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            {/* Start indoors */}
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

            {/* Direct sow spring */}
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

            {/* Direct sow fall */}
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
                    <Text className="text-xs text-gray-400 mt-0.5">
                      Expected harvest: {format(new Date(fallWindow.earliest.getTime() + selectedCrop.daysToMaturity[0] * 86400000), "MMM d")}
                      {" +"}
                    </Text>
                  </View>
                  <Text className="text-2xl">🍁</Text>
                </View>
              </Card>
            )}

            {/* Succession schedule */}
            {successions.length > 0 && (
              <Card>
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  🔄 Succession Schedule
                </Text>
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
                          <Text className="text-gray-400 font-normal text-xs">
                            {" "}({relativeLabel(s.sowDate)})
                          </Text>
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

            {/* Zone 8b notes */}
            <Card className="bg-green-50 border-green-200">
              <Text className="text-sm font-semibold text-green-800 mb-1">
                📍 Zone 8b Notes
              </Text>
              <Text className="text-sm text-green-700 leading-5">{selectedCrop.zone8bNotes}</Text>
            </Card>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-8 py-16">
            <Text className="text-4xl mb-4">🥬</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">
              Select a crop above
            </Text>
            <Text className="text-sm text-gray-400 mt-2 text-center">
              Tap any crop chip to see Zone 8b planting windows and succession schedule.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
