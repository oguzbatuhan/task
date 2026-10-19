import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, PlusIcon } from "./components/Icons.jsx";
import { GroupHead, TaskRow } from "./components/TaskRow.jsx";
import SyncBar from "./components/SyncBar.jsx";
import SortableList from "./components/SortableList.jsx";
import { useDriveSync } from "./hooks/useDriveSync.js";
import {
  dateLabel,
  groupLabel,
  month,
  nextDays,
  toIso,
  weekday,
} from "./lib/dates.js";
import { STORAGE_KEY, loadTasks, newTask } from "./lib/tasks.js";

export default function App() {
  const [today, setToday] = useState(() => toIso(new Date()));
  const days = useMemo(() => nextDays(10), [today]);
  // Date picker: weekly pages (0 = the first 7 days starting today)
  const [weekOffset, setWeekOffset] = useState(0);
  const pickerDays = useMemo(
    () => nextDays(7, weekOffset * 7),
    [today, weekOffset],
  );
  const [tasks, setTasks] = useState(loadTasks);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [formOpen, setFormOpen] = useState(false);
  const inputRef = useRef(null);
  const sync = useDriveSync(tasks, setTasks);

  // Local copy: tasks are kept in this browser even when not connected to Drive
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Update "today" and the 10-day list if the page stays open past midnight
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
  useEffect(() => {
    setDate(today);
    setWeekOffset(0);
  }, [today]);

  useEffect(() => {
    if (formOpen && inputRef.current) {
      const id = requestAnimationFrame(
        () => inputRef.current && inputRef.current.focus(),
      );
      return () => cancelAnimationFrame(id);
    }
  }, [formOpen]);

  const visible = useMemo(() => tasks.filter((t) => !t.deleted), [tasks]);

  const sorted = useMemo(
    () =>
      [...visible].sort(
        (a, b) =>
          Number(a.done) - Number(b.done) ||
          a.date.localeCompare(b.date) ||
          a.order - b.order ||
          a.title.localeCompare(b.title, "tr"),
      ),
    [visible],
  );

  // Open tasks are grouped by date; the list is date-sorted, so neighbouring tasks fall into the same group
  const groups = useMemo(() => {
    const out = [];
    sorted
      .filter((t) => !t.done)
      .forEach((t) => {
        const last = out[out.length - 1];
        if (last && last.date === t.date) last.items.push(t);
        else out.push({ date: t.date, items: [t] });
      });
    return out;
  }, [sorted]);
  const doneTasks = useMemo(() => sorted.filter((t) => t.done), [sorted]);
  const openCount = visible.length - doneTasks.length;

  function addTask(e) {
    e.preventDefault();
    const text = title.trim();
    if (!text) {
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    setTasks((prev) => {
      // A new task is appended to the bottom of that day's list
      const last = Math.max(
        0,
        ...prev.filter((t) => !t.deleted && t.date === date).map((t) => t.order),
      );
      return [...prev, newTask(text, date, last + 1)];
    });
    setTitle("");
    if (inputRef.current) inputRef.current.focus();
  }

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

  return (
    <main className="mx-auto w-full max-w-xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-4xl font-bold tracking-tight">
            Görevler
          </h1>
          <p className="tabular mt-1 text-sm text-[var(--muted)]">
            {openCount} açık · {doneTasks.length} tamamlandı
          </p>
          <SyncBar sync={sync} />
        </div>
        <button
          type="button"
          aria-expanded={formOpen}
          aria-controls="add-panel"
          onClick={() => setFormOpen((v) => !v)}
          className={
            "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-semibold transition-colors " +
            (formOpen
              ? "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--fg)]"
              : "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90")
          }
        >
          <PlusIcon open={formOpen} />
          {formOpen ? "" : ""}
        </button>
      </header>

      <div id="add-panel" className="fold" data-open={formOpen}>
        <div className="fold-inner">
          <div className="pb-6">
            <form
              onSubmit={addTask}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
            >
              <label
                htmlFor="task-title"
                className="mb-2 block text-sm font-semibold"
              >
                Yeni görev
              </label>
              <input
                id="task-title"
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                autoComplete="off"
                placeholder="Ne yapılacak?"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-base text-[var(--fg)] placeholder:text-[var(--muted)]"
              />

              <p id="date-label" className="mb-2 mt-4 text-sm font-semibold">
                Tarih
              </p>
              <div className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  aria-label="Önceki hafta"
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                  className="flex w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--fg)] transition-colors hover:border-[var(--line-strong)] disabled:opacity-30 disabled:hover:border-[var(--line)]"
                >
                  <ChevronIcon dir="left" />
                </button>
                <div
                  role="radiogroup"
                  aria-labelledby="date-label"
                  className="grid min-w-0 flex-1 grid-cols-7 gap-1.5"
                >
                  {pickerDays.map((d) => {
                    const iso = toIso(d);
                    const active = iso === date;
                    const di = days.findIndex((x) => toIso(x) === iso);
                    const top =
                      di === 0 ? "Bugün" : di === 1 ? "Yarın" : weekday(d);
                    return (
                      <button
                        key={iso}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setDate(iso)}
                        className={
                          "flex min-w-0 flex-col items-center rounded-xl border px-0.5 py-2 transition-colors " +
                          (active
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                            : "border-[var(--line)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--line-strong)]")
                        }
                      >
                        <span className="w-full truncate text-center text-[10px] font-medium uppercase tracking-wide opacity-80">
                          {top}
                        </span>
                        <span className="tabular display text-lg font-bold leading-tight">
                          {d.getDate()}
                        </span>
                        <span className="text-[10px] opacity-80">
                          {month(d)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Sonraki hafta"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="flex w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--fg)] transition-colors hover:border-[var(--line-strong)]"
                >
                  <ChevronIcon dir="right" />
                </button>
              </div>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90"
              >
                Görevi ekle
              </button>
            </form>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--line-strong)] px-4 py-10 text-center text-[var(--muted)]">
          Henüz görev yok. “Görev ekle” düğmesiyle ilk görevini ekle.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => {
            const label = groupLabel(g.date, days);
            return (
              <section key={g.date}>
                <GroupHead
                  primary={label.primary}
                  secondary={label.secondary}
                  tag={g.date < today ? "Süresi geçti" : null}
                  count={g.items.length}
                />
                <SortableList
                  items={g.items}
                  onReorder={(from, to) => reorder(g.items, from, to)}
                  renderItem={(t, sortable) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      sortable={sortable}
                      onToggle={toggle}
                      onRemove={remove}
                    />
                  )}
                />
              </section>
            );
          })}
          {doneTasks.length > 0 ? (
            <section>
              <GroupHead primary="Tamamlananlar" count={doneTasks.length} />
              <ul className="flex flex-col gap-2">
                {doneTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    meta={dateLabel(t.date, days)}
                    onToggle={toggle}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
