import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

  function openAdd() { setEditTarget(null); resetForm(); setShowAdd(true); }
  function openEdit(seed: GardenSeedInventory) { setEditTarget(seed); resetForm(seed); setShowAdd(true); }

  // Auto-detect family when name changes
  function handleNameChange(val: string) {
    setPlantName(val);
    if (!family) setFamily(guessFamilyFromName(val));
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

  function confirmDelete(seed: GardenSeedInventory) {
    Alert.alert("Delete Seed", `Remove "${seed.plant_name}${seed.variety ? ` (${seed.variety})` : ""}" from inventory?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSeed.mutate({ id: seed.id, householdId: householdId! }) },
    ]);
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
                    {/* Family color dot */}
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
                    <TouchableOpacity onPress={() => confirmDelete(seed)} className="px-2 py-1 rounded bg-red-50 ml-1">
                      <Text className="text-red-400 text-xs">✕</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
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
