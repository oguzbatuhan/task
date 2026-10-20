import { useEffect, useRef, useState } from "react";
import { CheckIcon, TrashIcon } from "./Icons.jsx";

// Date heading: with a divider line and the "done/total" count
export function GroupHead({ primary, secondary, count }) {
  return (
    <h2 className="mb-2 flex items-baseline gap-2">
      <span className="display text-base font-semibold">{primary}</span>
      {secondary ? <span className="text-sm text-[var(--muted)]">{secondary}</span> : null}
      <span className="h-px flex-1 self-center bg-[var(--line-strong)]" aria-hidden="true"></span>
      <span className="tabular text-sm text-[var(--muted)]">{count}</span>
    </h2>
  );
}

const CONFIRM_MS = 5000;

export function TaskRow({ task, sortable, onToggle, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef(null);
  const trashRef = useRef(null);
  const wasConfirming = useRef(false);

  // When confirmation is asked, focus moves to the safe option; if untouched it cancels itself
  useEffect(() => {
    if (confirming) {
      wasConfirming.current = true;
      if (cancelRef.current) cancelRef.current.focus();
      const id = setTimeout(() => setConfirming(false), CONFIRM_MS);
      return () => clearTimeout(id);
    }
    if (wasConfirming.current) {
      wasConfirming.current = false;
      if (trashRef.current) trashRef.current.focus();
    }
  }, [confirming]);

  const dragging = sortable && sortable.dragging;
  const base =
    "relative flex items-center gap-3 rounded-xl border bg-[var(--surface)] px-3 py-3 sm:px-4 ";
  const cls =
    base +
    (dragging
      ? "z-10 border-[var(--accent)] shadow-lg "
      : "border-[var(--line)] ") +
    (sortable
      ? "select-none [-webkit-touch-callout:none] " +
        (sortable.active && !dragging ? "transition-transform duration-150" : "")
      : "");

  if (confirming) {
    return (
      <li className={base + "border-[var(--warn)]"} role="alertdialog" aria-label={"Silme onayı: " + task.title}>
        <p className="min-w-0 flex-1 break-words text-base">
          <span className="font-semibold">Silinsin mi?</span>{" "}
          <span className="text-[var(--muted)]">{task.title}</span>
        </p>
        <button
          ref={cancelRef}
          type="button"
          onClick={() => setConfirming(false)}
          className="shrink-0 rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-sm font-semibold"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="shrink-0 rounded-lg bg-[var(--warn)] px-3 py-1.5 text-sm font-semibold text-[var(--bg)]"
        >
          Sil
        </button>
      </li>
    );
  }

  return (
    <li
      ref={sortable ? sortable.refCallback : undefined}
      style={sortable ? sortable.style : undefined}
      onPointerDown={sortable ? sortable.onPointerDown : undefined}
      onContextMenu={sortable ? sortable.onContextMenu : undefined}
      className={cls}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={(task.done ? "Tamamlandı işaretini kaldır: " : "Tamamlandı olarak işaretle: ") + task.title}
        onClick={() => onToggle(task.id)}
        className={
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all " +
          (task.done
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] opacity-40"
            : "border-[var(--line-strong)] text-transparent hover:border-[var(--accent)]")
        }
      >
        <CheckIcon />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={
            "break-words text-base transition-opacity " +
            (task.done ? "text-[var(--muted)] line-through opacity-50" : "text-[var(--fg)]")
          }
        >
          {task.title}
        </p>
      </div>
      <button
        ref={trashRef}
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={"Sil: " + task.title}
        className="shrink-0 rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--fg)]"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
