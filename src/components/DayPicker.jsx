import { DAY_SHORT, WEEK, cleanDays, describeDays } from "../lib/repeat.js";
import { RepeatIcon } from "./Icons.jsx";

const seg = "flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-[0.8125rem] font-medium transition-colors ";
const step =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] text-lg leading-none text-[var(--fg)] transition-colors hover:bg-[var(--hover)] active:scale-95 disabled:opacity-35";

// Repeat options: mark the weekdays yourself, then choose whether it repeats forever or ends after a number of times.
// onChange(days, count): count is 0 for "forever".
export default function DayPicker({ days, count = 0, onChange }) {
  const set = cleanDays(days);
  const toggle = (d) => onChange(cleanDays(set.includes(d) ? set.filter((x) => x !== d) : [...set, d]), count);
  const summary = set.length ? describeDays(set) + (count ? " · " + count + " kez, sonra biter" : " · sürekli") : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-1" role="group" aria-label="Tekrar günleri">
        {WEEK.map((d) => {
          const picked = set.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={picked}
              aria-label={DAY_SHORT[d]}
              onClick={() => toggle(d)}
              className={
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[0.75rem] font-medium transition-all active:scale-95 " +
                (picked
                  ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow)]"
                  : "border-[var(--line-strong)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]")
              }
            >
              {DAY_SHORT[d]}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 rounded-xl border border-[var(--line)] p-1" role="group" aria-label="Bitiş">
        <button
          type="button"
          aria-pressed={!count}
          onClick={() => onChange(set, 0)}
          className={seg + (!count ? "bg-[var(--accent-soft)] text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]")}
        >
          Sürekli
        </button>
        <button
          type="button"
          aria-pressed={!!count}
          onClick={() => onChange(set, count || 4)}
          className={seg + (count ? "bg-[var(--accent-soft)] text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]")}
        >
          Belli sayıda
        </button>
      </div>

      {count ? (
        <div className="flex items-center justify-center gap-3">
          <button type="button" aria-label="Azalt" disabled={count <= 1} onClick={() => onChange(set, count - 1)} className={step}>
            −
          </button>
          <label className="flex items-baseline gap-1.5 text-[0.8125rem] text-[var(--muted)]">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={count}
              aria-label="Tekrar sayısı"
              onChange={(e) => onChange(set, Math.min(999, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
              className="tabular w-14 bg-transparent text-center text-xl font-medium text-[var(--fg)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            kez
          </label>
          <button type="button" aria-label="Artır" disabled={count >= 999} onClick={() => onChange(set, count + 1)} className={step}>
            +
          </button>
        </div>
      ) : null}

      <div
        className={
          "flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8125rem] " +
          (set.length ? "bg-[var(--accent-soft)] text-[var(--fg)]" : "border border-dashed border-[var(--line-strong)] text-[var(--muted)]")
        }
      >
        <span className="shrink-0 text-[var(--muted)]">
          <RepeatIcon />
        </span>
        <span className="min-w-0 truncate">{set.length ? summary : "En az bir gün seç"}</span>
      </div>
    </div>
  );
}
