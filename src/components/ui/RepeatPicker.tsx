import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import type { FrequencyType } from "@/types/app.types";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEK_OF_MONTH = ["1st", "2nd", "3rd", "4th"] as const;
const CUSTOM_UNITS = ["days", "weeks", "months"] as const;

type RepeatOption =
  | "daily"
  | "weekly"
  | "day_of_week"
  | "monthly"
  | "day_of_month"
  | "yearly"
  | "custom";

export interface RepeatResult {
  frequencyType: FrequencyType;
  frequencyDays: number;
  /** Human-readable label for display */
  label: string;
}

interface RepeatPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: RepeatResult) => void;
}

function computeDays(option: RepeatOption, state: {
  selectedDays: boolean[];
  weekOfMonth: number;
  dayOfWeekForMonth: number;
  customNumber: string;
  customUnit: typeof CUSTOM_UNITS[number];
}): RepeatResult {
  switch (option) {
    case "daily":
      return { frequencyType: "daily", frequencyDays: 1, label: "Daily" };
    case "weekly":
      return { frequencyType: "weekly", frequencyDays: 7, label: "Weekly" };
    case "day_of_week": {
      // Multiple days selected — use 7-day cycle (weekly pattern)
      const names = state.selectedDays
        .map((sel, i) => (sel ? DAYS_OF_WEEK[i] : null))
        .filter(Boolean);
      const label = names.length > 0 ? `Weekly on ${names.join(", ")}` : "Weekly";
      return { frequencyType: "weekly", frequencyDays: 7, label };
    }
    case "monthly":
      return { frequencyType: "monthly", frequencyDays: 30, label: "Monthly" };
    case "day_of_month": {
      const weekLabel = WEEK_OF_MONTH[state.weekOfMonth];
      const dayLabel = DAYS_OF_WEEK[state.dayOfWeekForMonth];
      return {
        frequencyType: "monthly",
        frequencyDays: 30,
        label: `Monthly on ${weekLabel} ${dayLabel}`,
      };
    }
    case "yearly":
      return { frequencyType: "yearly", frequencyDays: 365, label: "Yearly" };
    case "custom": {
      const num = parseInt(state.customNumber || "1", 10) || 1;
      const multiplier =
        state.customUnit === "weeks" ? 7 : state.customUnit === "months" ? 30 : 1;
      const days = num * multiplier;
      return {
        frequencyType: "custom",
        frequencyDays: days,
        label: `Every ${num} ${state.customUnit}`,
      };
    }
  }
}

export function RepeatPickerModal({ visible, onClose, onSelect }: RepeatPickerProps) {
  const [option, setOption] = useState<RepeatOption | null>(null);

  // Day of Week state
  const [selectedDays, setSelectedDays] = useState<boolean[]>(new Array(7).fill(false));

  // Day of Month state
  const [weekOfMonth, setWeekOfMonth] = useState(0); // 0=1st, 1=2nd, etc.
  const [dayOfWeekForMonth, setDayOfWeekForMonth] = useState(1); // 0=Sun..6=Sat, default Mon

  // Custom state
  const [customNumber, setCustomNumber] = useState("1");
  const [customUnit, setCustomUnit] = useState<typeof CUSTOM_UNITS[number]>("days");

  const reset = () => {
    setOption(null);
    setSelectedDays(new Array(7).fill(false));
    setWeekOfMonth(0);
    setDayOfWeekForMonth(1);
    setCustomNumber("1");
    setCustomUnit("days");
  };

  const handleConfirm = () => {
    if (!option) return;
    const result = computeDays(option, {
      selectedDays,
      weekOfMonth,
      dayOfWeekForMonth,
      customNumber,
      customUnit,
    });
    onSelect(result);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleDay = (index: number) => {
    const next = [...selectedDays];
    next[index] = !next[index];
    setSelectedDays(next);
  };

  const OPTIONS: { value: RepeatOption; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "day_of_week", label: "Day of Week" },
    { value: "monthly", label: "Monthly" },
    { value: "day_of_month", label: "Day of Month" },
    { value: "yearly", label: "Yearly" },
    { value: "custom", label: "Custom" },
  ];

  const needsSubOptions = option === "day_of_week" || option === "day_of_month" || option === "custom";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        className="flex-1 bg-black/40 justify-center items-center"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          className="bg-white rounded-2xl mx-6 p-5 w-[340px] max-h-[80%]"
        >
          <Text className="text-lg font-bold text-gray-900 mb-4">Repeat Frequency</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Main options */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => setOption(o.value)}
                  className={`px-4 py-2 rounded-xl border ${
                    option === o.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-medium ${option === o.value ? "text-white" : "text-gray-700"}`}
                  >
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day of Week sub-option */}
            {option === "day_of_week" && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Select Days</Text>
                <View className="flex-row gap-1.5 justify-between">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-full items-center justify-center border ${
                        selectedDays[i]
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          selectedDays[i] ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Day of Month sub-option */}
            {option === "day_of_month" && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Week of Month</Text>
                <View className="flex-row gap-2 mb-3">
                  {WEEK_OF_MONTH.map((label, i) => (
                    <TouchableOpacity
                      key={label}
                      onPress={() => setWeekOfMonth(i)}
                      className={`px-3 py-2 rounded-xl border ${
                        weekOfMonth === i
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          weekOfMonth === i ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-sm font-medium text-gray-700 mb-2">Day of Week</Text>
                <View className="flex-row gap-1.5 justify-between">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setDayOfWeekForMonth(i)}
                      className={`w-10 h-10 rounded-full items-center justify-center border ${
                        dayOfWeekForMonth === i
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          dayOfWeekForMonth === i ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Custom sub-option */}
            {option === "custom" && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Repeat Every</Text>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={customNumber}
                    onChangeText={setCustomNumber}
                    keyboardType="number-pad"
                    className="border border-gray-200 rounded-xl px-3 py-2 w-16 text-center text-base bg-white"
                    placeholder="1"
                  />
                  <View className="flex-row gap-2">
                    {CUSTOM_UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => setCustomUnit(unit)}
                        className={`px-3 py-2 rounded-xl border ${
                          customUnit === unit
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            customUnit === unit ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              onPress={handleClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
            >
              <Text className="text-gray-600 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!option}
              className={`flex-1 py-3 rounded-xl items-center ${
                option ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <Text className={`font-semibold ${option ? "text-white" : "text-gray-400"}`}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
