import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenPlots,
  useCreateGardenPlot,
  useDeleteGardenPlot,
} from "@/hooks/useGarden";
import type { GardenPlot } from "@/types/app.types";

// Zone type presets for quick-start
const PLOT_PRESETS = [
  { label: "10×20 Veggie Bed", cols: 10, rows: 20 },
  { label: "4×8 Raised Bed",   cols: 4,  rows: 8  },
  { label: "8×8 Square",       cols: 8,  rows: 8  },
  { label: "Custom",           cols: 0,  rows: 0  },
];

export default function GardenScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: plots = [], isLoading } = useGardenPlots(householdId);
  const createPlot = useCreateGardenPlot();
  const deletePlot = useDeleteGardenPlot();

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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : plots.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🥬</Text>
          <Text className="text-lg font-semibold text-gray-700 text-center">
            No gardens yet
          </Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            Tap "New Garden" to create your first bed or plot map.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
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
        </ScrollView>
      )}

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

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Grid Size
            </Text>
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
              <Text className="text-green-800 text-sm font-medium mb-1">
                Zone 8b tips
              </Text>
              <Text className="text-green-700 text-xs">
                Your 10×20 veggie plot can be divided into zones for crop
                rotation tracking. Mark walkways as unusable areas to keep your
                layout accurate.
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
        {/* Header strip */}
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

        {/* Body */}
        <View className="px-4 py-3">
          {plot.description ? (
            <Text className="text-gray-600 text-sm mb-2">{plot.description}</Text>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-green-700 text-sm font-medium">
              Open Map →
            </Text>
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
