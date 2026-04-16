import React, { useRef, useCallback, useEffect } from "react";
import { View, Text } from "react-native";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type FormatCommand = "bold" | "italic" | "underline" | "insertOrderedList" | "insertUnorderedList";

const TOOLBAR_ACTIONS: { command: FormatCommand; label: string; style?: React.CSSProperties }[] = [
  { command: "bold", label: "B", style: { fontWeight: 700 } },
  { command: "italic", label: "I", style: { fontStyle: "italic" } },
  { command: "underline", label: "U", style: { textDecorationLine: "underline" } },
  { command: "insertOrderedList", label: "1." },
  { command: "insertUnorderedList", label: "\u2022" },
];

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Add notes...",
  minHeight = 150,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Set initial content only once on mount
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value;
      initializedRef.current = true;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command: FormatCommand) => {
    // Save current selection
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!editor) return;

    // Ensure focus is in the editor
    editor.focus();

    // If no selection is inside the editor, place cursor at end
    if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    document.execCommand(command, false);
    handleInput();
  }, [handleInput]);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      )}

      <div style={webStyles.wrapper}>
        <style dangerouslySetInnerHTML={{ __html: `
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
        ` }} />
        {/* Toolbar */}
        <div style={webStyles.toolbar}>
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.command}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand(action.command);
              }}
              style={webStyles.toolbarButton}
            >
              <span style={{ ...webStyles.toolbarIcon, ...action.style }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder={placeholder}
          style={{
            ...webStyles.editor,
            minHeight,
          }}
        />
      </div>
    </View>
  );
}

const webStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  toolbar: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    height: 40,
    alignItems: "center",
    paddingLeft: 4,
    paddingRight: 4,
  },
  toolbarButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 10px",
    borderRadius: 4,
  },
  toolbarIcon: {
    fontSize: 16,
    fontWeight: 700,
    color: "#374151",
  },
  editor: {
    padding: 12,
    fontSize: 14,
    lineHeight: 1.5,
    color: "#1f2937",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    outline: "none",
  },
};

/** Convert plain text to simple HTML (for migrating existing notes) */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
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
