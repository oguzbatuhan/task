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
    at: {},
  };
}

// Fields that are merged one by one between devices. Every change stamps the fields it touched (task.at[field]),
// so a rename on one device and a tick on another both survive. A task saved before this existed has no `at`
// (undefined): all its fields count as changed at updatedAt. subs carry their own timestamps (see subs.js).
export const FIELDS = ["title", "date", "time", "note", "done", "order", "deleted"];

function cleanAt(at) {
  if (!at || typeof at !== "object") return undefined;
  const out = {};
  for (const f of FIELDS) if (Number(at[f]) > 0) out[f] = Number(at[f]);
  return out;
}
const effAt = (t, f) => (t.at ? t.at[f] || 0 : t.updatedAt);

// The one way to change a task: returns the same object when nothing really changes (so no pointless sync),
// otherwise a copy with the touched fields stamped and updatedAt bumped.
export function patchTask(t, patch, now = Date.now()) {
  const next = { ...t };
  const at = t.at ? { ...t.at } : Object.fromEntries(FIELDS.map((f) => [f, t.updatedAt]));
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (k === "subs") {
      if (JSON.stringify(v) === JSON.stringify(t.subs)) continue;
    } else if (t[k] === v) continue;
    next[k] = v;
    if (k !== "subs") at[k] = now;
    changed = true;
  }
  if (!changed) return t;
  next.at = at;
  next.updatedAt = now;
  return next;
}

// Highest manual position on a day (a plain loop: spreading a big list into Math.max can overflow the stack)
export function maxOrder(tasks, date) {
  let max = 0;
  for (const t of tasks) if (!t.deleted && t.date === date && t.order > max) max = t.order;
  return max;
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
      at: cleanAt(t.at),
    }));
}

// Removed tasks older than 30 days are forgotten for good
const dropOldTombstones = (list) => {
  const cutoff = Date.now() - TOMBSTONE_MS;
  return list.filter((t) => !(t.deleted && t.updatedAt < cutoff));
};

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? dropOldTombstones(normalizeTasks(JSON.parse(raw))) : [];
  } catch {
    return [];
  }
}

export const sortById = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// Compares two task lists by content (both sides are normalized first, so key order and missing fields never matter)
export const sameTasks = (a, b) => JSON.stringify(normalizeTasks(a)) === JSON.stringify(normalizeTasks(b));

// Same task on two devices. Each field takes the value of the side that changed it last (task.at), subtasks merge one
// by one, and on an exact tie the same side wins everywhere, so both devices always end up with identical data.
function mergeTwo(a, b) {
  const aNewer =
    a.updatedAt !== b.updatedAt ? a.updatedAt > b.updatedAt : JSON.stringify(a) >= JSON.stringify(b);
  const newer = aNewer ? a : b;
  const subs = mergeSubs(a.subs, b.subs);
  if (!a.at && !b.at) return { ...newer, subs }; // both saved by an old version: newest whole task wins
  const out = { ...newer, subs };
  const at = {};
  for (const f of FIELDS) {
    const fa = effAt(a, f);
    const fb = effAt(b, f);
    out[f] = (fa !== fb ? (fa > fb ? a : b) : newer)[f];
    at[f] = Math.max(fa, fb);
  }
  out.at = cleanAt(at);
  out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  return out;
}

export function mergeTasks(local, remote) {
  const byId = new Map();
  for (const t of [...normalizeTasks(local), ...normalizeTasks(remote)]) {
    const cur = byId.get(t.id);
    byId.set(t.id, cur ? mergeTwo(cur, t) : t);
  }
  return sortById(dropOldTombstones([...byId.values()]));
}
