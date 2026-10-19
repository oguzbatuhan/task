const pad = (n) => String(n).padStart(2, "0");

export const toIso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export const fromIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

// List of n dates starting from today
export const nextDays = (n, offset = 0) => {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + offset);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
};

export const weekday = (d) => d.toLocaleDateString("tr-TR", { weekday: "short" });
export const month = (d) => d.toLocaleDateString("tr-TR", { month: "short" });
const weekdayLong = (d) => d.toLocaleDateString("tr-TR", { weekday: "long" });
const dayAndMonthLong = (d) => d.getDate() + " " + d.toLocaleDateString("tr-TR", { month: "long" });

// Short date shown under each task in the completed section
export function dateLabel(iso, days) {
  const i = days.findIndex((d) => toIso(d) === iso);
  if (i === 0) return "Bugün";
  if (i === 1) return "Yarın";
  const d = fromIso(iso);
  return d.getDate() + " " + month(d) + " " + weekday(d);
}

// Date group heading: "Bugün  18 Ekim Pazar", "Salı  20 Ekim"
export function groupLabel(iso, days) {
  const i = days.findIndex((d) => toIso(d) === iso);
  const d = fromIso(iso);
  const long = weekdayLong(d);
  const primary = i === 0 ? "Bugün" : i === 1 ? "Yarın" : long;
  const secondary = dayAndMonthLong(d) + (i === 0 || i === 1 ? " " + long : "");
  return { primary, secondary };
}
