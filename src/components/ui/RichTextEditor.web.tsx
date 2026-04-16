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
  const savedSelectionRef = useRef<Range | null>(null);

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

  // Save selection whenever it changes inside the editor
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore saved selection
  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (savedSelectionRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
      return true;
    }
    return false;
  }, []);

  const execCommand = useCallback((command: FormatCommand) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Restore the saved selection (toolbar mousedown blurs the editor)
    editor.focus();
    const restored = restoreSelection();

    // If we couldn't restore a selection, place cursor at end
    if (!restored) {
      const sel = window.getSelection();
      if (sel) {
        // Ensure there's at least a text node to work with
        if (!editor.textContent && editor.childNodes.length === 0) {
          const br = document.createElement("br");
          editor.appendChild(br);
        }
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    document.execCommand(command, false);

    // Save the new selection position after the command
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }

    handleInput();
  }, [handleInput, restoreSelection]);

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
        {/* Toolbar */}
        <div style={webStyles.toolbar}>
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.command}
              type="button"
              onMouseDown={(e) => {
                // Prevent blur so selection stays in the editor
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

        {/* Editable area — pure HTML, no React Native View wrappers */}
        <div
          className="rte-editor"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={() => {
            saveSelection();
            handleInput();
          }}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onSelect={saveSelection}
          data-placeholder={placeholder}
          style={{
            ...webStyles.editor,
            minHeight,
          }}
        />
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
