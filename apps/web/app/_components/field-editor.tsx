"use client";

import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { clozeNumbers } from "card-templates";
import { Bold, Italic, Underline } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { cn } from "cn";

// Only what the API keeps: bold, italic, underline, paragraphs, line breaks.
const EXTENSIONS = [
  StarterKit.configure({
    blockquote: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    link: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    strike: false,
  }),
];

/**
 * Wraps the selection in the next cloze deletion, {{cN::...}}, keeping its
 * formatting. N is one more than the highest number in `allValues`.
 */
export function applyCloze(editor: Editor, allValues: string[]) {
  const n = Math.max(0, ...allValues.flatMap((v) => clozeNumbers(v))) + 1;
  const { from, to } = editor.state.selection;
  const open = `{{c${n}::`;
  editor
    .chain()
    .focus()
    // Close first, so inserting the opening marker doesn't shift `to`.
    .insertContentAt(to, "}}")
    .insertContentAt(from, open)
    .setTextSelection(from === to ? from + open.length : { from: from + open.length, to: to + open.length })
    .run();
}

/**
 * One rich-text field. `cloze` adds the Cloze action, numbered across
 * `clozeValues` (every field of the note).
 */
export function FieldEditor({
  id,
  label,
  value,
  onChange,
  cloze,
  clozeValues = [],
  onEditor,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  cloze?: boolean;
  clozeValues?: string[];
  /** For tests: hands back the editor instance once it exists. */
  onEditor?: (editor: Editor) => void;
}) {
  // The editor on screen. In development, Strict Mode mounts twice and the hook
  // can return the first, discarded instance; the last one created is live.
  const [live, setLive] = useState<Editor | null>(null);
  // Re-render the toolbar on every change, so its pressed states are current.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    immediatelyRender: false,
    onCreate: ({ editor: e }) => setLive(e),
    onTransaction: () => rerender(),
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        id,
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
        class: "min-h-[84px] px-3.5 py-3 text-[15px] leading-relaxed outline-none [&_p]:m-0",
      },
      handleKeyDown: (_view, event) => {
        if (cloze && event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
          event.preventDefault();
          const target = live ?? editor;
          if (target) applyCloze(target, clozeValues);
          return true;
        }
        return false;
      },
    },
  });

  const current = live ?? editor;

  useEffect(() => {
    if (current) onEditor?.(current);
  }, [current, onEditor]);

  const mark = (name: "bold" | "italic" | "underline") => current?.isActive(name) ?? false;
  const tool = "inline-flex h-7 min-w-[30px] items-center justify-center gap-1.5 rounded-md px-1.5 text-sm hover:bg-accent";

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25">
      <div role="toolbar" aria-label={`Format ${label}`} className="flex items-center gap-0.5 border-b bg-muted p-1">
        <button type="button" className={cn(tool, mark("bold") && "bg-secondary")} aria-label="Bold" aria-pressed={mark("bold")} onClick={() => current?.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </button>
        <button type="button" className={cn(tool, mark("italic") && "bg-secondary")} aria-label="Italic" aria-pressed={mark("italic")} onClick={() => current?.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </button>
        <button type="button" className={cn(tool, mark("underline") && "bg-secondary")} aria-label="Underline" aria-pressed={mark("underline")} onClick={() => current?.chain().focus().toggleUnderline().run()}>
          <Underline className="size-4" />
        </button>
        {cloze ? (
          <>
            <span className="mx-1 h-[18px] w-px bg-border" aria-hidden="true" />
            <button
              type="button"
              className={cn(tool, "font-medium")}
              aria-keyshortcuts="Control+Shift+C Meta+Shift+C"
              onClick={() => current && applyCloze(current, clozeValues)}
            >
              […] Cloze
            </button>
          </>
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
