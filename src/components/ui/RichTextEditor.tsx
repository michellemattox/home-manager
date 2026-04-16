import React, { useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Add notes...",
  minHeight = 150,
}: RichTextEditorProps) {
  const editorRef = useRef<RichEditor>(null);

  const handleChange = useCallback(
    (html: string) => {
      onChange(html);
    },
    [onChange]
  );

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      )}

      <View className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <RichToolbar
          editor={editorRef}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertOrderedList,
            actions.insertBulletsList,
          ]}
          iconMap={{
            [actions.setBold]: () => (
              <Text style={styles.toolbarIcon}>B</Text>
            ),
            [actions.setItalic]: () => (
              <Text style={[styles.toolbarIcon, { fontStyle: "italic" }]}>I</Text>
            ),
            [actions.setUnderline]: () => (
              <Text style={[styles.toolbarIcon, { textDecorationLine: "underline" }]}>U</Text>
            ),
            [actions.insertOrderedList]: () => (
              <Text style={styles.toolbarIcon}>1.</Text>
            ),
            [actions.insertBulletsList]: () => (
              <Text style={styles.toolbarIcon}>&#8226;</Text>
            ),
          }}
          style={styles.toolbar}
          selectedIconTint="#2563eb"
          iconTint="#6b7280"
        />
        <RichEditor
          ref={editorRef}
          initialContentHTML={value}
          onChange={handleChange}
          placeholder={placeholder}
          editorStyle={{
            backgroundColor: "#ffffff",
            color: "#1f2937",
            placeholderColor: "#9ca3af",
            contentCSSText: `
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              padding: 8px;
            `,
          }}
          initialHeight={minHeight}
          useContainer={true}
          pasteAsPlainText={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    height: 40,
  },
  toolbarIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
});

/** Convert plain text to simple HTML (for migrating existing notes) */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  // If already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  // Convert newlines to <br> and wrap in <p>
  return text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Strip HTML tags for preview/plain text display */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
