import { SERIES_KEY, MAX_SERIES, MAX_SERIES_LESSONS, createSeries, loadSeries, upsertSeries, deleteSeries, getSeries, addListToSeries, removeListFromSeries, moveLesson, seriesLessons, seriesForList, makeSeriesId, orphanLessons } from "../series";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const L = (n) => "custom-aaaa" + n;
const at = (s) => new Date("2026-11-0" + s + "T10:00:00Z");

test("createSeries names, de-duplicates and caps", () => {
  const s = createSeries({ name: "  Child 1, Year 1 ", listIds: [L(1), L(1), L(2)] });
  expect(s.name).toBe("Child 1, Year 1");
  expect(s.listIds).toEqual([L(1), L(2)]);
  expect(createSeries({ name: "" }).name).toBe("My series");
  expect(createSeries({ name: "x", listIds: Array.from({ length: 40 }, (_, i) => "custom-aaa" + String(i).padStart(3, "0")) }).listIds).toHaveLength(MAX_SERIES_LESSONS);
});

test("ids look right and avoid clashes", () => {
  expect(makeSeriesId()).toMatch(/^series-[a-z0-9]{6}$/);
  const seq = [0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  let i = 0;
  expect(makeSeriesId(["series-aaaaaa"], () => seq[i++])).toBe("series-ssssss");
});

test("upsert, load newest first, get, delete", () => {
  const st = memory();
  upsertSeries(st, createSeries({ name: "Old", id: "series-old111", now: at(1) }));
  upsertSeries(st, createSeries({ name: "New", id: "series-new111", now: at(2) }));
  expect(loadSeries(st).map((s) => s.name)).toEqual(["New", "Old"]);
  expect(getSeries(st, "series-old111").name).toBe("Old");
  deleteSeries(st, "series-new111");
  expect(loadSeries(st).map((s) => s.name)).toEqual(["Old"]);
});

test("damaged storage reads as empty and bad entries are skipped", () => {
  const st = memory();
  st.setItem(SERIES_KEY, "not json");
  expect(loadSeries(st)).toEqual([]);
  st.setItem(SERIES_KEY, JSON.stringify([{ id: "nope" }, createSeries({ name: "ok", id: "series-ok1111" })]));
  expect(loadSeries(st).map((s) => s.name)).toEqual(["ok"]);
});

test("a device keeps up to MAX_SERIES", () => {
  const st = memory();
  for (let i = 0; i < MAX_SERIES; i++) expect(upsertSeries(st, createSeries({ name: "s" + i, id: "series-" + String(i).padStart(4, "0") })).ok).toBe(true);
  expect(upsertSeries(st, createSeries({ name: "one too many", id: "series-zzzz99" })).ok).toBe(false);
});

test("add and remove lessons", () => {
  const st = memory();
  upsertSeries(st, createSeries({ name: "A", id: "series-aaaaaa", now: at(1) }));
  addListToSeries(st, "series-aaaaaa", L(1), at(2));
  addListToSeries(st, "series-aaaaaa", L(1), at(3));
  addListToSeries(st, "series-aaaaaa", L(2), at(3));
  expect(getSeries(st, "series-aaaaaa").listIds).toEqual([L(1), L(2)]);
  removeListFromSeries(st, "series-aaaaaa", L(1), at(4));
  expect(getSeries(st, "series-aaaaaa").listIds).toEqual([L(2)]);
  expect(addListToSeries(st, "series-missing", L(1)).ok).toBe(false);
});

test("moveLesson swaps neighbours and stops at the ends", () => {
  const s = createSeries({ name: "A", listIds: [L(1), L(2), L(3)] });
  expect(moveLesson(s, L(2), -1).listIds).toEqual([L(2), L(1), L(3)]);
  expect(moveLesson(s, L(3), 1)).toBe(s);
  expect(moveLesson(s, L(1), -1)).toBe(s);
  expect(moveLesson(s, L(9), 1)).toBe(s);
});

test("seriesLessons keeps order and drops lessons that are gone", () => {
  const s = createSeries({ name: "A", listIds: [L(2), L(1), L(3)] });
  expect(seriesLessons(s, [{ id: L(1) }, { id: L(3) }]).map((l) => l.id)).toEqual([L(1), L(3)]);
});

test("seriesForList", () => {
  const a = createSeries({ name: "A", listIds: [L(1)] });
  const b = createSeries({ name: "B", listIds: [L(2)] });
  expect(seriesForList([a, b], L(1)).map((s) => s.name)).toEqual(["A"]);
});

test("orphanLessons are the lessons that are in no series", () => {
  const a = createSeries({ name: "A", listIds: [L(1)] });
  const b = createSeries({ name: "B", listIds: [L(2), L(9)] });
  const lists = [{ id: L(1) }, { id: L(2) }, { id: L(3) }, { id: L(4) }];
  expect(orphanLessons([a, b], lists).map((l) => l.id)).toEqual([L(3), L(4)]);
  expect(orphanLessons([], lists)).toHaveLength(4);
});
