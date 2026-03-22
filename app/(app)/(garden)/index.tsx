import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/ui/AppHeader";

export default function GardenScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F2FCEB]" edges={["top"]}>
      <AppHeader compact />
      <View className="px-4 py-3">
        <Text className="text-xl font-bold text-gray-900">Garden</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-5xl mb-4">🌱</Text>
        <Text className="text-lg font-semibold text-gray-700 text-center">Coming Soon</Text>
        <Text className="text-sm text-gray-400 mt-2 text-center">
          The Garden section is being planned. Check back soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}
