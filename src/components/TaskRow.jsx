import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronIcon, ClockIcon, RepeatIcon, TrashIcon } from "./Icons.jsx";
import { shortDate } from "../lib/dates.js";

// Date heading: day on the left, count on the right; thin progress under
export function GroupHead({ primary, secondary, count, progress }) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <div className="pb-2">
      <h2 className="flex items-baseline gap-2 text-sm">
        <span className="font-medium">{primary}</span>
        {secondary ? (
          <span className="min-w-0 truncate text-[var(--muted)]">{secondary}</span>
        ) : null}
        <span className="flex-1" aria-hidden="true"></span>
        <span className={"tabular text-sm " + (allDone ? "text-[var(--accent)]" : "text-[var(--muted)]")}>
          {count}
        </span>
      </h2>
      {total > 0 ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: pct + "%", opacity: allDone ? 1 : 0.8 }}
          />
        </div>
      ) : null}
    </div>
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
      className="mt-2 flex w-full items-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)]"
    >
      <span className={"inline-flex transition-transform " + (open ? "" : "-rotate-90")}>
        <ChevronIcon dir="down" />
      </span>
      Tamamlananlar
      <span className="tabular">{count}</span>
    </button>
  );
}

const CONFIRM_MS = 5000;

// Tapping a task opens a framed info area (day, time, Düzenle, Sil). Düzenle opens the edit sheet.
export function TaskRow({ task, sortable, onToggle, onEdit, onOpen, onRemove, dateLabel }) {
  // onOpen: old prop name, so an App.jsx that was not updated still opens the editor
  const edit = onEdit || onOpen;
  // A long press (drag to reorder) or a move (scroll) must not open the info area
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
    setMode((m) => (m === "closed" ? "open" : "closed"));
  };

  // "closed" | "open" (info + buttons) | "confirm" (asking "Silinsin mi?")
  const [mode, setMode] = useState("closed");
  const isOpen = mode !== "closed";
  const rootRef = useRef(null);
  const cancelRef = useRef(null);
  const delRef = useRef(null);
  const prevMode = useRef("closed");

  // A tap anywhere outside this task closes it. Listens to "click" (not "pointerdown"), so the list does not
  // shrink under the finger before the tap lands, and uses composedPath so Sil (which re-renders itself away)
  // still counts as inside.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      const inside = rootRef.current && e.composedPath().includes(rootRef.current);
      if (!inside) setMode("closed");
    };
    document.addEventListener("click", onDown);
    return () => document.removeEventListener("click", onDown);
  }, [isOpen]);

  // Confirmation: focus the safe option; if untouched it goes back to "open"
  useEffect(() => {
    if (mode === "confirm") {
      cancelRef.current?.focus();
      const id = setTimeout(() => setMode("open"), CONFIRM_MS);
      return () => clearTimeout(id);
    }
    if (mode === "open" && prevMode.current === "confirm") delRef.current?.focus();
  }, [mode]);
  useEffect(() => {
    prevMode.current = mode;
  });

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
  const cls =
    "relative text-sm " +
    (dragging
      ? "z-10 rounded-lg bg-[var(--surface)] shadow-md "
      : isOpen
        ? "rounded-lg bg-[var(--hover)] "
        : "rounded-lg hover:bg-[var(--hover)] ") +
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
      ref={(n) => {
        rootRef.current = n;
        if (sortable) sortable.refCallback(n);
      }}
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
      <div className="flex min-h-12 items-center gap-3 px-1">
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
            setMode((m) => (m === "closed" ? "open" : "closed"));
          }
        }}
        aria-expanded={isOpen}
        aria-label={"Ayrıntılar: " + task.title + (task.time ? ", saat " + task.time : "")}
        className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center self-stretch py-2"
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
        {task.time || dateLabel || task.ruleId ? (
          <p
            className={
              "tabular mt-0.5 inline-flex items-center gap-1.5 self-start text-xs font-medium " +
              (checked
                ? "text-[var(--muted)] opacity-60"
                : dateLabel
                  ? "text-[var(--warn)]"
                  : "text-[var(--accent)]")
            }
          >
            {dateLabel ? <span>{dateLabel}</span> : null}
            {task.time ? (
              <span className="inline-flex items-center gap-1">
                <ClockIcon />
                {task.time}
              </span>
            ) : null}
            {task.ruleId ? (
              <span className="inline-flex items-center" role="img" aria-label="Tekrarlayan görev" title="Tekrarlayan görev">
                <RepeatIcon />
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      </div>

      {isOpen ? (
        <div className="task-in flex items-center gap-3 pb-2.5 pl-9 pr-1">
          {mode === "confirm" ? (
            <div role="alertdialog" aria-label={"Silme onayı: " + task.title} className="flex w-full items-center gap-3">
              <span className="min-w-0 flex-1 text-sm text-[var(--muted)]">Silinsin mi?</span>
              <button ref={cancelRef} type="button" onClick={() => setMode("open")} className="link-btn">
                Vazgeç
              </button>
              <button type="button" onClick={() => onRemove(task.id)} className="link-btn text-[var(--warn)] hover:text-[var(--warn)]">
                Sil
              </button>
            </div>
          ) : (
            <>
              <span className="tabular min-w-0 flex-1 truncate text-xs text-[var(--muted)]">
                {shortDate(task.date)}
                {task.time ? " · " + task.time : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode("closed");
                  edit(task.id);
                }}
                className="link-btn"
              >
                Düzenle
              </button>
              <button
                ref={delRef}
                type="button"
                onClick={() => setMode("confirm")}
                className="link-btn text-[var(--warn)] hover:text-[var(--warn)]"
              >
                Sil
              </button>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
