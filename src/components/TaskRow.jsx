import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  ListIcon,
  NoteIcon,
  RepeatIcon,
  StarIcon,
  TrashIcon,
} from "./Icons.jsx";
import { shortDate } from "../lib/dates.js";
import { liveSubs } from "../lib/subs.js";
import { useI18n } from "../i18n.jsx";

// Subtasks: shown when the task is tapped open. Ticking is quick here; adding, renaming and removing happen in Edit.
function Subtasks({ subs, onToggle }) {
  const { t } = useI18n();
  return (
    <ul className="pb-1.5 pl-[2.375rem] pr-1">
      {subs.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            role="checkbox"
            aria-checked={s.done}
            aria-label={
              (s.done ? t("common.markUndone") : t("common.markDone")) +
              s.title
            }
            onClick={() => onToggle(s.id)}
            className="-ml-2 flex min-h-9 w-[calc(100%+0.5rem)] items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-[var(--hover)]"
          >
            <span
              className={
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors " +
                (s.done
                  ? "done-icon border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "border-[var(--line-strong)] text-transparent")
              }
            >
              <CheckIcon />
            </span>
            <span
              className={
                "min-w-0 flex-1 break-words text-sm " +
                (s.done
                  ? "text-[var(--muted)] line-through opacity-60"
                  : "text-[var(--fg)]")
              }
            >
              {s.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Date heading: day on the left, count on the right; thin progress under
// Heading of a week on the main list: "This week  Nov 9 – 15 · Week 46 ........ 2/5"
export function WeekHead({ primary, secondary, count }) {
  return (
    <h2 className="flex items-baseline gap-2 px-1">
      <span className="text-sm font-semibold tracking-tight text-[var(--fg)]">{primary}</span>
      <span className="min-w-0 truncate text-xs text-[var(--muted)]">{secondary}</span>
      <span className="h-px flex-1 self-center bg-[var(--line)]" aria-hidden="true"></span>
      <span className="tabular shrink-0 text-xs text-[var(--muted)]">{count}</span>
    </h2>
  );
}

export function GroupHead({ primary, secondary, count, progress }) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <div className="pb-1">
      <h2 className="flex items-baseline gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fg)]">
          {primary}
        </span>
        {secondary ? (
          <span className="min-w-0 truncate text-xs text-[var(--muted)]">
            {secondary}
          </span>
        ) : null}
        <span className="flex-1" aria-hidden="true"></span>
        <span
          className={
            "tabular text-xs " +
            (allDone ? "text-[var(--accent)]" : "text-[var(--muted)]")
          }
        >
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

// Completion animation: the check pops, then the row slowly fades out and moves to the day's "Completed" area
const CHECK_MS = 450; // check pop + strike-through
const FADE_MS = 800; // slow fade + collapse
const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Heading of the per-day completed area
export function DoneHead({ count, open, onToggle }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-2 flex w-full items-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)]"
    >
      <span
        className={
          "inline-flex transition-transform " + (open ? "" : "-rotate-90")
        }
      >
        <ChevronIcon dir="down" />
      </span>
      {t("task.completed")}
      <span className="tabular">{count}</span>
    </button>
  );
}

const CONFIRM_MS = 5000;

// Tapping a task opens a framed info area (day, time, Edit, Delete). Edit opens the edit sheet.
function TaskRowBase({
  task,
  sortable,
  onToggle,
  onEdit,
  onOpen,
  onRemove,
  onToggleSub,
  onToggleStar,
  dateLabel,
}) {
  const { t } = useI18n();
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

  // "closed" | "open" (info + buttons) | "confirm" (asking "Delete?")
  const [mode, setMode] = useState("closed");
  const isOpen = mode !== "closed";
  const rootRef = useRef(null);
  const cancelRef = useRef(null);
  const delRef = useRef(null);
  const prevMode = useRef("closed");

  // A tap anywhere outside this task closes it. Listens to "click" (not "pointerdown"), so the list does not
  // shrink under the finger before the tap lands, and uses composedPath so Delete (which re-renders itself away)
  // still counts as inside.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      const inside =
        rootRef.current && e.composedPath().includes(rootRef.current);
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
    if (mode === "open" && prevMode.current === "confirm")
      delRef.current?.focus();
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
  const subs = useMemo(() => liveSubs(task.subs), [task.subs]);
  const subsDone = subs.filter((x) => x.done).length;

  const dragging = sortable && sortable.dragging;
  const cls =
    "relative text-sm my-0.5 " +
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
      <div className="flex min-h-[3.25rem] items-center gap-3 px-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={
            (checked ? t("common.markUndone") : t("common.markDone")) +
            task.title
          }
          onClick={handleToggle}
          className="group -mr-[11px] flex h-11 w-11 shrink-0 items-center justify-center self-center"
        >
          <span
            className={
              "flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-[1.5px] transition-colors " +
              (phase === "checking" ? "check-pop " : "") +
              (checked
                ? "done-icon border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_0_0_3px_var(--accent-soft)]"
                : "border-[var(--line-strong)] text-transparent group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-soft)]")
            }
          >
            <CheckIcon />
          </span>
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
          aria-label={
            t("task.details", { title: task.title }) +
            (task.time ? t("task.at", { time: task.time }) : "")
          }
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center self-stretch py-2"
        >
          <p
            className={
              "break-words text-base leading-snug transition-all duration-300 " +
              (checked
                ? "text-[var(--muted)] line-through opacity-60"
                : "text-[var(--fg)]")
            }
          >
            {task.title}
          </p>
          {task.time || dateLabel || task.ruleId || subs.length || task.note ? (
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
              {task.note ? (
                <span
                  className="inline-flex items-center"
                  role="img"
                  aria-label={t("task.hasNote")}
                  title={t("task.hasNote")}
                >
                  <NoteIcon />
                </span>
              ) : null}
              {subs.length ? (
                <span
                  className="inline-flex items-center gap-1"
                  title={t("common.subtasks")}
                >
                  <ListIcon />
                  {subsDone}/{subs.length}
                </span>
              ) : null}
              {task.ruleId ? (
                <span
                  className="inline-flex items-center"
                  role="img"
                  aria-label={t("task.recurring")}
                  title={t("task.recurring")}
                >
                  <RepeatIcon />
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        {isOpen || task.starred ? (
          <button
            type="button"
            aria-label={task.starred ? t("task.unstar") : t("task.star")}
            aria-pressed={Boolean(task.starred)}
            title={task.starred ? t("task.starredTitle") : t("task.starTitle")}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar?.(task.id);
            }}
            className={
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--hover)] " +
              (task.starred
                ? "text-[var(--star)]"
                : "text-[var(--muted)] hover:text-[var(--fg)]")
            }
          >
            <StarIcon filled={Boolean(task.starred)} />
          </button>
        ) : null}
      </div>

      {isOpen && task.note ? (
        <p className="task-in whitespace-pre-wrap break-words pb-2 pl-[2.375rem] pr-1 text-sm text-[var(--muted)]">
          {task.note}
        </p>
      ) : null}

      {isOpen && subs.length > 0 && onToggleSub && mode !== "confirm" ? (
        <div className="task-in">
          <Subtasks
            subs={subs}
            onToggle={(subId) => onToggleSub(task.id, subId)}
          />
        </div>
      ) : null}

      {isOpen ? (
        <div className="task-in flex items-center gap-3 pb-2.5 pl-4 pr-4">
          {mode === "confirm" ? (
            <div
              role="alertdialog"
              aria-label={t("task.confirmDeletion", { title: task.title })}
              className="flex w-full items-center gap-3"
            >
              <span className="min-w-0 flex-1 text-sm text-[var(--muted)]">
                {t("task.deleteQ")}
              </span>
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setMode("open")}
                className="link-btn"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => onRemove(task.id)}
                className="link-btn text-[var(--warn)] hover:text-[var(--warn)]"
              >
                {t("common.delete")}
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
                {t("common.edit")}
              </button>
              <button
                ref={delRef}
                type="button"
                onClick={() => setMode("confirm")}
                className="link-btn text-[var(--warn)] hover:text-[var(--warn)]"
              >
                {t("common.delete")}
              </button>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

// Rows re-render only when their own task (or the handlers, which App keeps stable) change
export const TaskRow = memo(TaskRowBase);
