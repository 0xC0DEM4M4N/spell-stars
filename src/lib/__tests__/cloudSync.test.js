import { planCloudSync, lessonsOnlySnapshot } from "../cloudSync";
import { readLocalSnapshot } from "../syncSnapshot";
import { createList, upsertList, deleteList } from "../customLists";
import { createSeries, upsertSeries } from "../series";
import { loadDeleted, recordDeletion, pruneDeleted, DELETED_KEEP_MS } from "../deletions";

const word = (w) => ({ word: w });
const makeStorage = () => {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => Array.from(m.keys())[i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};
const lesson = (name, id, at = new Date("2026-11-01T10:00:00Z")) =>
  createList({ name, words: [word("because"), word("friend")], existingIds: [], now: at, id });

describe("deletions", () => {
  test("recordDeletion remembers an id and prunes old ones", () => {
    const s = makeStorage();
    recordDeletion(s, "custom-aaaaaa", 1000);
    expect(loadDeleted(s)["custom-aaaaaa"]).toBe(1000);
    expect(pruneDeleted({ a: 1000, b: 1000 + DELETED_KEEP_MS }, 1000 + DELETED_KEEP_MS + 5)).toEqual({ b: 1000 + DELETED_KEEP_MS });
  });
  test("deleteList records the deletion", () => {
    const s = makeStorage();
    const l = lesson("One", "custom-aaaaaa");
    upsertList(s, l);
    deleteList(s, l.id);
    expect(loadDeleted(s)[l.id]).toBeGreaterThan(0);
  });
});

describe("planCloudSync", () => {
  test("a first sign-in with local lessons pushes them", () => {
    const s = makeStorage();
    upsertList(s, lesson("One", "custom-aaaaaa"));
    const plan = planCloudSync(readLocalSnapshot(s).snapshot, {}, null);
    expect(plan.ok).toBe(true);
    expect(plan.lists).toHaveLength(1);
    expect(plan.pushNeeded).toBe(true);
  });

  test("lessons in the cloud arrive on an empty device", () => {
    const s = makeStorage();
    const l = lesson("From cloud", "custom-bbbbbb");
    const plan = planCloudSync(readLocalSnapshot(s).snapshot, {}, { lists: [l], series: [], deleted: {} });
    expect(plan.ok).toBe(true);
    expect(plan.lists.map((x) => x.id)).toEqual(["custom-bbbbbb"]);
    expect(plan.merge.listsChanged).toBe(true);
    expect(plan.pushNeeded).toBe(false);
  });

  test("series travel too", () => {
    const s = makeStorage();
    const l = lesson("A", "custom-aaaaaa");
    upsertList(s, l);
    upsertSeries(s, createSeries({ name: "Child 1", listIds: [l.id], existingIds: [] }));
    const plan = planCloudSync(readLocalSnapshot(s).snapshot, {}, null);
    expect(plan.series).toHaveLength(1);
  });

  test("a lesson deleted elsewhere is not brought back, and is dropped here", () => {
    const s = makeStorage();
    const l = lesson("Gone", "custom-aaaaaa");
    upsertList(s, l);
    const plan = planCloudSync(readLocalSnapshot(s).snapshot, {}, { lists: [], series: [], deleted: { "custom-aaaaaa": Date.now() } });
    expect(plan.lists).toHaveLength(0);
    expect(plan.dropLocal.lists).toEqual(["custom-aaaaaa"]);
  });

  test("a lesson deleted here is removed from the cloud copy", () => {
    const s = makeStorage();
    const l = lesson("Gone", "custom-aaaaaa");
    const plan = planCloudSync(readLocalSnapshot(s).snapshot, { "custom-aaaaaa": Date.now() }, { lists: [l], series: [], deleted: {} });
    expect(plan.lists).toHaveLength(0);
    expect(plan.pushNeeded).toBe(true);
  });

  test("nothing to do when both sides match", () => {
    const s = makeStorage();
    const l = lesson("Same", "custom-aaaaaa");
    upsertList(s, l);
    const local = readLocalSnapshot(s).snapshot;
    const plan = planCloudSync(local, {}, { lists: local.lists, series: [], deleted: {} });
    expect(plan.pushNeeded).toBe(false);
    expect(plan.merge.listsChanged).toBe(false);
  });

  test("lessonsOnlySnapshot rejects junk", () => {
    expect(lessonsOnlySnapshot({ lists: [{ nope: true }] })).toBeNull();
  });
});
