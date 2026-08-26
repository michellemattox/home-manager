import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { formatClock } from "@/utils/puppyPredict";

/** Preset back-dating offsets, in minutes. */
const PRESETS = [
  { label: "Now", minutes: 0 },
  { label: "15 min ago", minutes: 15 },
  { label: "30 min ago", minutes: 30 },
  { label: "1 hr ago", minutes: 60 },
  { label: "2 hr ago", minutes: 120 },
];

interface TimeAdjusterProps {
  /** Minutes to subtract from now. */
  value: number;
  onChange: (minutes: number) => void;
}

/**
 * "When did it happen" control. Defaults to Now; the presets and a custom
 * hours entry back-date the event so a late log still lands at the right time.
 */
export function TimeAdjuster({ value, onChange }: TimeAdjusterProps) {
  const isPreset = PRESETS.some((p) => p.minutes === value);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [customText, setCustomText] = useState(
    !isPreset && value > 0 ? String(value / 60) : ""
  );

  const applyCustom = (text: string) => {
    setCustomText(text);
    const hours = parseFloat(text);
    if (!isNaN(hours) && hours >= 0) onChange(Math.round(hours * 60));
  };

  const at = new Date(Date.now() - value * 60000);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-gray-500 uppercase">When</Text>
        <Text className="text-xs text-gray-500">
          logs at <Text className="font-semibold text-gray-700">{formatClock(at)}</Text>
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {PRESETS.map((p) => {
          const selected = !customOpen && value === p.minutes;
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => {
                setCustomOpen(false);
                onChange(p.minutes);
              }}
              className={`px-3 py-2 rounded-full border ${
                selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? "text-white" : "text-gray-700"
                }`}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => {
            setCustomOpen(true);
            applyCustom(customText || "3");
          }}
          className={`px-3 py-2 rounded-full border ${
            customOpen ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${customOpen ? "text-white" : "text-gray-700"}`}
          >
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {customOpen && (
        <View className="flex-row items-center gap-2 mt-2">
          <TextInput
            value={customText}
            onChangeText={applyCustom}
            keyboardType="decimal-pad"
            placeholder="3"
            className="border border-gray-300 rounded-xl px-3 py-2 text-base bg-white w-20 text-center"
          />
          <Text className="text-sm text-gray-600">hours ago (decimals ok, e.g. 1.5)</Text>
        </View>
      )}
    </View>
  );
}
