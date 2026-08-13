import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useHouseholdStore } from "@/stores/householdStore";
import { GardenCanvas, type Selected } from "@/components/garden/GardenCanvas";
import {
  useGardenAreas,
  useGardenBeds, useCreateGardenBed, useUpdateGardenBed, useDeleteGardenBed,
  useGardenHardscape, useCreateGardenHardscape, useUpdateGardenHardscape, useDeleteGardenHardscape,
  useGardenSupports, useCreateGardenSupport, useUpdateGardenSupport, useDeleteGardenSupport,
  useGardenCrops, useCreateGardenCrop, useCreateGardenCrops, useUpdateGardenCrop, useDeleteGardenCrop,
  useGardenHistoryChoices, useRecordHistoryChoice,
  useCropHarvests, useAddCropHarvest, useDeleteCropHarvest,
} from "@/hooks/useGardenMap";
import {
  CROP_CATALOG, SUPPORT_CATALOG, MATERIAL_CATALOG, type CropDef, type SupportDef,
  type HardscapeMaterial, cropEmoji, normalizeCropKey,
  bedAreaSqFt, plantsThatFit, findSupport, pointInPolygon, pointsBBox,
} from "@/lib/gardenCatalog";
import type { GardenArea, GardenBed, GardenSupport, GardenCrop } from "@/types/app.types";

type Tool = "plant" | "vertical" | "path" | "bed" | null;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export default function GardenAreaScreen() {
  const { areaId } = useLocalSearchParams<{ areaId: string }>();
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: areas = [] } = useGardenAreas(householdId);
  const area = areas.find((a) => a.id === areaId);

  const { data: beds = [] } = useGardenBeds(areaId);
  const { data: hardscape = [] } = useGardenHardscape(areaId);
  const { data: supports = [] } = useGardenSupports(areaId);
  const { data: crops = [] } = useGardenCrops(areaId);
  const { data: historyChoices = [] } = useGardenHistoryChoices(householdId);

  const createBed = useCreateGardenBed();
  const updateBed = useUpdateGardenBed();
  const deleteBed = useDeleteGardenBed();
  const createHard = useCreateGardenHardscape();
  const updateHard = useUpdateGardenHardscape();
  const deleteHard = useDeleteGardenHardscape();
  const createSupport = useCreateGardenSupport();
  const updateSupport = useUpdateGardenSupport();
  const deleteSupport = useDeleteGardenSupport();
  const createCrop = useCreateGardenCrop();
  const createCrops = useCreateGardenCrops();
  const updateCrop = useUpdateGardenCrop();
  const deleteCrop = useDeleteGardenCrop();
  const recordChoice = useRecordHistoryChoice();

  const [tool, setTool] = useState<Tool>(null);
  const [bedShape, setBedShape] = useState<"rect" | "circle" | "polygon">("rect");
  const [polyDraft, setPolyDraft] = useState<{ x: number; y: number }[]>([]);
  const [cropChoice, setCropChoice] = useState<CropDef>(CROP_CATALOG[0]);
  const [supportChoice, setSupportChoice] = useState<SupportDef>(SUPPORT_CATALOG[0]);
  const [materialChoice, setMaterialChoice] = useState<HardscapeMaterial>("gravel");
  const [selected, setSelected] = useState<Selected>(null);
  const [expanded, setExpanded] = useState(false);
  const [canvasW, setCanvasW] = useState(0);
  const [carry, setCarry] = useState<{ cropId: string; cropName: string } | null>(null);
  const [supDel, setSupDel] = useState<{ id: string; count: number } | null>(null);

  const scale = area && canvasW ? canvasW / area.width_ft : 0;

  const selectedBed = selected?.type === "bed" ? beds.find((b) => b.id === selected.id) : undefined;
  const selectedSupport = selected?.type === "support" ? supports.find((s) => s.id === selected.id) : undefined;
  const selectedHard = selected?.type === "hardscape" ? hardscape.find((h) => h.id === selected.id) : undefined;
  const selectedCrop = selected?.type === "crop" ? crops.find((c) => c.id === selected.id) : undefined;

  // ── Placement ───────────────────────────────────────────────────────────────
  async function handleCanvasPress(xFt: number, yFt: number) {
    if (!area || !householdId) return;
    if (!tool) { setSelected(null); return; }
    const x = round1(clamp(xFt, 0, area.width_ft));
    const y = round1(clamp(yFt, 0, area.length_ft));

    if (tool === "bed") {
      if (bedShape === "polygon") { setPolyDraft((pts) => [...pts, { x, y }]); return; }
      if (bedShape === "circle") {
        const d = Math.min(3, area.width_ft, area.length_ft);
        const bed = await createBed.mutateAsync({
          area_id: area.id, household_id: householdId, name: `Bed ${beds.length + 1}`,
          shape: "circle", x_ft: clamp(x, 0, area.width_ft - d), y_ft: clamp(y, 0, area.length_ft - d),
          width_ft: d, length_ft: d,
        });
        setSelected({ type: "bed", id: bed.id });
        return;
      }
      const w = Math.min(4, area.width_ft), l = Math.min(8, area.length_ft);
      const bed = await createBed.mutateAsync({
        area_id: area.id, household_id: householdId, name: `Bed ${beds.length + 1}`,
        shape: "rect", x_ft: clamp(x, 0, area.width_ft - w), y_ft: clamp(y, 0, area.length_ft - l),
        width_ft: w, length_ft: l,
      });
      setSelected({ type: "bed", id: bed.id });
    } else if (tool === "path") {
      const zMax = hardscape.reduce((m, h) => Math.max(m, h.z_index), 0);
      const h = await createHard.mutateAsync({
        area_id: area.id, household_id: householdId, material: materialChoice, shape: "rect",
        x_ft: x, y_ft: y, width_ft: 3, length_ft: 3, z_index: zMax + 1,
      });
      setSelected({ type: "hardscape", id: h.id });
    } else if (tool === "vertical") {
      const def = supportChoice;
      const s = await createSupport.mutateAsync({
        area_id: area.id, household_id: householdId, support_type: def.type, shape: def.footprint,
        x_ft: x, y_ft: y, width_ft: def.defaultWidthFt, length_ft: def.defaultLengthFt,
        height_ft: def.defaultHeightFt, default_spacing_in: def.defaultSpacingIn,
      });
      setSelected({ type: "support", id: s.id });
    } else if (tool === "plant") {
      const bed = bedAt(x, y);
      const crop = await createCrop.mutateAsync({
        area_id: area.id, household_id: householdId, bed_id: bed?.id ?? null,
        plant_name: cropChoice.name, plant_family: cropChoice.family, spacing_in: cropChoice.spacingIn,
        x_ft: x, y_ft: y, date_planted: new Date().toISOString().slice(0, 10),
      });
      setSelected({ type: "crop", id: crop.id });
      await maybeOfferHistory(crop);
    }
  }

  function bedAt(x: number, y: number): GardenBed | undefined {
    return beds.find((b) => {
      if (b.shape === "polygon" && b.points) return pointInPolygon(x, y, b.points as unknown as { x: number; y: number }[]);
      if (b.shape === "circle") {
        const r = (b.width_ft ?? 0) / 2;
        return Math.hypot(x - (b.x_ft + r), y - (b.y_ft + r)) <= r;
      }
      return x >= b.x_ft && x <= b.x_ft + (b.width_ft ?? 0) && y >= b.y_ft && y <= b.y_ft + (b.length_ft ?? 0);
    });
  }

  async function finishPolygon() {
    if (!area || !householdId || polyDraft.length < 3) { setPolyDraft([]); return; }
    const bb = pointsBBox(polyDraft);
    const bed = await createBed.mutateAsync({
      area_id: area.id, household_id: householdId, name: `Bed ${beds.length + 1}`,
      shape: "polygon", points: polyDraft as any,
      x_ft: round1(bb.x), y_ft: round1(bb.y), width_ft: round1(bb.width), length_ft: round1(bb.height),
    });
    setPolyDraft([]);
    setSelected({ type: "bed", id: bed.id });
  }

  // Offer the once-per-crop carry-over prompt if old data exists for this crop.
  async function maybeOfferHistory(crop: GardenCrop) {
    if (!householdId) return;
    const key = normalizeCropKey(crop.plant_name);
    if (historyChoices.some((c) => c.crop_key === key)) return;
    const { data } = await supabase
      .from("garden_plantings").select("id, variety, plant_family, season_year")
      .eq("household_id", householdId).ilike("plant_name", crop.plant_name)
      .order("season_year", { ascending: false }).limit(1);
    if (data && data.length > 0) setCarry({ cropId: crop.id, cropName: crop.plant_name });
    else if (data) { /* no history — nothing to offer */ }
  }

  async function resolveCarry(decision: "carried" | "declined") {
    if (!carry || !householdId || !area) return;
    if (decision === "carried") {
      const { data } = await supabase
        .from("garden_plantings").select("id, variety, plant_family")
        .eq("household_id", householdId).ilike("plant_name", carry.cropName)
        .order("season_year", { ascending: false }).limit(1);
      const src = data?.[0] as { id: string; variety: string | null; plant_family: string | null } | undefined;
      if (src) {
        await updateCrop.mutateAsync({ id: carry.cropId, areaId: area.id, updates: {
          variety: src.variety, plant_family: src.plant_family, source_planting_id: src.id,
        }});
      }
    }
    await recordChoice.mutateAsync({ householdId, cropName: carry.cropName, decision });
    setCarry(null);
  }

  // ── Move (drag) ───────────────────────────────────────────────────────────────
  function handleMove(type: NonNullable<Selected>["type"], id: string, xFt: number, yFt: number) {
    if (!area) return;
    const x = round1(clamp(xFt, 0, area.width_ft));
    const y = round1(clamp(yFt, 0, area.length_ft));
    if (type === "bed") {
      const b = beds.find((bb) => bb.id === id);
      if (b?.shape === "polygon" && b.points) {
        const dx = x - b.x_ft, dy = y - b.y_ft;
        const shifted = (b.points as unknown as { x: number; y: number }[]).map((p) => ({ x: round1(p.x + dx), y: round1(p.y + dy) }));
        updateBed.mutate({ id, areaId: area.id, updates: { x_ft: x, y_ft: y, points: shifted as any } });
      } else {
        updateBed.mutate({ id, areaId: area.id, updates: { x_ft: x, y_ft: y } });
      }
    }
    else if (type === "hardscape") updateHard.mutate({ id, areaId: area.id, updates: { x_ft: x, y_ft: y } });
    else if (type === "support") updateSupport.mutate({ id, areaId: area.id, updates: { x_ft: x, y_ft: y } });
    else if (type === "crop") updateCrop.mutate({ id, areaId: area.id, updates: { x_ft: x, y_ft: y, bed_id: bedAt(x, y)?.id ?? null } });
  }

  // ── Fill bed / row ────────────────────────────────────────────────────────────
  function fillBed() {
    if (!area || !householdId || !selectedBed) return;
    const b = selectedBed;
    const spacingFt = cropChoice.spacingIn / 12;
    if (spacingFt <= 0 || !b.width_ft || !b.length_ft) return;
    const poly = b.shape === "polygon" && b.points ? (b.points as unknown as { x: number; y: number }[]) : null;
    const cr = b.width_ft / 2, cx = b.x_ft + cr, cy = b.y_ft + cr;
    const accept = (x: number, y: number) =>
      poly ? pointInPolygon(x, y, poly)
      : b.shape === "circle" ? Math.hypot(x - cx, y - cy) <= cr - spacingFt / 4
      : true;
    const rows: { x_ft: number; y_ft: number }[] = [];
    for (let y = b.y_ft + spacingFt / 2; y <= b.y_ft + b.length_ft - spacingFt / 2 + 0.001; y += spacingFt) {
      for (let x = b.x_ft + spacingFt / 2; x <= b.x_ft + b.width_ft - spacingFt / 2 + 0.001; x += spacingFt) {
        if (accept(x, y)) rows.push({ x_ft: round1(x), y_ft: round1(y) });
      }
    }
    if (rows.length === 0) return;
    createCrops.mutate(rows.map((p) => ({
      area_id: area.id, household_id: householdId, bed_id: b.id,
      plant_name: cropChoice.name, plant_family: cropChoice.family, spacing_in: cropChoice.spacingIn,
      x_ft: p.x_ft, y_ft: p.y_ft, date_planted: new Date().toISOString().slice(0, 10),
    })));
  }

  // Crops of the chosen type already in the selected bed become the "book-ends".
  const rowEnds = useMemo(() => {
    if (!selectedBed) return [] as GardenCrop[];
    return crops.filter((c) => c.bed_id === selectedBed.id && normalizeCropKey(c.plant_name) === normalizeCropKey(cropChoice.name));
  }, [crops, selectedBed, cropChoice]);

  function fillRow() {
    if (!area || !householdId || rowEnds.length < 2) return;
    // Use the two furthest-apart plants of this crop as the row's ends.
    let a = rowEnds[0], b = rowEnds[0], best = -1;
    for (let i = 0; i < rowEnds.length; i++)
      for (let j = i + 1; j < rowEnds.length; j++) {
        const d = Math.hypot(rowEnds[i].x_ft - rowEnds[j].x_ft, rowEnds[i].y_ft - rowEnds[j].y_ft);
        if (d > best) { best = d; a = rowEnds[i]; b = rowEnds[j]; }
      }
    const spacingFt = cropChoice.spacingIn / 12;
    const dist = Math.hypot(b.x_ft - a.x_ft, b.y_ft - a.y_ft);
    const n = Math.floor(dist / spacingFt);
    if (n < 2) return;
    const pts: { x_ft: number; y_ft: number }[] = [];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push({ x_ft: round1(a.x_ft + (b.x_ft - a.x_ft) * t), y_ft: round1(a.y_ft + (b.y_ft - a.y_ft) * t) });
    }
    if (pts.length === 0) return;
    createCrops.mutate(pts.map((p) => ({
      area_id: area.id, household_id: householdId, bed_id: selectedBed!.id,
      plant_name: cropChoice.name, plant_family: cropChoice.family, spacing_in: cropChoice.spacingIn,
      x_ft: p.x_ft, y_ft: p.y_ft, date_planted: new Date().toISOString().slice(0, 10),
    })));
  }

  if (!area) {
    return (
      <SafeAreaView className="flex-1 bg-[#eaeee0]" edges={["top"]}>
        <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
      </SafeAreaView>
    );
  }

  const canvasHeight = area.length_ft * scale;

  return (
    <SafeAreaView className="flex-1 bg-[#1f2417]" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={10}><Text className="text-green-300 font-bold">‹ Garden</Text></Pressable>
        <Text className="text-white font-extrabold" numberOfLines={1}>{area.name}</Text>
        <Pressable onPress={() => setExpanded(true)} hitSlop={10}><Text className="text-green-300 font-bold">⤢ Expand</Text></Pressable>
      </View>

      {/* Canvas */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 12 }}>
        <View onLayout={(e) => setCanvasW(e.nativeEvent.layout.width)}>
          {scale > 0 && (
            <View style={{ height: canvasHeight }}>
              <GardenCanvas
                area={area} beds={beds} hardscape={hardscape} supports={supports} crops={crops}
                scale={scale} selected={selected} draft={polyDraft}
                onSelectElement={(s) => { setSelected(s); setTool(null); }}
                onCanvasPress={handleCanvasPress}
                onMoveElement={handleMove}
              />
            </View>
          )}
        </View>
        <Text className="text-white/50 text-xs mt-2 text-center">
          {polyDraft.length > 0 ? `Tap to add corners (${polyDraft.length}) · then Finish. `
            : tool === "bed" && bedShape === "polygon" ? "Tap the map to start drawing corners. "
            : tool ? `Tap the map to place a ${tool === "plant" ? cropChoice.name : tool}. `
            : "Tap an item to select · drag to move. "}
          {area.width_ft}×{area.length_ft} ft
        </Text>
      </ScrollView>

      {/* Polygon drawing bar */}
      {polyDraft.length > 0 && (
        <View className="flex-row gap-2 px-4 py-3 bg-white border-t border-gray-200">
          <Pressable onPress={() => setPolyDraft([])} className="flex-1 items-center bg-gray-100 rounded-xl py-3">
            <Text className="text-gray-600 font-bold">Cancel</Text>
          </Pressable>
          <Pressable onPress={() => setPolyDraft((p) => p.slice(0, -1))} className="flex-1 items-center bg-gray-100 rounded-xl py-3">
            <Text className="text-gray-600 font-bold">Undo point</Text>
          </Pressable>
          <Pressable onPress={finishPolygon} disabled={polyDraft.length < 3}
            className={`flex-1 items-center rounded-xl py-3 ${polyDraft.length < 3 ? "bg-gray-200" : "bg-green-600"}`}>
            <Text className={`font-bold ${polyDraft.length < 3 ? "text-gray-400" : "text-white"}`}>Finish ({polyDraft.length})</Text>
          </Pressable>
        </View>
      )}

      {/* Inspector (when something selected) */}
      {selected && (
        <Inspector
          selected={selected}
          bed={selectedBed} support={selectedSupport} hardscape={selectedHard} crop={selectedCrop}
          crops={crops} cropChoice={cropChoice} rowEndsCount={rowEnds.length}
          onClose={() => setSelected(null)}
          onSaveBed={(u) => selectedBed && updateBed.mutate({ id: selectedBed.id, areaId: area.id, updates: u })}
          onSaveSupport={(u) => selectedSupport && updateSupport.mutate({ id: selectedSupport.id, areaId: area.id, updates: u })}
          onSaveHard={(u) => selectedHard && updateHard.mutate({ id: selectedHard.id, areaId: area.id, updates: u })}
          onSaveCrop={(u) => selectedCrop && updateCrop.mutate({ id: selectedCrop.id, areaId: area.id, updates: u })}
          onFillBed={fillBed} onFillRow={fillRow}
          onDelete={() => handleDelete()}
        />
      )}

      {/* Build drawer (when nothing selected) */}
      {!selected && (
        <BuildDrawer
          tool={tool} setTool={setTool}
          cropChoice={cropChoice} setCropChoice={setCropChoice}
          supportChoice={supportChoice} setSupportChoice={setSupportChoice}
          materialChoice={materialChoice} setMaterialChoice={setMaterialChoice}
          bedShape={bedShape} setBedShape={setBedShape}
        />
      )}

      {/* Carry-over prompt */}
      <Modal visible={!!carry} transparent animationType="fade" onRequestClose={() => resolveCarry("declined")}>
        <View className="flex-1 bg-black/50 items-center justify-center px-8">
          <View className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <Text className="text-lg font-extrabold mb-1">{cropEmoji(carry?.cropName ?? "")} Add {carry?.cropName}</Text>
            <Text className="text-gray-600 text-sm mb-4">We found past records for {carry?.cropName}. Bring its history into this planting? You’ll only be asked once per crop.</Text>
            <View className="flex-row gap-2">
              <Pressable onPress={() => resolveCarry("carried")} className="flex-1 bg-green-600 rounded-xl py-3 items-center">
                <Text className="text-white font-bold">Carry over</Text>
              </Pressable>
              <Pressable onPress={() => resolveCarry("declined")} className="flex-1 bg-gray-100 rounded-xl py-3 items-center">
                <Text className="text-gray-700 font-bold">Start fresh</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Support delete — offer to keep or remove attached plants */}
      <Modal visible={!!supDel} transparent animationType="fade" onRequestClose={() => setSupDel(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-8">
          <View className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <Text className="text-lg font-extrabold mb-1">Remove support</Text>
            <Text className="text-gray-600 text-sm mb-4">
              This support has {supDel?.count} plant{supDel?.count === 1 ? "" : "s"} on it. Keep the plant{supDel?.count === 1 ? "" : "s"} on the map, or remove {supDel?.count === 1 ? "it" : "them"} too?
            </Text>
            <View className="gap-2">
              <Pressable onPress={() => { if (supDel) deleteSupport.mutate({ id: supDel.id, areaId: area.id }); setSupDel(null); setSelected(null); }}
                className="bg-green-600 rounded-xl py-3 items-center">
                <Text className="text-white font-bold">Keep plants</Text>
              </Pressable>
              <Pressable onPress={() => { if (supDel) deleteSupport.mutate({ id: supDel.id, areaId: area.id, removePlants: true }); setSupDel(null); setSelected(null); }}
                className="bg-red-50 rounded-xl py-3 items-center">
                <Text className="text-red-600 font-bold">Remove plants too</Text>
              </Pressable>
              <Pressable onPress={() => setSupDel(null)} className="py-2 items-center">
                <Text className="text-gray-400 font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expanded hop-around map */}
      <ExpandedMap
        visible={expanded} onClose={() => setExpanded(false)}
        area={area} beds={beds} hardscape={hardscape} supports={supports} crops={crops}
      />
    </SafeAreaView>
  );

  function handleDelete() {
    if (!selected || !area) return;
    if (selected.type === "bed") { deleteBed.mutate({ id: selected.id, areaId: area.id }); setSelected(null); }
    else if (selected.type === "hardscape") { deleteHard.mutate({ id: selected.id, areaId: area.id }); setSelected(null); }
    else if (selected.type === "crop") { deleteCrop.mutate({ id: selected.id, areaId: area.id }); setSelected(null); }
    else if (selected.type === "support") {
      const attached = crops.filter((c) => c.support_id === selected.id).length;
      if (attached > 0) {
        setSupDel({ id: selected.id, count: attached });
      } else {
        deleteSupport.mutate({ id: selected.id, areaId: area.id });
        setSelected(null);
      }
    }
  }
}

// ── Build drawer ────────────────────────────────────────────────────────────────
function BuildDrawer({
  tool, setTool, cropChoice, setCropChoice, supportChoice, setSupportChoice, materialChoice, setMaterialChoice,
  bedShape, setBedShape,
}: {
  tool: Tool; setTool: (t: Tool) => void;
  cropChoice: CropDef; setCropChoice: (c: CropDef) => void;
  supportChoice: SupportDef; setSupportChoice: (s: SupportDef) => void;
  materialChoice: HardscapeMaterial; setMaterialChoice: (m: HardscapeMaterial) => void;
  bedShape: "rect" | "circle" | "polygon"; setBedShape: (s: "rect" | "circle" | "polygon") => void;
}) {
  const tabs: { key: Tool; label: string }[] = [
    { key: "plant", label: "🌱 Plants" }, { key: "vertical", label: "▲ Vertical" },
    { key: "path", label: "🪨 Path" }, { key: "bed", label: "▭ Bed" },
  ];
  return (
    <View className="bg-white rounded-t-2xl px-3 pt-3 pb-5 border-t border-gray-200">
      <View className="flex-row gap-2 mb-3">
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => setTool(tool === t.key ? null : t.key)}
            className={`flex-1 items-center py-2 rounded-xl border ${tool === t.key ? "bg-green-600 border-green-600" : "bg-gray-50 border-gray-200"}`}>
            <Text className={`text-xs font-bold ${tool === t.key ? "text-white" : "text-gray-700"}`}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tool === "plant" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
          {CROP_CATALOG.map((c) => (
            <Pressable key={c.name} onPress={() => setCropChoice(c)}
              className={`px-3 py-2 rounded-xl border ${cropChoice.name === c.name ? "bg-green-100 border-green-500" : "bg-gray-50 border-gray-200"}`}>
              <Text className="text-center text-lg">{c.emoji}</Text>
              <Text className="text-[11px] font-semibold text-gray-700">{c.name}</Text>
              <Text className="text-[9px] text-gray-400 text-center">{c.spacingIn}"</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {tool === "vertical" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
          {SUPPORT_CATALOG.map((s) => (
            <Pressable key={s.type} onPress={() => setSupportChoice(s)}
              className={`px-3 py-2 rounded-xl border w-28 ${supportChoice.type === s.type ? "bg-green-100 border-green-500" : "bg-gray-50 border-gray-200"}`}>
              <Text className="text-[11px] font-bold text-gray-800">{s.label}</Text>
              <Text className="text-[9px] text-gray-400" numberOfLines={2}>{s.hint}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {tool === "path" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
          {MATERIAL_CATALOG.map((m) => (
            <Pressable key={m.material} onPress={() => setMaterialChoice(m.material)}
              className={`px-4 py-3 rounded-xl border ${materialChoice === m.material ? "bg-green-100 border-green-500" : "bg-gray-50 border-gray-200"}`}>
              <Text className="text-xs font-bold text-gray-700">{m.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {tool === "bed" && (
        <View>
          <View className="flex-row gap-2 mb-2">
            {([["rect", "▭ Rectangle"], ["circle", "◯ Circle / pot"], ["polygon", "⬡ Draw shape"]] as const).map(([s, label]) => (
              <Pressable key={s} onPress={() => setBedShape(s)}
                className={`flex-1 items-center py-2 rounded-xl border ${bedShape === s ? "bg-green-100 border-green-500" : "bg-gray-50 border-gray-200"}`}>
                <Text className={`text-xs font-bold ${bedShape === s ? "text-green-700" : "text-gray-600"}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-gray-500 text-xs px-1">
            {bedShape === "polygon" ? "Tap the map to drop corners for an L-shape or any outline, then Finish."
              : bedShape === "circle" ? "Tap the map to drop a round container; select it to resize."
              : "Tap the map to drop a 4×8 ft bed; select it to resize or rename."}
          </Text>
        </View>
      )}
      {!tool && <Text className="text-gray-400 text-xs px-1 text-center">Pick a tab, then tap the map to build.</Text>}
    </View>
  );
}

// ── Inspector ──────────────────────────────────────────────────────────────────
function NumField({ label, value, unit, onChange }: { label: string; value: number | null; unit: string; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value ?? ""));
  React.useEffect(() => { setText(String(value ?? "")); }, [value]);
  // Commit on blur/submit AND on every valid keystroke — react-native-web does
  // not fire onEndEditing reliably, so relying on it alone dropped edits.
  const commit = (raw: string) => { const n = parseFloat(raw); if (!isNaN(n)) onChange(n); };
  return (
    <View className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 flex-1">
      <Text className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">{label}</Text>
      <View className="flex-row items-center">
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => commit(text)}
          onSubmitEditing={() => commit(text)}
          onEndEditing={() => commit(text)}
          keyboardType="decimal-pad"
          className="flex-1 text-base font-bold text-gray-900 py-0" />
        <Text className="text-[10px] text-gray-400">{unit}</Text>
      </View>
    </View>
  );
}

// Text field that commits on blur/submit (RNW-safe, unlike onEndEditing).
function TextField({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string | null) => void }) {
  const [text, setText] = useState(value);
  React.useEffect(() => { setText(value); }, [value]);
  const commit = () => onCommit(text.trim() || null);
  return (
    <TextInput
      value={text} onChangeText={setText} placeholder={placeholder}
      onBlur={commit} onSubmitEditing={commit} onEndEditing={commit}
      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3" />
  );
}

const HARVEST_UNITS = ["lbs", "oz", "count", "bunches", "bags"];

function CropHarvestPanel({ crop }: { crop: GardenCrop }) {
  const { data: harvests = [] } = useCropHarvests(crop.id);
  const addHarvest = useAddCropHarvest();
  const delHarvest = useDeleteCropHarvest();
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("lbs");

  const total = harvests.reduce((s, h) => s + (h.quantity_value ?? 0), 0);
  const primaryUnit = harvests[0]?.quantity_unit ?? unit;

  function log() {
    const q = parseFloat(qty);
    addHarvest.mutate({
      household_id: crop.household_id, crop_id: crop.id, crop_name: crop.plant_name,
      date: new Date().toISOString().slice(0, 10),
      quantity_value: isNaN(q) ? null : q, quantity_unit: unit,
    });
    setQty("");
  }

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Harvests</Text>
        {harvests.length > 0 && (
          <Text className="text-xs font-mono text-gray-600">{total} {primaryUnit} · {harvests.length} log{harvests.length === 1 ? "" : "s"}</Text>
        )}
      </View>

      <View className="flex-row items-center gap-2 mb-2">
        <TextInput value={qty} onChangeText={setQty} keyboardType="decimal-pad" placeholder="Qty"
          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
          {HARVEST_UNITS.map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)}
              className={`px-2.5 py-2 rounded-lg border ${unit === u ? "bg-green-100 border-green-500" : "bg-white border-gray-200"}`}>
              <Text className={`text-xs font-semibold ${unit === u ? "text-green-700" : "text-gray-600"}`}>{u}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={log} className="bg-green-600 rounded-lg px-3 py-2"><Text className="text-white font-bold text-sm">Log</Text></Pressable>
      </View>

      {harvests.slice(0, 5).map((h) => (
        <View key={h.id} className="flex-row items-center justify-between py-1 border-t border-gray-100">
          <Text className="text-xs text-gray-600">{h.date}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs font-mono text-gray-700">{h.quantity_value ?? "—"} {h.quantity_unit}</Text>
            <Pressable onPress={() => delHarvest.mutate({ id: h.id, cropId: crop.id })} hitSlop={8}>
              <Text className="text-red-400 text-xs">✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function Inspector({
  selected, bed, support, hardscape, crop, crops, cropChoice, rowEndsCount,
  onClose, onSaveBed, onSaveSupport, onSaveHard, onSaveCrop, onFillBed, onFillRow, onDelete,
}: {
  selected: Selected; bed?: GardenBed; support?: GardenSupport; hardscape?: any; crop?: GardenCrop;
  crops: GardenCrop[]; cropChoice: CropDef; rowEndsCount: number;
  onClose: () => void;
  onSaveBed: (u: Partial<GardenBed>) => void; onSaveSupport: (u: Partial<GardenSupport>) => void;
  onSaveHard: (u: any) => void; onSaveCrop: (u: Partial<GardenCrop>) => void;
  onFillBed: () => void; onFillRow: () => void; onDelete: () => void;
}) {
  const title =
    selected?.type === "bed" ? bed?.name :
    selected?.type === "support" ? (findSupport(support?.support_type ?? "")?.label ?? "Support") :
    selected?.type === "hardscape" ? "Hardscape" : (crop ? crop.plant_name : "Item");

  const bedPlantCount = bed ? crops.filter((c) => c.bed_id === bed.id).length : 0;
  const capacity = bed && bed.width_ft && bed.length_ft
    ? plantsThatFit(bedAreaSqFt(bed as any), cropChoice.spacingIn) : 0;

  return (
    <View className="bg-white rounded-t-2xl px-4 pt-3 pb-5 border-t border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-extrabold">{title}</Text>
        <Pressable onPress={onClose} hitSlop={8}><Text className="text-gray-400 font-bold">Done</Text></Pressable>
      </View>

      {selected?.type === "bed" && bed && (
        <>
          <View className="flex-row gap-2 mb-3">
            <NumField label="Width" value={bed.width_ft} unit="ft" onChange={(v) => onSaveBed({ width_ft: v })} />
            <NumField label="Length" value={bed.length_ft} unit="ft" onChange={(v) => onSaveBed({ length_ft: v })} />
          </View>
          <Text className="text-xs text-gray-500 mb-2 font-mono">{bedPlantCount} planted · fits ~{capacity} {cropChoice.emoji}{cropChoice.name}</Text>
          <View className="flex-row gap-2 mb-2">
            <Pressable onPress={onFillBed} className="flex-1 items-center bg-green-600 rounded-xl py-3">
              <Text className="text-white font-bold text-sm">⚡ Fill bed</Text>
            </Pressable>
            <Pressable onPress={onFillRow} disabled={rowEndsCount < 2}
              className={`flex-1 items-center rounded-xl py-3 ${rowEndsCount < 2 ? "bg-gray-200" : "bg-green-700"}`}>
              <Text className={`font-bold text-sm ${rowEndsCount < 2 ? "text-gray-400" : "text-white"}`}>↔ Fill row</Text>
            </Pressable>
          </View>
          {rowEndsCount < 2 && (
            <Text className="text-[11px] text-gray-400 mb-1">Place two {cropChoice.name} plants in this bed to enable Fill row.</Text>
          )}
        </>
      )}

      {selected?.type === "support" && support && (
        <View className="flex-row gap-2 mb-3">
          <NumField label="Width" value={support.width_ft} unit="ft" onChange={(v) => onSaveSupport({ width_ft: v })} />
          <NumField label="Length" value={support.length_ft} unit="ft" onChange={(v) => onSaveSupport({ length_ft: v })} />
          <NumField label="Height" value={support.height_ft} unit="ft" onChange={(v) => onSaveSupport({ height_ft: v })} />
          <NumField label="Spacing" value={support.default_spacing_in} unit="in" onChange={(v) => onSaveSupport({ default_spacing_in: v })} />
        </View>
      )}

      {selected?.type === "hardscape" && hardscape && (
        <View className="flex-row gap-2 mb-3">
          <NumField label="Width" value={hardscape.width_ft} unit="ft" onChange={(v) => onSaveHard({ width_ft: v })} />
          <NumField label="Length" value={hardscape.length_ft} unit="ft" onChange={(v) => onSaveHard({ length_ft: v })} />
        </View>
      )}

      {selected?.type === "crop" && crop && (
        <View className="mb-3">
          <TextField value={crop.variety ?? ""} placeholder="Variety (optional)"
            onCommit={(v) => onSaveCrop({ variety: v })} />
          <CropHarvestPanel crop={crop} />
        </View>
      )}

      <Pressable onPress={onDelete} className="items-center py-2">
        <Text className="text-red-500 font-semibold text-sm">Delete</Text>
      </Pressable>
    </View>
  );
}

// ── Expanded hop-around map ──────────────────────────────────────────────────────
function ExpandedMap({
  visible, onClose, area, beds, hardscape, supports, crops,
}: {
  visible: boolean; onClose: () => void;
  area: GardenArea; beds: GardenBed[]; hardscape: any[]; supports: GardenSupport[]; crops: GardenCrop[];
}) {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState<number | null>(null);
  const scale = w ? w / area.width_ft : 0;
  const sel: Selected = idx != null && crops[idx] ? { type: "crop", id: crops[idx].id } : null;
  const cur = idx != null ? crops[idx] : undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#1f2417]" edges={["top"]}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={onClose} hitSlop={10}><Text className="text-green-300 font-bold">‹ Back to edit</Text></Pressable>
          <Text className="text-white font-bold">{area.name} · full map</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            {scale > 0 && (
              <View style={{ height: area.length_ft * scale }}>
                <GardenCanvas
                  area={area} beds={beds} hardscape={hardscape} supports={supports} crops={crops}
                  scale={scale} selected={sel} interactive
                  onSelectElement={(s) => { if (s?.type === "crop") setIdx(crops.findIndex((c) => c.id === s.id)); }}
                  onCanvasPress={() => setIdx(null)}
                />
              </View>
            )}
          </View>
          <Text className="text-white/50 text-xs mt-2 text-center">Tap any plant to hop to it</Text>
        </ScrollView>

        {cur && (
          <View className="bg-white rounded-t-2xl px-4 pt-4 pb-6 border-t border-gray-200">
            <Text className="text-lg font-extrabold">{cropEmoji(cur.plant_name)} {cur.plant_name}</Text>
            {cur.variety ? <Text className="text-sm text-gray-500">{cur.variety}</Text> : null}
            <Text className="text-xs text-gray-400 font-mono mt-1">
              {cur.spacing_in ? `${cur.spacing_in}" spacing` : ""}{cur.date_planted ? ` · planted ${cur.date_planted}` : ""}
            </Text>
            <View className="flex-row gap-2 mt-3">
              <Pressable onPress={() => setIdx((i) => (i == null ? 0 : (i - 1 + crops.length) % crops.length))}
                className="flex-1 items-center bg-gray-100 rounded-xl py-2.5"><Text className="font-bold text-gray-700">‹ Prev</Text></Pressable>
              <Pressable onPress={() => setIdx((i) => (i == null ? 0 : (i + 1) % crops.length))}
                className="flex-1 items-center bg-green-600 rounded-xl py-2.5"><Text className="font-bold text-white">Next ›</Text></Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
