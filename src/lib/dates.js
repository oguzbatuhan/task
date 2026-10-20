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

const weekdayLong = (d) => d.toLocaleDateString("tr-TR", { weekday: "long" });
const dayAndMonthLong = (d) => d.getDate() + " " + d.toLocaleDateString("tr-TR", { month: "long" });
const dayAndMonthShort = (d) => d.getDate() + " " + d.toLocaleDateString("tr-TR", { month: "short" });

// Name of the day relative to today: "Dün", "Bugün", "Yarın" (or null for any other day)
export function relativeName(iso, today) {
  if (iso === today) return "Bugün";
  if (iso === shiftIso(today, 1)) return "Yarın";
  if (iso === shiftIso(today, -1)) return "Dün";
  return null;
}

// Short text for the date chip: "18 Eki Paz"
export function shortDate(iso) {
  const d = fromIso(iso);
  return dayAndMonthShort(d) + " " + d.toLocaleDateString("tr-TR", { weekday: "short" });
}

// Date group heading: "Bugün  18 Ekim Pazar", "Dün  17 Ekim Cumartesi", "Salı  20 Ekim"
export function groupLabel(iso, today) {
  const d = fromIso(iso);
  const long = weekdayLong(d);
  const rel = relativeName(iso, today);
  return { primary: rel || long, secondary: dayAndMonthLong(d) + (rel ? " " + long : "") };
}
