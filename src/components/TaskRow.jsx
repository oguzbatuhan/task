import { useEffect, useRef, useState } from "react";
import { CheckIcon, TrashIcon } from "./Icons.jsx";

// Date heading: the day on the left, "done/total" on the right
export function GroupHead({ primary, secondary, count }) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-[var(--line-strong)] pb-2 text-sm">
      <span className="font-medium">{primary}</span>
      {secondary ? <span className="text-[var(--muted)]">{secondary}</span> : null}
      <span className="flex-1" aria-hidden="true"></span>
      <span className="tabular font-medium">{count}</span>
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
  const base = "relative -mx-2 flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-2 text-sm ";
  const cls =
    base +
    (dragging
      ? "z-10 border-[var(--line-strong)] bg-[var(--surface)] shadow-lg "
      : "border-transparent after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-[var(--line)] last:after:hidden ") +
    (sortable
      ? "select-none [-webkit-touch-callout:none] " +
        (sortable.active && !dragging ? "transition-transform duration-150" : "")
      : "");

  if (confirming) {
    return (
      <li className={base + "border-transparent"} role="alertdialog" aria-label={"Silme onayı: " + task.title}>
        <p className="min-w-0 flex-1 break-words">
          Silinsin mi? <span className="text-[var(--muted)]">{task.title}</span>
        </p>
        <button ref={cancelRef} type="button" onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">
          Vazgeç
        </button>
        <button type="button" onClick={() => onRemove(task.id)} className="btn btn-warn btn-sm">
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
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
          (task.done
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-[var(--line-strong)] text-transparent hover:border-[var(--accent)]")
        }
      >
        <CheckIcon />
      </button>
      <p
        className={
          "min-w-0 flex-1 break-words text-[0.9375rem] transition-opacity " +
          (task.done ? "text-[var(--muted)] line-through opacity-60" : "text-[var(--fg)]")
        }
      >
        {task.title}
      </p>
      <button
        ref={trashRef}
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={"Sil: " + task.title}
        className="icon-btn"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
