import React, { useState } from "react";
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
  useGardenSeeds,
  useGardenJournal,
  useGardenWatering,
  useGardenPestLogs,
  useGardenAllHarvests,
  useGardenWeatherLogs,
} from "@/hooks/useGarden";
import {
  useGardenAreas,
  useCreateGardenArea,
  useUpdateGardenArea,
  useDeleteGardenArea,
} from "@/hooks/useGardenMap";
import { useGardenWeather } from "@/hooks/useGardenWeather";
import { useAppRefresh } from "@/hooks/useAppRefresh";
import type { GardenArea } from "@/types/app.types";

const AREA_PRESETS = [
  { label: "Whole yard 20×20", width: 20, length: 20 },
  { label: "Bed strip 4×12",   width: 4,  length: 12 },
  { label: "Patio 12×12",      width: 12, length: 12 },
  { label: "Greenhouse 8×10",  width: 8,  length: 10 },
  { label: "Custom",           width: 0,  length: 0  },
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

  const { data: plots = [], isLoading, refetch } = useGardenAreas(householdId);
  const createPlot = useCreateGardenArea();
  const updatePlot = useUpdateGardenArea();
  const deletePlot = useDeleteGardenArea();

  // Dashboard data
  const { data: seeds = [] } = useGardenSeeds(householdId);
  const { data: journal = [] } = useGardenJournal(householdId);
  const { data: watering = [] } = useGardenWatering(householdId);
  const { data: weatherLogs = [] } = useGardenWeatherLogs(householdId);
  const { data: pestLogs = [] } = useGardenPestLogs(householdId);
  const { data: allHarvests = [] } = useGardenAllHarvests(householdId);

  const zipCode = household?.zip_code ?? null;
  const { data: weather } = useGardenWeather(zipCode, householdId);

  const { refreshing, onRefresh } = useAppRefresh();

  // Section open/close state (all collapsed by default — tap carrot to expand)
  const [planningOpen, setPlanningOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);

  // New / Edit garden modal state (shared form)
  const [showNew, setShowNew] = useState(false);
  const [editingPlot, setEditingPlot] = useState<GardenArea | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState(AREA_PRESETS[0]);
  const [customCols, setCustomCols] = useState("20");
  const [customRows, setCustomRows] = useState("20");

  function resetForm() {
    setName("");
    setDescription("");
    setPreset(AREA_PRESETS[0]);
    setCustomCols("20");
    setCustomRows("20");
  }

  function openEdit(plot: GardenArea) {
    setEditingPlot(plot);
    setName(plot.name);
    setDescription(plot.notes ?? "");
    const match = AREA_PRESETS.find((p) => p.width === plot.width_ft && p.length === plot.length_ft && p.label !== "Custom");
    setPreset(match ?? AREA_PRESETS[AREA_PRESETS.length - 1]);
    setCustomCols(String(plot.width_ft));
    setCustomRows(String(plot.length_ft));
    setShowNew(true);
  }

  async function handleCreate() {
    if (!householdId || !name.trim()) return;
    const width = preset.width > 0 ? preset.width : parseFloat(customCols) || 20;
    const length = preset.length > 0 ? preset.length : parseFloat(customRows) || 20;
    if (editingPlot) {
      await updatePlot.mutateAsync({
        id: editingPlot.id,
        householdId,
        updates: { name: name.trim(), notes: description.trim() || null, width_ft: width, length_ft: length },
      });
    } else {
      await createPlot.mutateAsync({
        household_id: householdId,
        name: name.trim(),
        notes: description.trim() || null,
        width_ft: width,
        length_ft: length,
      });
    }
    setEditingPlot(null);
    resetForm();
    setShowNew(false);
  }

  function confirmDelete(plot: GardenArea) {
    Alert.alert(
      "Delete Garden Area",
      `Remove "${plot.name}" and everything in it (beds, paths, supports, plants)? This cannot be undone.`,
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

  // Treat significant rainfall (>=5mm) as a whole-garden watering — the
  // edge function also writes a rain watering log, but reading the weather
  // log directly makes the dashboard update without waiting for that insert.
  const effectiveLastWateredDate: string | null = (() => {
    const candidates: string[] = [];
    if (watering[0]?.water_date) candidates.push(watering[0].water_date);
    weatherLogs.forEach((w: any) => {
      if ((w.rainfall_mm ?? 0) >= 5) candidates.push(w.log_date);
    });
    return candidates.length > 0 ? candidates.slice().sort().reverse()[0] : null;
  })();
  const lastWateringDays = effectiveLastWateredDate
    ? Math.floor((Date.now() - new Date(effectiveLastWateredDate + "T12:00:00").getTime()) / 86400000)
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
                <Text className="text-xs text-gray-500 mb-0.5">Garden areas</Text>
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
                    // Expo Router regenerates typed routes on `expo start`; cast
                    // avoids a stale-types error right after renaming the file.
                    pathname: "/(app)/(garden)/[areaId]" as any,
                    params: { areaId: plot.id },
                  })
                }
                onEdit={() => openEdit(plot)}
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
            <TouchableOpacity onPress={() => { setEditingPlot(null); resetForm(); setShowNew(false); }}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-gray-900">
              {editingPlot ? "Edit Garden" : "New Garden"}
            </Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!name.trim() || createPlot.isPending || updatePlot.isPending}
            >
              <Text
                className={`text-base font-semibold ${
                  name.trim() ? "text-green-600" : "text-gray-300"
                }`}
              >
                {createPlot.isPending || updatePlot.isPending ? "Saving…" : "Save"}
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

            <Text className="text-sm font-medium text-gray-700 mb-2">Area Size (feet)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {AREA_PRESETS.map((p) => (
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
                    label="Width (ft)"
                    keyboardType="decimal-pad"
                    value={customCols}
                    onChangeText={setCustomCols}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Length (ft)"
                    keyboardType="decimal-pad"
                    value={customRows}
                    onChangeText={setCustomRows}
                  />
                </View>
              </View>
            )}

            {preset.label !== "Custom" && preset.width > 0 && (
              <Text className="text-gray-400 text-sm -mt-2 mb-4">
                {preset.width} ft wide × {preset.length} ft long
              </Text>
            )}

            <View className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2">
              <Text className="text-green-800 text-sm font-medium mb-1">Zone 8b tips</Text>
              <Text className="text-green-700 text-xs">
                Set the area to the real footprint of your yard or greenhouse — beds, paths, and
                supports are drawn to scale inside it, so spacing and "how many fit" stay accurate.
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
  onEdit,
  onDelete,
}: {
  plot: GardenArea;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <TouchableOpacity onPress={onOpen} activeOpacity={0.7}>
        <View className="bg-green-700 px-4 py-3 flex-row items-center justify-between">
          <Text className="text-white text-base font-bold">{plot.name}</Text>
          <View className="flex-row items-center gap-2">
            <View className="bg-green-600 rounded-lg px-2 py-1">
              <Text className="text-green-100 text-xs">{plot.width_ft}×{plot.length_ft} ft</Text>
            </View>
          </View>
        </View>

        <View className="px-4 py-3">
          {plot.notes ? (
            <Text className="text-gray-600 text-sm mb-2">{plot.notes}</Text>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-green-700 text-sm font-medium">Open Map →</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={onEdit} className="px-3 py-1 rounded-lg bg-blue-50">
                <Text className="text-blue-600 text-xs">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} className="px-3 py-1 rounded-lg bg-red-50">
                <Text className="text-red-500 text-xs">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
}
