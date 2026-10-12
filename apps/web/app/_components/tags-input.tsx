"use client";

import { X } from "lucide-react";
import { useState } from "react";

/** Tags without spaces: Enter, space or comma adds one, Backspace removes the last. */
export function TagsInput({ id, value, onChange }: { id: string; value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25">
      {value.map((tag) => (
        <span key={tag} className="inline-flex h-[26px] items-center gap-1 rounded-full bg-secondary pr-1 pl-2.5 text-[13px]">
          {tag}
          <button type="button" aria-label={`Remove tag ${tag}`} className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-foreground" onClick={() => onChange(value.filter((t) => t !== tag))}>
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => add(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length === 0 ? "geography" : "Add a tag"}
        className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
