import test from "node:test";
import assert from "node:assert/strict";
import { groupLabel, relativeName, shiftIso } from "../src/lib/dates.js";
import { mergeTasks, newTask } from "../src/lib/tasks.js";

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
