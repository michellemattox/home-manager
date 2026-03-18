import React from "react";
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      )}
      <TextInput
        className={`bg-gray-50 border rounded-xl px-4 py-3 text-base text-gray-900 ${
          error ? "border-red-400" : "border-gray-200"
        } ${className ?? ""}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
      {hint && !error && (
        <Text className="text-gray-400 text-sm mt-1">{hint}</Text>
      )}
    </View>
  );
}
