import { readLocalSnapshot, isEmptySnapshot, parseSnapshotText, snapshotToFileText } from "../syncSnapshot";
import { mergeSnapshots, isNoOp, applyMergeResult, keysToChange } from "../syncMerge";
import { SERIES_KEY, createSeries, upsertSeries, loadSeries } from "../series";

const T1 = new Date("2026-11-01T00:00:00Z");
const T2 = new Date("2026-11-05T00:00:00Z");
const series = (id, name, now, listIds = []) => createSeries({ id, name, now, listIds });
const snap = (s) => ({ app: "spell-stars", v: 1, exportedAt: "2026-11-07T10:00:00.000Z", progress: {}, settings: {}, lists: [], series: s });

beforeEach(() => window.localStorage.clear());

test("series are read from the device and count as something to save", () => {
  upsertSeries(window.localStorage, series("series-aaaaaa", "Child 1, Year 1", T1, ["custom-bbbbbb"]));
  const { snapshot } = readLocalSnapshot(window.localStorage);
  expect(snapshot.series.map((s) => s.name)).toEqual(["Child 1, Year 1"]);
  expect(isEmptySnapshot(snapshot)).toBe(false);
  expect(isEmptySnapshot(snap([]))).toBe(true);
});

test("series survive the file round trip, and an older backup reads as none", () => {
  upsertSeries(window.localStorage, series("series-aaaaaa", "A", T1));
  const { snapshot } = readLocalSnapshot(window.localStorage);
  const back = parseSnapshotText(snapshotToFileText(snapshot));
  expect(back.ok).toBe(true);
  expect(back.snapshot.series).toEqual(snapshot.series);
  const old = parseSnapshotText(JSON.stringify({ app: "spell-stars", v: 1, exportedAt: "x", progress: {}, settings: {} }));
  expect(old.snapshot.series).toEqual([]);
});

test("merging adds new series and keeps the later edit of a shared one", () => {
  const mine = [series("series-aaaaaa", "Mine", T2)];
  const theirs = [series("series-aaaaaa", "Older name", T1), series("series-bbbbbb", "Theirs", T1)];
  const result = mergeSnapshots(snap(mine), snap(theirs), { mode: "merge" });
  expect(result.seriesChanged).toBe(true);
  expect(result.series.map((s) => s.name).sort()).toEqual(["Mine", "Theirs"]);
  expect(result.summary.series.added).toBe(1);
  expect(keysToChange(result)).toContain(SERIES_KEY);
});

test("identical series are a no-op; applying writes them", () => {
  const same = [series("series-aaaaaa", "Same", T1)];
  expect(isNoOp(mergeSnapshots(snap(same), snap(same), { mode: "merge" }))).toBe(true);
  const result = mergeSnapshots(snap([]), snap(same), { mode: "merge" });
  expect(isNoOp(result)).toBe(false);
  expect(applyMergeResult(window.localStorage, result).ok).toBe(true);
  expect(loadSeries(window.localStorage).map((s) => s.name)).toEqual(["Same"]);
});

test("replace mode makes this device match the backup", () => {
  upsertSeries(window.localStorage, series("series-aaaaaa", "Local only", T1));
  const result = mergeSnapshots(snap([series("series-aaaaaa", "Local only", T1)]), snap([series("series-bbbbbb", "From backup", T2)]), { mode: "replace" });
  expect(result.series.map((s) => s.name)).toEqual(["From backup"]);
  expect(result.summary.series.removed).toBe(1);
});
