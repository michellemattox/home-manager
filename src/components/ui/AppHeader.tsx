import React from "react";
import { View, Text } from "react-native";
import Logo from "../../../assets/logo.svg";

const TITLE_FONT = "Lobster_400Regular";

interface AppHeaderProps {
  /** compact = thin bar shown on all tabs except Home */
  compact?: boolean;
}

export function AppHeader({ compact = false }: AppHeaderProps) {
  if (compact) {
    return (
      <View className="flex-row items-center px-4 py-2">
        <Logo width={30} height={30} style={{ marginRight: 10 }} />
        <Text
          numberOfLines={1}
          style={{
            color: "#FC9853",
            fontFamily: TITLE_FONT,
            fontSize: 15,
            letterSpacing: 0.4,
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
              color: "#FC9853",
              fontFamily: TITLE_FONT,
              fontSize: 26,
              letterSpacing: 0.5,
              lineHeight: 32,
            }}
          >
            Mattox Family
          </Text>
          <Text
            style={{
              color: "#FC9853",
              fontFamily: TITLE_FONT,
              fontSize: 26,
              letterSpacing: 0.5,
              lineHeight: 32,
            }}
          >
            Home Management
          </Text>
        </View>
      </View>
    </View>
  );
}
