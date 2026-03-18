import React from "react";
import { View, Text } from "react-native";
import type { HouseholdMember } from "@/types/app.types";

interface MemberAvatarProps {
  member: HouseholdMember;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const sizeMap = {
  sm: { container: "w-6 h-6", text: "text-xs" },
  md: { container: "w-8 h-8", text: "text-sm" },
  lg: { container: "w-12 h-12", text: "text-base" },
};

export function MemberAvatar({
  member,
  size = "md",
  showName,
}: MemberAvatarProps) {
  const initials = member.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { container, text } = sizeMap[size];

  return (
    <View className="items-center">
      <View
        className={`${container} rounded-full items-center justify-center`}
        style={{ backgroundColor: member.color_hex }}
      >
        <Text className={`${text} font-bold text-white`}>{initials}</Text>
      </View>
      {showName && (
        <Text className="text-xs text-gray-500 mt-1">{member.display_name}</Text>
      )}
    </View>
  );
}

interface MemberAvatarGroupProps {
  members: HouseholdMember[];
  max?: number;
  size?: "sm" | "md";
}

export function MemberAvatarGroup({
  members,
  max = 3,
  size = "sm",
}: MemberAvatarGroupProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <View className="flex-row">
      {visible.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <MemberAvatar member={m} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          className={`${sizeMap[size].container} rounded-full bg-gray-200 items-center justify-center`}
          style={{ marginLeft: -8 }}
        >
          <Text className={`${sizeMap[size].text} text-gray-600 font-medium`}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
