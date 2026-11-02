import { useState } from "react";
import { CheckIcon, CloseIcon, PlusIcon } from "./Icons.jsx";
import { MAX_SUBS, SUB_TITLE_MAX, addSub, liveSubs, removeSub, renameSub, toggleSub } from "../lib/subs.js";

// Subtask list inside the Edit dialog: tick, rename, remove and add. `subs` is the task's full list (removed ones
// stay inside it as tombstones so the removal syncs); only the live ones are shown.
// Sits inside a form, so Enter adds a subtask instead of submitting.
export default function SubtaskEditor({ subs, onChange }) {
  const [text, setText] = useState("");
  const live = liveSubs(subs);
  const full = live.length >= MAX_SUBS;
  const add = () => {
    if (!text.trim() || full) return;
    onChange(addSub(subs, text));
    setText("");
  };
  return (
    <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] px-3.5 py-2">
      <p className="mb-0.5 flex items-center text-xs text-[var(--muted)]">
        <span>Subtasks</span>
        {live.length ? <span className="tabular ml-auto">{live.filter((s) => s.done).length}/{live.length}</span> : null}
      </p>
      {live.length > 0 ? (
        <ul>
          {live.map((s) => (
            <li key={s.id} className="flex min-h-10 items-center gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={s.done}
                aria-label={(s.done ? "Mark as not completed: " : "Mark as completed: ") + s.title}
                onClick={() => onChange(toggleSub(subs, s.id))}
                className={
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors " +
                  (s.done
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "border-[var(--line-strong)] text-transparent hover:border-[var(--accent)]")
                }
              >
                <CheckIcon />
              </button>
              <input
                value={s.title}
                onChange={(e) => onChange(renameSub(subs, s.id, e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                maxLength={SUB_TITLE_MAX}
                aria-label="Subtask name"
                className={
                  "min-w-0 flex-1 bg-transparent py-1 text-sm outline-none " +
                  (s.done ? "text-[var(--muted)] line-through opacity-60" : "text-[var(--fg)]")
                }
              />
              <button
                type="button"
                aria-label={"Remove subtask: " + s.title}
                onClick={() => onChange(removeSub(subs, s.id))}
                className="icon-btn -mr-2 !h-8 !w-8"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--muted)] [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">
          <PlusIcon />
        </span>
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
          disabled={full}
          placeholder={full ? "Subtask limit reached" : "Add subtask"}
          aria-label="Add subtask"
          maxLength={SUB_TITLE_MAX}
          enterKeyHint="done"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
        />
      </div>
    </div>
  );
}
