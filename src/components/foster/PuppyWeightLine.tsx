import React, { useMemo } from "react";
import { Text, TouchableOpacity, type GestureResponderEvent } from "react-native";
import { useFosterWeightLogs } from "@/hooks/useFosterPuppy";
import { summarizeGrowth, formatLbs, formatDelta, shortDate } from "@/utils/puppyGrowth";
import type { FosterPuppy } from "@/types/app.types";

interface PuppyWeightLineProps {
  puppy: FosterPuppy;
  /** Opens the full weigh-in history. */
  onPress: () => void;
}

/**
 * The one-line weight summary on a puppy's profile card: current weight, the
 * date it was taken, and the change since the previous weigh-in — red when the
 * puppy lost weight or held flat.
 *
 * On the "current puppy" card this sits inside an outer TouchableOpacity that
 * opens the log dialog, so the press is explicitly stopped from bubbling —
 * react-native-web propagates nested touches where native does not.
 */
export function PuppyWeightLine({ puppy, onPress }: PuppyWeightLineProps) {
  const { data: weightLogs = [] } = useFosterWeightLogs(puppy.id);
  const growth = useMemo(() => summarizeGrowth(weightLogs), [weightLogs]);

  const handlePress = (e?: GestureResponderEvent) => {
    (e as any)?.stopPropagation?.();
    onPress();
  };

  if (!growth.latest) {
    return (
      <TouchableOpacity onPress={handlePress} className="mt-1 self-start">
        <Text className="text-xs text-gray-400">⚖️ No weigh-ins yet — tap to view</Text>
      </TouchableOpacity>
    );
  }

  const chg = growth.sinceLast;
  return (
    <TouchableOpacity onPress={handlePress} className="mt-1 self-start flex-row items-center">
      <Text className="text-xs text-gray-700">
        <Text className="font-semibold">⚖️ {formatLbs(growth.latest.weight_lbs)}</Text>
        {` · ${shortDate(growth.latest.weighed_on)}`}
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
    </TouchableOpacity>
  );
}
