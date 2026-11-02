import { HistorySheet } from "./History.jsx";
import { RepeatIcon } from "./Icons.jsx";
import { shortDate } from "../lib/dates.js";
import { describeRule, isEnded, lastDate, occurrencesUntil } from "../lib/repeat.js";

// Icon button in the page header: opens the list of recurring tasks
export function RulesButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={"Recurring tasks (" + count + ")"}
      title="Recurring"
      className="icon-btn"
    >
      <RepeatIcon />
    </button>
  );
}

// List of recurring tasks; tapping one opens it for editing
export function RulesSheet({ rules, today, onOpen, onClose }) {
  return (
    <HistorySheet title="Recurring tasks" summary={rules.length + (rules.length === 1 ? " task" : " tasks")} onClose={onClose}>
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
                    ? " · Ended"
                    : " · " + Math.min(occurrencesUntil(r, today), r.count) + "/" + r.count + " (last: " + shortDate(lastDate(r)) + ")"
                  : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </HistorySheet>
  );
}
