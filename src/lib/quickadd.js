// Quick-add shortcuts typed inside the task title (English and Turkish words work in either interface language):
//   "tomorrow write report" / "yarın rapor yaz" -> tomorrow
//   "today groceries"       / "bugün market"    -> today
//   "meeting 14:30"         / "toplantı saat 14:30" -> time 14:30
// Only a leading/trailing day word and an "HH:MM" time are recognised, so ordinary titles stay untouched.
// Returns { title, date, time } where date/time are null/"" when nothing was recognised.

// [uü] / [ıi]: the plain-keyboard spelling ("bugun", "yarin") works too
const DAYS = "today|tomorrow|bug[üu]n|yar[ıi]n";
const DAY_START = new RegExp("^(" + DAYS + ")\\s+", "i");
const DAY_END = new RegExp("\\s+(" + DAYS + ")$", "i");
const TIME = /(?:^|\s)(?:(?:at|saat)\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/i;
const TOMORROW = /^(tomorrow|yar[ıi]n)$/i;

export function parseQuick(text, today, tomorrow) {
  let title = String(text).trim();
  let date = null;
  let time = "";

  const t = title.match(TIME);
  if (t) {
    time = t[1].padStart(2, "0") + ":" + t[2];
    title = title.replace(t[0], " ").trim();
  }

  const day = title.match(DAY_START) || title.match(DAY_END);
  if (day) {
    date = TOMORROW.test(day[1]) ? tomorrow : today;
    title = title.replace(day[0], " ");
  }

  title = title.replace(/\s+/g, " ").trim();
  // Nothing left to name the task: keep the text exactly as typed
  if (!title) return { title: String(text).trim(), date: null, time: "" };
  return { title, date, time };
}
