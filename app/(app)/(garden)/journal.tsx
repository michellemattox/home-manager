import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useGardenJournal,
  useCreateGardenJournalEntry,
  useUpdateGardenJournalEntry,
  useDeleteGardenJournalEntry,
  useGardenZonesByHousehold,
  useGardenPlantingsForHousehold,
} from "@/hooks/useGarden";
import type { GardenJournalEntry } from "@/types/app.types";

const QUICK_TAGS = ["🌱 Germination", "🌸 Flowering", "🌾 Harvest", "💧 Watering", "🐛 Pest", "🌿 Pruning", "🌡️ Weather", "📝 Note"];

export default function GardenJournalScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const householdId = household?.id;

  const { data: entries = [], isLoading } = useGardenJournal(householdId);
  const { data: zones = [] } = useGardenZonesByHousehold(householdId);
  const { data: plantings = [] } = useGardenPlantingsForHousehold(householdId);

  const createEntry = useCreateGardenJournalEntry();
  const updateEntry = useUpdateGardenJournalEntry();
  const deleteEntry = useDeleteGardenJournalEntry();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GardenJournalEntry | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setTitle(""); setBody(""); setTags([]);
    setShowModal(true);
  }

  function openEdit(e: GardenJournalEntry) {
    setEditing(e);
    setEntryDate(e.entry_date);
    setTitle(e.title ?? "");
    setBody(e.body);
    setTags(e.tags ?? []);
    setShowModal(true);
  }

  async function handleSave() {
    if (!body.trim() || !householdId) return;
    if (editing) {
      await updateEntry.mutateAsync({
        id: editing.id, householdId,
        updates: { entry_date: entryDate, title: title.trim() || null, body: body.trim(), tags },
      });
    } else {
      await createEntry.mutateAsync({
        household_id: householdId,
        plot_id: null, zone_id: null, planting_id: null,
        entry_date: entryDate,
        title: title.trim() || null,
        body: body.trim(),
        tags,
      });
    }
    setShowModal(false);
  }

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => (e.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [entries]);

  const filtered = useMemo(() =>
    filterTag ? entries.filter((e) => (e.tags ?? []).includes(filterTag)) : entries,
    [entries, filterTag]
  );

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, GardenJournalEntry[]>();
    filtered.forEach((e) => {
      const existing = map.get(e.entry_date) ?? [];
      existing.push(e);
      map.set(e.entry_date, existing);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  function fmtDate(d: string) {
    try {
      return format(new Date(d + "T12:00:00"), "EEEE, MMMM d, yyyy");
    } catch {
      return d;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-green-100 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">📓 Garden Journal</Text>
        <TouchableOpacity onPress={openNew} className="bg-green-600 rounded-xl px-3 py-1.5">
          <Text className="text-white text-sm font-semibold">+ Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <View className="px-4 py-2 bg-white border-b border-gray-100">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setFilterTag(null)}
                className={`px-3 py-1.5 rounded-xl border ${filterTag === null ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
              >
                <Text className={`text-xs font-medium ${filterTag === null ? "text-white" : "text-gray-600"}`}>All</Text>
              </TouchableOpacity>
              {allTags.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFilterTag(filterTag === t ? null : t)}
                  className={`px-3 py-1.5 rounded-xl border ${filterTag === t ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
                >
                  <Text className={`text-xs font-medium ${filterTag === t ? "text-white" : "text-gray-600"}`}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-3">📓</Text>
          <Text className="text-gray-500 text-sm font-medium text-center">No journal entries yet</Text>
          <Text className="text-gray-400 text-xs mt-1 text-center">
            Tap "+ Entry" to start logging observations, progress, and notes.
          </Text>
          <TouchableOpacity onPress={openNew} className="mt-5 bg-green-600 rounded-xl px-6 py-3">
            <Text className="text-white font-semibold">Write First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {grouped.map(([date, dayEntries]) => (
            <View key={date}>
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {fmtDate(date)}
              </Text>
              <View className="gap-3">
                {dayEntries.map((entry) => (
                  <Card key={entry.id} className="gap-2">
                    <View className="flex-row items-start gap-2">
                      <View className="flex-1">
                        {entry.title && (
                          <Text className="text-sm font-semibold text-gray-900 mb-0.5">{entry.title}</Text>
                        )}
                        <Text className="text-sm text-gray-700 leading-5">{entry.body}</Text>
                      </View>
                    </View>

                    {(entry.tags ?? []).length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5">
                        {(entry.tags ?? []).map((tag) => (
                          <View key={tag} className="bg-green-50 border border-green-200 rounded-lg px-2 py-0.5">
                            <Text className="text-green-700 text-xs">{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View className="flex-row items-center gap-2 pt-1 border-t border-gray-100">
                      <Text className="flex-1 text-xs text-gray-400">
                        {format(new Date(entry.created_at), "h:mm a")}
                      </Text>
                      <TouchableOpacity onPress={() => openEdit(entry)}>
                        <Text className="text-blue-500 text-xs">Edit</Text>
                      </TouchableOpacity>
                      {confirmingId === entry.id ? (
                        <View className="flex-row gap-1">
                          <TouchableOpacity onPress={() => setConfirmingId(null)} className="px-2 py-1 rounded-lg bg-gray-100">
                            <Text className="text-gray-600 text-xs">Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => { setConfirmingId(null); deleteEntry.mutate({ id: entry.id, householdId: householdId! }); }}
                            className="px-2 py-1 rounded-lg bg-red-500"
                          >
                            <Text className="text-white text-xs font-semibold">Delete</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => setConfirmingId(entry.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Text className="text-red-400 text-sm">✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Entry Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-semibold text-gray-900">{editing ? "Edit Entry" : "New Entry"}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!body.trim() || createEntry.isPending || updateEntry.isPending}
            >
              <Text className={`font-semibold ${body.trim() ? "text-green-600" : "text-gray-300"}`}>
                {createEntry.isPending || updateEntry.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            <DateInput label="Date" value={entryDate} onChange={setEntryDate} />
            <Input label="Title (optional)" placeholder="e.g. Peas sprouting in rows 2 & 3…" value={title} onChangeText={setTitle} />

            <Text className="text-sm font-medium text-gray-700 mb-1.5">Notes *</Text>
            <TextInput
              placeholder="What did you observe, do, or notice today?…"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 min-h-[120px] mb-4"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Tags</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {QUICK_TAGS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-xl border ${tags.includes(t) ? "bg-green-600 border-green-600" : "bg-white border-gray-200"}`}
                >
                  <Text className={`text-xs font-medium ${tags.includes(t) ? "text-white" : "text-gray-600"}`}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
