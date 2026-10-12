import type { Editor } from "@tiptap/react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, expect, test } from "vitest";
import { FieldEditor } from "../app/_components/field-editor";

// ProseMirror measures layout that jsdom doesn't have.
beforeAll(() => {
  const rect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} });
  Range.prototype.getBoundingClientRect = rect as never;
  Range.prototype.getClientRects = (() => []) as never;
  Element.prototype.scrollIntoView = () => {};
  document.elementFromPoint = () => null;
});

afterEach(cleanup);

// The editor as the note editor uses it: its value feeds clozeValues.
function Harness({ onEditor, onValue }: { onEditor: (e: Editor) => void; onValue: (v: string) => void }) {
  const [value, setValue] = useState("Madrid is the capital of Spain.");
  return (
    <FieldEditor
      id="field-1"
      label="Text"
      value={value}
      onChange={(html) => {
        setValue(html);
        onValue(html);
      }}
      cloze
      clozeValues={[value]}
      onEditor={onEditor}
    />
  );
}

// Selects `word` in the editor's text.
function select(editor: Editor, word: string) {
  const text = editor.state.doc.textContent;
  const at = text.indexOf(word);
  // +1: positions count the paragraph's opening token.
  act(() => {
    editor.commands.setTextSelection({ from: at + 1, to: at + 1 + word.length });
  });
}

test("the Cloze button wraps the selection in the next cloze number", async () => {
  let editor: Editor | undefined;
  let value = "";
  render(<Harness onEditor={(e) => (editor = e)} onValue={(v) => (value = v)} />);
  await waitFor(() => expect(editor).toBeDefined());
  const button = screen.getByRole("button", { name: "[…] Cloze" });

  select(editor!, "Madrid");
  fireEvent.click(button);
  expect(value).toContain("{{c1::Madrid}}");

  select(editor!, "Spain");
  fireEvent.click(button);
  expect(value).toContain("{{c2::Spain}}");
  expect(value).toContain("{{c1::Madrid}} is the capital of {{c2::Spain}}.");
});
