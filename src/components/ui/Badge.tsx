import React from "react";
import { View, Text } from "react-native";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "due_today"
  | "due_tomorrow"
  | "due_soon";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  due_today: "bg-orange-100 text-orange-700",
  due_tomorrow: "bg-yellow-100 text-yellow-700",
  due_soon: "bg-green-100 text-green-700",
};

export function Badge({ label, variant = "default", size = "md" }: BadgeProps) {
  return (
    <View
      className={`rounded-full px-2 py-0.5 self-start ${variantClasses[variant]}`}
    >
      <Text
        className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"} ${variantClasses[variant].split(" ")[1]}`}
      >
        {label}
      </Text>
    </View>
  );
}
