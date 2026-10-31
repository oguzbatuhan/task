// Recurring tasks.
// A rule ("every Mon, Wed, Fri") is stored separately from the tasks. The app turns it into ordinary tasks only for
// today and tomorrow (see materialize); later days are created when they come within that window, so the list never
// shows recurring tasks further ahead. Every generated task gets the id "<ruleId>@<date>", so two devices that
// generate the same day produce the very same task and the cloud merge never duplicates it.
//
// A rule repeats forever, or ends after `count` occurrences (count = 0 means forever). The occurrence number of a day is
// computed from the rule (how many rule days lie between its start and that day), so nothing extra has to be stored
// or synced to know when the rule ends.
import { fromIso, shiftIso } from "./dates.js";
import { isValidTime, newTask, uid } from "./tasks.js";

export const RULES_KEY = "task-rules-v1";
// How many days (today included) recurring tasks are created and shown for: today and tomorrow
export const HORIZON_DAYS = 2;

// Monday first, as in the Turkish calendar. Values are JS weekdays (0 = Sunday ... 6 = Saturday).
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 0: "Paz" };

export const cleanDays = (days) =>
  WEEK.filter((d) => Array.isArray(days) && days.includes(d));

export function describeDays(days) {
  const d = cleanDays(days);
  const key = d.join(",");
  if (d.length === 7) return "Her gün";
  if (key === "1,2,3,4,5") return "Hafta içi her gün";
  if (key === "6,0") return "Hafta sonu";
  if (d.length === 1) return "Her " + DAY_SHORT[d[0]];
  return d.map((x) => DAY_SHORT[x]).join(", ");
}

export const weekdayOf = (iso) => fromIso(iso).getDay();
export const instanceId = (ruleId, date) => ruleId + "@" + date;
// The day a generated task was created for (kept even if the task is moved to another day)
export const instanceDate = (id) => (id.includes("@") ? id.split("@")[1] : "");

export const cleanCount = (n) => (Number.isInteger(n) && n >= 1 && n <= 999 ? n : 0);

// Day of the count-th occurrence ("" when the rule is endless or has no days)
export function lastDate(rule) {
  if (!rule.count || !rule.days.length) return "";
  let date = rule.start;
  let n = 0;
  for (;;) {
    if (rule.days.includes(weekdayOf(date)) && ++n === rule.count) return date;
    date = shiftIso(date, 1);
  }
}

// How many occurrences the rule has had up to and including `date`
export function occurrencesUntil(rule, date) {
  if (!rule.days.length) return 0;
  let n = 0;
  for (let d = rule.start; d <= date; d = shiftIso(d, 1)) if (rule.days.includes(weekdayOf(d))) n++;
  return n;
}

// The rule has produced its last occurrence and that day is over
export const isEnded = (rule, today) => {
  const last = lastDate(rule);
  return Boolean(last) && last < today;
};

// "Pzt, Çar" / "Pzt, Çar · 10 kez"
export const describeRule = (rule) => describeDays(rule.days) + (rule.count ? " · " + rule.count + " kez" : "");

export function newRule(title, days, start, time = "", count = 0) {
  return {
    id: uid(),
    title,
    days: cleanDays(days),
    count: cleanCount(count),
    time: isValidTime(time) ? time : "",
    start,
    deleted: false,
    updatedAt: Date.now(),
  };
}

export function normalizeRules(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && typeof r.id === "string" && typeof r.title === "string" && typeof r.start === "string")
    .map((r) => ({
      id: r.id,
      title: r.title,
      days: cleanDays(r.days),
      count: cleanCount(r.count),
      time: isValidTime(r.time) ? r.time : "",
      start: r.start,
      deleted: Boolean(r.deleted),
      updatedAt: Number(r.updatedAt) || 0,
    }));
}

const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1000;

export function mergeRules(local, remote) {
  const byId = new Map();
  for (const r of [...normalizeRules(local), ...normalizeRules(remote)]) {
    const cur = byId.get(r.id);
    if (!cur || r.updatedAt > cur.updatedAt) byId.set(r.id, r);
  }
  const cutoff = Date.now() - TOMBSTONE_MS;
  return [...byId.values()]
    .filter((r) => !(r.deleted && r.updatedAt < cutoff))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function loadRules() {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? normalizeRules(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

// First day on or after `from` (and on or after the rule's start) on which the rule applies; "" if it has no days
export function nextOccurrence(rule, from) {
  if (!rule.days.length) return "";
  const begin = rule.start > from ? rule.start : from;
  for (let i = 0; i < 7; i++) {
    const date = shiftIso(begin, i);
    if (rule.days.includes(weekdayOf(date))) return date;
  }
  return "";
}

// A generated task that is further ahead than the window and still on its original day. Such tasks (e.g. made by an
// older version that created two weeks ahead) are hidden until their day comes within the window. A task the user
// moved to another day, or finished, is never hidden.
export function isBeyondWindow(task, today) {
  if (!task.ruleId || task.done || task.deleted) return false;
  if (task.date <= shiftIso(today, HORIZON_DAYS - 1)) return false;
  return instanceDate(task.id) === task.date;
}

// Creates the missing tasks of every active rule for [today, today + HORIZON_DAYS).
// Returns the same array when nothing is missing (so React does not re-render).
// A deleted generated task stays in the list as a "deleted" mark, so it is not created again.
export function materialize(tasks, rules, today) {
  const active = rules.filter((r) => !r.deleted && r.days.length > 0);
  if (active.length === 0) return tasks;
  const existing = new Set(tasks.map((t) => t.id));
  const lastOrder = new Map();
  const orderOf = (date) => {
    if (!lastOrder.has(date)) {
      lastOrder.set(
        date,
        Math.max(0, ...tasks.filter((t) => !t.deleted && t.date === date).map((t) => t.order)),
      );
    }
    return lastOrder.get(date);
  };
  const added = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = shiftIso(today, i);
    const wd = weekdayOf(date);
    for (const r of active) {
      if (date < r.start || !r.days.includes(wd)) continue;
      if (r.count && occurrencesUntil(r, date) > r.count) continue; // the rule has ended
      const id = instanceId(r.id, date);
      if (existing.has(id)) continue;
      existing.add(id);
      const order = orderOf(date) + 1;
      lastOrder.set(date, order);
      added.push({ ...newTask(r.title, date, order, r.time), id, ruleId: r.id });
    }
  }
  return added.length ? [...tasks, ...added] : tasks;
}

// Applies a rule change (new title/time/days, or deletion) to the tasks it already created:
// from today on, unfinished tasks follow the new title/time, and the ones on days that are no longer part
// of the rule are removed. Finished and past tasks are never touched.
export function syncInstances(tasks, rule, today) {
  const now = Date.now();
  return tasks.map((t) => {
    if (t.ruleId !== rule.id || t.deleted || t.done || t.date < today) return t;
    const origin = instanceDate(t.id) || t.date;
    // Removed rule, a day that is no longer part of it, or beyond its last occurrence
    const gone =
      rule.deleted ||
      !rule.days.includes(weekdayOf(origin)) ||
      (rule.count > 0 && occurrencesUntil(rule, origin) > rule.count);
    if (gone) return { ...t, deleted: true, updatedAt: now };
    if (t.title === rule.title && t.time === rule.time) return t;
    return { ...t, title: rule.title, time: rule.time, updatedAt: now };
  });
}
