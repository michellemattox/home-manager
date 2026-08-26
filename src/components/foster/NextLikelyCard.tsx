import React, { useMemo } from "react";
import { View, Text } from "react-native";
import {
  predictNext,
  loggedDayCount,
  formatClock,
  formatRelative,
  MIN_DAYS_FOR_PREDICTION,
} from "@/utils/puppyPredict";
import type { FosterPottyLog, FosterFeedingLog } from "@/types/app.types";

const TARGET_LABEL = { pee: "#1 · Pee", poop: "#2 · Poop" } as const;
const TARGET_EMOJI = { pee: "💧", poop: "💩" } as const;

const CONFIDENCE_STYLE = {
  low: { label: "rough guess", color: "#9ca3af" },
  medium: { label: "fair", color: "#d97706" },
  high: { label: "solid", color: "#16a34a" },
} as const;

interface NextLikelyCardProps {
  pottyLogs: FosterPottyLog[];
  feedingLogs: FosterFeedingLog[];
  dobMonths: number | null;
}

/** "Next up" projections. Shows a progress note instead of numbers it can't back. */
export function NextLikelyCard({ pottyLogs, feedingLogs, dobMonths }: NextLikelyCardProps) {
  const days = useMemo(() => loggedDayCount(pottyLogs), [pottyLogs]);
  const predictions = useMemo(
    () => predictNext(pottyLogs, feedingLogs, dobMonths),
    [pottyLogs, feedingLogs, dobMonths]
  );

  if (predictions.length === 0) {
    const remaining = Math.max(0, MIN_DAYS_FOR_PREDICTION - days);
    return (
      <View className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">Next likely</Text>
        <Text className="text-sm text-gray-500">
          {days === 0
            ? "No entries yet — log a few and projections start automatically."
            : remaining > 0
              ? `${days} day${days === 1 ? "" : "s"} logged. ${remaining} more and projections turn on.`
              : "Not enough entries yet to spot a pattern — keep logging."}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
      <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Next likely</Text>
      {predictions.map((p) => {
        const conf = CONFIDENCE_STYLE[p.confidence];
        return (
          <View key={p.target} className="flex-row items-start mb-2 last:mb-0">
            <Text style={{ fontSize: 16 }} className="mr-2 mt-0.5">
              {TARGET_EMOJI[p.target]}
            </Text>
            <View className="flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-sm font-semibold text-gray-900">
                  {TARGET_LABEL[p.target]} around {formatClock(p.at)}
                </Text>
                <Text
                  className={`text-xs ml-2 font-semibold ${
                    p.overdue ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {p.overdue ? `due ${formatRelative(p.at)}` : formatRelative(p.at)}
                </Text>
              </View>
              <Text className="text-[11px] text-gray-400 mt-0.5">
                {p.basis} · <Text style={{ color: conf.color }}>{conf.label}</Text>
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
