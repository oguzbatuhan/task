import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpIcon,
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  NoteIcon,
  PlusIcon,
  RepeatIcon,
} from "./Icons.jsx";
import DayPicker from "./DayPicker.jsx";
import SubDraft from "./SubDraft.jsx";
import { describeDays } from "../lib/repeat.js";
import { relativeName, shiftIso, shortDate } from "../lib/dates.js";
import { parseQuick } from "../lib/quickadd.js";

// Minimal tool buttons: icon only when unset, icon + value when set
const tool =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full text-[0.8125rem] font-medium transition-colors ";
const toolOff =
  "w-9 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)] active:bg-[var(--hover)]";
const toolOn = "bg-[var(--accent-soft)] px-2.5 text-[var(--fg)]";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];
const PRESETS = ["09:00", "12:00", "14:00", "18:00", "20:00", "21:30"];

// Mobile-friendly time sheet (avoids broken native time pickers on phones)
function TimeSheet({ value, onChange, onClose }) {
  const [h, setH] = useState((value || "09:00").slice(0, 2));
  const [m, setM] = useState((value || "09:00").slice(3, 5) || "00");
  const openedAt = useRef(Date.now());

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const apply = (hh, mm) => {
    onChange(hh + ":" + mm);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && Date.now() - openedAt.current > 300)
          onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pick a time"
        className="w-full max-w-md rounded-t-[1.25rem] border border-[var(--line)] bg-[var(--surface-elevated)] px-5 pt-4 shadow-2xl sm:rounded-[1.25rem]"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Time</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="icon-btn"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => apply(p.slice(0, 2), p.slice(3))}
              className={
                "tabular h-9 rounded-full border px-3 text-sm " +
                (value === p
                  ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "border-[var(--line-strong)] text-[var(--muted)]")
              }
            >
              {p}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Hour
            <div className="relative">
              <select
                value={h}
                onChange={(e) => setH(e.target.value)}
                className="cursor-pointer h-11 w-full appearance-none rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] pl-3 pr-9 text-base text-[var(--fg)]"
              >
                {HOURS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
              </svg>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Minute
            <div className="relative">
              <select
                value={MINS.includes(m) ? m : "00"}
                onChange={(e) => setM(e.target.value)}
                className="cursor-pointer h-11 w-full appearance-none rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] pl-3 pr-9 text-base text-[var(--fg)]"
              >
                {MINS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
              </svg>
            </div>
          </label>
        </div>

        <div className="flex gap-2 pb-1">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                onClose();
              }}
              className="btn btn-ghost flex-1"
            >
              Remove time
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => apply(h, MINS.includes(m) ? m : "00")}
            className="btn btn-solid flex-1"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Height of the on-screen keyboard (0 when closed), so the bottom dock rides above it on phones
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setInset(
        Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)),
      );
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

export default function Composer({ today, onAdd }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [days, setDays] = useState([]);
  const [count, setCount] = useState(0); // 0 = repeats forever, otherwise ends after this many times
  // Details: a description and subtasks (for a repeating task, every occurrence starts with them)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [subs, setSubs] = useState([]);
  const repeating = days.length > 0;
  const setRepeat = (d, n) => {
    setDays(d);
    setCount(n);
  };
  const [timeOpen, setTimeOpen] = useState(false);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const kb = useKeyboardInset();
  const dateRef = useRef(null);
  const tomorrow = shiftIso(today, 1);
  const empty = !title.trim();

  // Live quick-add: "tomorrow 14:30 report" lights up the day and time right while typing
  const quick = useMemo(
    () => (empty ? null : parseQuick(title, today, tomorrow)),
    [title, empty, today, tomorrow],
  );
  const effDate = quick?.date || date;
  const effTime = quick?.time || time;
  const custom = effDate !== today && effDate !== tomorrow;

  useEffect(() => setDate(today), [today]);

  // The dock stays compact (just the input) until it is used; a tap outside folds it back
  useEffect(() => {
    if (!focused) return;
    const onDown = (e) => {
      if (formRef.current && !e.composedPath().includes(formRef.current))
        setFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [focused]);

  function submit(e) {
    e?.preventDefault();
    const text = title.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    onAdd(quick.title, effDate, effTime, days, count, subs, note);
    reset();
    // blur so mobile keyboard closes after add
    inputRef.current?.blur();
    setFocused(false);
  }

  function reset() {
    setTitle("");
    setDate(today);
    setTime("");
    setNote("");
    setSubs([]);
    setDetailsOpen(false);
    setRepeat([], 0);
    setRepeatOpen(false);
  }

  function clearExtras() {
    setDate(today);
    setTime("");
    setNote("");
    setSubs([]);
    setDetailsOpen(false);
    setRepeat([], 0);
    setRepeatOpen(false);
  }

  const hasDetails = !!note.trim() || subs.length > 0;
  const hasExtras = date !== today || !!time || repeating || hasDetails;
  const dayBtn = (on) =>
    "h-8 rounded-full px-3 text-[0.8125rem] font-medium transition-colors " +
    (on
      ? "bg-[var(--fg)] text-[var(--bg)]"
      : "text-[var(--muted)] hover:text-[var(--fg)]");

  const expanded =
    focused || !empty || hasExtras || repeatOpen || detailsOpen || timeOpen;

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // Tabbing out of the dock folds it (taps are handled by the pointerdown listener above)
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget))
          setFocused(false);
      }}
      className="pointer-events-none fixed inset-x-0 z-30"
      style={{
        bottom: kb,
        paddingLeft: "max(12px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(12px, env(safe-area-inset-right, 0px))",
        paddingBottom:
          kb > 0 ? "8px" : "max(12px, env(safe-area-inset-bottom, 0px))",
        paddingTop: "28px",
        background: "linear-gradient(to top, var(--bg) 55%, transparent)",
      }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-elevated)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        {repeatOpen || detailsOpen ? (
          <div className="max-h-[48dvh] overflow-y-auto overscroll-contain">
            {repeatOpen ? (
              <div className="task-in border-b border-[var(--line)] p-4">
                <DayPicker days={days} count={count} onChange={setRepeat} />
                {repeating ? (
                  <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                    {(effDate > tomorrow
                      ? "Starts on " + shortDate(effDate) + ". "
                      : "") +
                      "Only shown for today and tomorrow; later days are added when they come up."}
                  </p>
                ) : null}
              </div>
            ) : null}
            {detailsOpen ? (
              <div className="task-in border-b border-[var(--line)] p-4">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  aria-label="Description"
                  placeholder="Description (optional)"
                  className="w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-base text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] sm:text-[0.9375rem]"
                />
                <div className="mt-2.5">
                  <SubDraft
                    subs={subs}
                    onChange={setSubs}
                    repeating={repeating}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2 py-1.5 pl-4 pr-1.5">
          <span aria-hidden="true" className="shrink-0 text-[var(--muted)]">
            <PlusIcon />
          </span>
          <input
            ref={inputRef}
            id="composer-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (title || hasExtras) reset();
                e.currentTarget.blur();
                setFocused(false);
              }
            }}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="done"
            aria-label="New task"
            placeholder="Add a task…"
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="submit"
            aria-label="Add task"
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition-all active:scale-95 sm:h-10 sm:w-10 " +
              (empty ? "opacity-0 pointer-events-none scale-90" : "opacity-100")
            }
            tabIndex={empty ? -1 : 0}
          >
            <ArrowUpIcon />
          </button>
        </div>

        {expanded ? (
          <div className="task-in flex items-center gap-1 border-t border-[var(--line)] px-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mr-1 flex shrink-0 items-center rounded-full bg-[var(--surface)] p-0.5 ring-1 ring-[var(--line)]">
                <button
                  type="button"
                  aria-pressed={effDate === today}
                  onClick={() => setDate(today)}
                  className={dayBtn(effDate === today)}
                >
                  Today
                </button>
                <button
                  type="button"
                  aria-pressed={effDate === tomorrow}
                  onClick={() => setDate(tomorrow)}
                  className={dayBtn(effDate === tomorrow)}
                >
                  Tomorrow
                </button>
              </div>
              <button
                type="button"
                aria-label="Pick a date"
                onClick={() => {
                  const el = dateRef.current;
                  if (!el) return;
                  try {
                    el.showPicker();
                  } catch {
                    el.click();
                  }
                }}
                className={tool + (custom ? toolOn : toolOff)}
              >
                <CalendarIcon />
                {custom ? (
                  <span className="whitespace-nowrap">
                    {relativeName(effDate, today) || shortDate(effDate)}
                  </span>
                ) : null}
              </button>
              {/* Native date input kept off-layout for picker API */}
              <input
                ref={dateRef}
                type="date"
                value={effDate}
                min={today}
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />
              <button
                type="button"
                aria-label="Set a time"
                onClick={() => setTimeOpen(true)}
                className={tool + (effTime ? toolOn : toolOff)}
              >
                <ClockIcon />
                {effTime ? (
                  <span className="tabular whitespace-nowrap">{effTime}</span>
                ) : null}
              </button>
              <button
                type="button"
                aria-label="Repeat"
                aria-expanded={repeatOpen}
                onClick={() => setRepeatOpen((o) => !o)}
                className={
                  tool +
                  (repeating
                    ? toolOn
                    : repeatOpen
                      ? "w-9 bg-[var(--hover)] text-[var(--fg)]"
                      : toolOff)
                }
              >
                <RepeatIcon />
                {repeating ? (
                  <span className="max-w-[9rem] truncate whitespace-nowrap">
                    {describeDays(days) + (count ? " ×" + count : "")}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                aria-label="Details"
                aria-expanded={detailsOpen}
                onClick={() => setDetailsOpen((o) => !o)}
                className={
                  tool +
                  (hasDetails
                    ? toolOn
                    : detailsOpen
                      ? "w-9 bg-[var(--hover)] text-[var(--fg)]"
                      : toolOff)
                }
              >
                <NoteIcon />
                {hasDetails ? (
                  <span className="tabular whitespace-nowrap">
                    {(note.trim() ? 1 : 0) + subs.length}
                  </span>
                ) : null}
              </button>
            </div>
            {hasExtras ? (
              <button
                type="button"
                onClick={clearExtras}
                className="shrink-0 rounded-full px-2.5 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
              >
                Reset
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {timeOpen
        ? createPortal(
            <TimeSheet
              value={effTime}
              onChange={setTime}
              onClose={() => setTimeOpen(false)}
            />,
            document.body,
          )
        : null}
    </form>
  );
}
