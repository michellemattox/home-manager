import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Platform } from "react-native";
import { format } from "date-fns";

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function parseDisplay(text: string): string | null {
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, m, d, y] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

interface DateInputProps {
  label?: string;
  value: string; // "" or "YYYY-MM-DD"
  onChange: (iso: string) => void;
  error?: string;
  hint?: string;
}

export function DateInput({ label, value, onChange, error, hint }: DateInputProps) {
  const [text, setText] = useState(() => (value ? isoToDisplay(value) : ""));
  const [showNativePicker, setShowNativePicker] = useState(false);

  useEffect(() => {
    setText(value ? isoToDisplay(value) : "");
  }, [value]);

  const handleTextChange = (t: string) => {
    setText(t);
    const iso = parseDisplay(t);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    if (value) setText(isoToDisplay(value));
    else setText("");
  };

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      )}
      <View
        className={`flex-row items-center bg-gray-50 border rounded-xl px-4 py-3 ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      >
        <TextInput
          className="flex-1 text-base text-gray-900"
          placeholderTextColor="#9ca3af"
          placeholder="MM/DD/YYYY"
          value={text}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          keyboardType="numbers-and-punctuation"
        />
        {Platform.OS === "web" ? (
          <WebCalendarButton value={value} onChange={(iso) => { onChange(iso); }} />
        ) : (
          <TouchableOpacity onPress={() => setShowNativePicker(true)} className="ml-2 p-1">
            <Text className="text-xl">📅</Text>
          </TouchableOpacity>
        )}
      </View>

      {showNativePicker && Platform.OS !== "web" && (
        <NativeDatePicker
          value={value}
          onChange={(iso) => { onChange(iso); setShowNativePicker(false); }}
          onDismiss={() => setShowNativePicker(false)}
        />
      )}

      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
      {hint && !error && <Text className="text-gray-400 text-sm mt-1">{hint}</Text>}
    </View>
  );
}

// Web: render a hidden <input type="date"> and trigger it on button press
function WebCalendarButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const inputRef = React.useRef<any>(null);
  return (
    <View style={{ position: "relative" }}>
      <TouchableOpacity
        className="ml-2 p-1"
        onPress={() => {
          if (inputRef.current) {
            inputRef.current.showPicker?.();
            inputRef.current.click?.();
          }
        }}
      >
        <Text className="text-xl">📅</Text>
      </TouchableOpacity>
      {/* @ts-ignore */}
      <input
        ref={inputRef}
        type="date"
        value={value || ""}
        onChange={(e: any) => {
          const iso = e.target.value;
          if (iso) onChange(iso);
        }}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />
    </View>
  );
}

// Native: lazy-require datetimepicker to avoid web bundle issues
function NativeDatePicker({
  value,
  onChange,
  onDismiss,
}: {
  value: string;
  onChange: (iso: string) => void;
  onDismiss: () => void;
}) {
  let DateTimePicker: any = null;
  try {
    DateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {
    return null;
  }
  const date = value ? new Date(value + "T12:00:00") : new Date();
  return (
    <DateTimePicker
      value={date}
      mode="date"
      display="default"
      onChange={(_: any, selectedDate?: Date) => {
        if (!selectedDate) { onDismiss(); return; }
        const iso = format(selectedDate, "yyyy-MM-dd");
        onChange(iso);
      }}
    />
  );
}
