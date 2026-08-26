import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAppRefresh } from "@/hooks/useAppRefresh";
import {
  useFosterPuppies,
  useFosterPottyLogs,
  useFosterFeedingLogs,
  useDeletePottyLog,
  useDeleteFeedingLog,
  useUpdatePottyLog,
  useUpdateFeedingLog,
} from "@/hooks/useFosterPuppy";
import { Card } from "@/components/ui/Card";
import { AppHeader } from "@/components/ui/AppHeader";
import { NextLikelyCard } from "@/components/foster/NextLikelyCard";
import { EntryEditModal, type EditTarget } from "@/components/foster/EntryEditModal";
import { showConfirm } from "@/lib/alert";
import {
  buildDaySummaries,
  daysSinceLastAccident,
  loggedDayCount,
  typicalDayWindows,
  computeAge,
  formatClock,
  formatMinutes,
  ptDay,
  MIN_DAYS_FOR_PREDICTION,
  type DaySummary,
} from "@/utils/puppyPredict";
import {
  POTTY_KINDS,
  POTTY_LOCATIONS,
  FEEDING_KINDS,
} from "@/types/app.types";

const KIND_META = Object.fromEntries(POTTY_KINDS.map((k) => [k.value, k]));
const LOC_META = Object.fromEntries(POTTY_LOCATIONS.map((l) => [l.value, l]));
const FEED_META = Object.fromEntries(FEEDING_KINDS.map((f) => [f.value, f]));

export default function FosterReportScreen() {
  const household = useHouseholdStore((s) => s.household);
  const { refreshing, onRefresh } = useAppRefresh();

  const { data: puppies = [] } = useFosterPuppies(household?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const puppy =
    puppies.find((p) => p.id === selectedId) ??
    puppies.find((p) => p.is_current && p.active) ??
    puppies[0] ??
    null;

  const { data: pottyLogs = [] } = useFosterPottyLogs(puppy?.id);
  const { data: feedingLogs = [] } = useFosterFeedingLogs(puppy?.id);
  const deletePotty = useDeletePottyLog();
  const deleteFeeding = useDeleteFeedingLog();
  const updatePotty = useUpdatePottyLog();
  const updateFeeding = useUpdateFeedingLog();
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const removeEntry = (t: EditTarget) => {
    if (t.type === "potty") deletePotty.mutate({ id: t.log.id, puppyId: t.log.puppy_id });
    else deleteFeeding.mutate({ id: t.log.id, puppyId: t.log.puppy_id });
  };

  const age = useMemo(() => computeAge(puppy?.dob ?? null), [puppy?.dob]);
  const days = useMemo(
    () => buildDaySummaries(pottyLogs, feedingLogs, 7),
    [pottyLogs, feedingLogs]
  );
  const sinceAccident = useMemo(() => daysSinceLastAccident(pottyLogs), [pottyLogs]);
  const loggedDays = useMemo(() => loggedDayCount(pottyLogs), [pottyLogs]);

  const weekTotals = useMemo(
    () =>
      days.reduce(
        (acc, d) => ({
          pee: acc.pee + d.pee,
          poop: acc.poop + d.poop,
          accidents: acc.accidents + d.accidents,
        }),
        { pee: 0, poop: 0, accidents: 0 }
      ),
    [days]
  );

  const peeWindows = useMemo(() => typicalDayWindows(pottyLogs, "pee"), [pottyLogs]);
  const poopWindows = useMemo(() => typicalDayWindows(pottyLogs, "poop"), [pottyLogs]);

  if (!puppy) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED]" edges={["top"]}>
        <AppHeader compact />
        <Header title="Daily Report" />
        <View className="px-4">
          <Card>
            <Text className="text-sm text-gray-600">
              No puppy profiles yet. Create one on the Foster Puppy screen to start logging.
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]" edges={["top"]}>
      <AppHeader compact />
      <Header title="Daily Report" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Puppy switcher — only when there's more than one profile */}
        {puppies.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {puppies.map((p) => {
                const selected = p.id === puppy.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedId(p.id)}
                    className={`px-3 py-2 rounded-full border ${
                      selected ? "bg-gray-900 border-gray-900" : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {p.name}
                      {!p.active ? " (past)" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Week at a glance */}
        <Card className="mb-3">
          <Text className="text-base font-bold text-gray-900">{puppy.name}</Text>
          <Text className="text-xs text-gray-500 mb-3">
            {age ? `${age.label} old` : "Age unknown"} · last 7 days
          </Text>
          <View className="flex-row gap-2">
            <Stat label="#1 Pee" value={weekTotals.pee} tint="#fefce8" color="#ca8a04" />
            <Stat label="#2 Poop" value={weekTotals.poop} tint="#fef3c7" color="#92400e" />
            <Stat
              label="Accidents"
              value={weekTotals.accidents}
              tint={weekTotals.accidents > 0 ? "#fef2f2" : "#f0fdf4"}
              color={weekTotals.accidents > 0 ? "#dc2626" : "#16a34a"}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-3">
            {sinceAccident == null
              ? "🎉 No accidents on record."
              : sinceAccident === 0
                ? "🚨 Accident today."
                : `🎉 ${sinceAccident} day${sinceAccident === 1 ? "" : "s"} since the last accident.`}
          </Text>
        </Card>

        {/* Next likely */}
        <View className="mb-3">
          <NextLikelyCard
            pottyLogs={pottyLogs}
            feedingLogs={feedingLogs}
            dobMonths={age?.months ?? null}
          />
        </View>

        {/* Typical day */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-2">
          Typical Day
        </Text>
        <Card className="mb-4">
          {loggedDays < MIN_DAYS_FOR_PREDICTION ? (
            <Text className="text-sm text-gray-500">
              {`Needs ${MIN_DAYS_FOR_PREDICTION} days of entries to spot a pattern — ${loggedDays} logged so far.`}
            </Text>
          ) : peeWindows.length === 0 && poopWindows.length === 0 ? (
            <Text className="text-sm text-gray-500">
              No repeating times yet — {puppy.name}'s schedule still looks random. Keep logging.
            </Text>
          ) : (
            <>
              <WindowRow label="#1 Pee" emoji="💧" windows={peeWindows} />
              <WindowRow label="#2 Poop" emoji="💩" windows={poopWindows} />
              <Text className="text-[11px] text-gray-400 mt-2">
                Windows are the times {puppy.name} usually goes, based on {loggedDays} days.
                The fraction is how many of those days each window actually fired.
              </Text>
            </>
          )}
        </Card>

        {/* Day-by-day */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Past 7 Days
        </Text>
        {days.map((d) => (
          <DayCard
            key={d.day}
            day={d}
            onEdit={setEditing}
            onDelete={(t) =>
              showConfirm(
                "Delete this entry?",
                "It's removed from the daily report and from the projections.",
                () => removeEntry(t),
                true
              )
            }
          />
        ))}
      </ScrollView>

      <EntryEditModal
        target={editing}
        onClose={() => setEditing(null)}
        saving={updatePotty.isPending || updateFeeding.isPending}
        onSavePotty={async (id, updates) => {
          if (!puppy) return;
          await updatePotty.mutateAsync({ id, puppyId: puppy.id, updates });
        }}
        onSaveFeeding={async (id, updates) => {
          if (!puppy) return;
          await updateFeeding.mutateAsync({ id, puppyId: puppy.id, updates });
        }}
        onDelete={removeEntry}
      />
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View className="flex-row items-center px-4 pb-2">
      <TouchableOpacity onPress={() => router.back()} className="mr-3">
        <Text className="text-blue-600 text-base">‹ Back</Text>
      </TouchableOpacity>
      <Text className="flex-1 text-xl font-bold text-gray-900">📊 {title}</Text>
    </View>
  );
}

function Stat({
  label,
  value,
  tint,
  color,
}: {
  label: string;
  value: number;
  tint: string;
  color: string;
}) {
  return (
    <View className="flex-1 rounded-xl py-2.5 items-center" style={{ backgroundColor: tint }}>
      <Text className="text-xl font-bold" style={{ color }}>
        {value}
      </Text>
      <Text className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</Text>
    </View>
  );
}

function WindowRow({
  label,
  emoji,
  windows,
}: {
  label: string;
  emoji: string;
  windows: ReturnType<typeof typicalDayWindows>;
}) {
  if (windows.length === 0) return null;
  return (
    <View className="mb-2">
      <Text className="text-xs font-semibold text-gray-700 mb-1">
        {emoji} {label}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {windows.map((w) => (
          <View
            key={`${w.target}-${w.centerMin}`}
            className="px-2.5 py-1.5 rounded-lg bg-gray-100"
          >
            <Text className="text-xs font-semibold text-gray-800">
              {formatMinutes(w.startMin)}–{formatMinutes(w.endMin)}
            </Text>
            <Text className="text-[10px] text-gray-500">
              {w.hits}/{w.daysObserved} days
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DayCard({
  day,
  onEdit,
  onDelete,
}: {
  day: DaySummary;
  onEdit: (target: EditTarget) => void;
  onDelete: (target: EditTarget) => void;
}) {
  const today = ptDay(new Date());
  const yesterday = ptDay(new Date(Date.now() - 86400000));
  const heading =
    day.day === today
      ? "Today"
      : day.day === yesterday
        ? "Yesterday"
        : new Date(`${day.day}T12:00:00Z`).toLocaleDateString("en-US", {
            // Pinned to UTC noon and formatted as-is: the label describes a
            // Pacific calendar day that was already resolved by ptDay().
            timeZone: "UTC",
            weekday: "short",
            month: "numeric",
            day: "numeric",
          });

  return (
    <Card className="mb-2">
      <View className="flex-row items-center mb-2">
        <Text className="text-sm font-bold text-gray-900 flex-1">{heading}</Text>
        <Text className="text-xs text-gray-500">
          💧 {day.pee}  💩 {day.poop}
          {day.nothing > 0 ? `  ⭕ ${day.nothing}` : ""}
          {day.accidents > 0 ? `  🚨 ${day.accidents}` : ""}
        </Text>
      </View>

      {day.timeline.length === 0 ? (
        <Text className="text-xs text-gray-400">No entries.</Text>
      ) : (
        <>
          {day.timeline.map((ev) => {
            if (ev.type === "potty") {
              const e = ev.log;
              const k = KIND_META[e.kind];
              const l = LOC_META[e.location];
              const accident = e.location === "inside";
              return (
                <EntryRow
                  key={e.id}
                  time={formatClock(e.occurred_at)}
                  emoji={k?.emoji ?? ""}
                  label={k?.label ?? e.kind}
                  trailing={`${l?.emoji ?? ""} ${(l?.label ?? "")
                    .replace("Outside · ", "")
                    .replace("Inside · ", "")}`}
                  trailingDanger={accident}
                  onEdit={() => onEdit({ type: "potty", log: e })}
                  onDelete={() => onDelete({ type: "potty", log: e })}
                />
              );
            }
            const f = ev.log;
            const meta = FEED_META[f.kind];
            return (
              <EntryRow
                key={f.id}
                time={formatClock(f.occurred_at)}
                emoji={meta?.emoji ?? ""}
                label={`${meta?.label ?? f.kind}${f.amount ? ` · ${f.amount}` : ""}`}
                muted
                onEdit={() => onEdit({ type: "feeding", log: f })}
                onDelete={() => onDelete({ type: "feeding", log: f })}
              />
            );
          })}
          <Text className="text-[10px] text-gray-300 mt-1.5">
            Newest first. Tap an entry to edit its time or details.
          </Text>
        </>
      )}
    </Card>
  );
}

/** One logged entry: tap anywhere to edit, or use the trash button to remove it. */
function EntryRow({
  time,
  emoji,
  label,
  trailing,
  trailingDanger,
  muted,
  onEdit,
  onDelete,
}: {
  time: string;
  emoji: string;
  label: string;
  trailing?: string;
  trailingDanger?: boolean;
  muted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="flex-row items-center border-b border-gray-50">
      <TouchableOpacity
        onPress={onEdit}
        className="flex-1 flex-row items-center py-2"
        accessibilityLabel={`Edit entry at ${time}`}
      >
        <Text className={`text-xs font-semibold w-16 ${muted ? "text-gray-400" : "text-gray-500"}`}>
          {time}
        </Text>
        <Text style={{ fontSize: 14 }} className="mr-1.5">
          {emoji}
        </Text>
        <Text
          className={`text-xs flex-1 ${muted ? "text-gray-500" : "font-semibold text-gray-800"}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {!!trailing && (
          <Text
            className={`text-[11px] mr-1 ${
              trailingDanger ? "text-red-600 font-semibold" : "text-gray-500"
            }`}
          >
            {trailing}
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="pl-2 pr-1 py-2"
        accessibilityLabel={`Delete entry at ${time}`}
      >
        <Text className="text-gray-300 text-sm">🗑</Text>
      </TouchableOpacity>
    </View>
  );
}
