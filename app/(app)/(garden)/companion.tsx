import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  COMPANION_PLANTS,
  getCompatibility,
  getPlantRelationships,
  type Compatibility,
} from "@/utils/companionData";

const COMPAT_CONFIG: Record<
  Compatibility,
  { label: string; bg: string; border: string; text: string; icon: string }
> = {
  good: {
    label: "Great together",
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-800",
    icon: "✓",
  },
  bad: {
    label: "Keep apart",
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-800",
    icon: "✗",
  },
  neutral: {
    label: "No known interaction",
    bg: "bg-gray-100",
    border: "border-gray-200",
    text: "text-gray-500",
    icon: "~",
  },
};

function emojiFor(name: string) {
  return COMPANION_PLANTS.find((p) => p.name === name)?.emoji ?? "🌱";
}

export default function CompanionScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return COMPANION_PLANTS;
    const q = search.toLowerCase();
    return COMPANION_PLANTS.filter((p) => p.name.toLowerCase().includes(q));
  }, [search]);

  function togglePlant(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  // All unique pairs for 2+ selected plants
  const pairs = useMemo(() => {
    if (selectedArr.length < 2) return [];
    const result: { a: string; b: string; compat: Compatibility }[] = [];
    for (let i = 0; i < selectedArr.length; i++) {
      for (let j = i + 1; j < selectedArr.length; j++) {
        result.push({
          a: selectedArr[i],
          b: selectedArr[j],
          compat: getCompatibility(selectedArr[i], selectedArr[j]),
        });
      }
    }
    // Bad first, then good, then neutral
    const order = { bad: 0, good: 1, neutral: 2 };
    return result.sort((a, b) => order[a.compat] - order[b.compat]);
  }, [selectedArr]);

  // Single-plant relationship data
  const singleInfo = useMemo(() => {
    if (selectedArr.length !== 1) return null;
    return getPlantRelationships(selectedArr[0]);
  }, [selectedArr]);

  const goodCount = pairs.filter((p) => p.compat === "good").length;
  const badCount = pairs.filter((p) => p.compat === "bad").length;
  const neutralCount = pairs.filter((p) => p.compat === "neutral").length;

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🌿 Companion Planting</Text>
        {selected.size > 0 && (
          <TouchableOpacity onPress={() => setSelected(new Set())}>
            <Text className="text-gray-400 text-sm">Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text className="text-sm text-gray-500">
          Select plants to check if they grow well together or should be kept apart.
        </Text>

        {/* Search */}
        <View className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex-row items-center gap-2">
          <Text className="text-gray-400 text-base">🔍</Text>
          <TextInput
            placeholder="Search plants…"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-gray-800"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text className="text-gray-400 text-sm px-1">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected count */}
        {selected.size > 0 && (
          <View className="flex-row items-center gap-2">
            <View className="bg-green-600 rounded-full px-3 py-0.5">
              <Text className="text-white text-xs font-semibold">{selected.size} selected</Text>
            </View>
            <Text className="text-gray-400 text-xs">
              {selected.size === 1
                ? "Select one more to check compatibility"
                : `${pairs.length} pair${pairs.length !== 1 ? "s" : ""} to compare`}
            </Text>
          </View>
        )}

        {/* Plant chip grid */}
        <View className="flex-row flex-wrap gap-2">
          {filtered.map((plant) => {
            const isSelected = selected.has(plant.name);
            return (
              <TouchableOpacity
                key={plant.name}
                onPress={() => togglePlant(plant.name)}
                activeOpacity={0.7}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                  isSelected
                    ? "bg-green-600 border-green-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text className="text-base">{plant.emoji}</Text>
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-gray-700"
                  }`}
                >
                  {plant.name}
                </Text>
                {isSelected && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <Text className="text-gray-400 text-sm py-2">No plants match "{search}"</Text>
          )}
        </View>

        {/* Empty state */}
        {selectedArr.length === 0 && (
          <View className="items-center py-10">
            <Text className="text-4xl mb-3">🌱</Text>
            <Text className="text-gray-500 text-sm font-medium">Tap plants above to get started</Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              Select 2 or more to check pair compatibility
            </Text>
          </View>
        )}

        {/* Single plant: show all its relationships */}
        {singleInfo && selectedArr.length === 1 && (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-gray-700">
              {emojiFor(selectedArr[0])} {selectedArr[0]}
            </Text>

            {singleInfo.good.length > 0 && (
              <View className="bg-green-50 border border-green-200 rounded-xl p-4 gap-3">
                <Text className="text-green-800 text-sm font-semibold">✓ Grows well with</Text>
                <View className="flex-row flex-wrap gap-2">
                  {singleInfo.good.map((g) => (
                    <View
                      key={g}
                      className="flex-row items-center gap-1 bg-green-100 rounded-lg px-2 py-1"
                    >
                      <Text className="text-sm">{emojiFor(g)}</Text>
                      <Text className="text-green-800 text-xs font-medium">{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {singleInfo.bad.length > 0 && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 gap-3">
                <Text className="text-red-800 text-sm font-semibold">✗ Keep away from</Text>
                <View className="flex-row flex-wrap gap-2">
                  {singleInfo.bad.map((b) => (
                    <View
                      key={b}
                      className="flex-row items-center gap-1 bg-red-100 rounded-lg px-2 py-1"
                    >
                      <Text className="text-sm">{emojiFor(b)}</Text>
                      <Text className="text-red-800 text-xs font-medium">{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {singleInfo.good.length === 0 && singleInfo.bad.length === 0 && (
              <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <Text className="text-gray-500 text-sm text-center">
                  No known companion planting relationships for {selectedArr[0]}.
                </Text>
              </View>
            )}

            <Text className="text-xs text-gray-400 text-center">
              Add more plants to check specific pair compatibility
            </Text>
          </View>
        )}

        {/* Multi-plant compatibility results */}
        {pairs.length > 0 && (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-gray-700">
              Compatibility — {selectedArr.length} plants, {pairs.length} pair{pairs.length !== 1 ? "s" : ""}
            </Text>

            {/* Summary row */}
            <View className="flex-row gap-2">
              {goodCount > 0 && (
                <View className="flex-row items-center gap-1.5 bg-green-100 border border-green-200 rounded-xl px-3 py-1.5">
                  <Text className="text-green-700 text-sm font-bold">{goodCount}</Text>
                  <Text className="text-green-700 text-sm">✓ good</Text>
                </View>
              )}
              {badCount > 0 && (
                <View className="flex-row items-center gap-1.5 bg-red-100 border border-red-200 rounded-xl px-3 py-1.5">
                  <Text className="text-red-700 text-sm font-bold">{badCount}</Text>
                  <Text className="text-red-700 text-sm">✗ bad</Text>
                </View>
              )}
              {neutralCount > 0 && (
                <View className="flex-row items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5">
                  <Text className="text-gray-600 text-sm font-bold">{neutralCount}</Text>
                  <Text className="text-gray-600 text-sm">~ neutral</Text>
                </View>
              )}
            </View>

            {/* Pair rows */}
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {pairs.map((pair, i) => {
                const cfg = COMPAT_CONFIG[pair.compat];
                return (
                  <View
                    key={`${pair.a}-${pair.b}`}
                    className={`px-4 py-3 gap-2 ${
                      i < pairs.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-base">{emojiFor(pair.a)}</Text>
                        <Text className="text-sm font-semibold text-gray-800">{pair.a}</Text>
                      </View>
                      <Text className="text-gray-300 text-sm">+</Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-base">{emojiFor(pair.b)}</Text>
                        <Text className="text-sm font-semibold text-gray-800">{pair.b}</Text>
                      </View>
                    </View>
                    <View
                      className={`self-start flex-row items-center gap-1 px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.border}`}
                    >
                      <Text className={`text-xs font-bold ${cfg.text}`}>{cfg.icon}</Text>
                      <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Tips card */}
        <View className="bg-green-50 border border-green-200 rounded-xl p-4">
          <Text className="text-green-800 text-xs font-semibold mb-2">💡 Quick tips</Text>
          <Text className="text-green-700 text-xs leading-5">
            • <Text className="font-semibold">Three Sisters</Text>: Corn + Beans + Squash is a classic winning trio{"\n"}
            • <Text className="font-semibold">Marigolds</Text> are nearly universal — repel aphids, whitefly, and nematodes{"\n"}
            • <Text className="font-semibold">Fennel</Text> is allelopathic — best grown isolated from most crops{"\n"}
            • <Text className="font-semibold">Legumes</Text> (Beans, Peas) fix nitrogen — great before heavy feeders
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
