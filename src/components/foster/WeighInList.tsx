import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useUpdateWeightLog, useDeleteWeightLog } from "@/hooks/useFosterPuppy";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatLbs, formatDelta, shortDate, type GrowthSummary } from "@/utils/puppyGrowth";
import type { FosterPuppy, FosterWeightLog } from "@/types/app.types";

interface WeighInListProps {
  puppy: FosterPuppy;
  growth: GrowthSummary;
  /** Show only the newest N entries (the dialog uses this); omit for all. */
  limit?: number;
  /** Rendered under the list when `limit` is hiding entries. */
  footer?: React.ReactNode;
}

/**
 * The weigh-in list with inline edit and delete. Shared by the Log Weigh-In view
 * of PuppyLogModal and the full-history WeightHistoryModal, so a weigh-in can be
 * corrected in the same place it was logged — there is no read-only rendering of
 * this list anywhere.
 */
export function WeighInList({ puppy, growth, limit, footer }: WeighInListProps) {
  const updateWeight = useUpdateWeightLog();
  const deleteWeight = useDeleteWeightLog();

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
      `${formatLbs(w.weight_lbs)} on ${shortDate(
        w.weighed_on
      )} will be removed from the profile and the report card.`,
      async () => {
        try {
          await deleteWeight.mutateAsync({ id: w.id, puppyId: puppy.id });
          // Close the editor if the row being edited is the one just deleted.
          setEditingId((cur) => (cur === w.id ? null : cur));
        } catch (e: any) {
          showAlert("Couldn't delete", e?.message ?? "Please try again.");
        }
      },
      true
    );
  };

  if (growth.entries.length === 0) {
    return (
      <Text className="text-sm text-gray-500">
        No weigh-ins yet. Add one with the ⚖️ Log Weigh-In button.
      </Text>
    );
  }

  const shown = limit != null ? growth.entries.slice(0, limit) : growth.entries;

  return (
    <View>
      {shown.map((w) => {
        const chg = growth.changes[w.id];

        if (editingId === w.id) {
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
                  onPress={() => setEditingId(null)}
                  className="px-4 rounded-xl py-2.5 items-center border border-gray-300 bg-white"
                >
                  <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(w)}
                  className="px-4 rounded-xl py-2.5 items-center border border-red-300 bg-white"
                >
                  <Text className="text-sm font-semibold text-red-600">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        return (
          <View key={w.id} className="flex-row items-center border-b border-gray-100 py-3">
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
            <TouchableOpacity
              onPress={() => openEdit(w)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white mr-2"
            >
              <Text className="text-xs font-semibold text-blue-600">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => remove(w)}
              disabled={deleteWeight.isPending}
              className="px-3 py-2 rounded-lg border border-red-300 bg-white"
            >
              <Text className="text-xs font-semibold text-red-600">Delete</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      {footer}
    </View>
  );
}
