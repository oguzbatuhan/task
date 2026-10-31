// Recurring tasks.
// A rule ("every Mon, Wed, Fri") is stored separately from the tasks. The app turns it into ordinary tasks for the
// coming days (see materialize). Every generated task gets the id "<ruleId>@<date>", so two devices that generate the
// same day produce the very same task and the cloud merge never duplicates it.
import { fromIso, shiftIso } from "./dates.js";
import { isValidTime, newTask, uid } from "./tasks.js";

export const RULES_KEY = "task-rules-v1";
// How many days ahead (today included) tasks are created
export const HORIZON_DAYS = 14;

// Monday first, as in the Turkish calendar. Values are JS weekdays (0 = Sunday ... 6 = Saturday).
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 0: "Paz" };

// "Haftada X kez": spreads X days evenly over the week
const PER_WEEK = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: WEEK };
export const daysForCount = (n) => [...(PER_WEEK[n] || [])];

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

export function newRule(title, days, start, time = "") {
  return {
    id: uid(),
    title,
    days: cleanDays(days),
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
    if (rule.deleted || !rule.days.includes(weekdayOf(origin))) {
      return { ...t, deleted: true, updatedAt: now };
    }
    if (t.title === rule.title && t.time === rule.time) return t;
    return { ...t, title: rule.title, time: rule.time, updatedAt: now };
  });
}
