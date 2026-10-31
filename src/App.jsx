import { useCallback, useEffect, useMemo, useState } from "react";
import { DoneHead, GroupHead, TaskRow } from "./components/TaskRow.jsx";
import { HistoryButton, HistoryDay, HistoryEmpty, HistoryLoadMore, HistorySheet, HistoryToolbar, MonthHead } from "./components/History.jsx";
import Composer from "./components/Composer.jsx";
import SyncBar from "./components/SyncBar.jsx";
import EditDialog from "./components/EditDialog.jsx";
import SortableList from "./components/SortableList.jsx";
import Toast from "./components/Toast.jsx";
import { useCloudSync } from "./hooks/useCloudSync.js";
import { groupLabel, relativeName, shortDate, toIso } from "./lib/dates.js";
import { groupByMonth } from "./lib/history.js";
import { STORAGE_KEY, loadTasks, newTask } from "./lib/tasks.js";
import { RULES_KEY, describeDays, loadRules, materialize, newRule, syncInstances } from "./lib/repeat.js";
import { RulesButton, RulesSheet } from "./components/RulesSheet.jsx";

const HISTORY_PAGE_DAYS = 30;

export default function App() {
  const [today, setToday] = useState(() => toIso(new Date()));
  // History drawer: closed by default; which days are open and how many days are loaded
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_DAYS);
  const [openDays, setOpenDays] = useState(() => new Set());
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all"); // all | done | pending
  const [tasks, setTasks] = useState(loadTasks);
  // Recurring rules: kept next to the tasks, they create the tasks of the coming days (see lib/repeat.js)
  const [rules, setRules] = useState(loadRules);
  const sync = useCloudSync(tasks, setTasks, rules, setRules);
  const liveRules = useMemo(() => rules.filter((r) => !r.deleted), [rules]);

  // Local copy: tasks are kept in this browser even when not connected to the cloud backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);
  useEffect(() => {
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    } catch {}
  }, [rules]);

  // Create the tasks of recurring rules for the coming days (also after midnight, a rule change or a cloud sync).
  // Returns the same list when nothing is missing, so this never loops.
  useEffect(() => {
    setTasks((prev) => materialize(prev, rules, today));
  }, [rules, today, tasks]);

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
    setHistoryQuery("");
    setHistoryFilter("all");
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

  // Filtered past days (search + status filter). Keeps newest-first order.
  const filteredPast = useMemo(() => {
    if (!historyOpen) return [];
    const q = historyQuery.trim().toLocaleLowerCase("tr");
    return allPast.slice(0, historyLimit).filter((date) => {
      const all = byDate.get(date) || [];
      if (historyFilter === "done" && !all.some((t) => t.done)) return false;
      if (historyFilter === "pending" && !all.some((t) => !t.done)) return false;
      if (!q) return true;
      const label = groupLabel(date, today);
      const hay = (
        label.primary +
        " " +
        (label.secondary || "") +
        " " +
        all.map((t) => t.title).join(" ")
      ).toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }, [historyOpen, allPast, historyLimit, historyQuery, historyFilter, byDate, today]);

  const pastMonths = useMemo(
    () => (historyOpen ? groupByMonth(filteredPast.map((date) => ({ date })), today) : []),
    [historyOpen, filteredPast, today],
  );

  const todayItems = byDate.get(today) || [];
  const todayDone = todayItems.filter((t) => t.done).length;

  const add = (title, date, time = "", days = []) => {
    if (days.length > 0) {
      const rule = newRule(title, days, date, time);
      setRules((prev) => [...prev, rule]);
      return; // the tasks themselves are created by the effect above
    }
    addOne(title, date, time);
  };
  const addOne = (title, date, time = "") =>
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
  const setDeleted = (id, deleted) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, deleted, updatedAt: Date.now() } : t,
      ),
    );

  // Short message at the bottom; deleting offers "Geri al"
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const remove = (id) => {
    setDeleted(id, true);
    setToast({ key: Date.now(), message: "Görev silindi", undo: () => setDeleted(id, false) });
  };

  // Unfinished tasks from earlier days: they used to hide in the history, now they stay in sight
  const overdue = useMemo(
    () =>
      tasks
        .filter((t) => !t.deleted && !t.done && t.date < today)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.order - b.order ||
            a.title.localeCompare(b.title, "tr"),
        ),
    [tasks, today],
  );
  const moveOverdueToToday = () => {
    const ids = new Set(overdue.map((t) => t.id));
    const before = new Map(overdue.map((t) => [t.id, t]));
    setTasks((prev) => {
      let last = Math.max(0, ...prev.filter((t) => !t.deleted && t.date === today).map((t) => t.order));
      const now = Date.now();
      return prev.map((t) => (ids.has(t.id) ? { ...t, date: today, order: ++last, updatedAt: now } : t));
    });
    setToast({
      key: Date.now(),
      message: ids.size + " görev bugüne taşındı",
      undo: () =>
        setTasks((prev) =>
          prev.map((t) => {
            const old = before.get(t.id);
            return old ? { ...old, updatedAt: Date.now() } : t;
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  const saveRule = (id, { title, time, days }) => {
    const cur = rules.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, title, time, days, updatedAt: Date.now() };
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setTasks((prev) => syncInstances(prev, next, today));
    setEditingRuleId(null);
  };
  const removeRule = (id) => {
    const cur = rules.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, deleted: true, updatedAt: Date.now() };
    setRules((prev) => prev.map((r) => (r.id === id ? next : r)));
    setTasks((prev) => syncInstances(prev, next, today));
    setEditingRuleId(null);
    setToast({ key: Date.now(), message: "Tekrarlayan görev silindi" });
  };

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
    const isToday = date === today;
    return (
      <section
        key={date}
        aria-label={label.primary + " " + label.secondary}
        className={"day-card " + (isToday ? "day-card-today" : "")}
      >
        <GroupHead
          primary={label.primary}
          secondary={label.secondary}
          count={all.length ? done + "/" + all.length : "0"}
        />
        {all.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">Bu günde görev yok.</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--accent)]">Tüm görevler tamamlandı ✨</p>
        ) : (
          <div className="mt-1">
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

  const allStats = historyOpen ? pastStats(allPast) : { total: 0, done: 0 };

  return (
    <main className="mx-auto w-full max-w-xl">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--muted)]">{todayLabel}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Görevler</h1>
          </div>
          <SyncBar sync={sync} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="progress min-w-0 flex-1 max-w-[12rem] sm:max-w-[14rem]"
            role="progressbar"
            aria-label="Bugünün ilerlemesi"
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
          <p className="tabular shrink-0 text-sm text-[var(--muted)]">
            {todayItems.length === 0
              ? "Bugün için görev yok"
              : todayDone === todayItems.length
                ? "Bugün tamam 🎉"
                : todayDone + "/" + todayItems.length}
          </p>
        </div>
      </header>

      <Composer today={today} onAdd={add} />

      <div className="flex flex-col gap-5">
        {overdue.length > 0 ? (
          <section
            aria-label="Geciken görevler"
            className="day-card day-card-warn"
          >
            <h2 className="mb-1 flex items-center gap-2 text-sm">
              <span className="font-medium text-[var(--warn)]">Geciken</span>
              <span className="tabular text-[var(--muted)]">{overdue.length}</span>
              <span className="flex-1" aria-hidden="true"></span>
              <button type="button" onClick={moveOverdueToToday} className="btn btn-ghost btn-sm">
                Hepsini bugüne taşı
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
                />
              ))}
            </ul>
          </section>
        ) : null}
        {upcoming.map(renderDay)}
        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            {dates.length === 0
              ? "Henüz görev yok. Yukarıdan ilk görevini ekle."
              : "Bugün ve sonrası için görev yok."}
          </p>
        ) : null}

        {hasPast || liveRules.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2.5 pt-1">
            {liveRules.length > 0 ? <RulesButton count={liveRules.length} onClick={() => setRulesOpen(true)} /> : null}
            {hasPast ? <HistoryButton count={allPast.length} onClick={openHistory} /> : null}
          </div>
        ) : null}
      </div>

      {historyOpen && hasPast ? (
        <HistorySheet
          summary={allPast.length + " gün · " + allStats.done + "/" + allStats.total + " tamamlandı"}
          onClose={() => setHistoryOpen(false)}
          toolbar={
            <HistoryToolbar
              query={historyQuery}
              onQueryChange={setHistoryQuery}
              filter={historyFilter}
              onFilterChange={setHistoryFilter}
              onExpandAll={() => setOpenDays(new Set(filteredPast))}
              onCollapseAll={() => setOpenDays(new Set())}
              hasDays={filteredPast.length > 0}
            />
          }
        >
          {pastMonths.length === 0 ? (
            <HistoryEmpty query={historyQuery} filter={historyFilter} />
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
                        meta={completed.length + "/" + all.length}
                        open={openDays.has(date)}
                        onToggle={() => toggleDay(date)}
                      >
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
        <RulesSheet rules={liveRules} onOpen={setEditingRuleId} onClose={() => setRulesOpen(false)} />
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
          ruleInfo={ruleOf(editing.ruleId) ? describeDays(ruleOf(editing.ruleId).days) : ""}
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
