import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from "react-native";
import {
  useFosterWeightLogs,
  useUpdateWeightLog,
  useDeleteWeightLog,
} from "@/hooks/useFosterPuppy";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import {
  summarizeGrowth,
  growthHeadline,
  formatLbs,
  formatDelta,
  shortDate,
} from "@/utils/puppyGrowth";
import type { FosterPuppy, FosterWeightLog } from "@/types/app.types";

interface WeightHistoryModalProps {
  visible: boolean;
  puppy: FosterPuppy;
  onClose: () => void;
}

/**
 * The full weigh-in history for one puppy, opened by tapping the weight line on
 * the profile. Every entry is editable in place (weight, date, note) and
 * deletable — a mistyped scale reading shouldn't be permanent, and there's no
 * undo-toast pattern here because the row is right there to re-add.
 *
 * New weigh-ins are added from the Puppy Behavior Log dialog, not here, so
 * there's exactly one place to log and one place to correct.
 */
export function WeightHistoryModal({ visible, puppy, onClose }: WeightHistoryModalProps) {
  const { data: weightLogs = [] } = useFosterWeightLogs(puppy.id);
  const updateWeight = useUpdateWeightLog();
  const deleteWeight = useDeleteWeightLog();

  const growth = useMemo(() => summarizeGrowth(weightLogs), [weightLogs]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftWeight, setDraftWeight] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const draftLbs = useMemo(() => {
    const n = Number(draftWeight.trim().replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 && n < 400 ? n : null;
  }, [draftWeight]);

  const openEdit = (w: FosterWeightLog) => {
    setEditingId(w.id);
    setDraftWeight(String(w.weight_lbs));
    setDraftDate(w.weighed_on);
    setDraftNote(w.notes ?? "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (w: FosterWeightLog) => {
    if (draftLbs == null || !draftDate) return;
    try {
      await updateWeight.mutateAsync({
        id: w.id,
        puppyId: puppy.id,
        updates: {
          weight_lbs: draftLbs,
          weighed_on: draftDate,
          notes: draftNote.trim() || null,
        },
      });
      setEditingId(null);
    } catch (e: any) {
      showAlert("Couldn't save", e?.message ?? "Please try again.");
    }
  };

  const remove = (w: FosterWeightLog) => {
    showConfirm(
      "Delete this weigh-in?",
      `${formatLbs(w.weight_lbs)} on ${shortDate(w.weighed_on)} will be removed from the profile and the report card.`,
      async () => {
        try {
          await deleteWeight.mutateAsync({ id: w.id, puppyId: puppy.id });
        } catch (e: any) {
          showAlert("Couldn't delete", e?.message ?? "Please try again.");
        }
      },
      true
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 items-center justify-center px-5">
        <View className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <Text style={{ fontSize: 20 }} className="mr-2">⚖️</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {puppy.name} · Weigh-Ins
              </Text>
              <Text className="text-xs text-gray-500">
                {growth.entries.length} logged
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="ml-3 px-1">
              <Text className="text-gray-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[520px]" keyboardShouldPersistTaps="handled">
            <View className="p-4">
              {/* Headline — same sentence the profile card shows. */}
              <View
                className={`rounded-xl px-3 py-3 mb-4 ${
                  growth.sinceLast?.flagged ? "bg-red-50" : "bg-emerald-50"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    growth.sinceLast?.flagged ? "text-red-700" : "text-emerald-800"
                  }`}
                >
                  {growthHeadline(growth, puppy)}
                </Text>
              </View>

              {growth.entries.length === 0 && (
                <Text className="text-sm text-gray-500">
                  No weigh-ins yet. Add one from the Puppy Behavior Log.
                </Text>
              )}

              {growth.entries.map((w) => {
                const chg = growth.changes[w.id];
                const isEditing = editingId === w.id;

                if (isEditing) {
                  return (
                    <View
                      key={w.id}
                      className="border border-blue-300 bg-blue-50/40 rounded-xl p-3 mb-2"
                    >
                      <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Weight (lbs)
                      </Text>
                      <TextInput
                        value={draftWeight}
                        onChangeText={setDraftWeight}
                        keyboardType="decimal-pad"
                        className="border border-gray-300 rounded-xl px-3 py-2.5 text-base bg-white mb-1"
                      />
                      {draftWeight.trim().length > 0 && draftLbs == null && (
                        <Text className="text-[11px] text-red-600 mb-1">
                          Enter a number of pounds, like 4.4.
                        </Text>
                      )}
                      <View className="mt-1">
                        <DateInput label="Date weighed" value={draftDate} onChange={setDraftDate} />
                      </View>
                      <TextInput
                        value={draftNote}
                        onChangeText={setDraftNote}
                        placeholder="Note (optional)"
                        className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white mt-2"
                      />
                      <View className="flex-row gap-2 mt-3">
                        <TouchableOpacity
                          onPress={() => saveEdit(w)}
                          disabled={draftLbs == null || !draftDate || updateWeight.isPending}
                          className={`flex-1 rounded-xl py-2.5 items-center ${
                            draftLbs == null || !draftDate ? "bg-gray-200" : "bg-blue-600"
                          }`}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              draftLbs == null || !draftDate ? "text-gray-400" : "text-white"
                            }`}
                          >
                            {updateWeight.isPending ? "Saving…" : "Save"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={cancelEdit}
                          className="px-4 rounded-xl py-2.5 items-center border border-gray-300 bg-white"
                        >
                          <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={w.id}
                    className="flex-row items-center border-b border-gray-100 py-3"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-baseline">
                        <Text className="text-base font-bold text-gray-900 mr-2">
                          {formatLbs(w.weight_lbs)}
                        </Text>
                        {chg && (
                          <Text
                            className={`text-xs font-semibold ${
                              chg.flagged ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            {formatDelta(chg.deltaLbs)}
                            {chg.days > 0 ? ` in ${chg.days}d` : ""}
                          </Text>
                        )}
                      </View>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {shortDate(w.weighed_on)}
                        {w.notes ? ` · ${w.notes}` : ""}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openEdit(w)} className="px-2 py-1">
                      <Text className="text-xs font-semibold text-blue-600">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(w)} className="px-2 py-1">
                      <Text className="text-xs font-semibold text-red-600">Delete</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
