import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const baseClasses = "flex-row items-center justify-center rounded-xl";

  const variantClasses = {
    primary: "bg-blue-600 active:bg-blue-700",
    secondary: "bg-gray-100 active:bg-gray-200",
    danger: "bg-red-500 active:bg-red-600",
    ghost: "bg-transparent active:bg-gray-100",
  };

  const sizeClasses = {
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "px-6 py-4",
  };

  const textClasses = {
    primary: "text-white font-semibold",
    secondary: "text-gray-800 font-semibold",
    danger: "text-white font-semibold",
    ghost: "text-blue-600 font-semibold",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled || loading ? "opacity-50" : ""} ${className ?? ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? "#fff" : "#374151"}
          size="small"
        />
      ) : (
        <Text className={`${textClasses[variant]} ${textSizeClasses[size]}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
