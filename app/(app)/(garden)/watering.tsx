import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenWatering,
  useDeleteGardenWateringLog,
  useGardenWeatherLogs,
} from "@/hooks/useGarden";
import { useGardenAreas, useLogWatering } from "@/hooks/useGardenMap";
import { useGardenWeather } from "@/hooks/useGardenWeather";
import {
  WATERING, significantRainDates, isHotRecently, computeWaterStatus, todayISO,
} from "@/lib/gardenCatalog";
import { WATERING_METHODS, type WateringMethod } from "@/types/app.types";

function fmtDate(d: string) {
  try { return format(new Date(d + "T12:00:00"), "EEEE, MMM d"); } catch { return d; }
}

export default function WateringScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  useGardenWeather(household?.zip_code ?? null, householdId); // refresh rain/temp

  const { data: areas = [] } = useGardenAreas(householdId);
  const { data: allLogs = [], isLoading } = useGardenWatering(householdId);
  const { data: weatherLogs = [] } = useGardenWeatherLogs(householdId);

  const logWatering = useLogWatering();
  const deleteLog = useDeleteGardenWateringLog();

  // New (area-based) logs only — the old plot-based history is retired.
  const logs = useMemo(() => allLogs.filter((l) => (l as any).area_id != null), [allLogs]);

  const today = todayISO();
  const rainDates = useMemo(() => significantRainDates(weatherLogs), [weatherLogs]);
  const hot = useMemo(() => isHotRecently(weatherLogs, today), [weatherLogs, today]);

  const statusByArea = useMemo(() => {
    const m = new Map<string, ReturnType<typeof computeWaterStatus>>();
    areas.forEach((a) => {
      const dates = logs.filter((l) => (l as any).area_id === a.id).map((l) => l.water_date);
      m.set(a.id, computeWaterStatus(dates, rainDates, hot, today));
    });
    return m;
  }, [areas, logs, rainDates, hot, today]);

  const dueAreas = areas.filter((a) => statusByArea.get(a.id)?.due);

  const todayWeather = weatherLogs.find((w) => w.log_date === today) ?? null;
  const todayRainMm = todayWeather?.rainfall_mm ?? 0;

  // ── Log modal ──────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [waterDate, setWaterDate] = useState(today);
  const [method, setMethod] = useState<WateringMethod>("hand");
  const [duration, setDuration] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function openLog(preselect?: string[]) {
    setSelectedAreaIds(preselect ?? []);
    setWaterDate(today); setMethod("hand"); setDuration(""); setAmount(""); setNotes("");
    setShowModal(true);
  }
  const allSelected = areas.length > 0 && selectedAreaIds.length === areas.length;
  const toggleArea = (id: string) =>
    setSelectedAreaIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelectedAreaIds(allSelected ? [] : areas.map((a) => a.id));

  async function handleSave() {
    if (!householdId || selectedAreaIds.length === 0) return;
    await logWatering.mutateAsync({
      householdId, areaIds: selectedAreaIds, water_date: waterDate, method,
      duration_min: duration ? parseFloat(duration) : null,
      amount_gal: amount ? parseFloat(amount) : null,
      notes: notes.trim() || null,
    });
    setShowModal(false);
  }

  async function quickLog(areaId: string) {
    if (!householdId) return;
    await logWatering.mutateAsync({
      householdId, areaIds: [areaId], water_date: today, method: "hand",
      duration_min: null, amount_gal: null, notes: null,
    });
  }

  // History grouped by date
  const grouped = useMemo(() => {
    const m = new Map<string, typeof logs>();
    logs.forEach((l) => { const e = m.get(l.water_date) ?? []; e.push(l); m.set(l.water_date, e); });
    return Array.from(m.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [logs]);

  function dueBadge(s: ReturnType<typeof computeWaterStatus> | undefined) {
    if (!s) return { label: "—", cls: "bg-gray-100 text-gray-400" };
    if (s.lastWatered === null) return { label: "Never watered", cls: "bg-red-100 text-red-700" };
    if (s.daysOverdue > 0) return { label: `Overdue ${s.daysOverdue}d`, cls: "bg-red-100 text-red-700" };
    if (s.daysOverdue === 0) return { label: "Due today", cls: "bg-amber-100 text-amber-700" };
    return { label: `OK · in ${-s.daysOverdue}d`, cls: "bg-green-100 text-green-700" };
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-green-700 text-base">← Back</Text></TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">💧 Watering</Text>
        <TouchableOpacity onPress={() => openLog()} className="bg-blue-600 rounded-xl px-3 py-1.5">
          <Text className="text-white text-sm font-semibold">+ Log</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#16a34a" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Rain / heat context */}
          {todayRainMm > 0 && (
            <View className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              <Text className="text-sm font-semibold text-sky-900">🌧 {todayRainMm.toFixed(1)}mm of rain today</Text>
              <Text className="text-xs text-sky-700 mt-1">
                {todayRainMm >= WATERING.rainWateringMm
                  ? "Counts as a watering for every garden."
                  : `Below the ${WATERING.rainWateringMm}mm threshold for a full soak.`}
                {todayWeather?.temp_high_f ? ` · High ${Math.round(todayWeather.temp_high_f)}°F` : ""}
              </Text>
            </View>
          )}
          {hot && (
            <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
              <Text className="text-xs font-semibold text-orange-800">
                🌡 It's been over {WATERING.hotThresholdF}°F — watering target tightened to every {WATERING.hotIntervalDays} days.
              </Text>
            </View>
          )}

          {areas.length === 0 ? (
            <Card className="items-center py-8">
              <Text className="text-3xl mb-2">🌱</Text>
              <Text className="text-gray-500 text-sm font-medium">No gardens yet</Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">Create a garden area first, then log watering here.</Text>
            </Card>
          ) : (
            <>
              {/* Needs water */}
              {dueAreas.length > 0 && (
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Needs water</Text>
                  <View className="gap-2">
                    {dueAreas.map((a) => {
                      const s = statusByArea.get(a.id);
                      const b = dueBadge(s);
                      return (
                        <View key={a.id} className="rounded-xl px-4 py-3 border border-amber-300 bg-amber-50 flex-row items-center gap-3">
                          <Text className="text-xl">💧</Text>
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">{a.name}</Text>
                            <Text className="text-xs text-amber-700 mt-0.5">{b.label}{s?.lastWatered ? ` · last ${fmtDate(s.lastWatered)}` : ""}</Text>
                          </View>
                          <TouchableOpacity onPress={() => quickLog(a.id)} className="bg-blue-600 rounded-xl px-3 py-2">
                            <Text className="text-white text-xs font-semibold">Watered</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* All gardens status */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-700">Gardens</Text>
                  <TouchableOpacity onPress={() => openLog(areas.map((a) => a.id))}>
                    <Text className="text-xs font-semibold text-blue-600">Log all</Text>
                  </TouchableOpacity>
                </View>
                <View className="gap-2">
                  {areas.map((a) => {
                    const s = statusByArea.get(a.id);
                    const b = dueBadge(s);
                    return (
                      <View key={a.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3">
                        <Text className="text-xl">🌱</Text>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">{a.name}</Text>
                          <View className="flex-row items-center gap-2 mt-1">
                            <View className={`self-start px-2 py-0.5 rounded-md ${b.cls.split(" ")[0]}`}>
                              <Text className={`text-xs font-medium ${b.cls.split(" ")[1]}`}>{b.label}</Text>
                            </View>
                            {s?.nextDue && s.daysOverdue < 0 && (
                              <Text className="text-xs text-gray-400">next {fmtDate(s.nextDue)}</Text>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => openLog([a.id])} className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                          <Text className="text-blue-700 text-xs font-semibold">💧 Log</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* History */}
          {grouped.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">History</Text>
              <View className="gap-4">
                {grouped.slice(0, 30).map(([date, dayLogs]) => (
                  <View key={date}>
                    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{fmtDate(date)}</Text>
                    <View className="gap-2">
                      {dayLogs.map((log) => {
                        const area = areas.find((a) => a.id === (log as any).area_id);
                        const mInfo = WATERING_METHODS.find((m) => m.value === log.method);
                        return (
                          <View key={log.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3">
                            <Text className="text-base">{log.method === "rain" ? "🌧" : "💧"}</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-800">{area?.name ?? "Garden"}</Text>
                              <Text className="text-xs text-gray-400">
                                {mInfo?.emoji} {mInfo?.label ?? log.method}
                                {log.duration_min ? ` · ${log.duration_min} min` : ""}
                                {log.amount_gal ? ` · ${log.amount_gal} gal` : ""}
                              </Text>
                              {log.notes && <Text className="text-xs text-gray-500 mt-0.5">{log.notes}</Text>}
                            </View>
                            {confirmingId === log.id ? (
                              <View className="flex-row gap-1">
                                <TouchableOpacity onPress={() => setConfirmingId(null)} className="px-2 py-1 rounded-lg bg-gray-100"><Text className="text-gray-600 text-xs">Cancel</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => { setConfirmingId(null); deleteLog.mutate({ id: log.id, householdId: householdId! }); }} className="px-2 py-1 rounded-lg bg-red-500"><Text className="text-white text-xs font-semibold">Delete</Text></TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity onPress={() => setConfirmingId(log.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                                <Text className="text-red-400 text-xs">✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Log modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowModal(false)}><Text className="text-gray-500">Cancel</Text></TouchableOpacity>
            <Text className="font-semibold text-gray-900">Log Watering</Text>
            <TouchableOpacity onPress={handleSave} disabled={logWatering.isPending || selectedAreaIds.length === 0}>
              <Text className={`font-semibold ${selectedAreaIds.length === 0 ? "text-gray-300" : "text-blue-600"}`}>
                {logWatering.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-2">Which gardens? (pick one or many)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity onPress={toggleAll}
                className={`px-3 py-1.5 rounded-xl border ${allSelected ? "border-blue-500 bg-blue-600" : "border-gray-200 bg-white"}`}>
                <Text className={`text-xs font-semibold ${allSelected ? "text-white" : "text-gray-700"}`}>All gardens</Text>
              </TouchableOpacity>
              {areas.map((a) => {
                const on = selectedAreaIds.includes(a.id);
                return (
                  <TouchableOpacity key={a.id} onPress={() => toggleArea(a.id)}
                    className={`px-3 py-1.5 rounded-xl border ${on ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"}`}>
                    <Text className={`text-xs font-medium ${on ? "text-blue-700" : "text-gray-700"}`}>🌱 {a.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <DateInput label="Date" value={waterDate} onChange={setWaterDate} />

            <Text className="text-sm font-medium text-gray-700 mb-2">Method</Text>
            <View className="flex-row gap-2 mb-4">
              {WATERING_METHODS.map((m) => (
                <TouchableOpacity key={m.value} onPress={() => setMethod(m.value)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${method === m.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}>
                  <Text className="text-base">{m.emoji}</Text>
                  <Text className={`text-xs font-medium ${method === m.value ? "text-white" : "text-gray-700"}`}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1"><Input label="Duration (min)" placeholder="e.g. 15" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" /></View>
              <View className="flex-1"><Input label="Amount (gal)" placeholder="e.g. 5" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></View>
            </View>

            <Input label="Notes" placeholder="Soil dry, overhead after heat…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} className="min-h-[80px]" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
