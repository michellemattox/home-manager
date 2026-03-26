import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenSeeds,
  useCreateGardenSeed,
  useUpdateGardenSeed,
  useDeleteGardenSeed,
} from "@/hooks/useGarden";
import { PLANT_FAMILIES, guessFamilyFromName, type GardenSeedInventory } from "@/types/app.types";

const CURRENT_YEAR = new Date().getFullYear();

// Rough seed viability by family (years)
const FAMILY_VIABILITY: Record<string, number> = {
  Solanaceae: 4, Brassicaceae: 5, Leguminosae: 3, Alliaceae: 2,
  Asteraceae: 3, Chenopodiaceae: 4, Cucurbitaceae: 5, Apiaceae: 3, Other: 3,
};

function getSeedStatus(seed: GardenSeedInventory) {
  const expiry = seed.expiry_year ?? (seed.purchase_year
    ? seed.purchase_year + (FAMILY_VIABILITY[seed.plant_family ?? "Other"] ?? 3)
    : null);
  if (!expiry) return null;
  if (expiry < CURRENT_YEAR) return "expired";
  if (expiry === CURRENT_YEAR) return "expiring";
  return "good";
}

function SeedBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View className="px-2 py-0.5 rounded" style={{ backgroundColor: bg }}>
      <Text className="text-xs font-medium" style={{ color }}>{label}</Text>
    </View>
  );
}

type SortMode = "name" | "family" | "expiry";

// Guess plant name/family from UPC product title
function parseSeedProductTitle(title: string): { plantName: string; variety: string } {
  // Remove common seed brand prefixes/suffixes
  const cleaned = title
    .replace(/\b(seeds?|seed packet|organic|heirloom|non-gmo|open.pollinated)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Try to split on common separators: " - ", ", ", " – "
  const parts = cleaned.split(/\s*[-–,]\s*/);
  if (parts.length >= 2) {
    return { plantName: parts[0].trim(), variety: parts[1].trim() };
  }
  return { plantName: cleaned, variety: "" };
}

export default function SeedsScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: seeds = [], isLoading } = useGardenSeeds(householdId);
  const createSeed = useCreateGardenSeed();
  const updateSeed = useUpdateGardenSeed();
  const deleteSeed = useDeleteGardenSeed();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<GardenSeedInventory | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [filterFamily, setFilterFamily] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Barcode scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scanLookupLoading, setScanLookupLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanCooldown = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Form state
  const [plantName, setPlantName] = useState("");
  const [variety, setVariety] = useState("");
  const [family, setFamily] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseYear, setPurchaseYear] = useState(String(CURRENT_YEAR));
  const [expiryYear, setExpiryYear] = useState("");
  const [germRate, setGermRate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm(seed?: GardenSeedInventory) {
    if (seed) {
      setPlantName(seed.plant_name);
      setVariety(seed.variety ?? "");
      setFamily(seed.plant_family ?? "");
      setQuantity(seed.quantity_seeds != null ? String(seed.quantity_seeds) : "");
      setPurchaseYear(seed.purchase_year != null ? String(seed.purchase_year) : String(CURRENT_YEAR));
      setExpiryYear(seed.expiry_year != null ? String(seed.expiry_year) : "");
      setGermRate(seed.germination_rate != null ? String(seed.germination_rate) : "");
      setSupplier(seed.supplier ?? "");
      setNotes(seed.notes ?? "");
    } else {
      setPlantName(""); setVariety(""); setFamily(""); setQuantity("");
      setPurchaseYear(String(CURRENT_YEAR)); setExpiryYear(""); setGermRate("");
      setSupplier(""); setNotes("");
    }
  }

  function openAdd() { setEditTarget(null); resetForm(); setScanError(null); setShowAdd(true); }
  function openEdit(seed: GardenSeedInventory) { setEditTarget(seed); resetForm(seed); setScanError(null); setShowAdd(true); }

  // Auto-detect family when name changes
  function handleNameChange(val: string) {
    setPlantName(val);
    if (!family) setFamily(guessFamilyFromName(val));
  }

  async function openScanner() {
    // If permission status is still loading or not granted, request it now
    if (!cameraPermission?.granted) {
      // Permanently denied — send to Settings
      if (cameraPermission?.canAskAgain === false) {
        Alert.alert(
          "Camera Permission Required",
          "Camera access was denied. Enable it in Settings → Apps → Home Manager → Permissions → Camera.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      // Ask for permission (covers null/not-yet-granted/can-ask-again)
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Camera access is needed to scan seed packet barcodes.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    setScanError(null);
    // Close the add sheet first; on Android two modals can't overlap.
    // Delay scanner open until the dismiss animation finishes (~300 ms).
    setShowAdd(false);
    setTimeout(() => setShowScanner(true), Platform.OS === "android" ? 350 : 50);
  }

  async function handleBarcodeScan(barcode: string) {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setShowScanner(false);
    setScanLookupLoading(true);
    setScanError(null);

    try {
      const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
      const data = await res.json();
      const item = data?.items?.[0];

      if (item) {
        const title = item.title ?? "";
        const { plantName: pn, variety: va } = parseSeedProductTitle(title);
        if (pn) setPlantName(pn);
        if (va) setVariety(va);
        if (pn && !family) setFamily(guessFamilyFromName(pn));
        if (item.brand) setSupplier(item.brand);
        // Try to extract seed count from description
        const desc = (item.description ?? "").toLowerCase();
        const seedMatch = desc.match(/(\d+)\s*seeds?/);
        if (seedMatch) setQuantity(seedMatch[1]);
      } else {
        setScanError(`No product found for barcode ${barcode}. Fill in manually.`);
      }
    } catch {
      setScanError("Could not look up barcode. Check your connection and try again.");
    } finally {
      setScanLookupLoading(false);
      // Reopen add modal after scanner has closed
      setTimeout(() => setShowAdd(true), Platform.OS === "android" ? 350 : 50);
      setTimeout(() => { scanCooldown.current = false; }, 2000);
    }
  }

  async function handleSave() {
    if (!householdId || !plantName.trim()) return;
    const autoFamily = family || guessFamilyFromName(plantName);
    const viability = FAMILY_VIABILITY[autoFamily] ?? 3;
    const purchYr = parseInt(purchaseYear) || CURRENT_YEAR;
    const payload = {
      household_id: householdId,
      plant_name: plantName.trim(),
      variety: variety.trim() || null,
      plant_family: autoFamily || null,
      quantity_seeds: quantity ? parseInt(quantity) : null,
      purchase_year: purchYr,
      expiry_year: expiryYear ? parseInt(expiryYear) : purchYr + viability,
      germination_rate: germRate ? parseInt(germRate) : null,
      supplier: supplier.trim() || null,
      notes: notes.trim() || null,
    };
    if (editTarget) {
      await updateSeed.mutateAsync({ id: editTarget.id, householdId, updates: payload });
    } else {
      await createSeed.mutateAsync(payload as any);
    }
    setShowAdd(false);
  }

  const families = useMemo(() => Array.from(new Set(seeds.map(s => s.plant_family).filter(Boolean))), [seeds]);

  const displayedSeeds = useMemo(() => {
    let list = filterFamily ? seeds.filter(s => s.plant_family === filterFamily) : seeds;
    if (sortMode === "family") list = [...list].sort((a, b) => (a.plant_family ?? "").localeCompare(b.plant_family ?? ""));
    else if (sortMode === "expiry") list = [...list].sort((a, b) => (a.expiry_year ?? 9999) - (b.expiry_year ?? 9999));
    else list = [...list].sort((a, b) => a.plant_name.localeCompare(b.plant_name));
    return list;
  }, [seeds, sortMode, filterFamily]);

  const expiredCount = seeds.filter(s => getSeedStatus(s) === "expired").length;
  const expiringCount = seeds.filter(s => getSeedStatus(s) === "expiring").length;
  const lowCount = seeds.filter(s => (s.quantity_seeds ?? 999) < 20 && s.quantity_seeds != null).length;

  const isPending = createSeed.isPending || updateSeed.isPending;

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🌱 Seed Inventory</Text>
        <TouchableOpacity onPress={openAdd} className="bg-green-600 rounded-xl px-3 py-1.5">
          <Text className="text-white text-sm font-semibold">+ Seed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
        {/* Alert badges */}
        {(expiredCount > 0 || expiringCount > 0 || lowCount > 0) && (
          <View className="flex-row gap-2 flex-wrap">
            {expiredCount > 0 && (
              <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
                <Text className="text-red-600 text-xs font-semibold">⚠ {expiredCount} expired</Text>
              </View>
            )}
            {expiringCount > 0 && (
              <View className="flex-row items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                <Text className="text-amber-700 text-xs font-semibold">⏰ {expiringCount} expiring this year</Text>
              </View>
            )}
            {lowCount > 0 && (
              <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
                <Text className="text-blue-700 text-xs font-semibold">📉 {lowCount} low stock (&lt;20 seeds)</Text>
              </View>
            )}
          </View>
        )}

        {/* Controls */}
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-xs text-gray-500">Sort:</Text>
          {(["name", "family", "expiry"] as SortMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setSortMode(m)}
              className={`px-2.5 py-1.5 rounded-xl border ${sortMode === m ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
            >
              <Text className={`text-xs font-medium capitalize ${sortMode === m ? "text-white" : "text-gray-600"}`}>{m}</Text>
            </TouchableOpacity>
          ))}
          {families.length > 1 && (
            <>
              <Text className="text-xs text-gray-400 ml-1">|</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-1.5">
                  <TouchableOpacity
                    onPress={() => setFilterFamily(null)}
                    className={`px-2.5 py-1.5 rounded-xl border ${!filterFamily ? "bg-green-100 border-green-300" : "bg-white border-gray-200"}`}
                  >
                    <Text className={`text-xs ${!filterFamily ? "text-green-700 font-medium" : "text-gray-500"}`}>All</Text>
                  </TouchableOpacity>
                  {families.map(f => {
                    const fi = PLANT_FAMILIES[f!] ?? PLANT_FAMILIES.Other;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setFilterFamily(filterFamily === f ? null : f!)}
                        className="px-2.5 py-1.5 rounded-xl border"
                        style={{ backgroundColor: filterFamily === f ? fi.bg : "white", borderColor: filterFamily === f ? fi.color : "#e5e7eb" }}
                      >
                        <Text className="text-xs" style={{ color: filterFamily === f ? fi.color : "#6b7280" }}>{f}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </View>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#16a34a" />
          </View>
        ) : displayedSeeds.length === 0 ? (
          <View className="items-center py-16 px-4">
            <Text className="text-5xl mb-4">🌱</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">No seeds yet</Text>
            <Text className="text-sm text-gray-400 mt-2 text-center">
              Tap "+ Seed" to start tracking your seed packets.
            </Text>
          </View>
        ) : (
          displayedSeeds.map(seed => {
            const st = getSeedStatus(seed);
            const famInfo = PLANT_FAMILIES[seed.plant_family ?? "Other"] ?? PLANT_FAMILIES.Other;
            const isLow = seed.quantity_seeds != null && seed.quantity_seeds < 20;
            return (
              <Card key={seed.id} className="p-0 overflow-hidden">
                <TouchableOpacity onPress={() => openEdit(seed)} activeOpacity={0.8}>
                  <View className="flex-row items-start px-4 py-3 gap-3">
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: famInfo.bg }}>
                      <View className="w-4 h-4 rounded-full" style={{ backgroundColor: famInfo.color }} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-sm font-bold text-gray-900">{seed.plant_name}</Text>
                        {seed.variety && <Text className="text-xs text-gray-500 italic">{seed.variety}</Text>}
                      </View>
                      <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                        {seed.plant_family && (
                          <SeedBadge label={seed.plant_family} color={famInfo.color} bg={famInfo.bg} />
                        )}
                        {st === "expired" && <SeedBadge label="Expired" color="#dc2626" bg="#fef2f2" />}
                        {st === "expiring" && <SeedBadge label="Expiring" color="#d97706" bg="#fffbeb" />}
                        {isLow && <SeedBadge label={`Low (${seed.quantity_seeds})`} color="#2563eb" bg="#eff6ff" />}
                      </View>
                      <View className="flex-row items-center gap-3 mt-1.5">
                        {seed.quantity_seeds != null && (
                          <Text className="text-xs text-gray-600">~{seed.quantity_seeds} seeds</Text>
                        )}
                        {seed.purchase_year && (
                          <Text className="text-xs text-gray-400">Purchased {seed.purchase_year}</Text>
                        )}
                        {seed.expiry_year && (
                          <Text className="text-xs text-gray-400">Good until {seed.expiry_year}</Text>
                        )}
                        {seed.germination_rate != null && (
                          <Text className="text-xs text-gray-400">{seed.germination_rate}% germ</Text>
                        )}
                      </View>
                      {seed.supplier && (
                        <Text className="text-xs text-gray-400 mt-0.5">from {seed.supplier}</Text>
                      )}
                    </View>
                    {/* Inline delete confirmation */}
                    {confirmingId === seed.id ? (
                      <View className="flex-col items-end gap-1">
                        <TouchableOpacity onPress={() => setConfirmingId(null)} className="px-2 py-1 rounded-lg bg-gray-100">
                          <Text className="text-gray-600 text-xs">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setConfirmingId(null);
                            deleteSeed.mutate({ id: seed.id, householdId: householdId! });
                          }}
                          className="px-2 py-1 rounded-lg bg-red-500"
                        >
                          <Text className="text-white text-xs font-semibold">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setConfirmingId(seed.id)}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        className="px-2 py-1.5"
                      >
                        <Text className="text-red-400 text-sm">✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* ── Barcode Scanner Modal ──────────────────────────────────────────── */}
      <Modal visible={showScanner} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => { setShowScanner(false); setTimeout(() => setShowAdd(true), Platform.OS === "android" ? 350 : 50); }}>
              <Text className="text-white text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-white font-semibold">Scan Seed Packet Barcode</Text>
            <View style={{ width: 60 }} />
          </View>

          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
              onBarcodeScanned={(e) => handleBarcodeScan(e.data)}
            />
            {/* Scan guide overlay */}
            <View
              style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                alignItems: "center", justifyContent: "center",
              }}
              pointerEvents="none"
            >
              <View style={{ width: 260, height: 120, borderWidth: 2, borderColor: "#4ade80", borderRadius: 12 }} />
              <Text style={{ color: "#4ade80", marginTop: 12, fontSize: 13, fontWeight: "600" }}>
                Align barcode within the box
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-gray-900">
              {editTarget ? "Edit Seed" : "Add Seed"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={!plantName.trim() || isPending}>
              <Text className={`text-base font-semibold ${plantName.trim() ? "text-green-600" : "text-gray-300"}`}>
                {isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            {/* Barcode scan button */}
            {!editTarget && (
              <TouchableOpacity
                onPress={openScanner}
                disabled={scanLookupLoading}
                className={`flex-row items-center justify-center gap-2 rounded-xl py-3 mb-4 border ${scanLookupLoading ? "border-gray-200 bg-gray-50" : "border-emerald-300 bg-emerald-50"}`}
              >
                {scanLookupLoading ? (
                  <>
                    <ActivityIndicator color="#16a34a" size="small" />
                    <Text className="text-emerald-700 text-sm font-medium">Looking up barcode…</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-base">📸</Text>
                    <Text className="text-emerald-700 text-sm font-semibold">Scan Seed Packet Barcode</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {scanError && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                <Text className="text-amber-700 text-xs">{scanError}</Text>
              </View>
            )}

            <Input label="Plant Name *" placeholder="e.g. Tomato, Kale, Carrots" value={plantName} onChangeText={handleNameChange} />
            <Input label="Variety" placeholder="e.g. Early Girl, Lacinato, Nantes" value={variety} onChangeText={setVariety} />

            {/* Family picker */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Plant Family</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {Object.entries(PLANT_FAMILIES).map(([fam, info]) => (
                  <TouchableOpacity
                    key={fam}
                    onPress={() => setFamily(fam)}
                    className="px-3 py-2 rounded-xl border"
                    style={{ backgroundColor: family === fam ? info.bg : "white", borderColor: family === fam ? info.color : "#e5e7eb" }}
                  >
                    <Text className="text-xs font-medium" style={{ color: family === fam ? info.color : "#6b7280" }}>{fam}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input label="Est. Seeds Remaining" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} placeholder="e.g. 50" />
              </View>
              <View className="flex-1">
                <Input label="Germ. Rate (%)" keyboardType="number-pad" value={germRate} onChangeText={setGermRate} placeholder="e.g. 85" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input label="Year Purchased" keyboardType="number-pad" value={purchaseYear} onChangeText={setPurchaseYear} />
              </View>
              <View className="flex-1">
                <Input label="Good Until (year)" keyboardType="number-pad" value={expiryYear} onChangeText={setExpiryYear} placeholder="auto-calculated" />
              </View>
            </View>
            <Input label="Supplier / Source" placeholder="e.g. Baker Creek, Territorial, saved" value={supplier} onChangeText={setSupplier} />
            <Input label="Notes" multiline numberOfLines={3} className="min-h-[72px]" value={notes} onChangeText={setNotes} placeholder="Storage notes, germination tips…" />

            <View className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2">
              <Text className="text-green-800 text-xs font-semibold mb-1">Seed viability guide</Text>
              <Text className="text-green-700 text-xs leading-5">
                Onions/Alliaceae: 1–2 yrs · Beans/Legumes: 3 yrs · Carrots/Apiaceae: 3 yrs{"\n"}
                Tomatoes/Solanaceae: 4 yrs · Beets/Chenopodiaceae: 4 yrs{"\n"}
                Brassicas/Cucurbits: 5 yrs · Store in cool, dark, dry place.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
