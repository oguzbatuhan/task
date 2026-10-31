import test from "node:test";
import assert from "node:assert/strict";
import { groupLabel, relativeName, shiftIso } from "../src/lib/dates.js";
import { isValidTime, mergeTasks, newTask, normalizeTasks } from "../src/lib/tasks.js";
import { groupByMonth, monthKey, monthLabel } from "../src/lib/history.js";

test("shiftIso moves across month and year boundaries", () => {
  assert.equal(shiftIso("2026-10-20", -1), "2026-10-19");
  assert.equal(shiftIso("2026-11-01", -1), "2026-10-31");
  assert.equal(shiftIso("2027-01-01", -1), "2026-12-31");
  assert.equal(shiftIso("2026-02-28", 1), "2026-03-01");
  assert.equal(shiftIso("2026-10-25", 1), "2026-10-26");
});

test("relative day names", () => {
  assert.equal(relativeName("2026-10-20", "2026-10-20"), "Bugün");
  assert.equal(relativeName("2026-10-19", "2026-10-20"), "Dün");
  assert.equal(relativeName("2026-10-21", "2026-10-20"), "Yarın");
  assert.equal(relativeName("2026-10-17", "2026-10-20"), null);
});

test("group labels", () => {
  assert.deepEqual(groupLabel("2026-10-19", "2026-10-20"), { primary: "Dün", secondary: "19 Ekim Pazartesi" });
  assert.equal(groupLabel("2026-10-17", "2026-10-20").primary, "Cumartesi");
});

test("a completed task keeps its date and the latest change wins on merge", () => {
  const t = newTask("a", "2026-10-19", 1);
  const done = { ...t, done: true, updatedAt: t.updatedAt + 10 };
  const merged = mergeTasks([t], [done]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].done, true);
  assert.equal(merged[0].date, "2026-10-19");
});

test("task time is optional and validated", () => {
  assert.equal(newTask("a", "2026-10-19", 1).time, "");
  assert.equal(newTask("a", "2026-10-19", 1, "09:30").time, "09:30");
  assert.equal(newTask("a", "2026-10-19", 1, "25:99").time, "");
  assert.equal(isValidTime("23:59"), true);
  // Tasks saved before the time field existed load with an empty time
  const [old] = normalizeTasks([{ id: "x", title: "t", date: "2026-10-19" }]);
  assert.equal(old.time, "");
  assert.equal(mergeTasks([], [{ ...old, time: "08:00", updatedAt: 5 }])[0].time, "08:00");
});

test("history: monthKey and monthLabel", () => {
  assert.equal(monthKey("2026-10-18"), "2026-10");
  // Same year as today: month name only; any other year: name and year
  assert.equal(monthLabel("2026-10", "2026-10-30"), "Ekim");
  assert.equal(monthLabel("2025-12", "2026-10-30"), "Aralık 2025");
});

test("history: groupByMonth keeps newest-first order and splits by month", () => {
  const days = [
    { date: "2026-10-29" },
    { date: "2026-10-02" },
    { date: "2026-09-30" },
    { date: "2025-12-31" },
  ];
  const groups = groupByMonth(days, "2026-10-30");
  assert.deepEqual(
    groups.map((g) => [g.key, g.label, g.days.map((d) => d.date)]),
    [
      ["2026-10", "Ekim", ["2026-10-29", "2026-10-02"]],
      ["2026-09", "Eylül", ["2026-09-30"]],
      ["2025-12", "Aralık 2025", ["2025-12-31"]],
    ]
  );
  assert.deepEqual(groupByMonth([], "2026-10-30"), []);
});

import {
  HORIZON_DAYS,
  daysForCount,
  describeDays,
  instanceId,
  materialize,
  mergeRules,
  newRule,
  normalizeRules,
  syncInstances,
} from "../src/lib/repeat.js";

// 2026-10-30 is a Friday
test("repeat: describeDays and daysForCount", () => {
  assert.equal(describeDays([0, 1, 2, 3, 4, 5, 6]), "Her gün");
  assert.equal(describeDays([5, 4, 3, 2, 1]), "Hafta içi her gün");
  assert.equal(describeDays([0, 6]), "Hafta sonu");
  assert.equal(describeDays([3]), "Her Çar");
  assert.equal(describeDays([5, 1, 3]), "Pzt, Çar, Cum");
  assert.deepEqual(daysForCount(3), [1, 3, 5]);
  assert.equal(daysForCount(7).length, 7);
});

test("repeat: materialize creates tasks only on the chosen weekdays, once", () => {
  const rule = newRule("spor", [1, 3, 5], "2026-10-30", "18:00");
  const tasks = materialize([], [rule], "2026-10-30");
  // Fri 30 Oct, Mon 2, Wed 4, Fri 6, Mon 9, Wed 11 (14 days: 30 Oct .. 12 Nov)
  assert.deepEqual(tasks.map((t) => t.date), ["2026-10-30", "2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-11"]);
  assert.ok(tasks.every((t) => t.title === "spor" && t.time === "18:00" && t.ruleId === rule.id));
  assert.equal(tasks[0].id, instanceId(rule.id, "2026-10-30"));
  // Running again adds nothing and returns the same array
  assert.equal(materialize(tasks, [rule], "2026-10-30"), tasks);
  assert.ok(HORIZON_DAYS >= 7);
});

test("repeat: rule start date, deleted rules and deleted tasks", () => {
  const rule = newRule("kitap", [0, 1, 2, 3, 4, 5, 6], "2026-11-02");
  const tasks = materialize([], [rule], "2026-10-30");
  assert.equal(tasks[0].date, "2026-11-02");
  // A task deleted by the user is not created again
  const deleted = tasks.map((t, i) => (i === 0 ? { ...t, deleted: true } : t));
  assert.equal(materialize(deleted, [rule], "2026-10-30"), deleted);
  assert.equal(materialize([], [{ ...rule, deleted: true }], "2026-10-30").length, 0);
});

test("repeat: two devices generating the same day merge into one task", () => {
  const rule = newRule("su iç", [1], "2026-10-30");
  const a = materialize([], [rule], "2026-10-30");
  const b = materialize([], [rule], "2026-10-30");
  assert.equal(mergeTasks(a, b).length, a.length);
});

test("repeat: changing days removes future unfinished tasks of removed days only", () => {
  const rule = newRule("spor", [1, 5], "2026-10-30");
  let tasks = materialize([], [rule], "2026-10-30");
  // Friday 30 Oct is done
  tasks = tasks.map((t) => (t.date === "2026-10-30" ? { ...t, done: true } : t));
  const edited = { ...rule, days: [1], title: "yüzme" };
  const next = syncInstances(tasks, edited, "2026-10-30");
  const live = next.filter((t) => !t.deleted);
  assert.deepEqual(live.map((t) => t.date), ["2026-10-30", "2026-11-02", "2026-11-09"]);
  // done one keeps its old title; unfinished future ones follow the rule
  assert.equal(live[0].title, "spor");
  assert.equal(live[1].title, "yüzme");
  // After deleting the rule nothing unfinished remains
  const gone = syncInstances(tasks, { ...rule, deleted: true }, "2026-10-30").filter((t) => !t.deleted);
  assert.deepEqual(gone.map((t) => t.date), ["2026-10-30"]);
});

test("repeat: old data loads, rules normalize and merge", () => {
  const [old] = normalizeTasks([{ id: "x", title: "t", date: "2026-10-19" }]);
  assert.equal(old.ruleId, "");
  assert.deepEqual(normalizeRules(undefined), []);
  const r = newRule("a", [1], "2026-10-30");
  const merged = mergeRules([r], [{ ...r, days: [2], updatedAt: r.updatedAt + 5 }]);
  assert.deepEqual(merged[0].days, [2]);
});
