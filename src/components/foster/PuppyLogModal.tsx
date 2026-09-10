import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from "react-native";
import { router } from "expo-router";
import { useHouseholdStore } from "@/stores/householdStore";
import {
  useFosterPottyLogs,
  useFosterFeedingLogs,
  useFosterWeightLogs,
  useLogPotty,
  useLogFeeding,
  useLogWeight,
} from "@/hooks/useFosterPuppy";
import { TimeAdjuster } from "./TimeAdjuster";
import { NextLikelyCard } from "./NextLikelyCard";
import { showAlert } from "@/lib/alert";
import {
  POTTY_KINDS,
  POTTY_LOCATIONS,
  FEEDING_KINDS,
  type FosterPuppy,
  type PottyKind,
  type PottyLocation,
  type FeedingKind,
} from "@/types/app.types";
import { computeAge } from "@/utils/puppyPredict";
import { DateInput } from "@/components/ui/DateInput";
import { getTodayPT } from "@/utils/dateUtils";
import { summarizeGrowth, formatLbs, formatDelta, shortDate } from "@/utils/puppyGrowth";
import { WeighInList } from "./WeighInList";

type View_ = "menu" | "potty" | "feeding" | "weight";

interface PuppyLogModalProps {
  visible: boolean;
  puppy: FosterPuppy;
  onClose: () => void;
}

/**
 * The one-tap dialog behind the Home "Puppy Behavior Log" button. Opens on a menu with
 * Log Potty / Log Food & Water / Log Weigh-In, the next-likely projections, and a
 * Daily Report link at the bottom.
 */
export function PuppyLogModal({ visible, puppy, onClose }: PuppyLogModalProps) {
  const household = useHouseholdStore((s) => s.household);
  const currentMember = useHouseholdStore((s) => s.currentMember);
  const [view, setView] = useState<View_>("menu");

  const { data: pottyLogs = [] } = useFosterPottyLogs(puppy.id);
  const { data: feedingLogs = [] } = useFosterFeedingLogs(puppy.id);
  const { data: weightLogs = [] } = useFosterWeightLogs(puppy.id);
  const logPotty = useLogPotty();
  const logFeeding = useLogFeeding();
  const logWeight = useLogWeight();

  // Potty form
  const [kind, setKind] = useState<PottyKind | null>(null);
  const [location, setLocation] = useState<PottyLocation | null>(null);
  const [pottyBackMin, setPottyBackMin] = useState(0);

  // Feeding form
  const [feedKind, setFeedKind] = useState<FeedingKind | null>(null);
  const [amount, setAmount] = useState("");
  const [feedBackMin, setFeedBackMin] = useState(0);

  // Weigh-in form. The date defaults to today (PT) but stays editable so a vet
  // weight from earlier in the week lands on the day it was actually taken.
  const [weight, setWeight] = useState("");
  const [weighedOn, setWeighedOn] = useState(getTodayPT());
  const [weightNote, setWeightNote] = useState("");

  const age = useMemo(() => computeAge(puppy.dob), [puppy.dob]);
  const growth = useMemo(() => summarizeGrowth(weightLogs), [weightLogs]);

  // Accepts "4.4" or "4.4 lbs"; rejects anything that isn't a positive number.
  const weightLbs = useMemo(() => {
    const n = Number(weight.trim().replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 && n < 400 ? n : null;
  }, [weight]);

  const reset = () => {
    setView("menu");
    setKind(null);
    setLocation(null);
    setPottyBackMin(0);
    setFeedKind(null);
    setAmount("");
    setFeedBackMin(0);
    setWeight("");
    setWeighedOn(getTodayPT());
    setWeightNote("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const savePotty = async () => {
    if (!household || !kind || !location) return;
    try {
      await logPotty.mutateAsync({
        household_id: household.id,
        puppy_id: puppy.id,
        kind,
        location,
        occurred_at: new Date(Date.now() - pottyBackMin * 60000).toISOString(),
        logged_by_member_id: currentMember?.id ?? null,
      });
      close();
    } catch (e: any) {
      showAlert("Couldn't save", e?.message ?? "Please try again.");
    }
  };

  const saveFeeding = async () => {
    if (!household || !feedKind) return;
    try {
      await logFeeding.mutateAsync({
        household_id: household.id,
        puppy_id: puppy.id,
        kind: feedKind,
        amount: amount.trim() || null,
        occurred_at: new Date(Date.now() - feedBackMin * 60000).toISOString(),
        logged_by_member_id: currentMember?.id ?? null,
      });
      close();
    } catch (e: any) {
      showAlert("Couldn't save", e?.message ?? "Please try again.");
    }
  };

  const saveWeight = async () => {
    if (!household || weightLbs == null) return;
    try {
      await logWeight.mutateAsync({
        household_id: household.id,
        puppy_id: puppy.id,
        weight_lbs: weightLbs,
        weighed_on: weighedOn || getTodayPT(),
        notes: weightNote.trim() || null,
        logged_by_member_id: currentMember?.id ?? null,
      });
      close();
    } catch (e: any) {
      showAlert("Couldn't save", e?.message ?? "Please try again.");
    }
  };

  const goReport = () => {
    close();
    router.push("/(app)/(foster)/report");
  };

  const goManage = () => {
    close();
    router.push("/(app)/(foster)");
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <View className="flex-1 bg-black/40 items-center justify-center px-5">
        <View className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            {view !== "menu" ? (
              <TouchableOpacity onPress={() => setView("menu")} className="mr-3">
                <Text className="text-blue-600 text-base">‹ Back</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 20 }} className="mr-2">🐶</Text>
            )}
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {view === "potty"
                  ? "Log Potty"
                  : view === "feeding"
                    ? "Log Food & Water"
                    : view === "weight"
                      ? "Log Weigh-In"
                      : puppy.name}
              </Text>
              {view === "menu" && (
                <Text className="text-xs text-gray-500">
                  {age ? `${age.label} old` : "Age unknown"}
                  {puppy.dob_is_estimate && age ? " (est.)" : ""}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={close} className="ml-3 px-1">
              <Text className="text-gray-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[520px]" keyboardShouldPersistTaps="handled">
            {view === "menu" && (
              <View className="p-4">
                <TouchableOpacity
                  onPress={() => setView("potty")}
                  className="bg-amber-500 rounded-2xl py-4 items-center mb-3"
                >
                  <Text className="text-white text-base font-bold">💩  Log Potty</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setView("feeding")}
                  className="bg-sky-600 rounded-2xl py-4 items-center mb-3"
                >
                  <Text className="text-white text-base font-bold">🍽  Log Food & Water</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setView("weight")}
                  className="bg-emerald-600 rounded-2xl py-4 items-center mb-1"
                >
                  <Text className="text-white text-base font-bold">⚖️  Log Weigh-In</Text>
                </TouchableOpacity>
                {growth.latest ? (
                  <Text className="text-[11px] text-gray-500 text-center mb-4">
                    {`Last: ${formatLbs(growth.latest.weight_lbs)} on ${shortDate(
                      growth.latest.weighed_on
                    )}`}
                    {growth.sinceLast
                      ? ` · ${formatDelta(growth.sinceLast.deltaLbs)} since the one before`
                      : ""}
                  </Text>
                ) : (
                  <Text className="text-[11px] text-gray-400 text-center mb-4">
                    No weigh-ins yet.
                  </Text>
                )}

                <NextLikelyCard
                  pottyLogs={pottyLogs}
                  feedingLogs={feedingLogs}
                  dobMonths={age?.months ?? null}
                />

                <TouchableOpacity
                  onPress={goReport}
                  className="border border-gray-300 rounded-2xl py-3 items-center mt-4"
                >
                  <Text className="text-gray-800 text-sm font-semibold">📊  Daily Report</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goManage} className="py-3 items-center">
                  <Text className="text-blue-600 text-xs font-semibold">Manage puppies</Text>
                </TouchableOpacity>
              </View>
            )}

            {view === "potty" && (
              <View className="p-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">What</Text>
                <View className="gap-2 mb-4">
                  {POTTY_KINDS.map((k) => {
                    const selected = kind === k.value;
                    return (
                      <TouchableOpacity
                        key={k.value}
                        onPress={() => setKind(k.value)}
                        className={`flex-row items-center px-4 py-3 rounded-xl border ${
                          selected ? "border-transparent" : "border-gray-200 bg-white"
                        }`}
                        style={selected ? { backgroundColor: k.bg, borderColor: k.color } : undefined}
                      >
                        <Text style={{ fontSize: 20 }} className="mr-3">{k.emoji}</Text>
                        <Text
                          className="text-base font-semibold"
                          style={{ color: selected ? k.color : "#374151" }}
                        >
                          {k.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Where</Text>
                <View className="gap-2 mb-4">
                  {POTTY_LOCATIONS.map((l) => {
                    const selected = location === l.value;
                    const accident = l.value === "inside";
                    return (
                      <TouchableOpacity
                        key={l.value}
                        onPress={() => setLocation(l.value)}
                        className={`flex-row items-center px-4 py-3 rounded-xl border ${
                          selected
                            ? accident
                              ? "bg-red-50 border-red-400"
                              : "bg-green-50 border-green-500"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text style={{ fontSize: 18 }} className="mr-3">{l.emoji}</Text>
                        <Text
                          className={`text-base font-semibold ${
                            selected
                              ? accident
                                ? "text-red-700"
                                : "text-green-700"
                              : "text-gray-700"
                          }`}
                        >
                          {l.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TimeAdjuster value={pottyBackMin} onChange={setPottyBackMin} />

                <TouchableOpacity
                  onPress={savePotty}
                  disabled={!kind || !location || logPotty.isPending}
                  className={`rounded-2xl py-4 items-center mt-5 ${
                    !kind || !location || logPotty.isPending ? "bg-gray-200" : "bg-amber-500"
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      !kind || !location ? "text-gray-400" : "text-white"
                    }`}
                  >
                    {logPotty.isPending ? "Saving…" : "Save to Log"}
                  </Text>
                </TouchableOpacity>
                <Text className="text-[11px] text-gray-400 text-center mt-2">
                  Saves straight into the daily report.
                </Text>
              </View>
            )}

            {view === "feeding" && (
              <View className="p-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">What</Text>
                <View className="flex-row gap-2 mb-4">
                  {FEEDING_KINDS.map((k) => {
                    const selected = feedKind === k.value;
                    return (
                      <TouchableOpacity
                        key={k.value}
                        onPress={() => setFeedKind(k.value)}
                        className={`flex-1 items-center px-3 py-3 rounded-xl border ${
                          selected ? "bg-sky-50 border-sky-500" : "bg-white border-gray-200"
                        }`}
                      >
                        <Text style={{ fontSize: 18 }}>{k.emoji}</Text>
                        <Text
                          className={`text-xs font-semibold mt-1 ${
                            selected ? "text-sky-700" : "text-gray-700"
                          }`}
                        >
                          {k.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  How much (optional)
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 1/2 cup kibble, full bowl"
                  className="border border-gray-300 rounded-xl px-3 py-3 text-base bg-white mb-4"
                />

                <TimeAdjuster value={feedBackMin} onChange={setFeedBackMin} />

                <TouchableOpacity
                  onPress={saveFeeding}
                  disabled={!feedKind || logFeeding.isPending}
                  className={`rounded-2xl py-4 items-center mt-5 ${
                    !feedKind || logFeeding.isPending ? "bg-gray-200" : "bg-sky-600"
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${!feedKind ? "text-gray-400" : "text-white"}`}
                  >
                    {logFeeding.isPending ? "Saving…" : "Save to Log"}
                  </Text>
                </TouchableOpacity>
                <Text className="text-[11px] text-gray-400 text-center mt-2">
                  Meal times sharpen the #2 projections.
                </Text>
              </View>
            )}

            {view === "weight" && (
              <View className="p-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Weight (lbs)
                </Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 4.4"
                  keyboardType="decimal-pad"
                  autoFocus
                  className="border border-gray-300 rounded-xl px-3 py-3 text-2xl font-semibold bg-white mb-1"
                />
                {weight.trim().length > 0 && weightLbs == null && (
                  <Text className="text-[11px] text-red-600 mb-2">
                    Enter a number of pounds, like 4.4.
                  </Text>
                )}
                {growth.latest && weightLbs != null && (
                  <Text className="text-[11px] text-gray-500 mb-2">
                    {`${formatDelta(
                      weightLbs - growth.latest.weight_lbs
                    )} from ${formatLbs(growth.latest.weight_lbs)} on ${shortDate(
                      growth.latest.weighed_on
                    )}`}
                  </Text>
                )}

                <View className="mt-2">
                  <DateInput
                    label="Date weighed"
                    value={weighedOn}
                    onChange={setWeighedOn}
                    hint="Defaults to today — change it if you're entering an older weigh-in."
                  />
                </View>

                <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-2">
                  Note (optional)
                </Text>
                <TextInput
                  value={weightNote}
                  onChangeText={setWeightNote}
                  placeholder="e.g. at the vet, with harness on"
                  className="border border-gray-300 rounded-xl px-3 py-3 text-base bg-white"
                />

                <TouchableOpacity
                  onPress={saveWeight}
                  disabled={weightLbs == null || !weighedOn || logWeight.isPending}
                  className={`rounded-2xl py-4 items-center mt-5 ${
                    weightLbs == null || !weighedOn || logWeight.isPending
                      ? "bg-gray-200"
                      : "bg-emerald-600"
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      weightLbs == null || !weighedOn ? "text-gray-400" : "text-white"
                    }`}
                  >
                    {logWeight.isPending ? "Saving…" : "Save Weigh-In"}
                  </Text>
                </TouchableOpacity>
                <Text className="text-[11px] text-gray-400 text-center mt-2">
                  Shows on {puppy.name}'s profile and the printed report card.
                </Text>

                {growth.entries.length > 0 && (
                  <View className="mt-5 pt-4 border-t border-gray-100">
                    <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Recent weigh-ins · tap Edit to correct one
                    </Text>
                    <WeighInList
                      puppy={puppy}
                      growth={growth}
                      limit={5}
                      footer={
                        growth.entries.length > 5 ? (
                          <Text className="text-[11px] text-gray-400 mt-2">
                            {`Showing the 5 most recent of ${growth.entries.length}. The rest are on the Daily Report.`}
                          </Text>
                        ) : null
                      }
                    />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
