export const STORAGE_KEY = "task-tasks-v1";

// Deleted tasks are not removed right away; they are kept for a while with a "deleted" flag
// so the deletion reaches other devices too. Flags older than 30 days are purged.
const TOMBSTONE_MS = 30 * 24 * 60 * 60 * 1000;

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// order: manual position among tasks on the same date (smaller comes first)
export function newTask(title, date, order = 0) {
  return { id: uid(), title, date, done: false, deleted: false, updatedAt: Date.now(), order };
}

export function normalizeTasks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t) => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.date === "string")
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      done: Boolean(t.done),
      deleted: Boolean(t.deleted),
      updatedAt: Number(t.updatedAt) || 0,
      order: Number(t.order) || 0,
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

export const sameTasks = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// If the same task changed in two places, the latest change (larger updatedAt) wins.
export function mergeTasks(local, remote) {
  const byId = new Map();
  for (const t of [...normalizeTasks(local), ...normalizeTasks(remote)]) {
    const current = byId.get(t.id);
    if (!current || t.updatedAt > current.updatedAt) byId.set(t.id, t);
  }
  const cutoff = Date.now() - TOMBSTONE_MS;
  const kept = [...byId.values()].filter((t) => !(t.deleted && t.updatedAt < cutoff));
  return sortById(kept);
}
