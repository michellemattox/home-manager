import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
import { showAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabase";

const TODAY_STR = new Date().toISOString().split("T")[0];

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

type FilterType = "all" | "active" | "resolved";

interface AIResult {
  identified: string;
  scientific_name?: string;
  confidence: "high" | "medium" | "low";
  type: "pest" | "disease" | "deficiency" | "observation";
  description: string;
  wsu_notes: string;
  organic_treatments: string[];
  cultural_controls: string[];
  urgency: "immediate" | "this_week" | "monitor" | "low";
  urgency_reason: string;
  not_visible_confirmation: boolean;
}

const URGENCY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  immediate: { bg: "#fef2f2", color: "#dc2626", label: "Act Immediately" },
  this_week: { bg: "#fffbeb", color: "#d97706", label: "This Week" },
  monitor: { bg: "#eff6ff", color: "#2563eb", label: "Monitor" },
  low: { bg: "#f0fdf4", color: "#16a34a", label: "Low Priority" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#16a34a",
  medium: "#d97706",
  low: "#6b7280",
};

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Form state
  const [plotId, setPlotId] = useState("");
  const [logType, setLogType] = useState<PestLogType>("pest");
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<number>(3);
  const [treatment, setTreatment] = useState("");
  const [notes, setNotes] = useState("");
  const [obsDate, setObsDate] = useState<Date>(new Date());
  const [resolved, setResolved] = useState(false);

  // Photo & AI state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [identifyingAI, setIdentifyingAI] = useState(false);
  const [aiResult, setAIResult] = useState<AIResult | null>(null);
  const [aiError, setAIError] = useState<string | null>(null);
  const [plantContext, setPlantContext] = useState("");

  const defaultPlotId = plots[0]?.id ?? "";

  // Keep plotId in sync if plots load after the component mounts but before
  // the user has opened the modal and picked a plot themselves.
  useEffect(() => {
    if (defaultPlotId && !showAdd) {
      setPlotId(defaultPlotId);
    }
  }, [defaultPlotId]);

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
    setPhotoUri(null);
    setPhotoBase64(null);
    setAIResult(null);
    setAIError(null);
    setPlantContext("");
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

  async function pickPhoto(useCamera: boolean) {
    let result: ImagePicker.ImagePickerResult;

    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.7,
        base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.7,
        base64: true,
      });
    }

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
    setAIResult(null);
    setAIError(null);
  }

  async function runAIIdentify() {
    if (!photoBase64) return;
    setIdentifyingAI(true);
    setAIError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/identify-pest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            imageBase64: photoBase64,
            mediaType: "image/jpeg",
            plantContext: plantContext.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setAIError(data.error ?? "AI identification failed");
      } else {
        const result = data as AIResult;
        setAIResult(result);
        // Auto-fill form fields from AI result
        if (!result.not_visible_confirmation) {
          if (!name.trim()) setName(result.identified);
          const matchedType = (["pest", "disease", "deficiency", "observation"] as PestLogType[])
            .find(t => t === result.type);
          if (matchedType) setLogType(matchedType);
          // Auto-suggest treatment from top organic recommendation
          if (!treatment.trim() && result.organic_treatments?.[0]) {
            setTreatment(result.organic_treatments[0]);
          }
          // Auto-set severity based on urgency
          if (result.urgency === "immediate") setSeverity(5);
          else if (result.urgency === "this_week") setSeverity(4);
          else if (result.urgency === "monitor") setSeverity(2);
        }
      }
    } catch (e: any) {
      setAIError(e.message ?? "Network error");
    } finally {
      setIdentifyingAI(false);
    }
  }

  async function handleSave() {
    if (!householdId || !plotId || !name.trim()) return;

    let uploadedPhotoUrl: string | null = null;

    // Upload photo to Supabase Storage if we have one and it's new
    if (photoUri && photoBase64 && !editTarget?.photo_url) {
      setUploadingPhoto(true);
      try {
        const ext = "jpg";
        const filePath = `${householdId}/${Date.now()}.${ext}`;
        const byteArray = Uint8Array.from(atob(photoBase64), (c) => c.charCodeAt(0));
        const { error: uploadErr } = await supabase.storage
          .from("garden-photos")
          .upload(filePath, byteArray, { contentType: "image/jpeg", upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("garden-photos").getPublicUrl(filePath);
          uploadedPhotoUrl = urlData.publicUrl;
        }
      } catch {
        // Photo upload is best-effort; still allow saving the log entry.
      } finally {
        setUploadingPhoto(false);
      }
    }

    try {
      const payload: any = {
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

      if (uploadedPhotoUrl) payload.photo_url = uploadedPhotoUrl;
      if (aiResult) payload.ai_identification = aiResult as any;

      if (editTarget) {
        await updateLog.mutateAsync({ id: editTarget.id, householdId, updates: payload });
      } else {
        await createLog.mutateAsync(payload);
      }

      setShowAdd(false);
    } catch (e: any) {
      showAlert("Save failed", e?.message ?? "Could not save this pest/disease entry.");
    }
  }

  const filteredLogs = useMemo(() => {
    if (filter === "active") return logs.filter(l => !l.resolved);
    if (filter === "resolved") return logs.filter(l => l.resolved);
    return logs;
  }, [logs, filter]);

  const isPending = createLog.isPending || updateLog.isPending || uploadingPhoto;

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">🐛 Pest & Disease Log</Text>
        {plots.length > 0 && (
          <TouchableOpacity onPress={openAdd} className="bg-green-600 rounded-xl px-3 py-1.5">
            <Text className="text-white text-sm font-semibold">+ Log</Text>
          </TouchableOpacity>
        )}
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

      {!isLoading && plots.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🌱</Text>
          <Text className="text-base font-semibold text-gray-700 text-center">No garden plots yet</Text>
          <Text className="text-sm text-gray-400 mt-2 text-center">
            Create a garden plot first, then you can log pests and diseases here.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-5 bg-green-600 rounded-xl px-5 py-2.5"
          >
            <Text className="text-white font-semibold text-sm">Go to Garden</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
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
            const typeInfo =
              PEST_LOG_TYPES.find(t => t.value === log.log_type) ?? ({
                value: log.log_type as any,
                label: "Unknown",
                emoji: "🌿",
                color: "#6b7280",
                bg: "#f9fafb",
              } as (typeof PEST_LOG_TYPES)[number]);
            const plot = plots.find(p => p.id === log.plot_id);
            const ai = log.ai_identification as AIResult | null;
            const urgency = ai ? URGENCY_STYLES[ai.urgency as keyof typeof URGENCY_STYLES] : null;
            return (
              <Card key={log.id} className="p-0 overflow-hidden">
                <TouchableOpacity onPress={() => openEdit(log)} activeOpacity={0.8}>
                  <View className="flex-row items-start px-4 py-3 gap-3">
                    {/* Photo thumbnail or type icon */}
                    {log.photo_url ? (
                      <Image
                        source={{ uri: log.photo_url }}
                        style={{ width: 44, height: 44, borderRadius: 10 }}
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: typeInfo.bg }}>
                        <Text className="text-xl">{typeInfo.emoji}</Text>
                      </View>
                    )}
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
                        {urgency && (
                          <View className="px-2 py-0.5 rounded" style={{ backgroundColor: urgency.bg }}>
                            <Text className="text-xs font-medium" style={{ color: urgency.color }}>{urgency.label}</Text>
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
                        {log.photo_url && <Text className="text-xs text-blue-400">📷 Photo</Text>}
                        {log.ai_identification && <Text className="text-xs text-purple-500">🤖 AI ID'd</Text>}
                      </View>
                      {log.treatment && (
                        <Text className="text-xs text-gray-600 mt-1">Treatment: {log.treatment}</Text>
                      )}
                      {ai?.wsu_notes && (
                        <Text className="text-xs text-green-700 mt-0.5" numberOfLines={2}>WSU: {ai.wsu_notes}</Text>
                      )}
                    </View>
                    {/* Inline delete confirmation */}
                    {confirmingId === log.id ? (
                      <View className="flex-col items-end gap-1">
                        <TouchableOpacity onPress={() => setConfirmingId(null)} className="px-2 py-1 rounded-lg bg-gray-100">
                          <Text className="text-gray-600 text-xs">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setConfirmingId(null);
                            deleteLog.mutate({ id: log.id, householdId: householdId! });
                          }}
                          className="px-2 py-1 rounded-lg bg-red-500"
                        >
                          <Text className="text-white text-xs font-semibold">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setConfirmingId(log.id)}
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

            {/* ── Photo & AI Identify section ─────────────────────────────── */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Photo</Text>
            <View className="mb-4">
              {photoUri ? (
                <View className="mb-3">
                  <Image source={{ uri: photoUri }} style={{ width: "100%", height: 200, borderRadius: 12 }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => { setPhotoUri(null); setPhotoBase64(null); setAIResult(null); setAIError(null); }}
                    className="absolute top-2 right-2 bg-black/50 rounded-full w-7 h-7 items-center justify-center"
                  >
                    <Text className="text-white text-xs font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (editTarget?.photo_url ? (
                <View className="mb-3">
                  <Image source={{ uri: editTarget.photo_url }} style={{ width: "100%", height: 180, borderRadius: 12 }} resizeMode="cover" />
                  <Text className="text-xs text-gray-400 mt-1 text-center">Existing photo</Text>
                </View>
              ) : null)}

              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => pickPhoto(true)}
                  className="flex-1 flex-row items-center justify-center gap-2 border border-blue-200 bg-blue-50 rounded-xl py-2.5"
                >
                  <Text className="text-base">📷</Text>
                  <Text className="text-blue-700 text-sm font-medium">Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickPhoto(false)}
                  className="flex-1 flex-row items-center justify-center gap-2 border border-gray-200 bg-gray-50 rounded-xl py-2.5"
                >
                  <Text className="text-base">🖼</Text>
                  <Text className="text-gray-700 text-sm font-medium">Choose Photo</Text>
                </TouchableOpacity>
              </View>

              {photoBase64 && (
                <View>
                  <Input
                    label="Plant context (optional)"
                    placeholder="e.g. tomato plant, kale bed, squash…"
                    value={plantContext}
                    onChangeText={setPlantContext}
                  />
                  <TouchableOpacity
                    onPress={runAIIdentify}
                    disabled={identifyingAI}
                    className={`flex-row items-center justify-center gap-2 rounded-xl py-3 mb-3 ${identifyingAI ? "bg-purple-200" : "bg-purple-600"}`}
                  >
                    {identifyingAI ? (
                      <>
                        <ActivityIndicator color="white" size="small" />
                        <Text className="text-white font-semibold text-sm">Identifying with AI…</Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-base">🤖</Text>
                        <Text className="text-white font-semibold text-sm">Identify with AI (WSU Extension)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {aiError && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                  <Text className="text-red-600 text-sm">{aiError}</Text>
                </View>
              )}

              {aiResult && !aiResult.not_visible_confirmation && (
                <View className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-sm font-bold text-purple-900">{aiResult.identified}</Text>
                    {aiResult.scientific_name && (
                      <Text className="text-xs text-purple-500 italic">{aiResult.scientific_name}</Text>
                    )}
                    <View className="ml-auto px-2 py-0.5 rounded" style={{ backgroundColor: CONFIDENCE_COLORS[aiResult.confidence] + "22" }}>
                      <Text className="text-xs font-medium" style={{ color: CONFIDENCE_COLORS[aiResult.confidence] }}>
                        {aiResult.confidence} confidence
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-purple-800 mb-2">{aiResult.description}</Text>

                  {/* Urgency */}
                  {(() => {
                    const u =
                      URGENCY_STYLES[aiResult.urgency as keyof typeof URGENCY_STYLES] ?? {
                        bg: "#f3f4f6",
                        color: "#6b7280",
                        label: "Monitor",
                      };
                    return (
                      <View className="flex-row items-center gap-2 mb-2">
                        <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: u.bg }}>
                          <Text className="text-xs font-semibold" style={{ color: u.color }}>{u.label}</Text>
                        </View>
                        <Text className="text-xs text-gray-600 flex-1">{aiResult.urgency_reason}</Text>
                      </View>
                    );
                  })()}

                  {/* WSU Notes */}
                  <View className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                    <Text className="text-xs font-semibold text-green-800 mb-0.5">WSU Extension (Zone 8b)</Text>
                    <Text className="text-xs text-green-700">{aiResult.wsu_notes}</Text>
                  </View>

                  {/* Organic treatments */}
                  {aiResult.organic_treatments?.length > 0 && (
                    <View className="mb-1">
                      <Text className="text-xs font-semibold text-gray-700 mb-1">Organic Treatments</Text>
                      {aiResult.organic_treatments.map((t, i) => (
                        <Text key={i} className="text-xs text-gray-600">• {t}</Text>
                      ))}
                    </View>
                  )}

                  {/* Cultural controls */}
                  {aiResult.cultural_controls?.length > 0 && (
                    <View>
                      <Text className="text-xs font-semibold text-gray-700 mb-1">Cultural Controls</Text>
                      {aiResult.cultural_controls.map((c, i) => (
                        <Text key={i} className="text-xs text-gray-600">• {c}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {aiResult?.not_visible_confirmation && (
                <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
                  <Text className="text-sm text-gray-600">No pest or disease detected in the photo. You can still log an observation manually.</Text>
                </View>
              )}
            </View>

            {/* ── Standard form fields ─────────────────────────────────────── */}
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

            <View className="h-8" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
