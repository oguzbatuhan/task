import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DICTS, detectLang, getLocale, setLang, t, tp } from "../src/lib/i18n.js";
import { groupLabel, relativeName, shortDate } from "../src/lib/dates.js";
import { describeDays, describeRule } from "../src/lib/repeat.js";
import { monthLabel } from "../src/lib/history.js";
import { parseQuick } from "../src/lib/quickadd.js";

// Every test leaves the language on English again, so the other test files are not affected
const withLang = (lang, fn) => {
  setLang(lang);
  try {
    return fn();
  } finally {
    setLang("en");
  }
};

test("English and Turkish dictionaries have exactly the same keys", () => {
  const en = Object.keys(DICTS.en).sort();
  const tr = Object.keys(DICTS.tr).sort();
  assert.deepEqual(tr, en);
  for (const lang of ["en", "tr"]) {
    for (const [k, v] of Object.entries(DICTS[lang])) {
      assert.ok(typeof v === "string" && v.length > 0, lang + ":" + k + " is empty");
    }
  }
});

test("placeholders match between languages", () => {
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const k of Object.keys(DICTS.en)) assert.equal(holes(DICTS.tr[k]), holes(DICTS.en[k]), k);
});

test("every key used in the source exists", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|js)$/.test(name) && !p.endsWith(join("lib", "i18n.js"))) files.push(p);
    }
  };
  walk(new URL("../src", import.meta.url).pathname);
  const used = new Set();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/"((?:app|toast|lang|common|day|repeat|composer|time|picker|subs|edit|task|history|rules|sync|err)\.[A-Za-z0-9_]+)"/g)) used.add(m[1]);
  }
  assert.ok(used.size > 60, "expected to find many keys, found " + used.size);
  for (const key of used) {
    assert.ok(key in DICTS.en || key + "_one" in DICTS.en, "missing key: " + key);
  }
});

test("English stays the default and the texts are unchanged", () => {
  assert.equal(t("app.today"), "Today");
  assert.equal(relativeName("2026-10-20", "2026-10-20"), "Today");
  assert.equal(shortDate("2026-10-18"), "Oct 18 Sun");
  assert.deepEqual(groupLabel("2026-10-19", "2026-10-20"), { primary: "Yesterday", secondary: "October 19 Monday" });
});

test("Turkish dates read day-first with Turkish names", () => {
  withLang("tr", () => {
    assert.equal(getLocale(), "tr-TR");
    assert.equal(relativeName("2026-10-21", "2026-10-20"), "Yarın");
    assert.equal(relativeName("2026-10-19", "2026-10-20"), "Dün");
    assert.deepEqual(groupLabel("2026-10-19", "2026-10-20"), { primary: "Dün", secondary: "19 Ekim Pazartesi" });
    assert.equal(groupLabel("2026-10-17", "2026-10-20").primary, "Cumartesi");
    assert.equal(shortDate("2026-10-18"), "18 Eki Paz");
    assert.equal(monthLabel("2025-03", "2026-10-20"), "Mart 2025");
    assert.equal(monthLabel("2026-03", "2026-10-20"), "Mart");
  });
});

test("repeat descriptions are translated", () => {
  withLang("tr", () => {
    assert.equal(describeDays([0, 1, 2, 3, 4, 5, 6]), "Her gün");
    assert.equal(describeDays([5, 4, 3, 2, 1]), "Hafta içi her gün");
    assert.equal(describeDays([0, 6]), "Hafta sonları");
    assert.equal(describeDays([3]), "Her Çar");
    assert.equal(describeDays([5, 1, 3]), "Pzt, Çar, Cum");
    assert.equal(describeRule({ days: [1, 3], count: 3 }), "Pzt, Çar · 3 kez");
  });
  assert.equal(describeRule({ days: [1, 3], count: 1 }), "Mon, Wed · 1 time");
  assert.equal(describeRule({ days: [1, 3], count: 3 }), "Mon, Wed · 3 times");
});

test("plurals and placeholders", () => {
  assert.equal(tp("toast.moved", 1), "1 task moved to today");
  assert.equal(tp("toast.moved", 4), "4 tasks moved to today");
  withLang("tr", () => assert.equal(tp("toast.moved", 4), "4 görev bugüne taşındı"));
  assert.equal(t("no.such.key"), "no.such.key");
});

test("quick add understands Turkish words in any interface language", () => {
  const T = "2026-10-20";
  const M = "2026-10-21";
  assert.deepEqual(parseQuick("yarın rapor yaz", T, M), { title: "rapor yaz", date: M, time: "" });
  assert.deepEqual(parseQuick("Yarın rapor yaz", T, M), { title: "rapor yaz", date: M, time: "" });
  assert.deepEqual(parseQuick("market bugün", T, M), { title: "market", date: T, time: "" });
  assert.deepEqual(parseQuick("BUGÜN market", T, M), { title: "market", date: T, time: "" });
  assert.deepEqual(parseQuick("yarin market", T, M), { title: "market", date: M, time: "" });
  assert.deepEqual(parseQuick("toplantı saat 14:30", T, M), { title: "toplantı", date: null, time: "14:30" });
  assert.deepEqual(parseQuick("yarın saat 9:05 diş hekimi", T, M), { title: "diş hekimi", date: M, time: "09:05" });
  // ordinary Turkish titles are left alone
  assert.deepEqual(parseQuick("bugünkü rapor", T, M), { title: "bugünkü rapor", date: null, time: "" });
});

test("language detection falls back to the browser language", () => {
  // no localStorage in node: falls through to navigator (undefined here) -> English
  assert.equal(detectLang(), "en");
});
