import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenWatering,
  useCreateGardenWateringLog,
  useUpdateGardenWateringLog,
  useDeleteGardenWateringLog,
  useGardenZonesByHousehold,
  useGardenPlots,
  useGardenWeatherLogs,
} from "@/hooks/useGarden";
import { useGardenWeather } from "@/hooks/useGardenWeather";
import { WATERING_METHODS, type GardenWateringLog, type WateringMethod } from "@/types/app.types";

export default function WateringScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  // Trigger weather fetch on visit — ensures today's rain is logged and weather data is fresh
  useGardenWeather(household?.zip_code ?? null, householdId);

  const { data: logs = [], isLoading } = useGardenWatering(householdId);
  const { data: zones = [] } = useGardenZonesByHousehold(householdId);
  const { data: plots = [] } = useGardenPlots(householdId);
  const { data: weatherLogs = [] } = useGardenWeatherLogs(householdId);

  const createLog = useCreateGardenWateringLog();
  const updateLog = useUpdateGardenWateringLog();
  const deleteLog = useDeleteGardenWateringLog();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GardenWateringLog | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Form state
  const [waterDate, setWaterDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<WateringMethod>("hand");
  const [duration, setDuration] = useState("");
  const [amount, setAmount] = useState("");
  const [plotId, setPlotId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  function openNew(prePlotId?: string) {
    setEditing(null);
    setWaterDate(new Date().toISOString().split("T")[0]);
    setMethod("hand"); setDuration(""); setAmount("");
    setPlotId(prePlotId ?? null);
    setNotes("");
    setShowModal(true);
  }

  function openEdit(log: GardenWateringLog) {
    setEditing(log);
    setWaterDate(log.water_date);
    setMethod(log.method);
    setDuration(log.duration_min?.toString() ?? "");
    setAmount(log.amount_gal?.toString() ?? "");
    setPlotId(log.plot_id);
    setNotes(log.notes ?? "");
    setShowModal(true);
  }

  async function handleSave() {
    if (!householdId) return;
    const payload = {
      household_id: householdId,
      plot_id: plotId,
      zone_id: null,
      water_date: waterDate,
      method,
      duration_min: duration ? parseFloat(duration) : null,
      amount_gal: amount ? parseFloat(amount) : null,
      notes: notes.trim() || null,
    };
    if (editing) {
      await updateLog.mutateAsync({ id: editing.id, householdId, updates: payload });
    } else {
      await createLog.mutateAsync(payload);
    }
    setShowModal(false);
  }

  // Last watered per plot — whole-garden logs (both ids null, e.g. rain) count for all plots
  const lastWateredByPlot = useMemo(() => {
    const map = new Map<string, string>();
    const lastWholeGarden = logs.find((l) => l.plot_id === null && l.zone_id === null)?.water_date ?? null;
    plots.forEach((plot) => {
      const plotLog = logs.find((l) => l.plot_id === plot.id);
      const date = plotLog?.water_date ?? lastWholeGarden;
      if (date) map.set(plot.id, date);
    });
    return map;
  }, [logs, plots]);

  function daysSince(dateStr: string) {
    return differenceInDays(new Date(), new Date(dateStr + "T12:00:00"));
  }

  function droughtLevel(days: number | null) {
    if (days === null) return { label: "Never watered", color: "text-gray-400", bg: "bg-gray-100" };
    if (days <= 1) return { label: "Today", color: "text-blue-600", bg: "bg-blue-100" };
    if (days <= 3) return { label: `${days}d ago`, color: "text-green-700", bg: "bg-green-100" };
    if (days <= 7) return { label: `${days}d ago`, color: "text-amber-700", bg: "bg-amber-100" };
    return { label: `${days}d ago`, color: "text-red-700", bg: "bg-red-100" };
  }

  // Group log history by date
  const grouped = useMemo(() => {
    const map = new Map<string, GardenWateringLog[]>();
    logs.forEach((l) => {
      const existing = map.get(l.water_date) ?? [];
      existing.push(l);
      map.set(l.water_date, existing);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [logs]);

  function fmtDate(d: string) {
    try { return format(new Date(d + "T12:00:00"), "EEEE, MMM d"); } catch { return d; }
  }

  // Temperature-adjusted rain coverage:
  // Cool weather = rain soaks deeper and evaporates slower → lasts longer.
  // Returns the number of remaining coverage days from the most recent rain event.
  const { rainCoverageDays, lastRainLog } = useMemo(() => {
    const recent = weatherLogs.slice(0, 4);
    const avgHigh = recent.length > 0
      ? recent.reduce((s, w) => s + (w.temp_high_f ?? 70), 0) / recent.length
      : 70;

    let tempMultiplier = 1.0;
    if (avgHigh < 55)      tempMultiplier = 2.2; // 50°F: rain lasts ~2x longer
    else if (avgHigh < 65) tempMultiplier = 1.6;
    else if (avgHigh < 75) tempMultiplier = 1.1;
    else if (avgHigh > 85) tempMultiplier = 0.7;
    else if (avgHigh > 75) tempMultiplier = 0.85;

    const lastRain = weatherLogs.find((w) => (w.rainfall_mm ?? 0) >= 5) ?? null;
    if (!lastRain) return { rainCoverageDays: 0, lastRainLog: null };

    const daysSinceRain = differenceInDays(new Date(), new Date(lastRain.log_date + "T12:00:00"));
    // 5mm = 1 coverage day at 70°F; multiplier scales with temp
    const totalCoverage = ((lastRain.rainfall_mm ?? 0) / 5) * tempMultiplier;
    return {
      rainCoverageDays: Math.max(0, Math.round(totalCoverage - daysSinceRain)),
      lastRainLog: lastRain,
    };
  }, [weatherLogs]);

  // Heat stress: hot/sunny days tighten the manual-watering threshold
  const heatStressExtra = useMemo(() => {
    const recent = weatherLogs.slice(0, 4);
    if (!recent.length) return 0;
    const avgHigh = recent.reduce((s, w) => s + (w.temp_high_f ?? 70), 0) / recent.length;
    const clearDays = recent.filter((w) => w.condition_main === "Clear").length;
    let extra = 0;
    if (avgHigh > 90) extra += 2;
    else if (avgHigh > 80) extra += 1;
    if (clearDays >= 3) extra += 1;
    return extra;
  }, [weatherLogs]);

  const urgencyDays = Math.max(1, 4 - heatStressExtra);

  // Plots that need watering
  const wateringAlerts = useMemo(() => {
    if (rainCoverageDays > 0) return [];
    return plots
      .map((plot) => {
        const lastDate = lastWateredByPlot.get(plot.id) ?? null;
        const days = lastDate ? daysSince(lastDate) : null;
        return { plot, days };
      })
      .filter(({ days }) => days === null || days >= urgencyDays)
      .sort((a, b) => (b.days ?? 999) - (a.days ?? 999));
  }, [plots, lastWateredByPlot, rainCoverageDays, urgencyDays]);


  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">💧 Watering Tracker</Text>
        <TouchableOpacity onPress={() => openNew()} className="bg-blue-600 rounded-xl px-3 py-1.5">
          <Text className="text-white text-sm font-semibold">+ Log</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* ── Rain coverage status ──────────────────────────────────────── */}
          {rainCoverageDays > 0 && lastRainLog && (
            <View className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              <Text className="text-sm font-semibold text-sky-900">
                🌧 Rain covering your garden
              </Text>
              <Text className="text-xs text-sky-700 mt-1">
                {(lastRainLog.rainfall_mm ?? 0).toFixed(1)}mm on {fmtDate(lastRainLog.log_date)}
                {lastRainLog.temp_high_f ? ` · High ${Math.round(lastRainLog.temp_high_f)}°F` : ""}
                {" — "}~{rainCoverageDays} more day{rainCoverageDays !== 1 ? "s" : ""} of coverage remaining.
              </Text>
            </View>
          )}

          {/* ── Heat advisory ─────────────────────────────────────────────── */}
          {heatStressExtra > 0 && rainCoverageDays === 0 && (
            <View className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <Text className="text-xs font-semibold text-orange-800">
                🌡 Heat advisory — watering threshold reduced to {urgencyDays} days
              </Text>
              <Text className="text-xs text-orange-600 mt-0.5">
                Recent high temps or sunny days are drying out soil faster than normal.
              </Text>
            </View>
          )}

          {/* ── Rain-aware watering alerts ────────────────────────────────── */}
          {wateringAlerts.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Watering Needed</Text>
              <View className="gap-2">
                {wateringAlerts.map(({ plot, days }) => (
                  <View
                    key={plot.id}
                    className="rounded-xl px-4 py-3 border flex-row items-center gap-3"
                    style={{
                      backgroundColor: (days ?? 0) >= 7 ? "#FFF1F2" : "#FFFBEB",
                      borderColor: (days ?? 0) >= 7 ? "#FCA5A5" : "#FCD34D",
                    }}
                  >
                    <Text className="text-xl">🌱</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{plot.name}</Text>
                      <Text className={`text-xs mt-0.5 ${(days ?? 0) >= 7 ? "text-red-600" : "text-amber-700"}`}>
                        {days === null ? "Never watered — needs attention" : `Not watered in ${days} days`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => openNew(plot.id)}
                      className="bg-blue-600 rounded-xl px-3 py-2"
                    >
                      <Text className="text-white text-xs font-semibold">💧 Log</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Garden status dashboard ───────────────────────────────────── */}
          {plots.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Garden Status</Text>
              <View className="gap-2">
                {plots.map((plot) => {
                  const lastDate = lastWateredByPlot.get(plot.id) ?? null;
                  const days = lastDate ? daysSince(lastDate) : null;
                  const drought = droughtLevel(days);
                  return (
                    <View key={plot.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3">
                      <Text className="text-xl">🌱</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900">{plot.name}</Text>
                        <View className={`self-start mt-1 px-2 py-0.5 rounded-md ${drought.bg}`}>
                          <Text className={`text-xs font-medium ${drought.color}`}>{drought.label}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => openNew(plot.id)}
                        className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2"
                      >
                        <Text className="text-blue-700 text-xs font-semibold">💧 Log</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Log history ───────────────────────────────────────────────── */}
          {grouped.length === 0 ? (
            <Card className="items-center py-8">
              <Text className="text-3xl mb-2">💧</Text>
              <Text className="text-gray-500 text-sm font-medium">No watering logged yet</Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                Tap "+ Log" or use the garden quick-log buttons above.
              </Text>
            </Card>
          ) : (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">History</Text>
              <View className="gap-4">
                {grouped.slice(0, 30).map(([date, dayLogs]) => (
                  <View key={date}>
                    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {fmtDate(date)}
                    </Text>
                    <View className="gap-2">
                      {dayLogs.map((log) => {
                        const plot = plots.find((p) => p.id === log.plot_id);
                        const methodInfo = WATERING_METHODS.find((m) => m.value === log.method);
                        return (
                          <View key={log.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3">
                            <Text className="text-base">{log.method === "rain" ? "🌧" : "🌱"}</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-800">
                                {plot?.name ?? "All Gardens"}
                              </Text>
                              <Text className="text-xs text-gray-400">
                                {methodInfo?.emoji} {methodInfo?.label ?? log.method}
                                {log.duration_min ? ` · ${log.duration_min} min` : ""}
                                {log.amount_gal ? ` · ${log.amount_gal} gal` : ""}
                              </Text>
                              {log.notes && <Text className="text-xs text-gray-500 mt-0.5">{log.notes}</Text>}
                            </View>
                            {confirmingId === log.id ? (
                              <View className="flex-row gap-1">
                                <TouchableOpacity onPress={() => setConfirmingId(null)} className="px-2 py-1 rounded-lg bg-gray-100">
                                  <Text className="text-gray-600 text-xs">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => { setConfirmingId(null); deleteLog.mutate({ id: log.id, householdId: householdId! }); }}
                                  className="px-2 py-1 rounded-lg bg-red-500"
                                >
                                  <Text className="text-white text-xs font-semibold">Delete</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View className="flex-row gap-2">
                                <TouchableOpacity onPress={() => openEdit(log)}>
                                  <Text className="text-blue-400 text-xs">Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setConfirmingId(log.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                                  <Text className="text-red-400 text-xs">✕</Text>
                                </TouchableOpacity>
                              </View>
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

      {/* ── Log Modal ───────────────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-semibold text-gray-900">{editing ? "Edit Watering" : "Log Watering"}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={createLog.isPending || updateLog.isPending}
            >
              <Text className="text-blue-600 font-semibold">
                {createLog.isPending || updateLog.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            <DateInput label="Date" value={waterDate} onChange={setWaterDate} />

            <Text className="text-sm font-medium text-gray-700 mb-2">Method</Text>
            <View className="flex-row gap-2 mb-4">
              {WATERING_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setMethod(m.value)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${method === m.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
                >
                  <Text className="text-base">{m.emoji}</Text>
                  <Text className={`text-xs font-medium ${method === m.value ? "text-white" : "text-gray-700"}`}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input label="Duration (min)" placeholder="e.g. 15" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
              </View>
              <View className="flex-1">
                <Input label="Amount (gal)" placeholder="e.g. 5" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              </View>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Garden (optional)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setPlotId(null)}
                className={`px-3 py-1.5 rounded-xl border ${plotId === null ? "border-gray-700 bg-gray-100" : "border-gray-200 bg-white"}`}
              >
                <Text className="text-xs text-gray-600">All Gardens</Text>
              </TouchableOpacity>
              {plots.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPlotId(p.id)}
                  className={`px-3 py-1.5 rounded-xl border ${plotId === p.id ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"}`}
                >
                  <Text className={`text-xs font-medium ${plotId === p.id ? "text-blue-700" : "text-gray-700"}`}>
                    🌱 {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Notes" placeholder="Soil dry, overhead after heat…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} className="min-h-[80px]" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
