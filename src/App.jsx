import { useEffect, useMemo, useState } from "react";
import { DoneHead, GroupHead, TaskRow } from "./components/TaskRow.jsx";
import { HistoryButton, HistoryDay, HistorySheet, MonthHead } from "./components/History.jsx";
import Composer from "./components/Composer.jsx";
import SyncBar from "./components/SyncBar.jsx";
import EditDialog from "./components/EditDialog.jsx";
import SortableList from "./components/SortableList.jsx";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { groupLabel, toIso } from "./lib/dates.js";
import { groupByMonth } from "./lib/history.js";
import { STORAGE_KEY, loadTasks, newTask } from "./lib/tasks.js";

const HISTORY_PAGE_DAYS = 30;

export default function App() {
  const [today, setToday] = useState(() => toIso(new Date()));
  // History drawer: closed by default; which days are open and how many days are loaded
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_DAYS);
  const [openDays, setOpenDays] = useState(() => new Set());
  const [tasks, setTasks] = useState(loadTasks);
  const sync = useCloudSync(tasks, setTasks);

  // Local copy: tasks are kept in this browser even when not connected to the cloud backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Update "today" if the page stays open past midnight
  useEffect(() => {
    const check = () =>
      setToday((prev) =>
        toIso(new Date()) === prev ? prev : toIso(new Date()),
      );
    const id = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // Tasks per date, in manual order. Completed tasks stay in their day.
  const byDate = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (t.deleted) continue;
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => a.order - b.order || a.title.localeCompare(b.title, "tr"),
      );
    }
    return map;
  }, [tasks]);

  const dates = useMemo(() => [...byDate.keys()].sort(), [byDate]);
  const upcoming = useMemo(
    () => dates.filter((d) => d >= today),
    [dates, today],
  );
  // Past days: only days that have tasks, newest first. They live behind the history button.
  const allPast = useMemo(
    () => dates.filter((d) => d < today).reverse(),
    [dates, today],
  );
  const hasPast = allPast.length > 0;

  // Opening starts fresh: newest day open, first page of days
  const openHistory = () => {
    setOpenDays(new Set(allPast.length ? [allPast[0]] : []));
    setHistoryLimit(HISTORY_PAGE_DAYS);
    setHistoryOpen(true);
  };
  const toggleDay = (date) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  // Nothing left in the past (e.g. the last task was deleted): close the drawer
  useEffect(() => {
    if (!hasPast) setHistoryOpen(false);
  }, [hasPast]);

  const pastMonths = useMemo(
    () =>
      historyOpen
        ? groupByMonth(
            allPast.slice(0, historyLimit).map((date) => ({ date })),
            today,
          )
        : [],
    [historyOpen, allPast, historyLimit, today],
  );
  const pastStats = (list) => {
    let total = 0;
    let done = 0;
    for (const d of list) {
      const all = byDate.get(d) || [];
      total += all.length;
      done += all.filter((t) => t.done).length;
    }
    return { total, done };
  };

  const todayItems = byDate.get(today) || [];
  const todayDone = todayItems.filter((t) => t.done).length;

  const add = (title, date, time = "") =>
    setTasks((prev) => {
      // A new task is appended to the bottom of that day's list
      const last = Math.max(
        0,
        ...prev
          .filter((t) => !t.deleted && t.date === date)
          .map((t) => t.order),
      );
      return [...prev, newTask(title, date, last + 1, time)];
    });

  const toggle = (id) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t,
      ),
    );
  const remove = (id) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t,
      ),
    );

  // Edit dialog: opened by tapping a task
  const [editingId, setEditingId] = useState(null);
  const editing = editingId
    ? tasks.find((t) => t.id === editingId && !t.deleted) || null
    : null;

  const save = (id, { title, date, time }) => {
    setTasks((prev) => {
      const cur = prev.find((t) => t.id === id);
      if (!cur) return prev;
      // Moved to another day: goes to the bottom of that day's list
      let order = cur.order;
      if (date !== cur.date) {
        order =
          Math.max(
            0,
            ...prev
              .filter((t) => !t.deleted && t.date === date)
              .map((t) => t.order),
          ) + 1;
      }
      return prev.map((t) =>
        t.id === id
          ? { ...t, title, date, time, order, updatedAt: Date.now() }
          : t,
      );
    });
    setEditingId(null);
  };
  const removeAndClose = (id) => {
    remove(id);
    setEditingId(null);
  };

  // Long-press and drag to reorder tasks within the same day
  const reorder = (items, from, to) => {
    const ids = items.map((t) => t.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) => {
        const i = ids.indexOf(t.id);
        return i < 0 || t.order === i + 1
          ? t
          : { ...t, order: i + 1, updatedAt: now };
      }),
    );
  };

  // Completed-area collapsed state per day (closed by default)
  const [doneOpenSet, setDoneOpenSet] = useState(() => new Set());
  const toggleDone = (date) =>
    setDoneOpenSet((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  const renderDay = (date) => {
    const all = byDate.get(date) || [];
    const items = all.filter((t) => !t.done);
    const completed = all.filter((t) => t.done);
    const doneOpen = doneOpenSet.has(date);
    const label = groupLabel(date, today);
    const done = completed.length;
    return (
      <section key={date} aria-label={label.primary + " " + label.secondary}>
        <GroupHead
          primary={label.primary}
          secondary={label.secondary}
          count={all.length ? done + "/" + all.length : "0"}
        />
        {all.length === 0 ? (
          <p className="py-3 text-sm text-[var(--muted)]">
            Bu günde görev yok.
          </p>
        ) : items.length === 0 ? (
          <p className="py-3 text-sm text-[var(--muted)]">
            Tüm görevler tamamlandı.
          </p>
        ) : (
          <SortableList
            items={items}
            onReorder={(from, to) => reorder(items, from, to)}
            renderItem={(t, sortable) => (
              <TaskRow
                key={t.id}
                task={t}
                sortable={sortable}
                onToggle={toggle}
                onEdit={setEditingId}
                onRemove={remove}
              />
            )}
          />
        )}
        {completed.length > 0 ? (
          <>
            <DoneHead
              count={completed.length}
              open={doneOpen}
              onToggle={() => toggleDone(date)}
            />
            {doneOpen ? (
              <ul>
                {completed.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={toggle}
                    onEdit={setEditingId}
                onRemove={remove}
                  />
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </section>
    );
  };

  const allStats = historyOpen ? pastStats(allPast) : { total: 0, done: 0 };

  return (
    <main className="mx-auto w-full max-w-md">
      <header className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-medium tracking-tight">Görevler</h1>
          <p className="tabular mt-0.5 text-sm text-[var(--muted)]">
            {todayItems.length === 0
              ? "Bugün için görev yok"
              : "Bugün " + todayDone + "/" + todayItems.length + " tamamlandı"}
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
          <div className="flex justify-center">
            <HistoryButton count={allPast.length} onClick={openHistory} />
          </div>
        ) : null}
      </div>

      {historyOpen && hasPast ? (
        <HistorySheet
          summary={allPast.length + " gün · " + allStats.done + "/" + allStats.total + " tamamlandı"}
          onClose={() => setHistoryOpen(false)}
        >
          {pastMonths.map((m) => {
            const st = pastStats(m.days.map((d) => d.date));
            return (
              <div key={m.key}>
                <MonthHead label={m.label} meta={st.done + "/" + st.total} />
                {m.days.map(({ date }) => {
                  const all = byDate.get(date) || [];
                  const pending = all.filter((t) => !t.done);
                  const completed = all.filter((t) => t.done);
                  const label = groupLabel(date, today);
                  return (
                    <HistoryDay
                      key={date}
                      primary={label.primary}
                      secondary={label.secondary}
                      meta={completed.length + "/" + all.length}
                      open={openDays.has(date)}
                      onToggle={() => toggleDay(date)}
                    >
                      {/* Pending and completed tasks are separate lists, so a task that is ticked off here moves
                          between them exactly like in the main list */}
                      {pending.length > 0 ? (
                        <ul>
                          {pending.map((t) => (
                            <TaskRow key={t.id} task={t} onToggle={toggle} onEdit={setEditingId} onRemove={remove} />
                          ))}
                        </ul>
                      ) : null}
                      {completed.length > 0 ? (
                        <ul>
                          {completed.map((t) => (
                            <TaskRow key={t.id} task={t} onToggle={toggle} onEdit={setEditingId} onRemove={remove} />
                          ))}
                        </ul>
                      ) : null}
                    </HistoryDay>
                  );
                })}
              </div>
            );
          })}
          {allPast.length > historyLimit ? (
            <div className="flex justify-center py-5">
              <button
                type="button"
                onClick={() => setHistoryLimit((n) => n + HISTORY_PAGE_DAYS)}
                className="btn btn-ghost btn-sm"
              >
                Daha eski günler
              </button>
            </div>
          ) : null}
        </HistorySheet>
      ) : null}

      {editing ? (
        <EditDialog
          task={editing}
          onSave={save}
          onDelete={removeAndClose}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </main>
  );
}
