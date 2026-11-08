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

// ── Weeks (Monday to Sunday, numbered the ISO way: week 1 is the one with the year's first Thursday) ──

// Monday of the week an ISO date is in
export function weekStart(iso) {
  const d = fromIso(iso);
  const back = (d.getDay() + 6) % 7; // Monday 0 … Sunday 6
  return shiftIso(iso, -back);
}

// ISO week number (1–53) of a date
export function weekNumber(iso) {
  const d = fromIso(weekStart(iso));
  d.setDate(d.getDate() + 3); // the Thursday of that week decides the week's year
  const jan1 = new Date(d.getFullYear(), 0, 1, 12);
  const days = Math.round((d - jan1) / 86400000);
  return Math.floor(days / 7) + 1;
}

// "Nov 9 – 15" / "9 – 15 Kasım"; across two months "Nov 30 – Dec 6" / "30 Kasım – 6 Aralık"
export function weekRange(startIso) {
  const a = fromIso(startIso);
  const b = fromIso(shiftIso(startIso, 6));
  if (a.getMonth() === b.getMonth()) {
    const month = b.toLocaleDateString(loc(), { month: "long" });
    return getLang() === "tr"
      ? a.getDate() + " – " + b.getDate() + " " + month
      : month + " " + a.getDate() + " – " + b.getDate();
  }
  return dayAndMonthLong(a) + " – " + dayAndMonthLong(b);
}

// Week group heading: "This week  Nov 2 – 8 · Week 45", "Week 47  Nov 16 – 22"
export function weekLabel(startIso, today) {
  const n = t("common.weekN", { n: weekNumber(startIso) });
  const range = weekRange(startIso);
  const thisWeek = weekStart(today);
  if (startIso === thisWeek) return { primary: t("common.thisWeek"), secondary: range + " · " + n };
  if (startIso === shiftIso(thisWeek, 7)) return { primary: t("common.nextWeek"), secondary: range + " · " + n };
  return { primary: n, secondary: range };
}
