import React from "react";
import { Platform, View, type ViewProps } from "react-native";

/**
 * Renders as <form> on web (fixes browser accessibility warnings
 * about password fields not being inside a form) and as <View> on native.
 */
interface WebFormProps extends ViewProps {
  children: React.ReactNode;
  onSubmit?: () => void;
}

export function WebForm({ children, onSubmit, style, ...props }: WebFormProps) {
  if (Platform.OS === "web") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        style={style as any}
      >
        {children}
      </form>
    );
  }
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}
