import { HistorySheet } from "./History.jsx";
import { RepeatIcon } from "./Icons.jsx";
import { shortDate } from "../lib/dates.js";
import { useI18n } from "../i18n.jsx";
import {
  describeRule,
  isEnded,
  lastDate,
  occurrencesUntil,
} from "../lib/repeat.js";

// Icon button in the page header: opens the list of recurring tasks
export function RulesButton({ count, onClick }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={t("rules.aria", { n: count })}
      title={t("rules.button")}
      className="icon-btn"
    >
      <RepeatIcon />
    </button>
  );
}

// List of recurring tasks; tapping one opens it for editing
export function RulesSheet({ rules, today, onOpen, onClose }) {
  const { t, tp } = useI18n();
  return (
    <HistorySheet
      title={t("rules.title")}
      summary={<p className="text-[13px] text-[var(--muted)]">{tp("rules.count", rules.length)}</p>}
      onClose={onClose}
    >
      <ul className="pb-2">
        {rules.map((r) => (
          <li key={r.id} className="border-b border-[var(--line)] last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex min-h-14 w-full flex-col justify-center px-1 py-3 text-left"
            >
              <span className="break-words text-[0.9375rem]">{r.title}</span>
              <span className="tabular mt-0.5 text-xs text-[var(--muted-2)]">
                {describeRule(r)}
                {r.time ? " · " + r.time : ""}
                {r.count
                  ? isEnded(r, today)
                    ? t("rules.ended")
                    : t("rules.progress", {
                        done: Math.min(occurrencesUntil(r, today), r.count),
                        total: r.count,
                        date: shortDate(lastDate(r)),
                      })
                  : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </HistorySheet>
  );
}
