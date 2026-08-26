import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from "react-native";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { normalizeTimeTo24h } from "@/utils/dateUtils";
import { ptDayAndMinutes, formatMinutes, ptWallTimeToISO } from "@/utils/puppyPredict";
import {
  POTTY_KINDS,
  POTTY_LOCATIONS,
  FEEDING_KINDS,
  type FosterPottyLog,
  type FosterFeedingLog,
  type PottyKind,
  type PottyLocation,
  type FeedingKind,
} from "@/types/app.types";

export type EditTarget =
  | { type: "potty"; log: FosterPottyLog }
  | { type: "feeding"; log: FosterFeedingLog };

interface EntryEditModalProps {
  target: EditTarget | null;
  onClose: () => void;
  onSavePotty: (id: string, updates: Partial<FosterPottyLog>) => Promise<void>;
  onSaveFeeding: (id: string, updates: Partial<FosterFeedingLog>) => Promise<void>;
  onDelete: (target: EditTarget) => void;
  saving?: boolean;
}

/**
 * Edit or delete one logged entry. The time is edited as a Pacific date plus a
 * free-text clock time ("7:15am", "19:00"), which is converted back to an
 * absolute instant so a corrected entry still sorts and projects correctly.
 */
export function EntryEditModal({
  target,
  onClose,
  onSavePotty,
  onSaveFeeding,
  onDelete,
  saving,
}: EntryEditModalProps) {
  const [kind, setKind] = useState<string>("");
  const [location, setLocation] = useState<PottyLocation>("backyard");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("");
  const [timeText, setTimeText] = useState("");

  // Re-seed the form whenever a different entry is opened.
  useEffect(() => {
    if (!target) return;
    const { day: d, minutes } = ptDayAndMinutes(target.log.occurred_at);
    setDay(d);
    setTimeText(formatMinutes(minutes));
    setKind(target.log.kind);
    if (target.type === "potty") setLocation(target.log.location);
    else setAmount(target.log.amount ?? "");
  }, [target?.log.id]);

  if (!target) return null;

  const isPotty = target.type === "potty";

  const save = async () => {
    const normalized = normalizeTimeTo24h(timeText);
    if (!normalized) {
      showAlert("Check the time", 'Try a format like "7:15am", "9am", or "19:00".');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      showAlert("Check the date", "Enter the date as MM/DD/YYYY.");
      return;
    }
    const [hh, mm] = normalized.split(":").map(Number);
    const occurred_at = ptWallTimeToISO(day, hh * 60 + mm);

    try {
      if (isPotty) {
        await onSavePotty(target.log.id, {
          kind: kind as PottyKind,
          location,
          occurred_at,
        });
      } else {
        await onSaveFeeding(target.log.id, {
          kind: kind as FeedingKind,
          amount: amount.trim() || null,
          occurred_at,
        });
      }
      onClose();
    } catch (e: any) {
      showAlert("Couldn't save", e?.message ?? "Please try again.");
    }
  };

  const confirmDelete = () => {
    showConfirm(
      "Delete this entry?",
      "It's removed from the daily report and from the projections.",
      () => {
        onDelete(target);
        onClose();
      },
      true
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              {isPotty ? "Edit Potty Entry" : "Edit Food & Water Entry"}
            </Text>

            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">What</Text>
            <View className={isPotty ? "gap-2 mb-4" : "flex-row gap-2 mb-4"}>
              {(isPotty ? POTTY_KINDS : FEEDING_KINDS).map((k) => {
                const selected = kind === k.value;
                return (
                  <TouchableOpacity
                    key={k.value}
                    onPress={() => setKind(k.value)}
                    className={`${isPotty ? "flex-row items-center" : "flex-1 items-center"} px-3 py-3 rounded-xl border ${
                      selected ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text style={{ fontSize: 16 }} className={isPotty ? "mr-3" : ""}>
                      {k.emoji}
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${isPotty ? "" : "mt-1"} ${
                        selected ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {k.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isPotty ? (
              <>
                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Where</Text>
                <View className="gap-2 mb-4">
                  {POTTY_LOCATIONS.map((l) => {
                    const selected = location === l.value;
                    const accident = l.value === "inside";
                    return (
                      <TouchableOpacity
                        key={l.value}
                        onPress={() => setLocation(l.value)}
                        className={`flex-row items-center px-3 py-3 rounded-xl border ${
                          selected
                            ? accident
                              ? "bg-red-50 border-red-400"
                              : "bg-green-50 border-green-500"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text style={{ fontSize: 16 }} className="mr-3">{l.emoji}</Text>
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? (accident ? "text-red-700" : "text-green-700") : "text-gray-700"
                          }`}
                        >
                          {l.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  How much (optional)
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 1/2 cup kibble"
                  className="border border-gray-300 rounded-xl px-3 py-3 text-base bg-white mb-4"
                />
              </>
            )}

            <DateInput label="Date" value={day} onChange={setDay} />

            <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 mt-4">Time</Text>
            <TextInput
              value={timeText}
              onChangeText={setTimeText}
              placeholder="7:15am"
              autoCapitalize="none"
              className="border border-gray-300 rounded-xl px-3 py-3 text-base bg-white"
            />
            <Text className="text-gray-400 text-xs mt-1">
              Pacific time. "7:15am", "9am" and "19:00" all work.
            </Text>

            <TouchableOpacity
              onPress={save}
              disabled={saving}
              className="bg-blue-600 rounded-2xl py-4 items-center mt-5"
            >
              <Text className="text-white text-base font-bold">
                {saving ? "Saving…" : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={confirmDelete}
              className="border border-red-200 bg-red-50 rounded-2xl py-3.5 items-center mt-2"
            >
              <Text className="text-red-600 text-sm font-bold">Delete Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="py-3 items-center">
              <Text className="text-gray-500 text-sm">Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
