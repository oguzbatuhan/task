import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ClockIcon, CloseIcon, PlusIcon, RepeatIcon } from "./Icons.jsx";
import DayPicker from "./DayPicker.jsx";
import { describeDays } from "../lib/repeat.js";
import { relativeName, shiftIso, shortDate } from "../lib/dates.js";
import { parseQuick } from "../lib/quickadd.js";

const chip =
  "relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ";
const chipOff =
  "border-[var(--line-strong)] text-[var(--muted)] active:bg-[var(--hover)] hover:bg-[var(--hover)] hover:text-[var(--fg)]";
const chipOn =
  "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
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
        if (e.target === e.currentTarget && Date.now() - openedAt.current > 300) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Saat seç"
        className="w-full max-w-md rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] px-5 pt-4 shadow-2xl sm:rounded-3xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Saat</h3>
          <button type="button" onClick={onClose} aria-label="Kapat" className="icon-btn">
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
            Saat
            <select
              value={h}
              onChange={(e) => setH(e.target.value)}
              className="h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] px-3 text-base text-[var(--fg)]"
            >
              {HOURS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Dakika
            <select
              value={MINS.includes(m) ? m : "00"}
              onChange={(e) => setM(e.target.value)}
              className="h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] px-3 text-base text-[var(--fg)]"
            >
              {MINS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
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
              Saati kaldır
            </button>
          ) : null}
          <button type="button" onClick={() => apply(h, MINS.includes(m) ? m : "00")} className="btn btn-solid flex-1">
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Composer({ today, onAdd }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [days, setDays] = useState([]);
  const [timeOpen, setTimeOpen] = useState(false);
  const inputRef = useRef(null);
  const dateRef = useRef(null);
  const tomorrow = shiftIso(today, 1);
  const custom = date !== today && date !== tomorrow;
  const empty = !title.trim();

  useEffect(() => setDate(today), [today]);

  function submit(e) {
    e.preventDefault();
    const text = title.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    const q = parseQuick(text, today, tomorrow);
    onAdd(q.title, q.date || date, q.time || time, days);
    setTitle("");
    setTime("");
    setDays([]);
    setRepeatOpen(false);
    setDate(today);
    // blur so mobile keyboard closes after add
    inputRef.current?.blur();
  }

  function clearExtras() {
    setDate(today);
    setTime("");
    setDays([]);
    setRepeatOpen(false);
  }

  const hasExtras = date !== today || !!time || days.length > 0;

  return (
    <form onSubmit={submit} className="mb-5">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] py-1 pl-4 pr-1 transition-colors focus-within:border-[var(--accent)]">
        <input
          ref={inputRef}
          id="composer-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Yeni görev"
          placeholder="Görev ekle…"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[0.9375rem] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          aria-label="Görevi ekle"
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition-opacity " +
            (empty ? "opacity-35" : "active:opacity-80")
          }
        >
          <PlusIcon />
        </button>
      </div>

      {/* Options always visible — more reliable on mobile than focus-gated chips */}
      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setDate(today)}
          className={"shrink-0 " + chip + (date === today ? chipOn : chipOff)}
        >
          Bugün
        </button>
        <button
          type="button"
          onClick={() => setDate(tomorrow)}
          className={"shrink-0 " + chip + (date === tomorrow ? chipOn : chipOff)}
        >
          Yarın
        </button>
        <button
          type="button"
          onClick={() => {
            const el = dateRef.current;
            if (!el) return;
            try {
              el.showPicker();
            } catch {
              el.click();
            }
          }}
          className={"shrink-0 " + chip + (custom ? chipOn : chipOff)}
        >
          <CalendarIcon />
          <span className="whitespace-nowrap">
            {custom ? relativeName(date, today) || shortDate(date) : "Tarih"}
          </span>
        </button>
        {/* Native date input kept off-layout for picker API */}
        <input
          ref={dateRef}
          type="date"
          value={date}
          min={today}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
        <button
          type="button"
          onClick={() => setTimeOpen(true)}
          className={"shrink-0 " + chip + (time ? chipOn : chipOff)}
        >
          <ClockIcon />
          <span className="tabular whitespace-nowrap">{time || "Saat"}</span>
        </button>
        <button
          type="button"
          aria-expanded={repeatOpen}
          onClick={() => setRepeatOpen((o) => !o)}
          className={"shrink-0 " + chip + (days.length || repeatOpen ? chipOn : chipOff)}
        >
          <RepeatIcon />
          <span className="max-w-[9rem] truncate whitespace-nowrap">
            {days.length ? describeDays(days) : "Tekrar"}
          </span>
        </button>
        {hasExtras ? (
          <button
            type="button"
            onClick={clearExtras}
            className="shrink-0 px-2 text-xs text-[var(--muted)] active:text-[var(--fg)]"
          >
            Sıfırla
          </button>
        ) : null}
      </div>

      {repeatOpen ? (
        <div className="mt-2 rounded-xl border border-[var(--line)] p-3">
          <DayPicker days={days} onChange={setDays} />
          {days.length ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {(date === today ? "Bugünden" : shortDate(date) + " tarihinden") + " itibaren eklenir."}
            </p>
          ) : null}
        </div>
      ) : null}

      {timeOpen ? (
        <TimeSheet value={time} onChange={setTime} onClose={() => setTimeOpen(false)} />
      ) : null}
    </form>
  );
}
