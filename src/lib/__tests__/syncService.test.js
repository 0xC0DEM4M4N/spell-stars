import fs from "fs";
import path from "path";

const DATA = path.join(__dirname, "..", "..", "..", "public", "data");

jest.mock("../yearData", () => {
  const fs2 = require("fs");
  const path2 = require("path");
  const { withWordKeys } = require("../wordKey");
  const dir = path2.join(__dirname, "..", "..", "..", "public", "data");
  const config = JSON.parse(fs2.readFileSync(path2.join(dir, "years.config.json"), "utf8"));
  return {
    getYearsConfig: () => Promise.resolve(config),
    findYearBySlug: (c, slug) => c.years.find((y) => y.slug === slug),
    getYearWords: (slug) => {
      if (global.__failing && global.__failing.has(slug)) return Promise.reject(new Error("offline"));
      const raw = JSON.parse(fs2.readFileSync(path2.join(dir, slug, "words.json"), "utf8"));
      return Promise.resolve(withWordKeys(slug, raw));
    },
  };
});

import { prepareExport, previewImport, applyImport, undoImport, currentUndo, ensureProgressMigrated } from "../syncService";

const raw = (slug) => JSON.parse(fs.readFileSync(path.join(DATA, slug, "words.json"), "utf8"));
const st = (over) => ({ box: 2, dueDate: "2026-09-10", attempts: 2, correctCount: 2, lastResult: "correct", lastSeen: "2026-09-09", ...over });
const put = (k, v) => window.localStorage.setItem(k, JSON.stringify(v));

beforeEach(() => {
  window.localStorage.clear();
  global.__failing = new Set();
});

test("prepareExport migrates old-format years first", async () => {
  const first = raw("year3").find((w) => w.contentType !== "letter");
  put("spellstars.year3.progress", { currentWeek: 4, words: { [first.id]: st() } });
  const out = await prepareExport();
  expect(out.failed).toEqual([]);
  expect(out.empty).toBe(false);
  expect(Object.keys(out.snapshot.progress.year3.words)).toEqual(["year3:" + first.word.toLowerCase()]);
  expect(JSON.parse(window.localStorage.getItem("spellstars.year3.progress")).v).toBe(2);
});

test("a year whose word list will not load is reported, not silently dropped", async () => {
  const a = raw("year3").find((w) => w.contentType !== "letter");
  const b = raw("year4").find((w) => w.contentType !== "letter");
  put("spellstars.year3.progress", { currentWeek: 4, words: { [a.id]: st() } });
  put("spellstars.year4.progress", { currentWeek: 2, words: { [b.id]: st() } });
  global.__failing.add("year4");
  const out = await prepareExport();
  expect(out.failed).toEqual(["year4"]);
  expect(Object.keys(out.snapshot.progress)).toEqual(["year3"]);
  // and the year that failed is left exactly as it was
  expect(JSON.parse(window.localStorage.getItem("spellstars.year4.progress")).v).toBeUndefined();
});

test("a year this version does not know is reported", async () => {
  put("spellstars.year99.progress", { currentWeek: 1, words: { x: st() } });
  expect((await ensureProgressMigrated()).failed).toEqual(["year99"]);
});

test("nothing to migrate is a quick no-op", async () => {
  expect(await ensureProgressMigrated()).toEqual({ migrated: [], failed: [] });
});

test("previewImport leaves a failed year alone; importing then undoing restores state", async () => {
  const b = raw("year4").find((w) => w.contentType !== "letter");
  put("spellstars.year4.progress", { currentWeek: 2, words: { [b.id]: st() } });
  global.__failing.add("year4");
  const incoming = {
    app: "spell-stars", v: 1, exportedAt: "x",
    settings: {},
    progress: {
      year4: { v: 2, currentWeek: 5, words: { "year4:scene": st() } },
      year3: { v: 2, currentWeek: 5, words: { "year3:badge": st() } },
    },
  };
  const before = { ...window.localStorage };
  const { result, failed } = await previewImport(incoming, {});
  expect(failed).toEqual(["year4"]);
  expect(result.summary.skippedYears).toEqual(["year4"]);
  expect(Object.keys(result.progress)).toEqual(["year3"]);
  expect({ ...window.localStorage }).toEqual(before); // preview changes nothing

  expect(applyImport(result)).toEqual({ ok: true });
  expect(window.localStorage.getItem("spellstars.year3.progress")).not.toBeNull();
  expect(currentUndo()).not.toBeNull();
  expect(undoImport()).toBe(true);
  expect(window.localStorage.getItem("spellstars.year3.progress")).toBeNull();
  expect(undoImport()).toBe(false);
});
