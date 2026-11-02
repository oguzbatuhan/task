// Subtasks: a small checklist that lives INSIDE a task, so it is backed up and synced together with it.
//
// Every subtask is { id, title, done, updatedAt, pos, deleted }:
//  - updatedAt lets two devices merge the checklist subtask by subtask (a tick on the phone and a new subtask on the
//    laptop both survive, instead of the older device's whole task being thrown away);
//  - deleted keeps a removed subtask as a short-lived "tombstone", so the removal reaches other devices too;
//  - pos is the position in the list (ties are broken by id, so every device sorts the same way).
import { uid } from "./id.js";

const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_SUBS = 30;
export const SUB_TITLE_MAX = 200;

// One place builds a subtask, so the key order (and with it the saved JSON) is always the same
const mk = (id, title, done, updatedAt, pos, deleted) => ({ id, title, done, updatedAt, pos, deleted });

const bySort = (a, b) => a.pos - b.pos || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function normalizeSubs(list) {
  if (!Array.isArray(list)) return [];
  const byId = new Map();
  list.forEach((s, i) => {
    if (!s || typeof s.id !== "string" || typeof s.title !== "string" || !s.title.trim()) return;
    // Subtasks saved before timestamps existed: updatedAt 0, position = place in the list
    byId.set(
      s.id,
      mk(
        s.id,
        s.title.trim().slice(0, SUB_TITLE_MAX),
        Boolean(s.done),
        Number(s.updatedAt) || 0,
        Number.isFinite(Number(s.pos)) && s.pos !== null && s.pos !== "" ? Number(s.pos) : i,
        Boolean(s.deleted),
      ),
    );
  });
  return [...byId.values()].sort(bySort);
}

export const liveSubs = (subs) => (Array.isArray(subs) ? subs.filter((s) => !s.deleted) : []);
export const subProgress = (subs) => {
  const live = liveSubs(subs);
  return { total: live.length, done: live.filter((s) => s.done).length };
};

// Titles typed in the "new task" form -> subtasks with fresh ids
export function newSubs(titles, now = Date.now()) {
  return cleanTitles(titles).map((title, i) => mk(uid(), title, false, now, i, false));
}

// Subtask titles typed by hand: strings, trimmed, no blanks, at most MAX_SUBS
export const cleanTitles = (list) =>
  Array.isArray(list)
    ? list
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => x.trim().slice(0, SUB_TITLE_MAX))
        .slice(0, MAX_SUBS)
    : [];

const nextPos = (subs) => subs.reduce((m, s) => Math.max(m, s.pos), -1) + 1;
const touch = (subs, id, change, now) =>
  subs.map((s) => (s.id === id && !s.deleted ? { ...s, ...change, updatedAt: now } : s));

export function addSub(subs, title, now = Date.now()) {
  const t = title.trim().slice(0, SUB_TITLE_MAX);
  if (!t || liveSubs(subs).length >= MAX_SUBS) return subs;
  return [...subs, mk(uid(), t, false, now, nextPos(subs), false)];
}
export const toggleSub = (subs, id, now = Date.now()) =>
  subs.map((s) => (s.id === id && !s.deleted ? { ...s, done: !s.done, updatedAt: now } : s));
// While typing, the title is kept as typed (spaces included); finalizeSubs cleans it up when the form is saved
export const renameSub = (subs, id, title, now = Date.now()) =>
  touch(subs, id, { title: title.slice(0, SUB_TITLE_MAX) }, now);

// Before saving an edit form: trim titles, and turn subtasks whose name was erased into removed ones
export const finalizeSubs = (subs, now = Date.now()) =>
  subs.map((s) => {
    if (s.deleted) return s;
    const title = s.title.trim();
    if (!title) return { ...s, title: "-", deleted: true, updatedAt: now };
    return title === s.title ? s : { ...s, title, updatedAt: now };
  });
export const removeSub = (subs, id, now = Date.now()) => touch(subs, id, { deleted: true }, now);

// Same subtask on two devices: the newer change wins; on an exact tie the same side wins everywhere
const pickSub = (a, b) => {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
};

export function mergeSubs(a, b) {
  const list = [...(a || []), ...(b || [])];
  if (list.length === 0) return [];
  const byId = new Map();
  for (const s of list) {
    const cur = byId.get(s.id);
    byId.set(s.id, cur ? pickSub(cur, s) : s);
  }
  const cutoff = Date.now() - TOMBSTONE_MS;
  return [...byId.values()].filter((s) => !(s.deleted && s.updatedAt < cutoff)).sort(bySort);
}

// Recurring tasks: every occurrence starts with the rule's subtask titles. The id comes from the title, so two devices
// that create the same day produce identical subtasks (updatedAt 0: any real edit made anywhere wins over them).
const hash = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

// old = the occurrence's current subtasks. When the rule's titles change, subtasks that are still in the rule keep their
// tick, new ones are added, and removed ones become tombstones (so other devices drop them as well).
export function subsFromTitles(taskId, titles, old = [], now = 0) {
  const list = cleanTitles(titles);
  const oldLive = liveSubs(old);
  const used = new Set();
  const out = list.map((title, pos) => {
    const prev = oldLive.find((s) => s.title === title && !used.has(s.id));
    if (prev) {
      used.add(prev.id);
      return prev.pos === pos ? prev : { ...prev, pos, updatedAt: now };
    }
    let id = taskId + "#" + hash(title);
    for (let n = 2; used.has(id); n++) id = taskId + "#" + hash(title) + n;
    used.add(id);
    return mk(id, title, false, now, pos, false);
  });
  const dropped = old
    .filter((s) => !used.has(s.id))
    .map((s) => (s.deleted ? s : { ...s, deleted: true, updatedAt: now }));
  return [...out, ...dropped].sort(bySort);
}
