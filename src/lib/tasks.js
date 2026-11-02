import { uid } from "./id.js";
import { mergeSubs, newSubs, normalizeSubs } from "./subs.js";

export { normalizeSubs };
export const STORAGE_KEY = "task-tasks-v1";

// Deleted tasks are not removed right away; they are kept for a while with a "deleted" flag
// so the deletion reaches other devices too. Flags older than 30 days are purged.
const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1000;

export { uid };

// order: manual position among tasks on the same date (smaller comes first)
// time: optional "HH:MM" (24h) or "" when the task has no set time
export const isValidTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

// note: optional free-text description ("" when none)
export const cleanNote = (v) => (typeof v === "string" ? v.trim().slice(0, 1000) : "");

// ruleId: set on tasks that a recurring rule created ("" for ordinary tasks)
// extra: { subs: [titles], note } typed in the "new task" form
export function newTask(title, date, order = 0, time = "", extra = {}) {
  return {
    id: uid(),
    title,
    date,
    time: isValidTime(time) ? time : "",
    done: false,
    deleted: false,
    updatedAt: Date.now(),
    order,
    ruleId: "",
    subs: newSubs(extra.subs),
    note: cleanNote(extra.note),
  };
}

export function normalizeTasks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t) => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.date === "string")
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      time: isValidTime(t.time) ? t.time : "",
      done: Boolean(t.done),
      deleted: Boolean(t.deleted),
      updatedAt: Number(t.updatedAt) || 0,
      order: Number(t.order) || 0,
      ruleId: typeof t.ruleId === "string" ? t.ruleId : "",
      subs: normalizeSubs(t.subs),
      note: cleanNote(t.note),
    }));
}

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeTasks(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export const sortById = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// Compares two task lists by content (both sides are normalized first, so key order and missing fields never matter)
export const sameTasks = (a, b) => JSON.stringify(normalizeTasks(a)) === JSON.stringify(normalizeTasks(b));

// If the same task changed in two places, the latest change (larger updatedAt) wins for its own fields (title, day,
// time, note, done ...). Subtasks are merged one by one, so ticking a subtask on one device and renaming the task
// on another keeps both changes. On an exact tie the same side wins on every device.
export function mergeTasks(local, remote) {
  const byId = new Map();
  for (const t of [...normalizeTasks(local), ...normalizeTasks(remote)]) {
    const cur = byId.get(t.id);
    if (!cur) {
      byId.set(t.id, t);
      continue;
    }
    const win =
      cur.updatedAt !== t.updatedAt
        ? cur.updatedAt > t.updatedAt ? cur : t
        : JSON.stringify(cur) >= JSON.stringify(t) ? cur : t;
    byId.set(t.id, { ...win, subs: mergeSubs(cur.subs, t.subs) });
  }
  const cutoff = Date.now() - TOMBSTONE_MS;
  const kept = [...byId.values()].filter((t) => !(t.deleted && t.updatedAt < cutoff));
  return sortById(kept);
}
