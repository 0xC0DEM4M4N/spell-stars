import { readLocalSnapshot, validateSnapshot, isEmptySnapshot, parseSnapshotText, snapshotToFileText } from "../syncSnapshot";
import { mergeSnapshots, isNoOp, applyMergeResult, readBackup, restoreBackup, keysToChange } from "../syncMerge";
import { CUSTOM_LISTS_KEY, MAX_LISTS, createList, upsertList, loadLists } from "../customLists";

const list = (id, name, updatedAt, words = ["cat"]) => ({
  ...createList({ name, words: words.map((word) => ({ word })), id }),
  createdAt: updatedAt,
  updatedAt,
});
const snap = (lists, progress = {}) => ({ app: "spell-stars", v: 1, exportedAt: "2026-09-21T10:00:00.000Z", progress, settings: {}, lists });
const T1 = "2026-09-01T00:00:00.000Z";
const T2 = "2026-09-05T00:00:00.000Z";

beforeEach(() => window.localStorage.clear());

describe("lists in the snapshot", () => {
  test("are read from the device", () => {
    upsertList(window.localStorage, list("custom-aaaaaa", "Week 4", T1));
    const { snapshot } = readLocalSnapshot(window.localStorage);
    expect(snapshot.lists.map((l) => l.name)).toEqual(["Week 4"]);
    expect(isEmptySnapshot(snapshot)).toBe(false);
  });

  test("a snapshot with only lists still counts as something to save", () => {
    expect(isEmptySnapshot(snap([list("custom-aaaaaa", "A", T1)]))).toBe(false);
    expect(isEmptySnapshot(snap([]))).toBe(true);
  });

  test("survive the file round trip", () => {
    upsertList(window.localStorage, list("custom-aaaaaa", "Week 4", T1, ["their", "there"]));
    const { snapshot } = readLocalSnapshot(window.localStorage);
    const back = parseSnapshotText(snapshotToFileText(snapshot));
    expect(back.ok).toBe(true);
    expect(back.snapshot.lists).toEqual(snapshot.lists);
  });

  test("an older backup without lists is still valid", () => {
    const old = { app: "spell-stars", v: 1, exportedAt: "x", progress: {}, settings: {} };
    const r = validateSnapshot(old);
    expect(r.ok).toBe(true);
    expect(r.snapshot.lists).toEqual([]);
  });

  test("bad lists are rejected", () => {
    const bad = (mut) => { const s = snap([list("custom-aaaaaa", "A", T1)]); mut(s.lists[0]); return validateSnapshot(s).ok; };
    expect(bad(() => {})).toBe(true);
    expect(bad((l) => { l.id = "year3"; })).toBe(false);
    expect(bad((l) => { l.words = []; })).toBe(false);
    expect(bad((l) => { l.words = Array.from({ length: 51 }, () => ({ word: "a" })); })).toBe(false);
    expect(bad((l) => { l.name = "x".repeat(61); })).toBe(false);
    expect(bad((l) => { l.yearHint = "Year 3!"; })).toBe(false);
    const many = snap(Array.from({ length: MAX_LISTS + 1 }, (_, i) => list("custom-" + String(100000 + i), "L", T1)));
    expect(validateSnapshot(many).ok).toBe(false);
  });
});

describe("merging lists", () => {
  test("merge adds lists the device does not have", () => {
    const r = mergeSnapshots(snap([list("custom-aaaaaa", "A", T1)]), snap([list("custom-bbbbbb", "B", T1)]));
    expect(r.lists.map((l) => l.id).sort()).toEqual(["custom-aaaaaa", "custom-bbbbbb"]);
    expect(r.summary.lists).toMatchObject({ added: 1, updated: 0, removed: 0 });
    expect(r.listsChanged).toBe(true);
    expect(isNoOp(r)).toBe(false);
  });

  test("the later edit of the same list wins, from either side", () => {
    const older = snap([list("custom-aaaaaa", "Old name", T1)]);
    const newer = snap([list("custom-aaaaaa", "New name", T2)]);
    expect(mergeSnapshots(older, newer).lists[0].name).toBe("New name");
    expect(mergeSnapshots(newer, older).lists[0].name).toBe("New name");
    expect(mergeSnapshots(newer, older).listsChanged).toBe(false);
  });

  test("the same lists change nothing", () => {
    const a = snap([list("custom-aaaaaa", "A", T1)]);
    const r = mergeSnapshots(a, a);
    expect(r.summary.lists).toMatchObject({ added: 0, updated: 0, unchanged: 1 });
    expect(isNoOp(r)).toBe(true);
  });

  test("merge converges", () => {
    const A = snap([list("custom-aaaaaa", "A-new", T2), list("custom-cccccc", "C", T1)]);
    const B = snap([list("custom-aaaaaa", "A-old", T1), list("custom-bbbbbb", "B", T1)]);
    const ab = mergeSnapshots(B, A).lists.map((l) => l.id + l.name).sort();
    const ba = mergeSnapshots(A, B).lists.map((l) => l.id + l.name).sort();
    expect(ab).toEqual(ba);
  });

  test("merge stops at the limit and says so", () => {
    const local = snap(Array.from({ length: MAX_LISTS }, (_, i) => list("custom-" + String(100000 + i), "L", T1)));
    const r = mergeSnapshots(local, snap([list("custom-zzzzzz", "extra", T1)]));
    expect(r.lists).toHaveLength(MAX_LISTS);
    expect(r.summary.lists.skipped).toBe(1);
  });

  test("replace makes the lists match the backup", () => {
    const local = snap([list("custom-aaaaaa", "A", T1), list("custom-bbbbbb", "B", T1)]);
    const inc = snap([list("custom-aaaaaa", "A2", T2), list("custom-cccccc", "C", T1)]);
    const r = mergeSnapshots(local, inc, { mode: "replace" });
    expect(r.lists.map((l) => l.id).sort()).toEqual(["custom-aaaaaa", "custom-cccccc"]);
    expect(r.summary.lists).toMatchObject({ added: 1, updated: 1, removed: 1 });
  });

  test("a snapshot from before lists existed leaves this device's lists alone", () => {
    const local = snap([list("custom-aaaaaa", "A", T1)]);
    const old = { ...snap([]), lists: undefined };
    const r = mergeSnapshots(local, old);
    expect(r.listsChanged).toBe(false);
    expect(r.lists.map((l) => l.id)).toEqual(["custom-aaaaaa"]);
  });
});

describe("applying and undoing", () => {
  test("lists are written, and undo puts them back", () => {
    upsertList(window.localStorage, list("custom-aaaaaa", "A", T1));
    const before = window.localStorage.getItem(CUSTOM_LISTS_KEY);
    const { snapshot: local } = readLocalSnapshot(window.localStorage);
    const r = mergeSnapshots(local, snap([list("custom-bbbbbb", "B", T1)]));
    expect(keysToChange(r)).toContain(CUSTOM_LISTS_KEY);
    expect(applyMergeResult(window.localStorage, r, 1000)).toEqual({ ok: true });
    expect(loadLists(window.localStorage).map((l) => l.id).sort()).toEqual(["custom-aaaaaa", "custom-bbbbbb"]);
    restoreBackup(window.localStorage, readBackup(window.localStorage, 2000));
    expect(window.localStorage.getItem(CUSTOM_LISTS_KEY)).toBe(before);
  });

  test("undo removes the lists key if there were none before", () => {
    const { snapshot: local } = readLocalSnapshot(window.localStorage);
    const r = mergeSnapshots(local, snap([list("custom-bbbbbb", "B", T1)]));
    applyMergeResult(window.localStorage, r, 1000);
    expect(window.localStorage.getItem(CUSTOM_LISTS_KEY)).not.toBeNull();
    restoreBackup(window.localStorage, readBackup(window.localStorage, 2000));
    expect(window.localStorage.getItem(CUSTOM_LISTS_KEY)).toBeNull();
  });

  test("lists are not written when nothing about them changed", () => {
    const a = snap([list("custom-aaaaaa", "A", T1)]);
    const r = mergeSnapshots(a, a);
    expect(keysToChange(r)).not.toContain(CUSTOM_LISTS_KEY);
  });
});
