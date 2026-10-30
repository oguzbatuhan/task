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
