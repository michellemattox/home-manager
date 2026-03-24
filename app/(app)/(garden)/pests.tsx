import React, { useState, useMemo } from "react";
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
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenPlots,
  useGardenPestLogs,
  useCreateGardenPestLog,
  useUpdateGardenPestLog,
  useDeleteGardenPestLog,
} from "@/hooks/useGarden";
import {
  PEST_LOG_TYPES,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  type GardenPestLog,
  type PestLogType,
} from "@/types/app.types";

const TODAY_STR = new Date().toISOString().split("T")[0];

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

type FilterType = "all" | "active" | "resolved";

export default function PestsScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: plots = [] } = useGardenPlots(householdId);
  const { data: logs = [], isLoading } = useGardenPestLogs(householdId);
  const createLog = useCreateGardenPestLog();
  const updateLog = useUpdateGardenPestLog();
  const deleteLog = useDeleteGardenPestLog();

  const [filter, setFilter] = useState<FilterType>("active");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<GardenPestLog | null>(null);

  // Form state
  const [plotId, setPlotId] = useState("");
  const [logType, setLogType] = useState<PestLogType>("pest");
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<number>(3);
  const [treatment, setTreatment] = useState("");
  const [notes, setNotes] = useState("");
  const [obsDate, setObsDate] = useState<Date>(new Date());
  const [resolved, setResolved] = useState(false);

  const defaultPlotId = plots[0]?.id ?? "";

  function resetForm(log?: GardenPestLog) {
    if (log) {
      setPlotId(log.plot_id);
      setLogType(log.log_type);
      setName(log.name);
      setSeverity(log.severity ?? 3);
      setTreatment(log.treatment ?? "");
      setNotes(log.notes ?? "");
      setObsDate(new Date(log.observation_date + "T12:00:00"));
      setResolved(log.resolved);
    } else {
      setPlotId(defaultPlotId);
      setLogType("pest");
      setName("");
      setSeverity(3);
      setTreatment("");
      setNotes("");
      setObsDate(new Date());
      setResolved(false);
    }
  }

  function openAdd() {
    setEditTarget(null);
    resetForm();
    setShowAdd(true);
  }

  function openEdit(log: GardenPestLog) {
    setEditTarget(log);
    resetForm(log);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!householdId || !plotId || !name.trim()) return;
    const payload = {
      household_id: householdId,
      plot_id: plotId,
      zone_id: null,
      planting_id: null,
      observation_date: obsDate.toISOString().split("T")[0],
      log_type: logType,
      name: name.trim(),
      severity,
      treatment: treatment.trim() || null,
      notes: notes.trim() || null,
      resolved,
    };
    if (editTarget) {
      await updateLog.mutateAsync({ id: editTarget.id, householdId, updates: payload });
    } else {
      await createLog.mutateAsync(payload as any);
    }
    setShowAdd(false);
  }

  function confirmDelete(log: GardenPestLog) {
    Alert.alert("Delete Log", `Remove this ${log.log_type} entry for "${log.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteLog.mutate({ id: log.id, householdId: householdId! }) },
    ]);
  }

  const filteredLogs = useMemo(() => {
    if (filter === "active") return logs.filter(l => !l.resolved);
    if (filter === "resolved") return logs.filter(l => l.resolved);
    return logs;
  }, [logs, filter]);

  const isPending = createLog.isPending || updateLog.isPending;

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🐛 Pest & Disease Log</Text>
        <TouchableOpacity onPress={openAdd} className="bg-green-600 rounded-xl px-3 py-1.5">
          <Text className="text-white text-sm font-semibold">+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View className="flex-row px-4 py-2 gap-2 bg-white border-b border-gray-100">
        {(["active", "all", "resolved"] as FilterType[]).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl border ${filter === f ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
          >
            <Text className={`text-xs font-semibold capitalize ${filter === f ? "text-white" : "text-gray-600"}`}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text className="text-xs text-gray-400 self-center ml-2">{filteredLogs.length} entr{filteredLogs.length === 1 ? "y" : "ies"}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : filteredLogs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🌿</Text>
          <Text className="text-base font-semibold text-gray-700 text-center">
            {filter === "resolved" ? "No resolved issues" : "No active issues"}
          </Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            {filter !== "resolved" ? 'Tap "+ Log" to record a pest, disease, or observation.' : ""}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {filteredLogs.map(log => {
            const typeInfo = PEST_LOG_TYPES.find(t => t.value === log.log_type)!;
            const plot = plots.find(p => p.id === log.plot_id);
            return (
              <Card key={log.id} className="p-0 overflow-hidden">
                <TouchableOpacity onPress={() => openEdit(log)} activeOpacity={0.8}>
                  <View className="flex-row items-start px-4 py-3 gap-3">
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: typeInfo.bg }}>
                      <Text className="text-xl">{typeInfo.emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-sm font-bold text-gray-900">{log.name}</Text>
                        <View className="px-2 py-0.5 rounded" style={{ backgroundColor: typeInfo.bg }}>
                          <Text className="text-xs font-medium" style={{ color: typeInfo.color }}>{typeInfo.label}</Text>
                        </View>
                        {log.resolved && (
                          <View className="px-2 py-0.5 rounded bg-green-100">
                            <Text className="text-xs font-medium text-green-700">✓ Resolved</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text className="text-xs text-gray-500">{formatDate(log.observation_date)}</Text>
                        {plot && <Text className="text-xs text-gray-400">{plot.name}</Text>}
                        {log.severity && (
                          <View className="flex-row items-center gap-1">
                            <Text className="text-xs" style={{ color: SEVERITY_COLORS[log.severity] }}>
                              {"●".repeat(log.severity)}{"○".repeat(5 - log.severity)}
                            </Text>
                            <Text className="text-xs" style={{ color: SEVERITY_COLORS[log.severity] }}>
                              {SEVERITY_LABELS[log.severity]}
                            </Text>
                          </View>
                        )}
                      </View>
                      {log.treatment && (
                        <Text className="text-xs text-gray-600 mt-1">
                          Treatment: {log.treatment}
                        </Text>
                      )}
                      {log.notes && (
                        <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={2}>{log.notes}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => confirmDelete(log)} className="px-2 py-1 rounded bg-red-50 ml-1">
                      <Text className="text-red-400 text-xs">✕</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-gray-900">
              {editTarget ? "Edit Log Entry" : "Log Observation"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={!name.trim() || !plotId || isPending}>
              <Text className={`text-base font-semibold ${name.trim() && plotId ? "text-green-600" : "text-gray-300"}`}>
                {isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            {/* Type picker */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PEST_LOG_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setLogType(t.value)}
                  className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${logType === t.value ? "border-transparent" : "border-gray-200 bg-white"}`}
                  style={logType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}
                >
                  <Text>{t.emoji}</Text>
                  <Text className={`text-sm font-medium ${logType === t.value ? "text-white" : "text-gray-700"}`}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Plot picker */}
            {plots.length > 1 && (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2">Garden</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {plots.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setPlotId(p.id)}
                      className={`px-3 py-2 rounded-xl border ${plotId === p.id ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
                    >
                      <Text className={`text-sm font-medium ${plotId === p.id ? "text-white" : "text-gray-700"}`}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Input label="Name *" placeholder="e.g. Aphids, Powdery mildew, Iron deficiency" value={name} onChangeText={setName} />

            <DateInput label="Date Observed" value={obsDate} onChange={setObsDate} />

            {/* Severity */}
            <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">Severity</Text>
            <View className="flex-row gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSeverity(s)}
                  className={`flex-1 py-2 rounded-xl border items-center ${severity === s ? "border-transparent" : "border-gray-200 bg-white"}`}
                  style={severity === s ? { backgroundColor: SEVERITY_COLORS[s] } : {}}
                >
                  <Text className={`text-sm font-bold ${severity === s ? "text-white" : "text-gray-700"}`}>{s}</Text>
                  <Text className={`text-xs ${severity === s ? "text-white opacity-80" : "text-gray-400"}`} numberOfLines={1}>
                    {SEVERITY_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Treatment Applied"
              placeholder="e.g. Neem oil spray, copper fungicide, hand-picked"
              value={treatment}
              onChangeText={setTreatment}
            />

            <Input
              label="Notes"
              placeholder="Additional observations…"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              className="min-h-[72px]"
            />

            {/* Resolved toggle */}
            <TouchableOpacity
              onPress={() => setResolved(!resolved)}
              className={`flex-row items-center gap-3 p-3 rounded-xl border mt-2 ${resolved ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}
            >
              <View className={`w-5 h-5 rounded border-2 items-center justify-center ${resolved ? "bg-green-600 border-green-600" : "border-gray-300"}`}>
                {resolved && <Text className="text-white text-xs">✓</Text>}
              </View>
              <Text className={`text-sm font-medium ${resolved ? "text-green-700" : "text-gray-700"}`}>Mark as resolved</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
