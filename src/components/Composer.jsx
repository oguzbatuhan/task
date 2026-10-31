import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ClockIcon, CloseIcon, PlusIcon, RepeatIcon } from "./Icons.jsx";
import DayPicker from "./DayPicker.jsx";
import { describeDays } from "../lib/repeat.js";
import { relativeName, shiftIso, shortDate } from "../lib/dates.js";
import { parseQuick } from "../lib/quickadd.js";

const chip =
  "relative inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ";
const chipOff =
  "border-[var(--line-strong)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]";
const chipOn =
  "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]";

// Minimal add bar: options appear when focused or when a non-default option is set
export default function Composer({ today, onAdd }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [days, setDays] = useState([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const tomorrow = shiftIso(today, 1);
  const custom = date !== today && date !== tomorrow;
  const empty = !title.trim();
  const hasExtras = date !== today || !!time || days.length > 0 || repeatOpen;
  const showOptions = focused || hasExtras || !!title.trim();

  useEffect(() => setDate(today), [today]);

  // Close options only when focus leaves the whole form
  useEffect(() => {
    if (!focused) return;
    const onDoc = (e) => {
      if (formRef.current && !formRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [focused]);

  function submit(e) {
    e.preventDefault();
    const text = title.trim();
    if (!text) {
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    const q = parseQuick(text, today, tomorrow);
    onAdd(q.title, q.date || date, q.time || time, days);
    setTitle("");
    setTime("");
    setDays([]);
    setRepeatOpen(false);
    setDate(today);
    if (inputRef.current) inputRef.current.focus();
  }

  function clearExtras() {
    setDate(today);
    setTime("");
    setDays([]);
    setRepeatOpen(false);
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mb-5">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] py-1 pl-4 pr-1 transition-colors focus-within:border-[var(--accent)]">
        <input
          ref={inputRef}
          id="composer-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setFocused(true)}
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
          aria-disabled={empty}
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition-opacity " +
            (empty ? "opacity-35" : "hover:opacity-90")
          }
        >
          <PlusIcon />
        </button>
      </div>

      {showOptions ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <div
            className="flex max-w-full gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="radiogroup"
            aria-label="Tarih"
          >
            <button
              type="button"
              role="radio"
              aria-checked={date === today}
              onClick={() => setDate(today)}
              className={"shrink-0 " + chip + (date === today ? chipOn : chipOff)}
            >
              Bugün
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={date === tomorrow}
              onClick={() => setDate(tomorrow)}
              className={"shrink-0 " + chip + (date === tomorrow ? chipOn : chipOff)}
            >
              Yarın
            </button>
            <label className={"shrink-0 cursor-pointer " + chip + (custom ? chipOn : chipOff)}>
              <CalendarIcon />
              <span className="whitespace-nowrap">
                {custom ? relativeName(date, today) || shortDate(date) : "Tarih"}
              </span>
              <input
                type="date"
                value={date}
                min={today}
                aria-label="Tarih seç"
                onChange={(e) => e.target.value && setDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <span className="relative inline-flex shrink-0">
              <label className={"cursor-pointer " + chip + (time ? chipOn + " pr-7" : chipOff)}>
                <ClockIcon />
                <span className="tabular whitespace-nowrap">{time || "Saat"}</span>
                <input
                  type="time"
                  value={time}
                  aria-label="Saat seç"
                  onChange={(e) => setTime(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {}
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {time ? (
                <button
                  type="button"
                  onClick={() => setTime("")}
                  aria-label="Saati kaldır"
                  className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--accent)] hover:bg-[var(--hover)]"
                >
                  <CloseIcon />
                </button>
              ) : null}
            </span>
            <button
              type="button"
              aria-expanded={repeatOpen}
              onClick={() => setRepeatOpen((o) => !o)}
              className={"shrink-0 " + chip + (days.length || repeatOpen ? chipOn : chipOff)}
            >
              <RepeatIcon />
              <span className="whitespace-nowrap">
                {days.length ? describeDays(days) : "Tekrar"}
              </span>
            </button>
          </div>
          {hasExtras ? (
            <button
              type="button"
              onClick={clearExtras}
              className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
            >
              Sıfırla
            </button>
          ) : null}
        </div>
      ) : null}

      {repeatOpen ? (
        <div className="task-in mt-2 rounded-xl border border-[var(--line)] p-3">
          <DayPicker days={days} onChange={setDays} />
          {days.length ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {(date === today ? "Bugünden" : shortDate(date) + " tarihinden") + " itibaren eklenir."}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
