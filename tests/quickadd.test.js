import test from "node:test";
import assert from "node:assert/strict";
import { parseQuick } from "../src/lib/quickadd.js";

const today = "2026-10-30";
const tomorrow = "2026-10-31";

test("leading day word sets the date", () => {
  assert.deepEqual(parseQuick("yarın rapor yaz", today, tomorrow), { title: "rapor yaz", date: tomorrow, time: "" });
  assert.deepEqual(parseQuick("Bugün market", today, tomorrow), { title: "market", date: today, time: "" });
});

test("trailing day word and time are recognised", () => {
  assert.deepEqual(parseQuick("toplantı yarın 14:30", today, tomorrow), { title: "toplantı", date: tomorrow, time: "14:30" });
  assert.deepEqual(parseQuick("doktor 9:05 yarın", today, tomorrow), { title: "doktor", date: tomorrow, time: "09:05" });
  assert.deepEqual(parseQuick("sunum saat 16:00", today, tomorrow), { title: "sunum", date: null, time: "16:00" });
});

test("ordinary titles are left alone", () => {
  assert.deepEqual(parseQuick("yarınki toplantıyı hazırla", today, tomorrow), { title: "yarınki toplantıyı hazırla", date: null, time: "" });
  assert.deepEqual(parseQuick("oran 3.50 olsun", today, tomorrow), { title: "oran 3.50 olsun", date: null, time: "" });
  assert.deepEqual(parseQuick("25:99 hatalı", today, tomorrow), { title: "25:99 hatalı", date: null, time: "" });
});

test("a title that would become empty is kept as typed", () => {
  assert.deepEqual(parseQuick("yarın", today, tomorrow), { title: "yarın", date: null, time: "" });
  assert.deepEqual(parseQuick("14:30", today, tomorrow), { title: "14:30", date: null, time: "" });
});
