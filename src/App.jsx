import { useEffect, useMemo, useState } from "react";
import { ChevronIcon } from "./components/Icons.jsx";
import { GroupHead, TaskRow } from "./components/TaskRow.jsx";
import Composer from "./components/Composer.jsx";
import SyncBar from "./components/SyncBar.jsx";
import SortableList from "./components/SortableList.jsx";
import { useDriveSync } from "./hooks/useDriveSync.js";
import { groupLabel, toIso } from "./lib/dates.js";
import { STORAGE_KEY, loadTasks, newTask } from "./lib/tasks.js";

const PAST_PAGE_DAYS = 14;

export default function App() {
  const [today, setToday] = useState(() => toIso(new Date()));
  // How many past days (that have tasks) are shown under the list
  const [pastLimit, setPastLimit] = useState(PAST_PAGE_DAYS);
  const [tasks, setTasks] = useState(loadTasks);
  const sync = useDriveSync(tasks, setTasks);

  // Local copy: tasks are kept in this browser even when not connected to Drive
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Update "today" if the page stays open past midnight
  useEffect(() => {
    const check = () => setToday((prev) => (toIso(new Date()) === prev ? prev : toIso(new Date())));
    const id = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  useEffect(() => setPastLimit(PAST_PAGE_DAYS), [today]);

  // Tasks per date, in manual order. Completed tasks stay in their day.
  const byDate = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (t.deleted) continue;
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "tr"));
    }
    return map;
  }, [tasks]);

  const dates = useMemo(() => [...byDate.keys()].sort(), [byDate]);
  const upcoming = useMemo(() => dates.filter((d) => d >= today), [dates, today]);
  // Past days: only days that have tasks, newest first, shown in pages
  const allPast = useMemo(() => dates.filter((d) => d < today).reverse(), [dates, today]);
  const pastDates = allPast.slice(0, pastLimit);
  const hasPast = allPast.length > 0;
  const canGoOlder = allPast.length > pastLimit;

  const todayItems = byDate.get(today) || [];
  const todayDone = todayItems.filter((t) => t.done).length;

  const add = (title, date) =>
    setTasks((prev) => {
      // A new task is appended to the bottom of that day's list
      const last = Math.max(0, ...prev.filter((t) => !t.deleted && t.date === date).map((t) => t.order));
      return [...prev, newTask(title, date, last + 1)];
    });

  const toggle = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t)));
  const remove = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t)));

  // Long-press and drag to reorder tasks within the same day
  const reorder = (items, from, to) => {
    const ids = items.map((t) => t.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) => {
        const i = ids.indexOf(t.id);
        return i < 0 || t.order === i + 1 ? t : { ...t, order: i + 1, updatedAt: now };
      }),
    );
  };

  const renderDay = (date) => {
    const items = byDate.get(date) || [];
    const label = groupLabel(date, today);
    const done = items.filter((t) => t.done).length;
    return (
      <section key={date} aria-label={label.primary + " " + label.secondary}>
        <GroupHead
          primary={label.primary}
          secondary={label.secondary}
          count={items.length ? done + "/" + items.length : "0"}
        />
        {items.length === 0 ? (
          <p className="py-3 text-sm text-[var(--muted)]">Bu günde görev yok.</p>
        ) : (
          <SortableList
            items={items}
            onReorder={(from, to) => reorder(items, from, to)}
            renderItem={(t, sortable) => (
              <TaskRow key={t.id} task={t} sortable={sortable} onToggle={toggle} onRemove={remove} />
            )}
          />
        )}
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-md">
      <header className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight">Görevler</h1>
          <p className="tabular mt-0.5 text-sm text-[var(--muted)]">
            {todayItems.length === 0 ? "Bugün için görev yok" : "Bugün " + todayDone + "/" + todayItems.length + " tamamlandı"}
          </p>
        </div>
        <SyncBar sync={sync} />
      </header>

      <Composer today={today} onAdd={add} />

      <div className="flex flex-col gap-9">
        {upcoming.map(renderDay)}
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            {dates.length === 0
              ? "Henüz görev yok. Yukarıdan ilk görevini ekle."
              : "Bugün ve sonrası için görev yok."}
          </p>
        ) : null}

        {hasPast ? (
          <div className="flex flex-col gap-9 border-t border-[var(--line)] pt-9">
            {pastDates.map(renderDay)}
            {canGoOlder ? (
              <button
                type="button"
                onClick={() => setPastLimit((n) => n + PAST_PAGE_DAYS)}
                className="btn btn-ghost btn-sm mx-auto gap-1.5"
              >
                Daha eski günler
                <ChevronIcon dir="down" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
