import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFosterWeightLogs } from "@/hooks/useFosterPuppy";
import { summarizeGrowth, formatLbs, formatDelta, shortDate } from "@/utils/puppyGrowth";
import type { FosterPuppy } from "@/types/app.types";

interface PuppyWeightLineProps {
  puppy: FosterPuppy;
  /** Opens the full weigh-in history, where entries are edited and deleted. */
  onPress: () => void;
}

/**
 * The weight row on a puppy's profile card: current weight, when it was taken,
 * and the change since the previous weigh-in — red on a loss or a flat week.
 *
 * It must never be nested inside another TouchableOpacity: react-native-web
 * fires the parent's onPress as well, which previously opened the Behavior Log
 * dialog on top of the history modal. Callers place it as a sibling.
 */
export function PuppyWeightLine({ puppy, onPress }: PuppyWeightLineProps) {
  const { data: weightLogs = [] } = useFosterWeightLogs(puppy.id);
  const growth = useMemo(() => summarizeGrowth(weightLogs), [weightLogs]);

  const chg = growth.sinceLast;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center mt-2 pt-2 border-t border-gray-200/70"
    >
      {growth.latest ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">
            ⚖️ {formatLbs(growth.latest.weight_lbs)}
          </Text>
          <Text className="text-xs text-gray-500 ml-2">
            {shortDate(growth.latest.weighed_on)}
          </Text>
          {chg && (
            <Text
              className={`text-xs font-semibold ml-2 ${
                chg.flagged ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {formatDelta(chg.deltaLbs)}
            </Text>
          )}
        </>
      ) : (
        <Text className="text-xs text-gray-400">⚖️ No weigh-ins yet</Text>
      )}
      <View className="flex-1" />
      <Text className="text-xs font-semibold text-blue-600">
        {growth.entries.length ? "Edit ›" : "View ›"}
      </Text>
    </TouchableOpacity>
  );
}
