// Helpers for the history drawer: past days are listed newest first and grouped by month.

// "2026-10" for any ISO day (YYYY-MM-DD)
export const monthKey = (iso) => iso.slice(0, 7);

// "Ekim" for a month of the current year, "Ekim 2025" for any other year
export function monthLabel(key, today) {
  const [y, m] = key.split("-").map(Number);
  const name = new Date(y, m - 1, 1, 12).toLocaleDateString("tr-TR", { month: "long" });
  return y === Number(String(today).slice(0, 4)) ? name : name + " " + y;
}

// Splits days (each with a `date`, already newest first) into consecutive month groups:
// [{ key: "2026-10", label: "Ekim", days: [...] }, ...]
export function groupByMonth(days, today) {
  const out = [];
  for (const day of days) {
    const key = monthKey(day.date);
    const last = out[out.length - 1];
    if (last && last.key === key) last.days.push(day);
    else out.push({ key, label: monthLabel(key, today), days: [day] });
  }
  return out;
}
