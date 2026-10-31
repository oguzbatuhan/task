import { HistorySheet } from "./History.jsx";
import { RepeatIcon } from "./Icons.jsx";
import { shortDate } from "../lib/dates.js";
import { describeRule, isEnded, lastDate, occurrencesUntil } from "../lib/repeat.js";

// Small pill under the main content: opens the list of recurring tasks
export function RulesButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line-strong)] pl-3 pr-3.5 text-[0.8125rem] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
    >
      <RepeatIcon />
      Tekrarlayanlar
      <span className="tabular rounded-full bg-[var(--accent-soft)] px-1.5 text-xs leading-5 text-[var(--accent)]">{count}</span>
    </button>
  );
}

// List of recurring tasks; tapping one opens it for editing
export function RulesSheet({ rules, today, onOpen, onClose }) {
  return (
    <HistorySheet title="Tekrarlayan görevler" summary={rules.length + " görev"} onClose={onClose}>
      <ul className="py-1">
        {rules.map((r) => (
          <li key={r.id} className="border-b border-[var(--line)] last:border-b-0">
            <button type="button" onClick={() => onOpen(r.id)} className="flex min-h-14 w-full flex-col justify-center py-2 text-left">
              <span className="break-words text-[0.9375rem]">{r.title}</span>
              <span className="tabular mt-0.5 text-xs font-medium text-[var(--accent)]">
                {describeRule(r)}
                {r.time ? " · " + r.time : ""}
                {r.count
                  ? isEnded(r, today)
                    ? " · Bitti"
                    : " · " + Math.min(occurrencesUntil(r, today), r.count) + "/" + r.count + " (son: " + shortDate(lastDate(r)) + ")"
                  : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </HistorySheet>
  );
}
