import React from "react";
import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${className ?? ""}`}
      {...props}
    >
      {children}
    </View>
  );
}
