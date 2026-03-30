import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenPlots,
  useCreateGardenPlot,
  useDeleteGardenPlot,
  useGardenSeeds,
  useGardenJournal,
  useGardenWatering,
  useGardenPestLogs,
  useGardenAllHarvests,
} from "@/hooks/useGarden";
import { useGardenWeather } from "@/hooks/useGardenWeather";
import type { GardenPlot } from "@/types/app.types";

const PLOT_PRESETS = [
  { label: "10×20 Veggie Bed", cols: 10, rows: 20 },
  { label: "4×8 Raised Bed",   cols: 4,  rows: 8  },
  { label: "8×8 Square",       cols: 8,  rows: 8  },
  { label: "Custom",           cols: 0,  rows: 0  },
];

function SectionHeader({
  title,
  emoji,
  isOpen,
  onToggle,
  badge,
}: {
  title: string;
  emoji: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-base">{emoji}</Text>
        <Text className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</Text>
        {badge ? (
          <View className="bg-gray-100 rounded-full px-2 py-0.5">
            <Text className="text-xs text-gray-500">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</Text>
    </TouchableOpacity>
  );
}

function NavButton({
  emoji,
  label,
  sublabel,
  colorClass,
  borderClass,
  textClass,
  subTextClass,
  onPress,
}: {
  emoji: string;
  label: string;
  sublabel: string;
  colorClass: string;
  borderClass: string;
  textClass: string;
  subTextClass: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 flex-row items-center gap-2 border ${borderClass} ${colorClass} rounded-xl px-3 py-2`}
    >
      <Text className="text-lg">{emoji}</Text>
      <View className="flex-1">
        <Text className={`text-xs font-semibold ${textClass}`}>{label}</Text>
        <Text className={`text-xs ${subTextClass}`} numberOfLines={1}>{sublabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function GardenScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: plots = [], isLoading, refetch } = useGardenPlots(householdId);
  const createPlot = useCreateGardenPlot();
  const deletePlot = useDeleteGardenPlot();

  // Dashboard data
  const { data: seeds = [] } = useGardenSeeds(householdId);
  const { data: journal = [] } = useGardenJournal(householdId);
  const { data: watering = [] } = useGardenWatering(householdId);
  const { data: pestLogs = [] } = useGardenPestLogs(householdId);
  const { data: allHarvests = [] } = useGardenAllHarvests(householdId);

  const zipCode = household?.zip_code ?? null;
  const { data: weather } = useGardenWeather(zipCode, householdId);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Section open/close state (all open by default)
  const [planningOpen, setPlanningOpen] = useState(true);
  const [maintenanceOpen, setMaintenanceOpen] = useState(true);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(true);

  // New garden modal state
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState(PLOT_PRESETS[0]);
  const [customCols, setCustomCols] = useState("10");
  const [customRows, setCustomRows] = useState("20");

  function resetForm() {
    setName("");
    setDescription("");
    setPreset(PLOT_PRESETS[0]);
    setCustomCols("10");
    setCustomRows("20");
  }

  async function handleCreate() {
    if (!householdId || !name.trim()) return;
    const cols = preset.cols > 0 ? preset.cols : parseInt(customCols) || 10;
    const rows = preset.rows > 0 ? preset.rows : parseInt(customRows) || 20;
    await createPlot.mutateAsync({
      household_id: householdId,
      name: name.trim(),
      description: description.trim() || null,
      cols,
      rows,
    });
    resetForm();
    setShowNew(false);
  }

  function confirmDelete(plot: GardenPlot) {
    Alert.alert(
      "Delete Garden",
      `Remove "${plot.name}" and all its zones and plantings? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deletePlot.mutate({ id: plot.id, householdId: plot.household_id }),
        },
      ]
    );
  }

  // Dashboard summaries
  const lastJournal = journal[0];
  const lastJournalDays = lastJournal
    ? Math.floor((Date.now() - new Date(lastJournal.created_at).getTime()) / 86400000)
    : null;

  const lastWatering = watering[0];
  const lastWateringDays = lastWatering
    ? Math.floor((Date.now() - new Date(lastWatering.water_date ?? lastWatering.created_at).getTime()) / 86400000)
    : null;

  const activePests = pestLogs.filter((p: any) => p.status === "active" || p.status === "monitoring").length;

  const recentHarvestsThisMonth = allHarvests.filter((h: any) => {
    const d = new Date(h.date ?? h.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <AppHeader compact />

      {/* Title row */}
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">🌱 Garden</Text>
        <TouchableOpacity
          onPress={() => setShowNew(true)}
          className="bg-green-600 rounded-xl px-4 py-2"
        >
          <Text className="text-white font-semibold text-sm">+ New Garden</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
      >
        {/* ── PLANNING ───────────────────────────────────────────────────── */}
        <SectionHeader
          emoji="📋"
          title="Planning"
          isOpen={planningOpen}
          onToggle={() => setPlanningOpen((v) => !v)}
          badge={seeds.length > 0 ? `${seeds.length} seeds` : undefined}
        />

        {planningOpen && (
          <View className="bg-[#F2FCEB] px-4 pt-3 pb-2">
            {/* Mini-dashboard */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white rounded-xl p-3 border border-green-100">
                <Text className="text-xs text-gray-500 mb-0.5">Seed inventory</Text>
                <Text className="text-lg font-bold text-green-700">{seeds.length}</Text>
                <Text className="text-xs text-gray-400">varieties tracked</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border border-green-100">
                <Text className="text-xs text-gray-500 mb-0.5">Active plots</Text>
                <Text className="text-lg font-bold text-green-700">{plots.length}</Text>
                <Text className="text-xs text-gray-400">garden zones</Text>
              </View>
            </View>

            {/* Nav buttons */}
            <View className="flex-row gap-2 mb-2">
              <NavButton
                emoji="📅"
                label="Succession"
                sublabel="Planner"
                colorClass="bg-green-50"
                borderClass="border-green-200"
                textClass="text-green-800"
                subTextClass="text-green-500"
                onPress={() => router.push("/(app)/(garden)/succession")}
              />
              <NavButton
                emoji="🔄"
                label="Rotation"
                sublabel="By zone"
                colorClass="bg-purple-50"
                borderClass="border-purple-200"
                textClass="text-purple-800"
                subTextClass="text-purple-500"
                onPress={() => router.push("/(app)/(garden)/rotation")}
              />
              <NavButton
                emoji="🌱"
                label="Seeds"
                sublabel="Inventory"
                colorClass="bg-emerald-50"
                borderClass="border-emerald-200"
                textClass="text-emerald-800"
                subTextClass="text-emerald-500"
                onPress={() => router.push("/(app)/(garden)/seeds")}
              />
            </View>
            <View className="flex-row gap-2 mb-3">
              <NavButton
                emoji="🌿"
                label="Companions"
                sublabel="Planting"
                colorClass="bg-teal-50"
                borderClass="border-teal-200"
                textClass="text-teal-800"
                subTextClass="text-teal-500"
                onPress={() => router.push("/(app)/(garden)/companion")}
              />
              <NavButton
                emoji="🗓"
                label="Calendar"
                sublabel="Planting guide"
                colorClass="bg-orange-50"
                borderClass="border-orange-200"
                textClass="text-orange-800"
                subTextClass="text-orange-500"
                onPress={() => router.push("/(app)/(garden)/calendar")}
              />
              <View className="flex-1" />
            </View>
          </View>
        )}

        {/* ── MAINTENANCE ────────────────────────────────────────────────── */}
        <SectionHeader
          emoji="🛠"
          title="Maintenance"
          isOpen={maintenanceOpen}
          onToggle={() => setMaintenanceOpen((v) => !v)}
          badge={recentHarvestsThisMonth > 0 ? `${recentHarvestsThisMonth} harvests this month` : undefined}
        />

        {maintenanceOpen && (
          <View className="bg-[#F2FCEB] px-4 pt-3 pb-2">
            {/* Mini-dashboard */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white rounded-xl p-3 border border-blue-100">
                <Text className="text-xs text-gray-500 mb-0.5">Last watered</Text>
                <Text className="text-lg font-bold text-blue-600">
                  {lastWateringDays === null ? "—" : lastWateringDays === 0 ? "Today" : `${lastWateringDays}d ago`}
                </Text>
                <Text className="text-xs text-gray-400">{watering.length} logs total</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border border-indigo-100">
                <Text className="text-xs text-gray-500 mb-0.5">Journal</Text>
                <Text className="text-lg font-bold text-indigo-600">
                  {lastJournalDays === null ? "—" : lastJournalDays === 0 ? "Today" : `${lastJournalDays}d ago`}
                </Text>
                <Text className="text-xs text-gray-400">last entry</Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border border-amber-100">
                <Text className="text-xs text-gray-500 mb-0.5">Harvests</Text>
                <Text className="text-lg font-bold text-amber-600">{recentHarvestsThisMonth}</Text>
                <Text className="text-xs text-gray-400">this month</Text>
              </View>
            </View>

            {/* Weather bar */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(garden)/weather")}
              className="flex-row items-center gap-2 border border-blue-200 bg-blue-50 rounded-xl px-3 py-2.5 mb-2"
            >
              {weather?.current.icon ? (
                <Image source={{ uri: `https://openweathermap.org/img/wn/${weather.current.icon}.png` }} style={{ width: 28, height: 28 }} />
              ) : (
                <Text className="text-xl">🌦</Text>
              )}
              <View className="flex-1">
                {weather?.current ? (
                  <>
                    <Text className="text-blue-800 text-sm font-semibold">{weather.current.temp}°F — {weather.current.description}</Text>
                    <Text className="text-blue-500 text-xs">{zipCode} · tap for forecast</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-blue-700 text-sm font-semibold">Weather</Text>
                    <Text className="text-blue-400 text-xs">{zipCode ? "Tap to load" : "Set zip in settings"}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Nav buttons */}
            <View className="flex-row gap-2 mb-2">
              <NavButton
                emoji="📓"
                label="Journal"
                sublabel="Notes & obs."
                colorClass="bg-indigo-50"
                borderClass="border-indigo-200"
                textClass="text-indigo-800"
                subTextClass="text-indigo-500"
                onPress={() => router.push("/(app)/(garden)/journal")}
              />
              <NavButton
                emoji="💧"
                label="Watering"
                sublabel="Tracker"
                colorClass="bg-blue-50"
                borderClass="border-blue-200"
                textClass="text-blue-800"
                subTextClass="text-blue-500"
                onPress={() => router.push("/(app)/(garden)/watering")}
              />
              <NavButton
                emoji="🌾"
                label="Harvests"
                sublabel="Analytics"
                colorClass="bg-amber-50"
                borderClass="border-amber-200"
                textClass="text-amber-800"
                subTextClass="text-amber-500"
                onPress={() => router.push("/(app)/(garden)/harvest-analytics")}
              />
            </View>
            <View className="flex-row gap-2 mb-3">
              <NavButton
                emoji="🛒"
                label="Shopping"
                sublabel="Garden list"
                colorClass="bg-lime-50"
                borderClass="border-lime-200"
                textClass="text-lime-800"
                subTextClass="text-lime-500"
                onPress={() => router.push("/(app)/(garden)/shopping")}
              />
              <View className="flex-1" />
              <View className="flex-1" />
            </View>
          </View>
        )}

        {/* ── TROUBLESHOOTING ────────────────────────────────────────────── */}
        <SectionHeader
          emoji="🔍"
          title="Troubleshooting"
          isOpen={troubleshootingOpen}
          onToggle={() => setTroubleshootingOpen((v) => !v)}
          badge={activePests > 0 ? `${activePests} active issue${activePests !== 1 ? "s" : ""}` : undefined}
        />

        {troubleshootingOpen && (
          <View className="bg-[#F2FCEB] px-4 pt-3 pb-2">
            {/* Mini-dashboard */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white rounded-xl p-3 border border-red-100">
                <Text className="text-xs text-gray-500 mb-0.5">Pest / disease logs</Text>
                <Text className="text-lg font-bold text-red-600">{pestLogs.length}</Text>
                <Text className="text-xs text-gray-400">
                  {activePests > 0 ? `${activePests} active` : "none active"}
                </Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-3 border border-cyan-100">
                <Text className="text-xs text-gray-500 mb-0.5">Plant library</Text>
                <Text className="text-lg font-bold text-cyan-600">📚</Text>
                <Text className="text-xs text-gray-400">Crop reference</Text>
              </View>
            </View>

            {/* Nav buttons */}
            <View className="flex-row gap-2 mb-3">
              <NavButton
                emoji="🐛"
                label="Pests"
                sublabel="& Diseases"
                colorClass="bg-red-50"
                borderClass="border-red-200"
                textClass="text-red-800"
                subTextClass="text-red-500"
                onPress={() => router.push("/(app)/(garden)/pests")}
              />
              <NavButton
                emoji="📚"
                label="Library"
                sublabel="Crop reference"
                colorClass="bg-cyan-50"
                borderClass="border-cyan-200"
                textClass="text-cyan-800"
                subTextClass="text-cyan-500"
                onPress={() => router.push("/(app)/(garden)/plant-library")}
              />
              <View className="flex-1" />
            </View>
          </View>
        )}

        {/* ── GARDEN PLOTS ───────────────────────────────────────────────── */}
        <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-gray-700 uppercase tracking-wide">Your Gardens</Text>
        </View>

        {isLoading ? (
          <View style={{ padding: 16, gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : plots.length === 0 ? (
          <View style={{ alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text className="text-5xl mb-4">🥬</Text>
            <Text className="text-lg font-semibold text-gray-700 text-center">No gardens yet</Text>
            <Text className="text-sm text-gray-400 mt-2 text-center">
              Tap "New Garden" to create your first bed or plot map.
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            {plots.map((plot) => (
              <PlotCard
                key={plot.id}
                plot={plot}
                onOpen={() =>
                  router.push({
                    pathname: "/(app)/(garden)/[plotId]",
                    params: { plotId: plot.id },
                  })
                }
                onDelete={() => confirmDelete(plot)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* New Garden Modal */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { resetForm(); setShowNew(false); }}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-gray-900">New Garden</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!name.trim() || createPlot.isPending}
            >
              <Text
                className={`text-base font-semibold ${
                  name.trim() ? "text-green-600" : "text-gray-300"
                }`}
              >
                {createPlot.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            <Input
              label="Garden Name *"
              placeholder="e.g. Main Veggie Plot, Side Yard Beds…"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Description"
              placeholder="Optional notes about this garden"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              className="min-h-[80px]"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Grid Size</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PLOT_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => setPreset(p)}
                  className={`px-3 py-2 rounded-xl border ${
                    preset.label === p.label
                      ? "bg-green-600 border-green-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      preset.label === p.label ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {preset.label === "Custom" && (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="Columns (width)"
                    keyboardType="number-pad"
                    value={customCols}
                    onChangeText={setCustomCols}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Rows (length)"
                    keyboardType="number-pad"
                    value={customRows}
                    onChangeText={setCustomRows}
                  />
                </View>
              </View>
            )}

            {preset.label !== "Custom" && preset.cols > 0 && (
              <Text className="text-gray-400 text-sm -mt-2 mb-4">
                {preset.cols} columns × {preset.rows} rows
              </Text>
            )}

            <View className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2">
              <Text className="text-green-800 text-sm font-medium mb-1">Zone 8b tips</Text>
              <Text className="text-green-700 text-xs">
                Your 10×20 veggie plot can be divided into zones for crop rotation tracking.
                Mark walkways as unusable areas to keep your layout accurate.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PlotCard({
  plot,
  onOpen,
  onDelete,
}: {
  plot: GardenPlot;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <TouchableOpacity onPress={onOpen} activeOpacity={0.7}>
        <View className="bg-green-700 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-white text-base font-bold">{plot.name}</Text>
          </View>
          <View className="bg-green-600 rounded-lg px-2 py-1">
            <Text className="text-green-100 text-xs">
              {plot.cols}×{plot.rows}
            </Text>
          </View>
        </View>

        <View className="px-4 py-3">
          {plot.description ? (
            <Text className="text-gray-600 text-sm mb-2">{plot.description}</Text>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-green-700 text-sm font-medium">Open Map →</Text>
            <TouchableOpacity
              onPress={onDelete}
              className="px-3 py-1 rounded-lg bg-red-50"
            >
              <Text className="text-red-500 text-xs">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
}
