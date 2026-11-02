import { useState } from "react";
import { MAX_SUBS } from "../lib/subs.js";

// Editable list of subtask titles for the "new task" form and for recurring rules (every occurrence gets these subtasks).
// Sits inside forms, so Enter adds a line instead of submitting.
export default function SubDraft({ subs, onChange, repeating = true }) {
  const [text, setText] = useState("");
  const add = () => {
    const title = text.trim();
    if (!title || subs.length >= MAX_SUBS) return;
    onChange([...subs, title]);
    setText("");
  };
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--muted)]">{repeating ? "Subtasks (added to every occurrence)" : "Subtasks"}</p>
      {subs.length > 0 ? (
        <ul>
          {subs.map((s, i) => (
            <li key={i} className="flex min-h-9 items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{s}</span>
              <button
                type="button"
                aria-label={"Remove subtask: " + s}
                onClick={() => onChange(subs.filter((_, j) => j !== i))}
                className="link-btn !px-1.5"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Add subtask"
        aria-label="Add subtask"
        maxLength={200}
        enterKeyHint="done"
        className="h-9 w-full bg-transparent text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
      />
    </div>
  );
}
