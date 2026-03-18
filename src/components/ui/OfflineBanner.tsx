import React from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-yellow-500 px-4 py-2">
      <Text className="text-white text-center text-sm font-medium">
        You're offline — showing cached data
      </Text>
    </View>
  );
}
