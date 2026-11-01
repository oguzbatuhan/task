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

const weekdayLong = (d) => d.toLocaleDateString("en-US", { weekday: "long" });
const dayAndMonthLong = (d) => d.toLocaleDateString("en-US", { month: "long" }) + " " + d.getDate();
const dayAndMonthShort = (d) => d.toLocaleDateString("en-US", { month: "short" }) + " " + d.getDate();

// Name of the day relative to today: "Yesterday", "Today", "Tomorrow" (or null for any other day)
export function relativeName(iso, today) {
  if (iso === today) return "Today";
  if (iso === shiftIso(today, 1)) return "Tomorrow";
  if (iso === shiftIso(today, -1)) return "Yesterday";
  return null;
}

// Short text for the date chip: "Oct 18 Sun"
export function shortDate(iso) {
  const d = fromIso(iso);
  return dayAndMonthShort(d) + " " + d.toLocaleDateString("en-US", { weekday: "short" });
}

// Date group heading: "Today  October 18 Sunday", "Yesterday  October 17 Saturday", "Tuesday  October 20"
export function groupLabel(iso, today) {
  const d = fromIso(iso);
  const long = weekdayLong(d);
  const rel = relativeName(iso, today);
  return { primary: rel || long, secondary: dayAndMonthLong(d) + (rel ? " " + long : "") };
}
