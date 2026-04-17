import React, { useRef, useCallback, useEffect } from "react";

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
      editorRef.current.innerHTML = value || "";
      initializedRef.current = true;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command: FormatCommand) => {
    const editor = editorRef.current;
    if (!editor) return;

    // If editor has no content, add a zero-width space so execCommand has
    // something to work with (browsers need a text node for list commands).
    if (!editor.textContent && editor.childNodes.length === 0) {
      editor.innerHTML = "\u200B";
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    document.execCommand(command, false);
    handleInput();
  }, [handleInput]);

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div style={webStyles.label}>{label}</div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .rte-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        .rte-editor ul, .rte-editor ol {
          padding-left: 20px;
          margin-bottom: 4px;
        }
        .rte-editor li {
          margin-bottom: 2px;
        }
      ` }} />

      <div style={webStyles.wrapper}>
        {/* Editable area */}
        <div
          className="rte-editor"
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

        {/* Toolbar at bottom — prevents pop-up conflicts when highlighting text */}
        <div style={webStyles.toolbar}>
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.command}
              type="button"
              onMouseDown={(e) => {
                // preventDefault keeps focus + selection inside the editor
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
      </div>
    </div>
  );
}

const webStyles: Record<string, React.CSSProperties> = {
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  wrapper: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  toolbar: {
    display: "flex",
    flexDirection: "row" as const,
    backgroundColor: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
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
