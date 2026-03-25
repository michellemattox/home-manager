import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#d1d5db",
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton that mimics a PlotCard / generic list card
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          backgroundColor: "white",
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        },
        style,
      ]}
    >
      {/* Header strip */}
      <View style={{ backgroundColor: "#d1fae5", padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Skeleton width="45%" height={14} borderRadius={6} />
        <Skeleton width={40} height={22} borderRadius={8} />
      </View>
      {/* Body */}
      <View style={{ padding: 14, gap: 8 }}>
        <Skeleton width="75%" height={12} borderRadius={6} />
        <Skeleton width="50%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

// Compact skeleton for list rows (tasks, pests, ideas, etc.)
export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          backgroundColor: "white",
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        },
        style,
      ]}
    >
      <Skeleton width={40} height={40} borderRadius={10} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={13} borderRadius={6} />
        <Skeleton width="40%" height={11} borderRadius={6} />
      </View>
    </View>
  );
}
