import React from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = "Search..." }: Props) {
  return (
    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2">
      <Text className="text-gray-400 mr-2">🔍</Text>
      <TextInput
        className="flex-1 text-sm text-gray-900"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-gray-400 text-base">✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
