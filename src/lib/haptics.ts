import { Platform } from "react-native";

// Wrap expo-haptics so web doesn't throw
export async function impactLight() {
  if (Platform.OS === "web") return;
  const Haptics = require("expo-haptics");
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function notificationSuccess() {
  if (Platform.OS === "web") return;
  const Haptics = require("expo-haptics");
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
