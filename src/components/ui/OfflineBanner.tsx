import React from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable is null on web (not measurable via browser API),
      // so only treat the connection as offline when isConnected is explicitly false.
      setIsOffline(state.isConnected === false);
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
