import React from "react";
import { View, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";

interface RichTextViewerProps {
  html: string;
  /** Approximate min height in pixels */
  minHeight?: number;
}

const WRAPPER_HTML = (body: string) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #374151;
    padding: 0;
    background: transparent;
  }
  p { margin-bottom: 8px; }
  ul, ol { padding-left: 20px; margin-bottom: 8px; }
  li { margin-bottom: 2px; }
  b, strong { font-weight: 600; }
</style>
</head>
<body>${body}</body>
</html>`;

/**
 * Renders HTML content. On native uses WebView, on web uses dangerouslySetInnerHTML.
 */
export function RichTextViewer({ html, minHeight = 40 }: RichTextViewerProps) {
  if (!html) return null;

  // Check if content is just plain text (no HTML tags)
  const isPlainText = !/<[a-z][\s\S]*>/i.test(html);
  if (isPlainText) {
    return <Text className="text-sm text-gray-700">{html}</Text>;
  }

  if (Platform.OS === "web") {
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

  return (
    <WebView
      source={{ html: WRAPPER_HTML(html) }}
      style={{ minHeight, backgroundColor: "transparent" }}
      scrollEnabled={false}
      originWhitelist={["*"]}
      showsVerticalScrollIndicator={false}
    />
  );
}
