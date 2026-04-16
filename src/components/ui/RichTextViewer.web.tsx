import React from "react";
import { View, Text } from "react-native";

interface RichTextViewerProps {
  html: string;
  minHeight?: number;
}

export function RichTextViewer({ html }: RichTextViewerProps) {
  if (!html) return null;

  const isPlainText = !/<[a-z][\s\S]*>/i.test(html);
  if (isPlainText) {
    return <Text className="text-sm text-gray-700">{html}</Text>;
  }

  return (
    <View>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: "#374151",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      />
    </View>
  );
}
