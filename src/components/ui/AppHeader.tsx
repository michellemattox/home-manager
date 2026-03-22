import React from "react";
import { View, Text, Platform } from "react-native";
import Logo from "../../../assets/logo.svg";

// Font that best approximates Ananda Black across platforms.
// Ananda Black is a bold, slightly condensed display font.
const titleFont = Platform.select({
  ios: "Georgia",
  android: undefined, // falls back to system bold
  default: undefined,
});

interface AppHeaderProps {
  /** compact = thin bar shown on all tabs except Home */
  compact?: boolean;
}

export function AppHeader({ compact = false }: AppHeaderProps) {
  if (compact) {
    return (
      <View className="flex-row items-center px-4 py-2 bg-white border-b border-gray-100">
        <Logo width={30} height={30} style={{ marginRight: 10 }} />
        <Text
          numberOfLines={1}
          style={{
            color: "#4D86E3",
            fontWeight: "800",
            fontSize: 15,
            letterSpacing: 0.6,
            fontFamily: titleFont,
          }}
        >
          Mattox Family Home Management
        </Text>
      </View>
    );
  }

  // Large version for Home tab
  return (
    <View className="items-center pb-3 pt-2">
      <View className="flex-row items-center">
        <Logo width={60} height={60} style={{ marginRight: 12 }} />
        <View>
          <Text
            style={{
              color: "#4D86E3",
              fontWeight: "800",
              fontSize: 26,
              letterSpacing: 1,
              lineHeight: 30,
              fontFamily: titleFont,
            }}
          >
            Mattox Family
          </Text>
          <Text
            style={{
              color: "#4D86E3",
              fontWeight: "800",
              fontSize: 26,
              letterSpacing: 1,
              lineHeight: 30,
              fontFamily: titleFont,
            }}
          >
            Home Management
          </Text>
        </View>
      </View>
    </View>
  );
}
