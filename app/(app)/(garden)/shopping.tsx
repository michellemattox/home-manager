/**
 * Garden Shopping List
 *
 * Smart shopping list that auto-suggests items from:
 * - Low/expired seeds in inventory
 * - Active pest treatments needed (from pest log)
 * - Common PNW Zone 8b garden supplies
 *
 * User can check off items, add custom items, and clear completed.
 * Persisted via AsyncStorage.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useHouseholdStore } from "@/stores/householdStore";
import { useGardenSeeds, useGardenPestLogs } from "@/hooks/useGarden";

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "garden_shopping_list_v1";

interface ShoppingItem {
  id: string;
  text: string;
  category: "seeds" | "pest_control" | "supplies" | "custom";
  checked: boolean;
  auto?: boolean; // auto-suggested vs manually added
}

const CATEGORY_STYLES = {
  seeds:        { label: "Seeds",        emoji: "🌱", bg: "#f0fdf4", color: "#16a34a" },
  pest_control: { label: "Pest Control", emoji: "🐛", bg: "#fef2f2", color: "#dc2626" },
  supplies:     { label: "Supplies",     emoji: "🛒", bg: "#eff6ff", color: "#2563eb" },
  custom:       { label: "Custom",       emoji: "✏️",  bg: "#f9fafb", color: "#6b7280" },
};

// Common Zone 8b supplies to suggest
const ZONE_8B_SUPPLIES: { text: string; trigger?: string }[] = [
  { text: "Iron phosphate slug bait (Sluggo) — OMRI listed", trigger: "slugs" },
  { text: "Floating row cover (1.5 oz) — brassica protection" },
  { text: "Neem oil concentrate — pest & fungal control" },
  { text: "Insecticidal soap spray (Safer Brand)" },
  { text: "Copper fungicide — late blight prevention" },
  { text: "Diatomaceous earth (food grade)" },
  { text: "Bt (Bacillus thuringiensis) — caterpillar control" },
  { text: "Beneficial nematodes (Steinernema feltiae) — root maggots" },
  { text: "Yellow sticky traps — whitefly/aphid monitoring" },
  { text: "Rhizobium inoculant — pea/bean nitrogen fixation" },
  { text: "Dolomitic lime — soil pH correction" },
  { text: "Balanced organic fertilizer (4-4-4 or similar)" },
  { text: "Compost — soil amendment" },
  { text: "Garden twine & bamboo stakes — tomato support" },
  { text: "Drip irrigation emitters/fittings" },
];

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ShoppingScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: seeds = [] } = useGardenSeeds(householdId);
  const { data: pestLogs = [] } = useGardenPestLogs(householdId);

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load persisted list
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY + (householdId ?? ""))
      .then(raw => {
        if (raw) setItems(JSON.parse(raw));
      })
      .finally(() => setLoaded(true));
  }, [householdId]);

  // Persist on change
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY + (householdId ?? ""), JSON.stringify(items));
  }, [items, loaded, householdId]);

  // Auto-suggested items from data
  const suggestions = useMemo(() => {
    const result: Omit<ShoppingItem, "id" | "checked">[] = [];
    const existingTexts = new Set(items.map(i => i.text.toLowerCase()));

    // Low/expired seeds
    seeds.forEach(seed => {
      const isExpired = seed.expiry_year != null && seed.expiry_year < CURRENT_YEAR;
      const isLow = seed.quantity_seeds != null && seed.quantity_seeds < 20;
      if (isExpired) {
        const text = `Replace expired seeds: ${seed.plant_name}${seed.variety ? ` (${seed.variety})` : ""}`;
        if (!existingTexts.has(text.toLowerCase()))
          result.push({ text, category: "seeds", auto: true });
      } else if (isLow) {
        const text = `Restock seeds: ${seed.plant_name}${seed.variety ? ` (${seed.variety})` : ""} (~${seed.quantity_seeds} left)`;
        if (!existingTexts.has(text.toLowerCase()))
          result.push({ text, category: "seeds", auto: true });
      }
    });

    // Active pest treatments
    const activePests = pestLogs.filter(l => !l.resolved);
    const pestTreatments = new Set<string>();
    activePests.forEach(log => {
      if (log.log_type === "pest" || log.log_type === "disease") {
        const name = log.name.toLowerCase();
        if (name.includes("aphid") || name.includes("whitefly") || name.includes("thrip")) {
          pestTreatments.add("Insecticidal soap spray — for " + log.name);
          pestTreatments.add("Neem oil — for " + log.name);
        }
        if (name.includes("slug") || name.includes("snail")) {
          pestTreatments.add("Iron phosphate bait (Sluggo) — for " + log.name);
        }
        if (name.includes("mildew") || name.includes("blight") || name.includes("rust") || name.includes("mold")) {
          pestTreatments.add("Copper fungicide — for " + log.name);
        }
        if (name.includes("caterpillar") || name.includes("worm") || name.includes("looper")) {
          pestTreatments.add("Bt spray (Bacillus thuringiensis) — for " + log.name);
        }
        if (name.includes("root maggot") || name.includes("wireworm") || name.includes("cutworm")) {
          pestTreatments.add("Beneficial nematodes — for " + log.name);
        }
        if (name.includes("spider mite")) {
          pestTreatments.add("Predatory mites (Phytoseiidae) — for " + log.name);
        }
      }
    });
    pestTreatments.forEach(text => {
      if (!existingTexts.has(text.toLowerCase()))
        result.push({ text, category: "pest_control", auto: true });
    });

    return result;
  }, [seeds, pestLogs, items]);

  function addSuggestion(s: Omit<ShoppingItem, "id" | "checked">) {
    setItems(prev => [...prev, { ...s, id: genId(), checked: false }]);
  }

  function addCustomItem() {
    const text = newItemText.trim();
    if (!text) return;
    setItems(prev => [...prev, { id: genId(), text, category: "custom", checked: false }]);
    setNewItemText("");
  }

  function toggleItem(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function clearChecked() {
    setItems(prev => prev.filter(i => !i.checked));
  }

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  const grouped = useMemo(() => {
    const g: Record<string, ShoppingItem[]> = { seeds: [], pest_control: [], supplies: [], custom: [] };
    unchecked.forEach(i => g[i.category]?.push(i));
    return g;
  }, [unchecked]);

  if (!loaded) {
    return (
      <SafeAreaView className="flex-1 bg-[#F2FCEB] items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#16a34a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🛒 Garden Shopping</Text>
        {checked.length > 0 && (
          <TouchableOpacity onPress={clearChecked} className="bg-gray-100 rounded-xl px-3 py-1.5">
            <Text className="text-gray-600 text-xs font-semibold">Clear done ({checked.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>

        {/* Auto-suggestions from data */}
        {suggestions.length > 0 && (
          <View>
            <TouchableOpacity
              onPress={() => setShowSuggestions(!showSuggestions)}
              className="flex-row items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-base">💡</Text>
                <View>
                  <Text className="text-amber-800 text-sm font-semibold">
                    {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} from your garden
                  </Text>
                  <Text className="text-amber-600 text-xs">Based on low seeds & active pest logs</Text>
                </View>
              </View>
              <Text className="text-amber-600 text-sm">{showSuggestions ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showSuggestions && (
              <View className="gap-2 mt-2">
                {suggestions.map((s, i) => {
                  const cat = CATEGORY_STYLES[s.category];
                  return (
                    <View key={i} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3">
                      <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: cat.bg }}>
                        <Text className="text-xs" style={{ color: cat.color }}>{cat.emoji}</Text>
                      </View>
                      <Text className="flex-1 text-sm text-gray-700">{s.text}</Text>
                      <TouchableOpacity
                        onPress={() => addSuggestion(s)}
                        className="bg-green-600 rounded-lg px-2.5 py-1.5"
                      >
                        <Text className="text-white text-xs font-semibold">+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Common Zone 8b supplies quick-add */}
        <View>
          <TouchableOpacity
            onPress={() => setShowSuggestions(s => !s)}
            className="flex-row items-center gap-2 mb-2"
          >
            <Text className="text-sm font-semibold text-gray-700">Common PNW Garden Supplies</Text>
            <Text className="text-gray-400 text-xs">(tap to add)</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {ZONE_8B_SUPPLIES.filter(s => !items.some(i => i.text === s.text)).slice(0, 8).map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setItems(prev => [...prev, { id: genId(), text: s.text, category: "supplies", checked: false }])}
                  className="border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 max-w-[160px]"
                >
                  <Text className="text-blue-700 text-xs" numberOfLines={2}>{s.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Add custom item */}
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
            placeholder="Add item to list…"
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={addCustomItem}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={addCustomItem}
            disabled={!newItemText.trim()}
            className={`rounded-xl px-4 py-3 items-center justify-center ${newItemText.trim() ? "bg-green-600" : "bg-gray-200"}`}
          >
            <Text className={`text-sm font-semibold ${newItemText.trim() ? "text-white" : "text-gray-400"}`}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Shopping list by category */}
        {unchecked.length === 0 && checked.length === 0 ? (
          <View className="items-center py-12 px-4">
            <Text className="text-4xl mb-3">🛒</Text>
            <Text className="text-base font-semibold text-gray-700 text-center">List is empty</Text>
            <Text className="text-sm text-gray-400 mt-2 text-center">
              Add items above or accept suggestions from your garden data.
            </Text>
          </View>
        ) : (
          <>
            {(["seeds", "pest_control", "supplies", "custom"] as const).map(cat => {
              const catItems = grouped[cat];
              if (!catItems?.length) return null;
              const cs = CATEGORY_STYLES[cat];
              return (
                <View key={cat}>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-sm font-semibold text-gray-700">{cs.emoji} {cs.label}</Text>
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cs.bg }}>
                      <Text className="text-xs font-medium" style={{ color: cs.color }}>{catItems.length}</Text>
                    </View>
                  </View>
                  <View className="gap-2">
                    {catItems.map(item => (
                      <View key={item.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3">
                        <TouchableOpacity
                          onPress={() => toggleItem(item.id)}
                          className={`w-5 h-5 rounded border-2 items-center justify-center flex-shrink-0 ${item.checked ? "bg-green-600 border-green-600" : "border-gray-300"}`}
                        >
                          {item.checked && <Text className="text-white text-xs">✓</Text>}
                        </TouchableOpacity>
                        <Text className="flex-1 text-sm text-gray-800">{item.text}</Text>
                        <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Text className="text-gray-300 text-sm">✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {/* Checked/done items */}
            {checked.length > 0 && (
              <View>
                <Text className="text-sm font-semibold text-gray-400 mb-2">Done ({checked.length})</Text>
                <View className="gap-2">
                  {checked.map(item => (
                    <View key={item.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3 opacity-60">
                      <TouchableOpacity
                        onPress={() => toggleItem(item.id)}
                        className="w-5 h-5 rounded border-2 items-center justify-center flex-shrink-0 bg-green-600 border-green-600"
                      >
                        <Text className="text-white text-xs">✓</Text>
                      </TouchableOpacity>
                      <Text className="flex-1 text-sm text-gray-500 line-through">{item.text}</Text>
                      <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Text className="text-gray-300 text-sm">✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
