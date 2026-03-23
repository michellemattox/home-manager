import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Card } from "@/components/ui/Card";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenPlots,
  useGardenZones,
  useGardenCells,
  useGardenPlantings,
  useGardenHarvests,
  useCreateGardenZone,
  useUpdateGardenZone,
  useDeleteGardenZone,
  useUpsertGardenCells,
  useDeleteGardenCells,
  useCreateGardenPlanting,
  useUpdateGardenPlanting,
  useDeleteGardenPlanting,
  useCreateGardenHarvest,
  useUpdateGardenHarvest,
  useDeleteGardenHarvest,
} from "@/hooks/useGarden";
import {
  PLANT_FAMILIES,
  guessFamilyFromName,
  type GardenZone,
  type GardenPlanting,
  type GardenHarvest,
} from "@/types/app.types";

const SCREEN_W = Dimensions.get("window").width;
const GRID_W = SCREEN_W - 32;

const ZONE_TYPE_OPTS: { value: GardenZone["zone_type"]; label: string; defaultColor: string }[] = [
  { value: "bed",       label: "Bed / Row",  defaultColor: "#84cc16" },
  { value: "walkway",   label: "Walkway",    defaultColor: "#d1d5db" },
  { value: "container", label: "Container",  defaultColor: "#f97316" },
  { value: "other",     label: "Other",      defaultColor: "#a78bfa" },
];

const ZONE_COLORS = [
  "#84cc16", "#16a34a", "#0891b2", "#2563eb", "#7c3aed",
  "#db2777", "#ea580c", "#d97706", "#d1d5db", "#6b7280",
];

const HARVEST_UNITS = ["lbs", "oz", "kg", "count", "bunches", "bags", "quarts", "gallons", "other"];

type EditMode = "none" | "draw";

// ── Auto-save hook ────────────────────────────────────────────────────────────
function useAutoSave(
  isEditMode: boolean,
  deps: unknown[],
  onSave: () => void,
  delay = 3000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedValuesRef = useRef<string>("");

  // Capture initial values when edit mode first becomes true
  useEffect(() => {
    if (isEditMode) {
      openedValuesRef.current = JSON.stringify(deps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    // Don't fire if values haven't changed from when the modal opened
    if (JSON.stringify(deps) === openedValuesRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onSave, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function PlotDetailScreen() {
  const { plotId } = useLocalSearchParams<{ plotId: string }>();
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id ?? "";

  const { data: plots = [] } = useGardenPlots(householdId);
  const plot = plots.find((p) => p.id === plotId);

  const { data: zones = [], isLoading: zonesLoading } = useGardenZones(plotId, householdId);
  const { data: cells = [], isLoading: cellsLoading } = useGardenCells(plotId);
  const { data: plantings = [], isLoading: plantingsLoading } = useGardenPlantings(plotId);
  const { data: harvests = [] } = useGardenHarvests(plotId);

  const createZone = useCreateGardenZone();
  const updateZone = useUpdateGardenZone();
  const deleteZone = useDeleteGardenZone();
  const upsertCells = useUpsertGardenCells();
  const deleteCells = useDeleteGardenCells();
  const createPlanting = useCreateGardenPlanting();
  const updatePlanting = useUpdateGardenPlanting();
  const deletePlanting = useDeleteGardenPlanting();
  const createHarvest = useCreateGardenHarvest();
  const updateHarvest = useUpdateGardenHarvest();
  const deleteHarvest = useDeleteGardenHarvest();

  // ── Grid state ───────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState<EditMode>("none");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [pendingCells, setPendingCells] = useState<Set<string>>(new Set());
  const [panelZoneId, setPanelZoneId] = useState<string | null>(null);

  const cellZoneMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cells) { if (c.zone_id) m.set(`${c.col},${c.row}`, c.zone_id); }
    return m;
  }, [cells]);

  const zoneById = useMemo(() => {
    const m = new Map<string, GardenZone>();
    for (const z of zones) m.set(z.id, z);
    return m;
  }, [zones]);

  const panelZone = panelZoneId ? zoneById.get(panelZoneId) ?? null : null;
  const panelPlantings = useMemo(
    () => (panelZoneId ? plantings.filter((p) => p.zone_id === panelZoneId) : []),
    [panelZoneId, plantings]
  );

  // ── Zone form ────────────────────────────────────────────────────────────────
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<GardenZone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneType, setZoneType] = useState<GardenZone["zone_type"]>("bed");
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0]);
  const [zoneSaved, setZoneSaved] = useState(false);

  const doSaveZone = useCallback(() => {
    if (!editingZone || !zoneName.trim()) return;
    updateZone.mutate(
      { id: editingZone.id, plotId: editingZone.plot_id, updates: { name: zoneName.trim(), zone_type: zoneType, color: zoneColor } },
      { onSuccess: () => { setZoneSaved(true); setTimeout(() => setZoneSaved(false), 2000); } }
    );
  }, [editingZone, zoneName, zoneType, zoneColor]);

  useAutoSave(!!editingZone && showZoneModal, [zoneName, zoneType, zoneColor], doSaveZone);

  // ── Planting form ────────────────────────────────────────────────────────────
  const [showPlantingModal, setShowPlantingModal] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<GardenPlanting | null>(null);
  const [pPlantName, setPPlantName] = useState("");
  const [pVariety, setPVariety] = useState("");
  const [pFamily, setPFamily] = useState("Other");
  const [pDatePlanted, setPDatePlanted] = useState("");
  const [pDateRemoved, setPDateRemoved] = useState("");
  const [pNotes, setPNotes] = useState("");
  const [pZoneId, setPZoneId] = useState<string | null>(null);
  const [plantingSaved, setPlantingSaved] = useState(false);

  const doSavePlanting = useCallback(() => {
    if (!editingPlanting || !pPlantName.trim() || !plotId) return;
    const year = pDatePlanted ? parseInt(pDatePlanted.split("-")[0]) : editingPlanting.season_year;
    updatePlanting.mutate(
      {
        id: editingPlanting.id,
        plotId,
        updates: {
          plant_name: pPlantName.trim(),
          variety: pVariety.trim() || null,
          plant_family: pFamily,
          date_planted: pDatePlanted || null,
          date_removed: pDateRemoved || null,
          notes: pNotes.trim() || null,
          zone_id: pZoneId,
          season_year: year,
        },
      },
      { onSuccess: () => { setPlantingSaved(true); setTimeout(() => setPlantingSaved(false), 2000); } }
    );
  }, [editingPlanting, pPlantName, pVariety, pFamily, pDatePlanted, pDateRemoved, pNotes, pZoneId, plotId]);

  useAutoSave(
    !!editingPlanting && showPlantingModal,
    [pPlantName, pVariety, pFamily, pDatePlanted, pDateRemoved, pNotes, pZoneId],
    doSavePlanting
  );

  // ── Harvest form ─────────────────────────────────────────────────────────────
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<GardenHarvest | null>(null);
  const [harvestPlantingId, setHarvestPlantingId] = useState<string | null>(null);
  const [hDate, setHDate] = useState("");
  const [hQty, setHQty] = useState("");
  const [hUnit, setHUnit] = useState("lbs");
  const [hNotes, setHNotes] = useState("");
  const [harvestSaved, setHarvestSaved] = useState(false);

  const doSaveHarvest = useCallback(() => {
    if (!editingHarvest || !hDate || !plotId) return;
    updateHarvest.mutate(
      {
        id: editingHarvest.id,
        plotId,
        updates: {
          date: hDate,
          quantity_value: hQty ? parseFloat(hQty) : null,
          quantity_unit: hUnit,
          notes: hNotes.trim() || null,
        },
      },
      { onSuccess: () => { setHarvestSaved(true); setTimeout(() => setHarvestSaved(false), 2000); } }
    );
  }, [editingHarvest, hDate, hQty, hUnit, hNotes, plotId]);

  useAutoSave(!!editingHarvest && showHarvestModal, [hDate, hQty, hUnit, hNotes], doSaveHarvest);

  // ── Expanded harvest rows ────────────────────────────────────────────────────
  const [expandedPlantingId, setExpandedPlantingId] = useState<string | null>(null);

  // ── Grid interaction ─────────────────────────────────────────────────────────
  function togglePendingCell(col: number, row: number) {
    if (editMode !== "draw") return;
    const key = `${col},${row}`;
    setPendingCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function commitDrawing() {
    if (!selectedZoneId || pendingCells.size === 0) { setPendingCells(new Set()); setEditMode("none"); return; }
    const toUpsert = Array.from(pendingCells).map((key) => {
      const [col, row] = key.split(",").map(Number);
      return { plot_id: plotId!, zone_id: selectedZoneId, household_id: householdId, col, row };
    });
    await upsertCells.mutateAsync(toUpsert);
    setPendingCells(new Set());
    setEditMode("none");
  }

  async function handleClearZoneCells(zoneId: string) {
    const zoneCells = cells.filter((c) => c.zone_id === zoneId);
    if (!zoneCells.length) return;
    await deleteCells.mutateAsync({ plotId: plotId!, cellIds: zoneCells.map((c) => c.id) });
  }

  // ── Zone CRUD ────────────────────────────────────────────────────────────────
  function openNewZone() {
    setEditingZone(null);
    setZoneName(""); setZoneType("bed");
    setZoneColor(ZONE_COLORS[zones.length % ZONE_COLORS.length]);
    setShowZoneModal(true);
  }

  function openEditZone(zone: GardenZone) {
    setEditingZone(zone);
    setZoneName(zone.name); setZoneType(zone.zone_type); setZoneColor(zone.color);
    setShowZoneModal(true);
  }

  async function handleSaveZone() {
    if (!zoneName.trim() || !plotId) return;
    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone.id, plotId: editingZone.plot_id, updates: { name: zoneName.trim(), zone_type: zoneType, color: zoneColor } });
    } else {
      await createZone.mutateAsync({ plot_id: plotId, household_id: householdId, name: zoneName.trim(), zone_type: zoneType, color: zoneColor });
    }
    setShowZoneModal(false);
  }

  function confirmDeleteZone(zone: GardenZone) {
    Alert.alert("Delete Zone", `Delete "${zone.name}"? Its map cells will also be cleared.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await handleClearZoneCells(zone.id);
        await deleteZone.mutateAsync({ id: zone.id, plotId: zone.plot_id });
        if (panelZoneId === zone.id) setPanelZoneId(null);
      }},
    ]);
  }

  // ── Planting CRUD ────────────────────────────────────────────────────────────
  function openNewPlanting(zoneId: string | null) {
    setEditingPlanting(null);
    setPPlantName(""); setPVariety(""); setPFamily("Other");
    setPDatePlanted(new Date().toISOString().split("T")[0]);
    setPDateRemoved(""); setPNotes(""); setPZoneId(zoneId);
    setShowPlantingModal(true);
  }

  function openEditPlanting(p: GardenPlanting) {
    setEditingPlanting(p);
    setPPlantName(p.plant_name); setPVariety(p.variety ?? "");
    setPFamily(p.plant_family ?? "Other");
    setPDatePlanted(p.date_planted ?? ""); setPDateRemoved(p.date_removed ?? "");
    setPNotes(p.notes ?? ""); setPZoneId(p.zone_id);
    setShowPlantingModal(true);
  }

  async function handleSavePlanting() {
    if (!pPlantName.trim() || !plotId) return;
    const detectedFamily = pFamily === "Other" ? guessFamilyFromName(pPlantName) : pFamily;
    const year = pDatePlanted ? parseInt(pDatePlanted.split("-")[0]) : new Date().getFullYear();
    if (editingPlanting) {
      await updatePlanting.mutateAsync({
        id: editingPlanting.id, plotId,
        updates: { plant_name: pPlantName.trim(), variety: pVariety.trim() || null, plant_family: detectedFamily, date_planted: pDatePlanted || null, date_removed: pDateRemoved || null, notes: pNotes.trim() || null, zone_id: pZoneId, season_year: year },
      });
    } else {
      await createPlanting.mutateAsync({
        plot_id: plotId, zone_id: pZoneId, household_id: householdId,
        plant_name: pPlantName.trim(), variety: pVariety.trim() || null, plant_family: detectedFamily,
        date_planted: pDatePlanted || null, date_removed: null, season_year: year, notes: pNotes.trim() || null,
      });
    }
    setShowPlantingModal(false);
  }

  function confirmDeletePlanting(p: GardenPlanting) {
    Alert.alert("Remove Planting", `Remove "${p.plant_name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deletePlanting.mutate({ id: p.id, plotId: plotId! }) },
    ]);
  }

  // ── Harvest CRUD ─────────────────────────────────────────────────────────────
  function openNewHarvest(plantingId: string) {
    setEditingHarvest(null);
    setHarvestPlantingId(plantingId);
    setHDate(new Date().toISOString().split("T")[0]);
    setHQty(""); setHUnit("lbs"); setHNotes("");
    setShowHarvestModal(true);
  }

  function openEditHarvest(h: GardenHarvest) {
    setEditingHarvest(h);
    setHarvestPlantingId(h.planting_id);
    setHDate(h.date); setHQty(h.quantity_value?.toString() ?? "");
    setHUnit(h.quantity_unit ?? "lbs"); setHNotes(h.notes ?? "");
    setShowHarvestModal(true);
  }

  async function handleSaveHarvest() {
    if (!hDate || !harvestPlantingId || !plotId) return;
    if (editingHarvest) {
      await updateHarvest.mutateAsync({
        id: editingHarvest.id, plotId,
        updates: { date: hDate, quantity_value: hQty ? parseFloat(hQty) : null, quantity_unit: hUnit, notes: hNotes.trim() || null },
      });
    } else {
      await createHarvest.mutateAsync({
        planting_id: harvestPlantingId, plot_id: plotId, household_id: householdId,
        date: hDate, quantity_value: hQty ? parseFloat(hQty) : null,
        quantity_unit: hUnit, notes: hNotes.trim() || null,
      });
    }
    setShowHarvestModal(false);
  }

  function confirmDeleteHarvest(h: GardenHarvest) {
    Alert.alert("Delete Harvest", "Remove this harvest record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteHarvest.mutate({ id: h.id, plotId: plotId! }) },
    ]);
  }

  // ── Render helpers ───────────────────────────────────────────────────────────
  function getCellColor(col: number, row: number): string {
    const key = `${col},${row}`;
    if (editMode === "draw" && pendingCells.has(key)) {
      const zone = selectedZoneId ? zoneById.get(selectedZoneId) : null;
      return zone ? zone.color + "cc" : "#fbbf24cc";
    }
    const zoneId = cellZoneMap.get(key);
    if (!zoneId) return "transparent";
    return zoneById.get(zoneId)?.color ?? "#e5e7eb";
  }

  function getCellBorder(col: number, row: number): string {
    const key = `${col},${row}`;
    if (editMode === "draw" && pendingCells.has(key)) return "#f59e0b";
    const zoneId = cellZoneMap.get(key);
    if (!zoneId) return "#e5e7eb";
    if (zoneId === panelZoneId) return "#16a34a";
    return "transparent";
  }

  if (!plot) {
    return (
      <SafeAreaView className="flex-1 bg-[#F2FCEB] items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#16a34a" />
      </SafeAreaView>
    );
  }

  const CELL_SIZE = Math.floor(GRID_W / plot.cols);
  const isLoading = zonesLoading || cellsLoading || plantingsLoading;

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>{plot.name}</Text>
        {editMode === "none" && (
          <TouchableOpacity onPress={openNewZone} className="bg-green-600 rounded-xl px-3 py-1.5">
            <Text className="text-white text-sm font-semibold">+ Zone</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#16a34a" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Grid Map ─────────────────────────────────────────────────────── */}
          <View className="mx-4 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-700">
                Garden Map ({plot.cols}×{plot.rows})
              </Text>
              {editMode === "none" ? (
                zones.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => { setSelectedZoneId(zones[0].id); setPendingCells(new Set()); setEditMode("draw"); }}
                    className="bg-blue-600 rounded-xl px-3 py-1"
                  >
                    <Text className="text-white text-xs font-semibold">Edit Map</Text>
                  </TouchableOpacity>
                ) : null
              ) : (
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => { setPendingCells(new Set()); setEditMode("none"); }} className="bg-gray-200 rounded-xl px-3 py-1">
                    <Text className="text-gray-700 text-xs font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={commitDrawing} disabled={upsertCells.isPending} className="bg-green-600 rounded-xl px-3 py-1">
                    <Text className="text-white text-xs font-semibold">
                      {upsertCells.isPending ? "Saving…" : `Save (${pendingCells.size})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {editMode === "draw" && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">Painting zone: tap cells to assign them</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {zones.map((z) => (
                      <TouchableOpacity
                        key={z.id}
                        onPress={() => setSelectedZoneId(z.id)}
                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${selectedZoneId === z.id ? "border-gray-900" : "border-gray-200"}`}
                        style={{ backgroundColor: z.color + "33" }}
                      >
                        <View style={{ backgroundColor: z.color }} className="w-3 h-3 rounded-sm" />
                        <Text className="text-xs font-medium text-gray-800">{z.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={{ width: GRID_W, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, overflow: "hidden", backgroundColor: "#f9fafb" }}>
              {Array.from({ length: plot.rows }).map((_, row) => (
                <View key={row} style={{ flexDirection: "row" }}>
                  {Array.from({ length: plot.cols }).map((_, col) => (
                    <TouchableOpacity
                      key={col}
                      onPress={() => {
                        if (editMode === "draw") { togglePendingCell(col, row); }
                        else {
                          const zoneId = cellZoneMap.get(`${col},${row}`);
                          if (zoneId) setPanelZoneId(zoneId === panelZoneId ? null : zoneId);
                        }
                      }}
                      activeOpacity={0.7}
                      style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getCellColor(col, row), borderWidth: 0.5, borderColor: getCellBorder(col, row) }}
                    />
                  ))}
                </View>
              ))}
            </View>

            {zones.length > 0 && (
              <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-2">
                {zones.map((z) => (
                  <View key={z.id} className="flex-row items-center gap-1">
                    <View style={{ backgroundColor: z.color }} className="w-3 h-3 rounded-sm" />
                    <Text className="text-xs text-gray-600">{z.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Zone Panel ───────────────────────────────────────────────────── */}
          {panelZone && (
            <View className="mx-4 mt-4">
              <Card className="border-2" style={{ borderColor: panelZone.color }}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View style={{ backgroundColor: panelZone.color }} className="w-4 h-4 rounded-sm" />
                    <Text className="font-bold text-gray-900 text-base">{panelZone.name}</Text>
                    <Text className="text-xs text-gray-400 capitalize">{panelZone.zone_type}</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => openEditZone(panelZone)}>
                      <Text className="text-blue-600 text-sm">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteZone(panelZone)}>
                      <Text className="text-red-500 text-sm">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {panelPlantings.length === 0 ? (
                  <Text className="text-gray-400 text-sm mb-2">No plantings yet.</Text>
                ) : (
                  <View className="gap-3 mb-2">
                    {panelPlantings.map((p) => (
                      <PlantingRow
                        key={p.id}
                        planting={p}
                        harvests={harvests.filter((h) => h.planting_id === p.id)}
                        expanded={expandedPlantingId === p.id}
                        onToggleExpand={() => setExpandedPlantingId(expandedPlantingId === p.id ? null : p.id)}
                        onEdit={() => openEditPlanting(p)}
                        onDelete={() => confirmDeletePlanting(p)}
                        onLogHarvest={() => openNewHarvest(p.id)}
                        onEditHarvest={openEditHarvest}
                        onDeleteHarvest={confirmDeleteHarvest}
                      />
                    ))}
                  </View>
                )}
                <TouchableOpacity onPress={() => openNewPlanting(panelZone.id)} className="flex-row items-center gap-1 mt-1">
                  <Text className="text-green-700 text-sm font-semibold">+ Add Planting</Text>
                </TouchableOpacity>
              </Card>
            </View>
          )}

          {/* ── Zones List ───────────────────────────────────────────────────── */}
          <View className="mx-4 mt-5">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Zones ({zones.length})</Text>
            {zones.length === 0 ? (
              <Card>
                <Text className="text-gray-400 text-sm text-center">
                  No zones yet. Tap "+ Zone" to define beds, walkways, or rows.
                </Text>
              </Card>
            ) : (
              <View className="gap-2">
                {zones.map((zone) => {
                  const zPlantings = plantings.filter((p) => p.zone_id === zone.id);
                  const zoneCellCount = cells.filter((c) => c.zone_id === zone.id).length;
                  return (
                    <TouchableOpacity key={zone.id} onPress={() => setPanelZoneId(zone.id === panelZoneId ? null : zone.id)} activeOpacity={0.7}>
                      <Card className={panelZoneId === zone.id ? "border-2" : ""} style={panelZoneId === zone.id ? { borderColor: zone.color } : {}}>
                        <View className="flex-row items-center gap-3">
                          <View style={{ backgroundColor: zone.color }} className="w-5 rounded-sm self-stretch min-h-[40px]" />
                          <View className="flex-1">
                            <Text className="font-semibold text-gray-900">{zone.name}</Text>
                            <Text className="text-xs text-gray-500 capitalize">
                              {zone.zone_type} · {zoneCellCount} cells · {zPlantings.length} planting{zPlantings.length !== 1 ? "s" : ""}
                            </Text>
                            {zPlantings.length > 0 && (
                              <Text className="text-xs text-green-700 mt-0.5" numberOfLines={1}>
                                {zPlantings.map((p) => p.plant_name).join(", ")}
                              </Text>
                            )}
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity onPress={() => { setSelectedZoneId(zone.id); setPendingCells(new Set()); setEditMode("draw"); }} className="bg-blue-50 rounded-lg px-2 py-1">
                              <Text className="text-blue-600 text-xs">Map</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openNewPlanting(zone.id)} className="bg-green-50 rounded-lg px-2 py-1">
                              <Text className="text-green-600 text-xs">+ Plant</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Unzoned plantings ────────────────────────────────────────────── */}
          {plantings.filter((p) => !p.zone_id).length > 0 && (
            <View className="mx-4 mt-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Unassigned Plantings</Text>
              <Card>
                <View className="gap-3">
                  {plantings.filter((p) => !p.zone_id).map((p) => (
                    <PlantingRow
                      key={p.id}
                      planting={p}
                      harvests={harvests.filter((h) => h.planting_id === p.id)}
                      expanded={expandedPlantingId === p.id}
                      onToggleExpand={() => setExpandedPlantingId(expandedPlantingId === p.id ? null : p.id)}
                      onEdit={() => openEditPlanting(p)}
                      onDelete={() => confirmDeletePlanting(p)}
                      onLogHarvest={() => openNewHarvest(p.id)}
                      onEditHarvest={openEditHarvest}
                      onDeleteHarvest={confirmDeleteHarvest}
                    />
                  ))}
                </View>
              </Card>
            </View>
          )}

          <View className="mx-4 mt-3">
            <TouchableOpacity onPress={() => openNewPlanting(null)} className="border border-dashed border-green-400 rounded-xl py-3 items-center">
              <Text className="text-green-700 text-sm font-semibold">+ Add Planting (no zone)</Text>
            </TouchableOpacity>
          </View>

          {/* ── Crop Rotation Legend ─────────────────────────────────────────── */}
          <View className="mx-4 mt-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Crop Rotation Families</Text>
            <Card>
              <View className="flex-row flex-wrap gap-2">
                {Object.entries(PLANT_FAMILIES).map(([key, fam]) => (
                  <View key={key} className="flex-row items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: fam.bg }}>
                    <View style={{ backgroundColor: fam.color }} className="w-2.5 h-2.5 rounded-full" />
                    <Text className="text-xs" style={{ color: fam.color }}>{fam.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </ScrollView>
      )}

      {/* ── Zone Modal ────────────────────────────────────────────────────────── */}
      <Modal visible={showZoneModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowZoneModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-gray-900">{editingZone ? "Edit Zone" : "New Zone"}</Text>
              {zoneSaved && <Text className="text-green-500 text-xs">Saved ✓</Text>}
            </View>
            <TouchableOpacity onPress={handleSaveZone} disabled={!zoneName.trim() || createZone.isPending || updateZone.isPending}>
              <Text className={`font-semibold ${zoneName.trim() ? "text-green-600" : "text-gray-300"}`}>
                {createZone.isPending || updateZone.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-4 py-4">
            <Input label="Zone Name *" placeholder="e.g. Tomato Row, North Walkway…" value={zoneName} onChangeText={setZoneName} />
            <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {ZONE_TYPE_OPTS.map((t) => (
                <TouchableOpacity key={t.value} onPress={() => { setZoneType(t.value); if (!editingZone) setZoneColor(t.defaultColor); }}
                  className={`px-3 py-2 rounded-xl border ${zoneType === t.value ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"}`}>
                  <Text className={`text-sm ${zoneType === t.value ? "text-green-700 font-semibold" : "text-gray-700"}`}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Color</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {ZONE_COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setZoneColor(c)}
                  style={{ backgroundColor: c, width: 36, height: 36, borderRadius: 8, borderWidth: zoneColor === c ? 3 : 0, borderColor: "#111827" }} />
              ))}
            </View>
            {editingZone && (
              <View className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <Text className="text-blue-700 text-xs">Changes auto-save after 3 seconds.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Planting Modal ────────────────────────────────────────────────────── */}
      <Modal visible={showPlantingModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowPlantingModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-gray-900">{editingPlanting ? "Edit Planting" : "Add Planting"}</Text>
              {plantingSaved && <Text className="text-green-500 text-xs">Saved ✓</Text>}
            </View>
            <TouchableOpacity onPress={handleSavePlanting} disabled={!pPlantName.trim() || createPlanting.isPending || updatePlanting.isPending}>
              <Text className={`font-semibold ${pPlantName.trim() ? "text-green-600" : "text-gray-300"}`}>
                {createPlanting.isPending || updatePlanting.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-4 py-4">
            <Input
              label="Plant Name *"
              placeholder="e.g. Golden Potatoes, Sugar Snap Peas…"
              value={pPlantName}
              onChangeText={(t) => { setPPlantName(t); if (t.length > 3) setPFamily(guessFamilyFromName(t)); }}
            />
            <Input label="Variety" placeholder="e.g. Yukon Gold, Oregon Sugar Pod…" value={pVariety} onChangeText={setPVariety} />

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Plant Family <Text className="text-gray-400 font-normal">(auto-detected)</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {Object.entries(PLANT_FAMILIES).map(([key, fam]) => (
                  <TouchableOpacity key={key} onPress={() => setPFamily(key)}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                    style={{ backgroundColor: pFamily === key ? fam.color + "33" : "#f9fafb", borderColor: pFamily === key ? fam.color : "#e5e7eb" }}>
                    <Text className="text-xs font-medium" style={{ color: pFamily === key ? fam.color : "#6b7280" }}>{fam.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <DateInput label="Date Planted" value={pDatePlanted} onChange={setPDatePlanted} />
            <DateInput label="Done Harvesting (optional)" value={pDateRemoved} onChange={setPDateRemoved} hint="Set when this plant stopped producing" />

            <Text className="text-sm font-medium text-gray-700 mb-2">Zone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => setPZoneId(null)}
                  className={`px-3 py-1.5 rounded-xl border ${pZoneId === null ? "border-gray-700 bg-gray-100" : "border-gray-200"}`}>
                  <Text className="text-xs text-gray-600">None</Text>
                </TouchableOpacity>
                {zones.map((z) => (
                  <TouchableOpacity key={z.id} onPress={() => setPZoneId(z.id)}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                    style={{ backgroundColor: pZoneId === z.id ? z.color + "33" : "#f9fafb", borderColor: pZoneId === z.id ? z.color : "#e5e7eb" }}>
                    <View style={{ backgroundColor: z.color }} className="w-2.5 h-2.5 rounded-sm" />
                    <Text className="text-xs text-gray-700">{z.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Input label="Notes" placeholder="Yield notes, what to repeat next year…" value={pNotes} onChangeText={setPNotes} multiline numberOfLines={3} className="min-h-[80px]" />

            {pFamily && pFamily !== "Other" && PLANT_FAMILIES[pFamily] && (
              <View className="rounded-xl p-3 mt-1" style={{ backgroundColor: PLANT_FAMILIES[pFamily].bg }}>
                <Text className="text-xs font-semibold mb-0.5" style={{ color: PLANT_FAMILIES[pFamily].color }}>
                  {PLANT_FAMILIES[pFamily].label} rotation tip
                </Text>
                <Text className="text-xs text-gray-600">{ROTATION_TIPS[pFamily] ?? "Rotate this family to a different bed each season."}</Text>
              </View>
            )}

            {editingPlanting && (
              <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-4">
                <Text className="text-blue-700 text-xs">Changes auto-save after 3 seconds.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Harvest Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={showHarvestModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowHarvestModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-gray-900">{editingHarvest ? "Edit Harvest" : "Log Harvest"}</Text>
              {harvestSaved && <Text className="text-green-500 text-xs">Saved ✓</Text>}
            </View>
            <TouchableOpacity onPress={handleSaveHarvest} disabled={!hDate || createHarvest.isPending || updateHarvest.isPending}>
              <Text className={`font-semibold ${hDate ? "text-green-600" : "text-gray-300"}`}>
                {createHarvest.isPending || updateHarvest.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-4 py-4">
            <DateInput label="Harvest Date *" value={hDate} onChange={setHDate} />

            <Text className="text-sm font-medium text-gray-700 mb-2">Quantity</Text>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Input
                  placeholder="Amount (e.g. 2.5)"
                  value={hQty}
                  onChangeText={setHQty}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {HARVEST_UNITS.map((u) => (
                      <TouchableOpacity key={u} onPress={() => setHUnit(u)}
                        className={`px-3 py-2.5 rounded-xl border ${hUnit === u ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}>
                        <Text className={`text-sm ${hUnit === u ? "text-white font-semibold" : "text-gray-700"}`}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <Input label="Notes" placeholder="Quality, color, what stood out…" value={hNotes} onChangeText={setHNotes} multiline numberOfLines={2} />

            {editingHarvest && (
              <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-2">
                <Text className="text-blue-700 text-xs">Changes auto-save after 3 seconds.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── PlantingRow ───────────────────────────────────────────────────────────────
function PlantingRow({
  planting,
  harvests,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onLogHarvest,
  onEditHarvest,
  onDeleteHarvest,
}: {
  planting: GardenPlanting;
  harvests: GardenHarvest[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLogHarvest: () => void;
  onEditHarvest: (h: GardenHarvest) => void;
  onDeleteHarvest: (h: GardenHarvest) => void;
}) {
  const fam = planting.plant_family ? PLANT_FAMILIES[planting.plant_family] : PLANT_FAMILIES.Other;
  const isDone = !!planting.date_removed;
  const totalHarvests = harvests.length;

  return (
    <View>
      <View className="flex-row items-start gap-2">
        <View style={{ backgroundColor: fam?.color ?? "#6b7280" }} className="w-2.5 rounded-full mt-1 self-stretch min-h-[36px]" />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className={`font-medium text-sm ${isDone ? "text-gray-400 line-through" : "text-gray-900"}`}>
              {planting.plant_name}{planting.variety ? ` · ${planting.variety}` : ""}
            </Text>
            {isDone && <Text className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">Done</Text>}
          </View>
          <Text className="text-xs text-gray-400">
            {planting.date_planted ? `Planted ${planting.date_planted}` : `Season ${planting.season_year}`}
            {planting.plant_family ? ` · ${planting.plant_family}` : ""}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={onToggleExpand} className="px-2 py-1 bg-amber-50 rounded-lg">
            <Text className="text-amber-700 text-xs">🌾 {totalHarvests > 0 ? totalHarvests : "+"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} className="px-2 py-1">
            <Text className="text-blue-500 text-xs">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} className="px-2 py-1">
            <Text className="text-red-400 text-xs">✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Harvest panel */}
      {expanded && (
        <View className="ml-4 mt-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-amber-800">Harvest Log</Text>
            <TouchableOpacity onPress={onLogHarvest} className="bg-amber-500 rounded-lg px-2 py-1">
              <Text className="text-white text-xs font-semibold">+ Log Harvest</Text>
            </TouchableOpacity>
          </View>
          {harvests.length === 0 ? (
            <Text className="text-xs text-amber-600">No harvests logged yet.</Text>
          ) : (
            <View className="gap-1.5">
              {harvests.map((h) => (
                <View key={h.id} className="flex-row items-center gap-2">
                  <Text className="text-xs text-amber-800 flex-1">
                    {h.date}
                    {h.quantity_value ? ` · ${h.quantity_value} ${h.quantity_unit ?? ""}` : ""}
                    {h.notes ? ` — ${h.notes}` : ""}
                  </Text>
                  <TouchableOpacity onPress={() => onEditHarvest(h)}>
                    <Text className="text-blue-400 text-xs">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteHarvest(h)}>
                    <Text className="text-red-300 text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const ROTATION_TIPS: Record<string, string> = {
  Solanaceae:     "Avoid planting tomatoes, potatoes, or peppers in the same spot more than once every 3 years. Heavy feeders — follow with nitrogen-fixing legumes.",
  Brassicaceae:   "Rotate brassicas every 3–4 years to prevent clubroot and cabbage root fly. Follow with legumes or alliums.",
  Leguminosae:    "Peas and beans fix nitrogen — great predecessors for heavy feeders. Rotate annually to prevent root rot.",
  Alliaceae:      "Onions and garlic deter many pests. Rotate annually. Follow with a heavy feeder like brassicas.",
  Asteraceae:     "Lettuce and relatives are light feeders. Can follow heavier crops. Rotate to prevent lettuce aphid buildup.",
  Chenopodiaceae: "Beets and chard are light-to-medium feeders. Rotate to prevent beet leaf spot and boron depletion.",
  Cucurbitaceae:  "Squash and cucumbers are heavy feeders. Excellent to follow legumes. Rotate every 2–3 years to prevent powdery mildew.",
  Apiaceae:       "Carrots and parsley attract beneficial insects. Sensitive to carrot fly — use row covers. Rotate every 3 years.",
};
