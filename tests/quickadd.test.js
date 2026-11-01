import test from "node:test";
import assert from "node:assert/strict";
import { parseQuick } from "../src/lib/quickadd.js";

const today = "2026-10-30";
const tomorrow = "2026-10-31";

test("leading day word sets the date", () => {
  assert.deepEqual(parseQuick("tomorrow write report", today, tomorrow), { title: "write report", date: tomorrow, time: "" });
  assert.deepEqual(parseQuick("Today groceries", today, tomorrow), { title: "groceries", date: today, time: "" });
});

test("trailing day word and time are recognised", () => {
  assert.deepEqual(parseQuick("meeting tomorrow 14:30", today, tomorrow), { title: "meeting", date: tomorrow, time: "14:30" });
  assert.deepEqual(parseQuick("doctor 9:05 tomorrow", today, tomorrow), { title: "doctor", date: tomorrow, time: "09:05" });
  assert.deepEqual(parseQuick("presentation at 16:00", today, tomorrow), { title: "presentation", date: null, time: "16:00" });
});

test("ordinary titles are left alone", () => {
  assert.deepEqual(parseQuick("tomorrowland meeting prep", today, tomorrow), { title: "tomorrowland meeting prep", date: null, time: "" });
  assert.deepEqual(parseQuick("rate should be 3.50", today, tomorrow), { title: "rate should be 3.50", date: null, time: "" });
  assert.deepEqual(parseQuick("25:99 invalid", today, tomorrow), { title: "25:99 invalid", date: null, time: "" });
});

test("a title that would become empty is kept as typed", () => {
  assert.deepEqual(parseQuick("tomorrow", today, tomorrow), { title: "tomorrow", date: null, time: "" });
  assert.deepEqual(parseQuick("14:30", today, tomorrow), { title: "14:30", date: null, time: "" });
});
