import { DAY_SHORT, WEEK, cleanDays, daysForCount, describeDays } from "../lib/repeat.js";

// Seven weekday buttons (Monday first) plus quick choices: "Her gün", "Hafta içi" and "Haftada X kez"
export default function DayPicker({ days, onChange }) {
  const set = cleanDays(days);
  const toggle = (d) => onChange(cleanDays(set.includes(d) ? set.filter((x) => x !== d) : [...set, d]));
  const quick = "inline-flex h-8 items-center rounded-full border px-3 text-[0.8125rem] font-medium transition-colors ";
  const off = "border-[var(--line-strong)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]";
  const on = "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]";
  const same = (a) => a.join(",") === set.join(",");
  const everyDay = WEEK;
  const weekdays = [1, 2, 3, 4, 5];
  // "Haftada X kez" shows which count is selected only while the days are exactly that evenly spread set
  const countNow = [1, 2, 3, 4, 5, 6, 7].find((n) => same(cleanDays(daysForCount(n)))) || "";

  return (
    <div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label="Tekrar günleri">
        {WEEK.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={set.includes(d)}
            onClick={() => toggle(d)}
            className={
              "h-10 rounded-xl border text-[0.8125rem] font-medium transition-colors " +
              (set.includes(d)
                ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                : "border-[var(--line-strong)] text-[var(--muted)] hover:bg-[var(--hover)]")
            }
          >
            {DAY_SHORT[d]}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onChange(everyDay)} className={quick + (same(everyDay) ? on : off)}>
          Her gün
        </button>
        <button type="button" onClick={() => onChange(weekdays)} className={quick + (same(weekdays) ? on : off)}>
          Hafta içi
        </button>
        <label className={"relative " + quick + "cursor-pointer gap-1 " + (countNow ? on : off)}>
          <span>Haftada {countNow || "…"} kez</span>
          <select
            aria-label="Haftada kaç kez"
            value={countNow}
            onChange={(e) => onChange(daysForCount(Number(e.target.value)))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="" disabled>
              Haftada kaç kez?
            </option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                Haftada {n} kez
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {set.length ? describeDays(set) : "En az bir gün seç"}
      </p>
    </div>
  );
}
