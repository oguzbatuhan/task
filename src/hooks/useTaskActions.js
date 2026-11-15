import { useCallback, useEffect, useState } from "react";
import { relativeName, shiftIso, shortDate } from "../lib/dates.js";
import { cleanNote, maxOrder, newTask, patchTask } from "../lib/tasks.js";
import { normalizeSubs, toggleSub } from "../lib/subs.js";
import { cleanSubs, isBeyondWindow, newRule, nextOccurrence, syncInstances } from "../lib/repeat.js";

// Every way the user changes tasks and recurring rules, plus the short bottom message (toast) that goes with them.
// Handlers use functional updates only, so they stay stable and memoized task rows do not re-render needlessly.
export function useTaskActions({ tasks, setTasks, rules, setRules, today, collator, t, tp }) {
  // Short message at the bottom; deleting offers "Undo"
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  // A recently dropped task gets a short entrance animation
  const [landedId, setLandedId] = useState(null);
  useEffect(() => {
    if (!landedId) return;
    const id = setTimeout(() => setLandedId(null), 700);
    return () => clearTimeout(id);
  }, [landedId]);

  const say = (message, undo) => setToast({ key: Date.now(), message, ...(undo ? { undo } : {}) });

  // ── Adding ──
  const addOne = (title, date, time = "", extra = {}) =>
    // A new task is appended to the bottom of that day's list
    setTasks((prev) => [...prev, newTask(title, date, maxOrder(prev, date) + 1, time, extra)]);

  const add = (title, date, time = "", days = [], count = 0, subs = [], note = "") => {
    if (days.length > 0) {
      const rule = newRule(title, days, date, time, count, subs, note);
      setRules((prev) => [...prev, rule]);
      // the tasks themselves are created by the materialize effect in App
      const first = nextOccurrence(rule, today);
      const later = first > shiftIso(today, 1);
      say(later ? t("toast.recurringLater", { date: shortDate(first) }) : t("toast.recurringAdded"));
      return;
    }
    addOne(title, date, time, { subs, note });
  };

  // ── Changing one task ──
  const toggle = useCallback(
    (id) => setTasks((prev) => prev.map((x) => (x.id === id ? patchTask(x, { done: !x.done }) : x))),
    [setTasks],
  );
  const toggleStar = useCallback(
    (id) => setTasks((prev) => prev.map((x) => (x.id === id ? patchTask(x, { starred: !x.starred }) : x))),
    [setTasks],
  );
  // Ticking a subtask changes only that subtask (its own timestamp), so it merges cleanly with other devices
  const toggleSubtask = useCallback(
    (id, subId) =>
      setTasks((prev) => prev.map((x) => (x.id === id ? patchTask(x, { subs: toggleSub(x.subs, subId) }) : x))),
    [setTasks],
  );
  const setDeleted = useCallback(
    (id, deleted) => setTasks((prev) => prev.map((x) => (x.id === id ? patchTask(x, { deleted }) : x))),
    [setTasks],
  );
  const remove = useCallback(
    (id) => {
      setDeleted(id, true);
      setToast({ key: Date.now(), message: t("toast.deleted"), undo: () => setDeleted(id, false) });
    },
    [setDeleted, t],
  );

  const save = (id, { title, date, time, note, subs }) =>
    setTasks((prev) => {
      const cur = prev.find((x) => x.id === id);
      if (!cur) return prev;
      // Moved to another day: goes to the bottom of that day's list
      const order = date !== cur.date ? maxOrder(prev, date) + 1 : cur.order;
      const next = patchTask(cur, { title, date, time, note: cleanNote(note), subs: normalizeSubs(subs ?? cur.subs), order });
      return next === cur ? prev : prev.map((x) => (x.id === id ? next : x));
    });

  // ── Moving ──
  const moveOverdueToToday = (overdue) => {
    const ids = new Set(overdue.map((x) => x.id));
    const before = new Map(overdue.map((x) => [x.id, x]));
    setTasks((prev) => {
      let last = maxOrder(prev, today);
      const now = Date.now();
      return prev.map((x) => (ids.has(x.id) ? patchTask(x, { date: today, order: ++last }, now) : x));
    });
    say(tp("toast.moved", ids.size), () =>
      setTasks((prev) =>
        prev.map((x) => {
          const old = before.get(x.id);
          return old ? patchTask(x, { date: old.date, order: old.order }) : x;
        }),
      ),
    );
  };

  // Long-press and drag to reorder tasks within the same day
  const reorder = (items, from, to) => {
    const ids = items.map((x) => x.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const position = new Map(ids.map((id, i) => [id, i + 1]));
    const now = Date.now();
    setTasks((prev) => prev.map((x) => (position.has(x.id) ? patchTask(x, { order: position.get(x.id) }, now) : x)));
  };

  // Long-press, drag onto another day and let go: the task goes where it was dropped (undo in the toast)
  const moveToDay = (id, date, index) => {
    const cur = tasks.find((x) => x.id === id);
    if (!cur || cur.date === date) return;
    const before = { date: cur.date, order: cur.order };
    setTasks((prev) => {
      // The day's open tasks in order, with the moved one inserted where it was dropped
      const ids = prev
        .filter((x) => !x.deleted && !x.done && x.date === date && x.id !== id && !isBeyondWindow(x, today))
        .sort((a, b) => a.order - b.order || collator.compare(a.title, b.title))
        .map((x) => x.id);
      ids.splice(index == null ? ids.length : Math.min(index, ids.length), 0, id);
      const position = new Map(ids.map((x, i) => [x, i + 1]));
      const now = Date.now();
      return prev.map((x) =>
        x.id === id
          ? patchTask(x, { date, order: position.get(id) }, now)
          : position.has(x.id)
            ? patchTask(x, { order: position.get(x.id) }, now)
            : x,
      );
    });
    setLandedId(id);
    say(t("toast.movedTo", { day: relativeName(date, today) || shortDate(date) }), () =>
      setTasks((prev) => prev.map((x) => (x.id === id ? patchTask(x, before) : x))),
    );
  };

  // ── Recurring rules ──
  const saveRule = (id, { title, time, days, count, subs, note }) => {
    const cur = rules.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, title, time, days, count, subs: cleanSubs(subs), note: cleanNote(note), updatedAt: Date.now() };
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setTasks((prev) => syncInstances(prev, next, today, cur));
  };
  const removeRule = (id) => {
    const cur = rules.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, deleted: true, updatedAt: Date.now() };
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setTasks((prev) => syncInstances(prev, next, today));
    say(t("toast.ruleDeleted"));
  };

  return {
    toast, closeToast, landedId,
    add, toggle, toggleStar, toggleSubtask, remove, save,
    moveOverdueToToday, reorder, moveToDay, saveRule, removeRule,
  };
}
