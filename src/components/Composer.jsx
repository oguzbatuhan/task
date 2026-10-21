import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ClockIcon, CloseIcon, PlusIcon } from "./Icons.jsx";
import { relativeName, shiftIso, shortDate } from "../lib/dates.js";

const chip =
  "relative inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ";
const chipOff =
  "border-[var(--line-strong)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]";
const chipOn =
  "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]";

// One-line "add task" bar with quick date chips
export default function Composer({ today, onAdd }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const inputRef = useRef(null);
  const tomorrow = shiftIso(today, 1);
  const custom = date !== today && date !== tomorrow;
  const empty = !title.trim();

  // If the page stays open past midnight, go back to "today"
  useEffect(() => setDate(today), [today]);

  function submit(e) {
    e.preventDefault();
    const text = title.trim();
    if (!text) {
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    onAdd(text, date, time);
    setTitle("");
    setTime("");
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <form onSubmit={submit} className="mb-11">
      <div className="flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] py-1 pl-5 pr-1 transition-colors focus-within:border-[var(--accent)]">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Yeni görev"
          placeholder="Yeni görev ekle…"
          className="min-w-0 flex-1 bg-transparent py-2 text-[0.9375rem] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          aria-label="Görevi ekle"
          aria-disabled={empty}
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] transition-opacity " +
            (empty ? "opacity-40" : "hover:opacity-90")
          }
        >
          <PlusIcon />
        </button>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center gap-1.5"
        role="radiogroup"
        aria-label="Tarih"
      >
        <button
          type="button"
          role="radio"
          aria-checked={date === today}
          onClick={() => setDate(today)}
          className={chip + (date === today ? chipOn : chipOff)}
        >
          Bugün
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={date === tomorrow}
          onClick={() => setDate(tomorrow)}
          className={chip + (date === tomorrow ? chipOn : chipOff)}
        >
          Yarın
        </button>
        <label
          className={chip + "cursor-pointer " + (custom ? chipOn : chipOff)}
        >
          <CalendarIcon />
          <span>
            {custom
              ? relativeName(date, today) || shortDate(date)
              : "Tarih seç"}
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
        <span className="relative inline-flex">
          <label
            className={
              chip +
              "cursor-pointer " +
              (time ? chipOn + " pr-8" : chipOff)
            }
          >
            <ClockIcon />
            <span className="tabular">{time || "Saat ekle"}</span>
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
              className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--accent)] hover:bg-[var(--hover)]"
            >
              <CloseIcon />
            </button>
          ) : null}
        </span>
      </div>
    </form>
  );
}
