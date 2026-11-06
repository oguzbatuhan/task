import { getLang, getLocale, t } from "./i18n.js";

const pad = (n) => String(n).padStart(2, "0");

export const toIso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export const fromIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

// Moves an ISO date (YYYY-MM-DD) forward (n > 0) or backward (n < 0) by n days
export const shiftIso = (iso, n) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

// Names come from the browser's locale data for the current interface language.
// English reads "October 18", Turkish "18 Ekim" (day first).
const loc = () => getLocale();
const weekdayLong = (d) => d.toLocaleDateString(loc(), { weekday: "long" });
const weekdayShort = (d) => d.toLocaleDateString(loc(), { weekday: "short" });
const dayAndMonth = (d, month) => {
  const name = d.toLocaleDateString(loc(), { month });
  return getLang() === "tr" ? d.getDate() + " " + name : name + " " + d.getDate();
};
const dayAndMonthLong = (d) => dayAndMonth(d, "long");
const dayAndMonthShort = (d) => dayAndMonth(d, "short");

// Name of the day relative to today: "Yesterday", "Today", "Tomorrow" (or null for any other day)
export function relativeName(iso, today) {
  if (iso === today) return t("common.today");
  if (iso === shiftIso(today, 1)) return t("common.tomorrow");
  if (iso === shiftIso(today, -1)) return t("common.yesterday");
  return null;
}

// Short text for the date chip: "Oct 18 Sun"
export function shortDate(iso) {
  const d = fromIso(iso);
  return dayAndMonthShort(d) + " " + weekdayShort(d);
}

// Date group heading: "Today  October 18 Sunday", "Yesterday  October 17 Saturday", "Tuesday  October 20"
export function groupLabel(iso, today) {
  const d = fromIso(iso);
  const long = weekdayLong(d);
  const rel = relativeName(iso, today);
  return { primary: rel || long, secondary: dayAndMonthLong(d) + (rel ? " " + long : "") };
}

// Small date tile for history rows: { day: "18", wd: "Sun" }
export function dayBadge(iso) {
  const d = fromIso(iso);
  return { day: String(d.getDate()), wd: weekdayShort(d) };
}
