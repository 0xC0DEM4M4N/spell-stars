import { readLocalSnapshot } from "../syncSnapshot";
import {
  mergeSnapshots, isNoOp, applyMergeResult, readBackup, restoreBackup, clearBackup,
  BACKUP_KEY, UNDO_WINDOW_MS, keysToChange,
} from "../syncMerge";

const st = (over) => ({
  box: 2, dueDate: "2026-09-10", attempts: 2, correctCount: 2,
  lastResult: "correct", lastSeen: "2026-09-09", ...over,
});
const snap = (progress, settings = {}) => ({
  app: "spell-stars", v: 1, exportedAt: "2026-09-21T10:00:00.000Z", progress, settings,
});
const year = (words, currentWeek = 3) => ({ v: 2, currentWeek, words });

// Merge output as a snapshot again, so two directions can be compared.
const asSnap = (local, result) => snap({ ...local.progress, ...result.progress }, { ...local.settings, ...result.settings });

describe("mergeSnapshots (merge)", () => {
  test("adds words the device does not have", () => {
    const local = snap({ year3: year({ "year3:a": st() }) });
    const inc = snap({ year3: year({ "year3:b": st({ box: 4 }) }) });
    const r = mergeSnapshots(local, inc);
    expect(Object.keys(r.progress.year3.words).sort()).toEqual(["year3:a", "year3:b"]);
    expect(r.summary).toMatchObject({ added: 1, updated: 0, unchanged: 0, removed: 0 });
  });

  test("the record with more attempts wins", () => {
    const local = snap({ year3: year({ "year3:a": st({ attempts: 2, box: 1 }) }) });
    const inc = snap({ year3: year({ "year3:a": st({ attempts: 5, box: 3 }) }) });
    expect(mergeSnapshots(local, inc).progress.year3.words["year3:a"].box).toBe(3);
    expect(mergeSnapshots(inc, local).progress.year3.words["year3:a"].box).toBe(3);
  });

  test("on equal attempts the later practice wins", () => {
    const local = snap({ year3: year({ "year3:a": st({ lastSeen: "2026-09-09", box: 1 }) }) });
    const inc = snap({ year3: year({ "year3:a": st({ lastSeen: "2026-09-12", box: 4 }) }) });
    expect(mergeSnapshots(local, inc).progress.year3.words["year3:a"].box).toBe(4);
    expect(mergeSnapshots(inc, local).progress.year3.words["year3:a"].box).toBe(4);
  });

  test("an exact tie is settled the same way from either side", () => {
    const a = snap({ year3: year({ "year3:a": st({ box: 1, correctCount: 1 }) }) });
    const b = snap({ year3: year({ "year3:a": st({ box: 1, correctCount: 2 }) }) });
    expect(mergeSnapshots(a, b).progress.year3.words["year3:a"]).toEqual(mergeSnapshots(b, a).progress.year3.words["year3:a"]);
  });

  test("merging the same snapshot changes nothing", () => {
    const a = snap({ year3: year({ "year3:a": st(), "year3:b": st({ box: 5 }) }) });
    const r = mergeSnapshots(a, a);
    expect(r.summary).toMatchObject({ added: 0, updated: 0, removed: 0, unchanged: 2 });
    expect(isNoOp(r)).toBe(true);
  });

  test("merge converges: A into B equals B into A", () => {
    const A = snap({
      year3: year({ "year3:a": st({ attempts: 4, box: 3 }), "year3:b": st({ attempts: 1 }), "year3:c": st({ lastSeen: "2026-09-20", box: 5 }) }, 6),
      year2: year({ "year2:x": st() }, 2),
    });
    const B = snap({
      year3: year({ "year3:a": st({ attempts: 2, box: 1 }), "year3:c": st({ lastSeen: "2026-09-11", box: 1 }), "year3:d": st() }, 3),
    });
    const AB = asSnap(B, mergeSnapshots(B, A));
    const BA = asSnap(A, mergeSnapshots(A, B));
    expect(AB.progress.year3.words).toEqual(BA.progress.year3.words);
    expect(AB.progress.year2).toEqual(BA.progress.year2);
    // and doing it again changes nothing
    expect(isNoOp(mergeSnapshots(AB, BA))).toBe(true);
  });

  test("keeps this device's week unless asked", () => {
    const local = snap({ year3: year({ "year3:a": st() }, 3) });
    const inc = snap({ year3: year({ "year3:a": st() }, 9) });
    const keep = mergeSnapshots(local, inc);
    expect(keep.progress.year3.currentWeek).toBe(3);
    expect(keep.summary.weekDiffers).toEqual([{ slug: "year3", here: 3, there: 9 }]);
    expect(isNoOp(keep)).toBe(true);
    const take = mergeSnapshots(local, inc, { useIncomingWeeks: true });
    expect(take.progress.year3.currentWeek).toBe(9);
    expect(isNoOp(take)).toBe(false);
  });

  test("a year the device has never seen comes with its week", () => {
    const r = mergeSnapshots(snap({}), snap({ year5: year({ "year5:a": st() }, 11) }));
    expect(r.progress.year5.currentWeek).toBe(11);
    expect(r.summary.added).toBe(1);
  });

  test("years not in the backup are left alone", () => {
    const local = snap({ year2: year({ "year2:x": st() }) });
    const r = mergeSnapshots(local, snap({ year3: year({ "year3:a": st() }) }));
    expect(r.progress.year2).toBeUndefined();
    expect(r.removedYears).toEqual([]);
  });

  test("skipYears are never touched", () => {
    const r = mergeSnapshots(snap({}), snap({ year3: year({ "year3:a": st() }) }), { skipYears: ["year3"] });
    expect(r.progress.year3).toBeUndefined();
    expect(r.summary.skippedYears).toEqual(["year3"]);
  });
});

describe("mergeSnapshots (replace)", () => {
  test("makes the device match the backup", () => {
    const local = snap({
      year3: year({ "year3:a": st({ attempts: 9 }), "year3:z": st() }, 8),
      year2: year({ "year2:x": st() }),
    });
    const inc = snap({ year3: year({ "year3:a": st({ attempts: 1 }), "year3:b": st() }, 2) });
    const r = mergeSnapshots(local, inc, { mode: "replace" });
    expect(Object.keys(r.progress.year3.words).sort()).toEqual(["year3:a", "year3:b"]);
    expect(r.progress.year3.words["year3:a"].attempts).toBe(1);
    expect(r.progress.year3.currentWeek).toBe(2);
    expect(r.removedYears).toEqual(["year2"]);
    expect(r.summary).toMatchObject({ added: 1, updated: 1, removed: 2 });
  });

  test("does not remove years that were skipped", () => {
    const local = snap({ year2: year({ "year2:x": st() }) });
    const r = mergeSnapshots(local, snap({}), { mode: "replace", skipYears: ["year2"] });
    expect(r.removedYears).toEqual([]);
  });
});

describe("settings", () => {
  test("copied only when asked", () => {
    const local = snap({}, { theme: "light" });
    const inc = snap({}, { theme: "dark", textScale: "large" });
    expect(mergeSnapshots(local, inc).settings).toEqual({});
    const r = mergeSnapshots(local, inc, { copySettings: true });
    expect(r.settings).toEqual({ theme: "dark", textScale: "large" });
    expect(r.summary.settingsChanged.sort()).toEqual(["textScale", "theme"]);
  });

  test("identical settings are not counted as a change", () => {
    const r = mergeSnapshots(snap({}, { theme: "dark" }), snap({}, { theme: "dark" }), { copySettings: true });
    expect(r.summary.settingsChanged).toEqual([]);
    expect(isNoOp(r)).toBe(true);
  });
});

describe("apply and undo", () => {
  const KEY = (s) => "spellstars." + s + ".progress";
  beforeEach(() => window.localStorage.clear());

  const setup = () => {
    window.localStorage.setItem(KEY("year3"), JSON.stringify(year({ "year3:a": st({ attempts: 1 }) }, 2)));
    window.localStorage.setItem(KEY("year2"), JSON.stringify(year({ "year2:x": st() }, 5)));
    window.localStorage.setItem("spellstars.theme", "light");
  };

  test("writes the merge, and undo puts everything back exactly", () => {
    setup();
    const before = { ...window.localStorage };
    const { snapshot: local } = readLocalSnapshot(window.localStorage);
    const inc = snap({ year3: year({ "year3:a": st({ attempts: 7 }), "year3:b": st() }, 9), year5: year({ "year5:q": st() }) }, { theme: "dark" });
    const r = mergeSnapshots(local, inc, { mode: "replace", copySettings: true });
    expect(applyMergeResult(window.localStorage, r, 1000)).toEqual({ ok: true });

    expect(JSON.parse(window.localStorage.getItem(KEY("year3"))).words["year3:a"].attempts).toBe(7);
    expect(window.localStorage.getItem(KEY("year2"))).toBeNull(); // removed by replace
    expect(window.localStorage.getItem(KEY("year5"))).not.toBeNull();
    expect(window.localStorage.getItem("spellstars.theme")).toBe("dark");

    const backup = readBackup(window.localStorage, 2000);
    expect(backup).not.toBeNull();
    restoreBackup(window.localStorage, backup);

    const after = { ...window.localStorage };
    expect(after).toEqual(before);
    expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  test("the undo copy expires", () => {
    setup();
    const { snapshot: local } = readLocalSnapshot(window.localStorage);
    const r = mergeSnapshots(local, snap({ year3: year({ "year3:b": st() }) }));
    applyMergeResult(window.localStorage, r, 1000);
    expect(readBackup(window.localStorage, 1000 + UNDO_WINDOW_MS - 1)).not.toBeNull();
    expect(readBackup(window.localStorage, 1000 + UNDO_WINDOW_MS + 1)).toBeNull();
    expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  test("a damaged backup is ignored", () => {
    window.localStorage.setItem(BACKUP_KEY, "{bad");
    expect(readBackup(window.localStorage)).toBeNull();
    window.localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: "x", entries: 3 }));
    expect(readBackup(window.localStorage)).toBeNull();
  });

  test("restore never writes outside the app's own progress and settings keys", () => {
    window.localStorage.setItem("other", "keep");
    restoreBackup(window.localStorage, { at: 1, entries: { other: "hacked", "spellstars.year3.progress": "{}" } });
    expect(window.localStorage.getItem("other")).toBe("keep");
    expect(window.localStorage.getItem("spellstars.year3.progress")).toBe("{}");
  });

  test("a failed write rolls everything back", () => {
    setup();
    const { snapshot: local } = readLocalSnapshot(window.localStorage);
    const before = { ...window.localStorage };
    const r = mergeSnapshots(local, snap({ year3: year({ "year3:b": st() }), year4: year({ "year4:c": st() }) }));

    // A storage that runs out of space when the last new year is written.
    const real = window.localStorage;
    const fake = {
      getItem: (k) => real.getItem(k),
      removeItem: (k) => real.removeItem(k),
      setItem: (k, v) => { if (k === "spellstars.year4.progress") throw new Error("QuotaExceededError"); real.setItem(k, v); },
    };
    const out = applyMergeResult(fake, r, 1000);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/nothing was changed/);
    // applyMergeResult itself rolled back: same contents, minus the undo copy it made.
    delete before[BACKUP_KEY];
    const now = { ...real };
    delete now[BACKUP_KEY];
    expect(now).toEqual(before);
  });

  test("keysToChange lists progress, removed years and settings", () => {
    const r = { progress: { year3: {} }, removedYears: ["year2"], settings: { theme: "dark" }, summary: {} };
    expect(keysToChange(r)).toEqual(["spellstars.year3.progress", "spellstars.year2.progress", "spellstars.theme"]);
  });
});
