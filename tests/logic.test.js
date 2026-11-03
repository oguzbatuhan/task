import test from "node:test";
import assert from "node:assert/strict";
import { groupLabel, relativeName, shiftIso } from "../src/lib/dates.js";
import { isValidTime, maxOrder, mergeTasks, newTask, normalizeTasks, patchTask, sameTasks } from "../src/lib/tasks.js";
import { addSub, finalizeSubs, liveSubs, mergeSubs, removeSub, renameSub, subsFromTitles, toggleSub } from "../src/lib/subs.js";
import { groupByMonth, monthKey, monthLabel } from "../src/lib/history.js";

test("shiftIso moves across month and year boundaries", () => {
  assert.equal(shiftIso("2026-10-20", -1), "2026-10-19");
  assert.equal(shiftIso("2026-11-01", -1), "2026-10-31");
  assert.equal(shiftIso("2027-01-01", -1), "2026-12-31");
  assert.equal(shiftIso("2026-02-28", 1), "2026-03-01");
  assert.equal(shiftIso("2026-10-25", 1), "2026-10-26");
});

test("relative day names", () => {
  assert.equal(relativeName("2026-10-20", "2026-10-20"), "Today");
  assert.equal(relativeName("2026-10-19", "2026-10-20"), "Yesterday");
  assert.equal(relativeName("2026-10-21", "2026-10-20"), "Tomorrow");
  assert.equal(relativeName("2026-10-17", "2026-10-20"), null);
});

test("group labels", () => {
  assert.deepEqual(groupLabel("2026-10-19", "2026-10-20"), { primary: "Yesterday", secondary: "October 19 Monday" });
  assert.equal(groupLabel("2026-10-17", "2026-10-20").primary, "Saturday");
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
  assert.equal(monthLabel("2026-10", "2026-10-30"), "October");
  assert.equal(monthLabel("2025-12", "2026-10-30"), "December 2025");
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
      ["2026-10", "October", ["2026-10-29", "2026-10-02"]],
      ["2026-09", "September", ["2026-09-30"]],
      ["2025-12", "December 2025", ["2025-12-31"]],
    ]
  );
  assert.deepEqual(groupByMonth([], "2026-10-30"), []);
});

import {
  HORIZON_DAYS,
  describeDays,
  instanceId,
  isBeyondWindow,
  materialize,
  describeRule,
  nextOccurrence,
  isEnded,
  lastDate,
  occurrencesUntil,
  mergeRules,
  newRule,
  normalizeRules,
  syncInstances,
} from "../src/lib/repeat.js";

// 2026-10-30 is a Friday
test("repeat: describeDays", () => {
  assert.equal(describeDays([0, 1, 2, 3, 4, 5, 6]), "Every day");
  assert.equal(describeDays([5, 4, 3, 2, 1]), "Every weekday");
  assert.equal(describeDays([0, 6]), "Weekends");
  assert.equal(describeDays([3]), "Every Wed");
  assert.equal(describeDays([5, 1, 3]), "Mon, Wed, Fri");
});

test("repeat: materialize creates tasks only on the chosen weekdays, once", () => {
  const rule = newRule("gym", [1, 3, 5], "2026-10-30", "18:00");
  const tasks = materialize([], [rule], "2026-10-30");
  // Only today and tomorrow are created: Fri 30 Oct yes, Sat 31 Oct is not a rule day
  assert.deepEqual(tasks.map((t) => t.date), ["2026-10-30"]);
  // The next day comes into the window by itself: Sun 1 Nov -> Mon 2 Nov is tomorrow
  const next = materialize(tasks, [rule], "2026-11-01");
  assert.deepEqual(next.map((t) => t.date), ["2026-10-30", "2026-11-02"]);
  assert.ok(tasks.every((t) => t.title === "gym" && t.time === "18:00" && t.ruleId === rule.id));
  assert.equal(tasks[0].id, instanceId(rule.id, "2026-10-30"));
  // Running again adds nothing and returns the same array
  assert.equal(materialize(tasks, [rule], "2026-10-30"), tasks);
  assert.equal(HORIZON_DAYS, 2);
});

test("repeat: rule start date, deleted rules and deleted tasks", () => {
  const rule = newRule("read", [0, 1, 2, 3, 4, 5, 6], "2026-11-02");
  assert.equal(materialize([], [rule], "2026-10-30").length, 0); // starts after tomorrow: nothing yet
  const tasks = materialize([], [rule], "2026-11-01");
  assert.equal(tasks[0].date, "2026-11-02");
  // A task deleted by the user is not created again
  const deleted = tasks.map((t, i) => (i === 0 ? { ...t, deleted: true } : t));
  assert.equal(materialize(deleted, [rule], "2026-10-30"), deleted);
  assert.equal(materialize([], [{ ...rule, deleted: true }], "2026-10-30").length, 0);
});

test("repeat: two devices generating the same day merge into one task", () => {
  const rule = newRule("drink water", [1], "2026-10-30");
  const a = materialize([], [rule], "2026-10-30");
  const b = materialize([], [rule], "2026-10-30");
  assert.equal(mergeTasks(a, b).length, a.length);
});

test("repeat: changing days removes future unfinished tasks of removed days only", () => {
  const rule = newRule("gym", [1, 5], "2026-10-30");
  // Friday 30 Oct is created and done; on Sunday 1 Nov Monday 2 Nov comes into the window
  let tasks = materialize([], [rule], "2026-10-30");
  tasks = tasks.map((t) => ({ ...t, done: true }));
  tasks = materialize(tasks, [rule], "2026-11-01");
  assert.deepEqual(tasks.map((t) => t.date), ["2026-10-30", "2026-11-02"]);
  // Rule now only Friday: the unfinished Monday goes away, the done Friday stays untouched
  const onlyFri = { ...rule, days: [5], title: "swim" };
  let live = syncInstances(tasks, onlyFri, "2026-11-01").filter((t) => !t.deleted);
  assert.deepEqual(live.map((t) => t.date), ["2026-10-30"]);
  assert.equal(live[0].title, "gym");
  // Rule now only Monday: the unfinished Monday follows the new title
  const onlyMon = { ...rule, days: [1], title: "swim" };
  live = syncInstances(tasks, onlyMon, "2026-11-01").filter((t) => !t.deleted);
  assert.deepEqual(live.map((t) => t.date), ["2026-10-30", "2026-11-02"]);
  assert.equal(live[1].title, "swim");
  // After deleting the rule nothing unfinished remains
  const gone = syncInstances(tasks, { ...rule, deleted: true }, "2026-11-01").filter((t) => !t.deleted);
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

test("repeat: nextOccurrence and hiding tasks beyond the today+tomorrow window", () => {
  const rule = newRule("gym", [1], "2026-10-30"); // Mondays
  assert.equal(nextOccurrence(rule, "2026-10-30"), "2026-11-02");
  assert.equal(nextOccurrence({ ...rule, days: [] }, "2026-10-30"), "");
  // Tasks made by an older version (14 days ahead) stay stored but are hidden until their day is near
  const far = { ...newTask("gym", "2026-11-09", 1), id: instanceId(rule.id, "2026-11-09"), ruleId: rule.id };
  assert.equal(isBeyondWindow(far, "2026-10-30"), true);
  assert.equal(isBeyondWindow(far, "2026-11-08"), false); // tomorrow
  assert.equal(isBeyondWindow({ ...far, date: "2026-11-12" }, "2026-10-30"), false); // user moved it
  assert.equal(isBeyondWindow({ ...far, ruleId: "" }, "2026-10-30"), false); // ordinary task
  assert.equal(isBeyondWindow({ ...far, done: true }, "2026-10-30"), false);
});

test("repeat: a rule can end after a number of occurrences", () => {
  const rule = newRule("meds", [1, 3], "2026-10-26", "", 3); // Mon 26, Wed 28, Mon 2 Nov, then it ends
  assert.equal(rule.count, 3);
  assert.equal(lastDate(rule), "2026-11-02");
  assert.equal(lastDate({ ...rule, count: 0 }), "");
  assert.equal(occurrencesUntil(rule, "2026-10-28"), 2);
  assert.equal(describeRule(rule), "Mon, Wed · 3 times");
  // Up to the last day tasks are created, after it nothing more (Wed 4 Nov would be the 4th)
  assert.deepEqual(materialize([], [rule], "2026-11-02").map((t) => t.date), ["2026-11-02"]);
  assert.equal(materialize([], [rule], "2026-11-03").length, 0);
  assert.equal(isEnded(rule, "2026-11-02"), false);
  assert.equal(isEnded(rule, "2026-11-03"), true);
  // Endless rules never end
  const endless = newRule("water", [1], "2026-10-26");
  assert.equal(isEnded(endless, "2030-01-01"), false);
  assert.equal(materialize([], [endless], "2030-01-07").length, 1);
  // Lowering the count removes the unfinished tasks beyond the new last day
  const tasks = materialize([], [rule], "2026-11-02");
  const shorter = syncInstances(tasks, { ...rule, count: 2 }, "2026-11-02").filter((t) => !t.deleted);
  assert.equal(shorter.length, 0);
  assert.equal(normalizeRules([{ ...rule, count: 5000 }])[0].count, 0);
});

test("subtasks: old data gets none, bad entries dropped, survive merge", () => {
  const [old] = normalizeTasks([{ id: "x", title: "t", date: "2026-10-19" }]);
  assert.deepEqual(old.subs, []);
  const [t] = normalizeTasks([
    { id: "y", title: "t", date: "2026-10-19", subs: [{ id: "a", title: "one", done: 1 }, { id: "b", title: "  " }, null, { title: "no id" }] },
  ]);
  assert.deepEqual(t.subs, [{ id: "a", title: "one", done: true, updatedAt: 0, pos: 0, deleted: false }]);
  // a removed subtask is kept as a tombstone, so the removal reaches the other device
  const T = Date.now();
  const removed = { ...t, subs: removeSub(t.subs, "a", T), updatedAt: T };
  const merged = mergeTasks([{ ...t, updatedAt: 1 }], [removed])[0];
  assert.deepEqual(liveSubs(merged.subs), []);
  assert.equal(merged.subs.length, 1);
  assert.deepEqual(newTask("n", "2026-10-19").subs, []);
});

test("recurring subtasks: copied to new occurrences, replaced only when the rule's subtasks change", async () => {
  const { newRule, materialize, syncInstances, normalizeRules } = await import("../src/lib/repeat.js");
  const today = "2026-11-02"; // Monday
  const rule = newRule("Gym", [1, 2], today, "", 0, ["Warm up", "  ", "Stretch"]);
  assert.deepEqual(rule.subs, ["Warm up", "Stretch"]);
  assert.deepEqual(normalizeRules([{ ...rule, subs: undefined }])[0].subs, []);

  let tasks = materialize([], [rule], today);
  assert.equal(tasks.length, 2);
  assert.deepEqual(tasks[0].subs.map((s) => s.title), ["Warm up", "Stretch"]);

  // tick one on a single day; a plain rename keeps it
  tasks = tasks.map((t, i) => (i === 0 ? { ...t, subs: t.subs.map((s, j) => (j === 0 ? { ...s, done: true } : s)) } : t));
  const renamed = { ...rule, title: "Gym!" };
  assert.equal(syncInstances(tasks, renamed, today, rule)[0].subs[0].done, true);

  // changing the rule's subtasks replaces them but keeps ticks by title
  const changed = { ...rule, subs: ["Warm up", "Lift"] };
  const out = syncInstances(tasks, changed, today, rule)[0].subs;
  assert.deepEqual(liveSubs(out).map((s) => [s.title, s.done]), [["Warm up", true], ["Lift", false]]);
  // the dropped subtask is a tombstone, so other devices drop it too
  assert.equal(out.filter((s) => s.deleted).length, 1);
});

test("notes: normalize, copy to occurrences, replaced only when the rule's note changes", async () => {
  const { newRule, materialize, syncInstances } = await import("../src/lib/repeat.js");
  const [old] = normalizeTasks([{ id: "x", title: "t", date: "2026-10-19" }]);
  assert.equal(old.note, "");
  assert.equal(normalizeTasks([{ id: "y", title: "t", date: "2026-10-19", note: "  hi  " }])[0].note, "hi");
  const today = "2026-11-02";
  const rule = newRule("Gym", [1, 2], today, "", 0, [], "bring towel");
  let tasks = materialize([], [rule], today);
  assert.equal(tasks[0].note, "bring towel");
  tasks = tasks.map((t, i) => (i === 0 ? { ...t, note: "custom" } : t));
  assert.equal(syncInstances(tasks, { ...rule, title: "Gym!" }, today, rule)[0].note, "custom");
  assert.equal(syncInstances(tasks, { ...rule, note: "new" }, today, rule)[0].note, "new");
});

test("sync: a subtask ticked on one device and the task renamed on another keep both changes", () => {
  const T = Date.now();
  const base = newTask("a", "2026-11-02", 1, "", { subs: ["x", "y"] });
  const [x] = base.subs;
  // device A ticks x; device B renames the task later (newer task-level change)
  const a = { ...base, subs: toggleSub(base.subs, x.id, T + 20), updatedAt: T + 20 };
  const b = { ...base, title: "renamed", updatedAt: T + 30 };
  const merged = mergeTasks([a], [b])[0];
  assert.equal(merged.title, "renamed");
  assert.equal(merged.subs.find((s) => s.id === x.id).done, true);
  // same result whichever side is "local"
  assert.deepEqual(mergeTasks([b], [a]), mergeTasks([a], [b]));
});

test("sync: subtasks added on two devices are both kept, edits and removals merge per subtask", () => {
  const T = Date.now();
  const base = newTask("a", "2026-11-02", 1, "", { subs: ["x"] });
  const a = { ...base, subs: addSub(base.subs, "from A", T + 20), updatedAt: T + 20 };
  const b = { ...base, subs: addSub(base.subs, "from B", T + 21), updatedAt: T + 21 };
  const merged = mergeTasks([a], [b])[0];
  assert.deepEqual(liveSubs(merged.subs).map((s) => s.title).sort(), ["from A", "from B", "x"]);
  const [x] = base.subs;
  const renamed = renameSub(base.subs, x.id, "x2", T + 40);
  const dropped = removeSub(base.subs, x.id, T + 30);
  assert.equal(mergeSubs(renamed, dropped).find((s) => s.id === x.id).title, "x2"); // newer change wins
  assert.equal(mergeSubs(renamed, dropped).find((s) => s.id === x.id).deleted, false);
});

test("sync: a freshly generated recurring task never overwrites edits made on another device", () => {
  const rule = newRule("Gym", [1], "2026-11-02", "", 0, ["Warm up"], "towel");
  const phone = materialize([], [rule], "2026-11-02"); // generated just now, before the first sync
  assert.equal(phone[0].updatedAt, 0);
  const laptop = materialize([], [rule], "2026-11-02").map((t) => ({
    ...t,
    note: "bring shoes too",
    subs: toggleSub(t.subs, t.subs[0].id, 500),
    updatedAt: 500,
  }));
  const merged = mergeTasks(phone, laptop);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].note, "bring shoes too");
  assert.equal(merged[0].subs[0].done, true);
  // and the other way round
  assert.deepEqual(mergeTasks(laptop, phone), merged);
});

test("sync: both devices generate identical subtasks for the same day", () => {
  const rule = newRule("Gym", [1], "2026-11-02", "", 0, ["Warm up", "Warm up", "Lift"]);
  const a = materialize([], [rule], "2026-11-02")[0];
  const b = materialize([], [rule], "2026-11-02")[0];
  assert.equal(a.subs.length, 3);
  assert.deepEqual(a.subs, b.subs);
  assert.equal(new Set(a.subs.map((s) => s.id)).size, 3);
  assert.equal(mergeTasks([a], [b])[0].subs.length, 3);
  assert.deepEqual(subsFromTitles("t", ["one"]).map((s) => s.title), ["one"]);
});

test("subtasks: new task form values, trimming on save, notes and sameTasks", () => {
  const t = newTask("a", "2026-11-02", 1, "", { subs: ["one", "  ", "two"], note: "  hello  " });
  assert.deepEqual(liveSubs(t.subs).map((s) => s.title), ["one", "two"]);
  assert.equal(t.note, "hello");
  // typing a space inside a name is kept while editing; blank names become removals when saved
  const typed = renameSub(t.subs, t.subs[0].id, "one ");
  assert.equal(typed[0].title, "one ");
  const blank = finalizeSubs(renameSub(t.subs, t.subs[0].id, "  "));
  assert.deepEqual(liveSubs(blank).map((s) => s.title), ["two"]);
  assert.equal(finalizeSubs(typed)[0].title, "one");
  // key order or missing fields never make two equal task lists look different
  assert.equal(sameTasks([t], JSON.parse(JSON.stringify([t]))), true);
  assert.equal(sameTasks([t], [{ ...t, note: "changed" }]), false);
});

test("sync: different fields changed on two devices are both kept (per-field merge)", () => {
  const T = Date.now();
  const base = { ...newTask("a", "2026-11-02", 1), updatedAt: T };
  const phone = patchTask(base, { done: true }, T + 10); // ticked on the phone
  const laptop = patchTask(base, { title: "renamed", note: "n" }, T + 20); // renamed later on the laptop
  const merged = mergeTasks([phone], [laptop])[0];
  assert.equal(merged.done, true);
  assert.equal(merged.title, "renamed");
  assert.equal(merged.note, "n");
  assert.deepEqual(mergeTasks([laptop], [phone]), mergeTasks([phone], [laptop]));
  // the same field changed on both: the later change wins
  const later = patchTask(base, { title: "later" }, T + 30);
  assert.equal(mergeTasks([laptop], [later])[0].title, "later");
});

test("sync: tasks saved by the old version (no field stamps) still merge, newest whole task wins", () => {
  const T = Date.now();
  const old = { ...newTask("a", "2026-11-02", 1), at: undefined, updatedAt: T };
  const oldNewer = { ...old, title: "b", updatedAt: T + 5 };
  assert.equal(mergeTasks([old], [oldNewer])[0].title, "b");
  // legacy vs a patched copy: the field the new version did not touch keeps the legacy (newer) value
  const patched = patchTask({ ...old, updatedAt: T - 100 }, { done: true }, T + 10);
  const m = mergeTasks([oldNewer], [patched])[0];
  assert.equal(m.title, "b");
  assert.equal(m.done, true);
});

test("patchTask: no real change returns the very same object; maxOrder works on big lists", () => {
  const t = newTask("a", "2026-11-02", 3);
  assert.equal(patchTask(t, { title: "a", order: 3 }), t);
  assert.notEqual(patchTask(t, { title: "b" }), t);
  const big = Array.from({ length: 200000 }, (_, i) => ({ ...t, id: String(i), order: i }));
  assert.equal(maxOrder(big, "2026-11-02"), 199999);
});

test("repeat: occurrence counting by arithmetic matches day-by-day counting", () => {
  const slow = (rule, date) => {
    let n = 0;
    for (let d = rule.start; d <= date; d = shiftIso(d, 1)) {
      const wd = new Date(d + "T12:00:00").getDay();
      if (rule.days.includes(wd)) n++;
    }
    return n;
  };
  for (const days of [[1], [1, 3], [0, 6], [1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]]) {
    for (const start of ["2026-10-26", "2026-10-31", "2026-11-01", "2024-02-28"]) {
      const rule = newRule("x", days, start);
      for (let i = 0; i < 60; i++) {
        const date = shiftIso(start, i);
        assert.equal(occurrencesUntil(rule, date), slow(rule, date), days + " " + start + " " + date);
      }
      for (const count of [1, 2, 3, 5, 8, 13]) {
        const last = lastDate({ ...rule, count });
        assert.equal(occurrencesUntil(rule, last), count);
        assert.equal(occurrencesUntil(rule, shiftIso(last, -1)), count - 1);
      }
    }
  }
});

test("star: set on one device while another renames; both survive, and the star survives a round trip", () => {
  const base = newTask("a", "2026-11-03", 1);
  const phone = patchTask(base, { starred: true }, base.updatedAt + 1000);
  const pc = patchTask(base, { title: "b" }, base.updatedAt + 2000);
  const m1 = mergeTasks([phone], [pc])[0];
  const m2 = mergeTasks([pc], [phone])[0];
  assert.equal(m1.starred, true);
  assert.equal(m1.title, "b");
  assert.deepEqual(m1, m2);
  // unstar later on the other device wins
  const unstar = patchTask(m1, { starred: false }, base.updatedAt + 3000);
  assert.equal(mergeTasks([m1], [unstar])[0].starred, false);
  assert.equal(normalizeTasks(JSON.parse(JSON.stringify([m1])))[0].starred, true);
});
