import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronIcon, ClockIcon } from "./Icons.jsx";

// Date heading: the day on the left, "done/total" on the right
export function GroupHead({ primary, secondary, count }) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-[var(--line-strong)] pb-2 text-sm">
      <span className="font-medium">{primary}</span>
      {secondary ? (
        <span className="text-[var(--muted)]">{secondary}</span>
      ) : null}
      <span className="flex-1" aria-hidden="true"></span>
      <span className="tabular font-medium">{count}</span>
    </h2>
  );
}

// Completion animation: the check pops, then the row slowly fades out and moves to the day's "Tamamlananlar" area
const CHECK_MS = 450; // check pop + strike-through
const FADE_MS = 800; // slow fade + collapse
const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Heading of the per-day completed area
export function DoneHead({ count, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-3 flex w-full items-center gap-1.5 rounded-lg py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)]"
    >
      <span
        className={
          "inline-flex transition-transform " + (open ? "" : "-rotate-90")
        }
      >
        <ChevronIcon dir="down" />
      </span>
      Tamamlananlar
      <span className="tabular">{count}</span>
    </button>
  );
}

export function TaskRow({ task, sortable, onToggle, onOpen }) {
  // A long press (drag to reorder) or a move (scroll) must not open the editor
  const press = useRef(null);
  const trackPress = (e) => {
    press.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    if (sortable) sortable.onPointerDown(e);
  };
  const open = (e) => {
    const p = press.current;
    press.current = null;
    if (
      p &&
      (Date.now() - p.t > 300 ||
        Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8)
    )
      return;
    onOpen(task.id);
  };
  // "idle" | "checking" (check pops) | "fading" (row fades out, then the task is marked done)
  const [phase, setPhase] = useState("idle");
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleToggle = () => {
    // Un-completing, reduced motion, or a click during the animation (cancels it)
    if (phase !== "idle") {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setPhase("idle");
      return;
    }
    if (task.done || reduceMotion()) return onToggle(task.id);
    setPhase("checking");
    timers.current = [
      setTimeout(() => setPhase("fading"), CHECK_MS),
      setTimeout(() => onToggle(task.id), CHECK_MS + FADE_MS),
    ];
  };

  const checked = task.done || phase !== "idle";

  const dragging = sortable && sortable.dragging;
  const base =
    "relative -mx-2 flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-2 text-sm ";
  const cls =
    base +
    (dragging
      ? "z-10 border-[var(--line-strong)] bg-[var(--surface)] shadow-lg "
      : "border-transparent  ") +
    (phase === "fading" ? "task-out " : "") +
    (task.done ? "task-in " : "") +
    (sortable
      ? "select-none [-webkit-touch-callout:none] " +
        (sortable.active && !dragging
          ? "transition-transform duration-150"
          : "")
      : "");

  return (
    <li
      ref={sortable ? sortable.refCallback : undefined}
      style={
        phase === "fading"
          ? { animationDuration: FADE_MS + "ms" }
          : sortable
            ? sortable.style
            : undefined
      }
      onPointerDown={trackPress}
      onContextMenu={sortable ? sortable.onContextMenu : undefined}
      className={cls}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={
          (checked
            ? "Tamamlandı işaretini kaldır: "
            : "Tamamlandı olarak işaretle: ") + task.title
        }
        onClick={handleToggle}
        className={
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
          (phase === "checking" ? "check-pop " : "") +
          (checked
            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-[var(--line-strong)] text-transparent hover:border-[var(--accent)]")
        }
      >
        <CheckIcon />
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(task.id);
          }
        }}
        aria-label={"Düzenle: " + task.title + (task.time ? ", saat " + task.time : "")}
        className="min-w-0 flex-1 cursor-pointer self-stretch py-2.5"
      >
        <p
          className={
            "break-words text-[0.9375rem] transition-all duration-300 " +
            (checked
              ? "text-[var(--muted)] line-through opacity-60"
              : "text-[var(--fg)]")
          }
        >
          {task.title}
        </p>
        {task.time ? (
          <p
            className={
              "tabular mt-0.5 inline-flex items-center gap-1 text-xs font-medium " +
              (checked ? "text-[var(--muted)] opacity-60" : "text-[var(--accent)]")
            }
          >
            <ClockIcon />
            {task.time}
          </p>
        ) : null}
      </div>
    </li>
  );
}
