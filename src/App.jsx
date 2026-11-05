import { useCallback, useEffect, useMemo, useState } from "react";
import { DoneHead, GroupHead, TaskRow } from "./components/TaskRow.jsx";
import { HistoryButton, HistoryDay, HistoryEmpty, HistoryLoadMore, HistorySheet, HistoryStats, MonthHead } from "./components/History.jsx";
import Composer from "./components/Composer.jsx";
import SyncBar from "./components/SyncBar.jsx";
import EditDialog from "./components/EditDialog.jsx";
import SortableList from "./components/SortableList.jsx";
import Toast from "./components/Toast.jsx";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { usePersist } from "./hooks/usePersist.js";
import { groupLabel, relativeName, shiftIso, shortDate, toIso } from "./lib/dates.js";
import { groupByMonth } from "./lib/history.js";
import { STORAGE_KEY, cleanNote, loadTasks, maxOrder, newTask, patchTask } from "./lib/tasks.js";
import { normalizeSubs, toggleSub } from "./lib/subs.js";
import { RULES_KEY, cleanSubs, describeRule, loadRules, isBeyondWindow, materialize, newRule, nextOccurrence, syncInstances } from "./lib/repeat.js";
import { RulesButton, RulesSheet } from "./components/RulesSheet.jsx";

const HISTORY_PAGE_DAYS = 30;
// One shared collator: much cheaper than localeCompare on every comparison
const collator = new Intl.Collator("en");

export default function App() {
  const [today, setToday] = useState(() => toIso(new Date()));
  // History drawer: closed by default; which days are open and how many days are loaded
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_DAYS);
  const [openDays, setOpenDays] = useState(() => new Set());
  const [tasks, setTasks] = useState(loadTasks);
  // Recurring rules: kept next to the tasks, they create the tasks of the coming days (see lib/repeat.js)
  const [rules, setRules] = useState(loadRules);
  const sync = useCloudSync(tasks, setTasks, rules, setRules);
  const liveRules = useMemo(() => rules.filter((r) => !r.deleted), [rules]);

  // Local copy: tasks are kept in this browser even when not connected to the cloud backup
  usePersist(STORAGE_KEY, tasks);
  usePersist(RULES_KEY, rules);

  // Create the tasks of recurring rules for the coming days (on start, after midnight and when a rule changes, also
  // one that arrives from the cloud). Task edits cannot make a task missing, so they do not re-run this.
  // Returns the same list when nothing is missing, so this never loops.
  useEffect(() => {
    setTasks((prev) => materialize(prev, rules, today));
  }, [rules, today]);

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
      if (t.deleted || isBeyondWindow(t, today)) continue;
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => a.order - b.order || collator.compare(a.title, b.title),
      );
    }
    return map;
  }, [tasks, today]);

  const dates = useMemo(() => [...byDate.keys()].sort(), [byDate]);
  // Unfinished tasks from earlier days: they used to hide in the history, now they stay in sight.
  // Taken from the already sorted per-day lists, so no extra sorting is needed.
  const overdue = useMemo(() => {
    const out = [];
    for (const d of dates) {
      if (d >= today) break;
      for (const t of byDate.get(d)) if (!t.done) out.push(t);
    }
    return out;
  }, [byDate, dates, today]);
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
    setOpenDays(new Set());
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

  // done/total per past day, computed once
  const dayStats = useMemo(() => {
    const m = new Map();
    if (!historyOpen) return m;
    for (const d of allPast) {
      const all = byDate.get(d) || [];
      m.set(d, { total: all.length, done: all.filter((t) => t.done).length });
    }
    return m;
  }, [historyOpen, allPast, byDate]);
  const pastStats = (list) => {
    let total = 0;
    let done = 0;
    for (const d of list) {
      const st = dayStats.get(d);
      if (st) {
        total += st.total;
        done += st.done;
      }
    }
    return { total, done };
  };

  const filteredPast = useMemo(
    () => (historyOpen ? allPast.slice(0, historyLimit) : []),
    [historyOpen, allPast, historyLimit],
  );

  const pastMonths = useMemo(
    () => (historyOpen ? groupByMonth(filteredPast.map((date) => ({ date })), today) : []),
    [historyOpen, filteredPast, today],
  );

  const todayItems = byDate.get(today) || [];
  const todayDone = todayItems.filter((t) => t.done).length;

  // Short message at the bottom; deleting offers "Undo"
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const add = (title, date, time = "", days = [], count = 0, subs = [], note = "") => {
    if (days.length > 0) {
      const rule = newRule(title, days, date, time, count, subs, note);
      setRules((prev) => [...prev, rule]);
      // the tasks themselves are created by the effect above (only for today and tomorrow)
      const first = nextOccurrence(rule, today);
      const later = first > shiftIso(today, 1);
      setToast({
        key: Date.now(),
        message: "Recurring task added" + (later ? " · will appear on " + shortDate(first) : ""),
      });
      return;
    }
    addOne(title, date, time, { subs, note });
  };
  const addOne = (title, date, time = "", extra = {}) =>
    // A new task is appended to the bottom of that day's list
    setTasks((prev) => [...prev, newTask(title, date, maxOrder(prev, date) + 1, time, extra)]);

  // Handlers are stable (functional updates only), so memoized task rows do not re-render needlessly
  const toggle = useCallback(
    (id) => setTasks((prev) => prev.map((t) => (t.id === id ? patchTask(t, { done: !t.done }) : t))),
    [],
  );
  const toggleStar = useCallback(
    (id) => setTasks((prev) => prev.map((t) => (t.id === id ? patchTask(t, { starred: !t.starred }) : t))),
    [],
  );
  // Ticking a subtask changes only that subtask (its own timestamp), so it merges cleanly with other devices
  const toggleSubtask = useCallback(
    (id, subId) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? patchTask(t, { subs: toggleSub(t.subs, subId) }) : t)),
      ),
    [],
  );
  const setDeleted = useCallback(
    (id, deleted) =>
      setTasks((prev) => prev.map((t) => (t.id === id ? patchTask(t, { deleted }) : t))),
    [],
  );
  const remove = useCallback(
    (id) => {
      setDeleted(id, true);
      setToast({ key: Date.now(), message: "Task deleted", undo: () => setDeleted(id, false) });
    },
    [setDeleted],
  );

  const moveOverdueToToday = () => {
    const ids = new Set(overdue.map((t) => t.id));
    const before = new Map(overdue.map((t) => [t.id, t]));
    setTasks((prev) => {
      let last = maxOrder(prev, today);
      const now = Date.now();
      return prev.map((t) => (ids.has(t.id) ? patchTask(t, { date: today, order: ++last }, now) : t));
    });
    setToast({
      key: Date.now(),
      message: ids.size + (ids.size === 1 ? " task" : " tasks") + " moved to today",
      undo: () =>
        setTasks((prev) =>
          prev.map((t) => {
            const old = before.get(t.id);
            return old ? patchTask(t, { date: old.date, order: old.order }) : t;
          }),
        ),
    });
  };

  // "n" or "/" jumps to the new-task field (when not typing somewhere)
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "n" && e.key !== "/") return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const el = document.getElementById("composer-input");
      if (!el) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Edit dialog: opened by tapping a task
  const [editingId, setEditingId] = useState(null);
  const editing = editingId
    ? tasks.find((t) => t.id === editingId && !t.deleted) || null
    : null;

  // Recurring rules sheet and rule editor
  const [rulesOpen, setRulesOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const editingRule = editingRuleId ? liveRules.find((r) => r.id === editingRuleId) || null : null;
  const ruleOf = (id) => (id ? liveRules.find((r) => r.id === id) || null : null);
  useEffect(() => {
    if (liveRules.length === 0) setRulesOpen(false);
  }, [liveRules.length]);

  const saveRule = (id, { title, time, days, count, subs, note }) => {
    const cur = rules.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, title, time, days, count, subs: cleanSubs(subs), note: cleanNote(note), updatedAt: Date.now() };
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setTasks((prev) => syncInstances(prev, next, today, cur));
    setEditingRuleId(null);
  };
  const removeRule = (id) => {
    const cur = rules.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, deleted: true, updatedAt: Date.now() };
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setTasks((prev) => syncInstances(prev, next, today));
    setEditingRuleId(null);
    setToast({ key: Date.now(), message: "Recurring task deleted" });
  };

  const save = (id, { title, date, time, note, subs }) => {
    setTasks((prev) => {
      const cur = prev.find((t) => t.id === id);
      if (!cur) return prev;
      // Moved to another day: goes to the bottom of that day's list
      const order = date !== cur.date ? maxOrder(prev, date) + 1 : cur.order;
      const next = patchTask(cur, { title, date, time, note: cleanNote(note), subs: normalizeSubs(subs ?? cur.subs), order });
      return next === cur ? prev : prev.map((t) => (t.id === id ? next : t));
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
    const position = new Map(ids.map((id, i) => [id, i + 1]));
    const now = Date.now();
    setTasks((prev) => prev.map((t) => (position.has(t.id) ? patchTask(t, { order: position.get(t.id) }, now) : t)));
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
    const isToday = date === today;
    return (
      <section
        key={date}
        aria-label={label.primary + " " + label.secondary}
        className={"day-card " + (isToday ? "day-card-today" : "")}
      >
        {isToday ? null : (
          <GroupHead
            primary={label.primary}
            secondary={label.secondary}
            count={all.length ? done + "/" + all.length : "0"}
          />
        )}
        {all.length === 0 ? (
          <p className="py-3 text-sm text-[var(--muted)]">No tasks on this day.</p>
        ) : items.length === 0 ? (
          <p className="py-3 text-sm text-[var(--muted)]">All tasks completed ✨</p>
        ) : (
          <div>
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
                  onToggleSub={toggleSubtask}
                  onToggleStar={toggleStar}
                />
              )}
            />
          </div>
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
                    onToggleSub={toggleSubtask}
                  onToggleStar={toggleStar}
                  />
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </section>
    );
  };

  const todayLabel = (() => {
    const l = groupLabel(today, today);
    return l.secondary;
  })();

  const allStats = pastStats(allPast);

  return (
    <main className="mx-auto w-full max-w-xl pb-40 sm:max-w-lg md:max-w-xl lg:max-w-2xl sm:pb-36">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--muted)]">{todayLabel}</p>
          <div className="-mr-2.5 flex shrink-0 items-center sm:-mr-2">
            {liveRules.length > 0 ? <RulesButton count={liveRules.length} onClick={() => setRulesOpen(true)} /> : null}
            {hasPast ? <HistoryButton count={allPast.length} onClick={openHistory} /> : null}
            <SyncBar sync={sync} />
          </div>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3 sm:mt-2">
          <h1 className="text-[2.25rem] font-semibold leading-none tracking-tight text-[var(--fg)] sm:text-[2.5rem]">Today</h1>
          <p className="tabular shrink-0 pb-0.5 text-[12px] font-medium text-[var(--muted)] sm:pb-1 sm:text-[13px]">
            {todayItems.length === 0
              ? "Nothing planned"
              : todayDone === todayItems.length
                ? "All done 🎉"
                : todayDone + " of " + todayItems.length + " done"}
          </p>
        </div>
        <div
          className="progress mt-4 sm:mt-5"
          role="progressbar"
          aria-label="Today's progress"
          aria-valuemin={0}
          aria-valuemax={todayItems.length}
          aria-valuenow={todayDone}
        >
          <span
            style={{
              width: (todayItems.length ? (todayDone / todayItems.length) * 100 : 0) + "%",
            }}
          />
        </div>
      </header>

      <Composer today={today} onAdd={add} />

      <div className="flex flex-col gap-6 sm:gap-8">
        {overdue.length > 0 ? (
          <section
            aria-label="Overdue tasks"
            className="day-card day-card-warn"
          >
            <h2 className="mb-1 flex items-center gap-2 text-sm">
              <span className="font-medium text-[var(--warn)]">Overdue</span>
              <span className="tabular text-[var(--muted)]">{overdue.length}</span>
              <span className="flex-1" aria-hidden="true"></span>
              <button type="button" onClick={moveOverdueToToday} className="btn btn-ghost btn-sm">
                Move all to today
              </button>
            </h2>
            <ul>
              {overdue.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  dateLabel={relativeName(t.date, today) || shortDate(t.date)}
                  onToggle={toggle}
                  onEdit={setEditingId}
                  onRemove={remove}
                  onToggleSub={toggleSubtask}
                  onToggleStar={toggleStar}
                />
              ))}
            </ul>
          </section>
        ) : null}
        {upcoming.map(renderDay)}
        {upcoming.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--muted)]">
            {dates.length === 0
              ? "No tasks yet. Add your first one below."
              : "No tasks for today or later."}
          </p>
        ) : null}
      </div>

      {historyOpen && hasPast ? (
        <HistorySheet
          summary={<HistoryStats days={allPast.length} done={allStats.done} total={allStats.total} />}
          onClose={() => setHistoryOpen(false)}
        >
          {pastMonths.length === 0 ? (
            <HistoryEmpty />
          ) : (
            pastMonths.map((m) => {
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
                        done={completed.length}
                        total={all.length}
                        open={openDays.has(date)}
                        onToggle={() => toggleDay(date)}
                      >
                        {pending.length > 0 ? (
                          <ul>
                            {pending.map((t) => (
                              <TaskRow key={t.id} task={t} onToggle={toggle} onEdit={setEditingId} onRemove={remove} onToggleSub={toggleSubtask}
                  onToggleStar={toggleStar} />
                            ))}
                          </ul>
                        ) : null}
                        {completed.length > 0 ? (
                          <ul>
                            {completed.map((t) => (
                              <TaskRow key={t.id} task={t} onToggle={toggle} onEdit={setEditingId} onRemove={remove} onToggleSub={toggleSubtask}
                  onToggleStar={toggleStar} />
                            ))}
                          </ul>
                        ) : null}
                      </HistoryDay>
                    );
                  })}
                </div>
              );
            })
          )}
          <HistoryLoadMore
            hasMore={allPast.length > historyLimit}
            onLoadMore={() => setHistoryLimit((n) => n + HISTORY_PAGE_DAYS)}
          />
        </HistorySheet>
      ) : null}

      <Toast toast={toast} onClose={closeToast} />

      {rulesOpen && liveRules.length > 0 ? (
        <RulesSheet rules={liveRules} today={today} onOpen={setEditingRuleId} onClose={() => setRulesOpen(false)} />
      ) : null}

      {editingRule ? (
        <EditDialog
          key={"rule-" + editingRule.id}
          mode="rule"
          task={editingRule}
          onSave={saveRule}
          onDelete={removeRule}
          onClose={() => setEditingRuleId(null)}
        />
      ) : null}

      {editing ? (
        <EditDialog
          task={editing}
          ruleInfo={ruleOf(editing.ruleId) ? describeRule(ruleOf(editing.ruleId)) : ""}
          onEditRule={() => {
            const rid = editing.ruleId;
            setEditingId(null);
            setEditingRuleId(rid);
          }}
          onSave={save}
          onDelete={removeAndClose}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </main>
  );
}
