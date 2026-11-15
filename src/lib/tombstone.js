// Deleted tasks, rules and subtasks are kept for a while with a "deleted" flag so the deletion reaches other devices.
// A device that stays offline longer than this could bring a deleted item back, so the window is generous (90 days).
// One shared constant: tasks.js, subs.js and repeat.js all use it.
export const TOMBSTONE_MS = 90 * 24 * 60 * 60 * 1000;
