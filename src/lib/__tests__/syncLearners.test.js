import { LEARNERS_KEY, addLearner, loadLearners, progressKeyFor } from "../learners";
import { saveProgress } from "../srs";
import { practisedWordCount } from "../syncNudge";
import { isEmptySnapshot, readLocalSnapshot, snapshotLearners, validateSnapshot } from "../syncSnapshot";
import { applyMergeResult, isNoOp, keysToChange, mergeSnapshots, readBackup, restoreBackup } from "../syncMerge";

const store = () => window.localStorage;
beforeEach(() => store().clear());

const state = (attempts = 1) => ({ box: 1, dueDate: "2026-09-22", attempts, correctCount: attempts, lastResult: "correct", lastSeen: "2026-09-21" });
const year = (keys, week = 1, attempts = 1) => ({
  v: 2,
  currentWeek: week,
  words: Object.fromEntries(keys.map((k) => [k, state(attempts)])),
});
const snap = (progress, learners = [], extra = {}) => ({
  app: "spell-stars",
  v: 1,
  exportedAt: "2026-09-21T10:00:00.000Z",
  progress,
  settings: {},
  lists: [],
  learners,
  ...extra,
});
const seeded = () => {
  let n = 0;
  return () => ((n++ * 7) % 36) / 36;
};
const local = () => readLocalSnapshot(store()).snapshot;

// Two learners on this device: main (Learner 1) and Ben.
function twoLearners() {
  saveProgress("year3", year(["year3:badge", "year3:ghost"]));
  addLearner(store(), "Ben");
  const ben = loadLearners(store())[1].id;
  saveProgress("year3", year(["year3:frost"], 2), ben);
  return ben;
}

describe("reading the device", () => {
  test("no roster gives no learners in the snapshot", () => {
    saveProgress("year3", year(["year3:badge"]));
    const s = local();
    expect(s.learners).toEqual([]);
    expect(snapshotLearners(s)).toEqual([{ id: "main", name: "", createdAt: "", progress: s.progress }]);
  });

  test("the main learner's progress stays top-level; others travel with their learner", () => {
    const ben = twoLearners();
    const s = local();
    expect(Object.keys(s.progress.year3.words).sort()).toEqual(["year3:badge", "year3:ghost"]);
    expect(s.learners.map((l) => l.name)).toEqual(["Learner 1", "Ben"]);
    expect(s.learners[0].progress).toBeUndefined();
    expect(Object.keys(s.learners[1].progress.year3.words)).toEqual(["year3:frost"]);
    expect(s.learners[1].id).toBe(ben);
    expect(validateSnapshot(JSON.parse(JSON.stringify(s))).ok).toBe(true);
  });

  test("a snapshot that only names learners is not empty", () => {
    addLearner(store(), "Ben");
    expect(isEmptySnapshot(local())).toBe(false);
    store().clear();
    expect(isEmptySnapshot(local())).toBe(true);
  });

  test("progress of a learner who is not on the roster is left out", () => {
    saveProgress("year3", year(["year3:x"]), "l-orphan1");
    addLearner(store(), "Ben");
    expect(JSON.stringify(local())).not.toContain("year3:x");
  });

  test("the reminder counts every learner's words", () => {
    twoLearners();
    expect(practisedWordCount(store())).toBe(3);
  });
});

describe("the file format", () => {
  test("an old backup with no learners is still valid", () => {
    const old = { app: "spell-stars", v: 1, exportedAt: "x", progress: { year3: year(["year3:badge"]) }, settings: {} };
    const r = validateSnapshot(old);
    expect(r.ok).toBe(true);
    expect(r.snapshot.learners).toEqual([]);
  });

  test("names are tidied and must be unique; ids must be well formed; there is a limit", () => {
    const ok = validateSnapshot(snap({}, [{ id: "main", name: "  Ava  " }, { id: "l-abc123", name: "Ben" }]));
    expect(ok.ok).toBe(true);
    expect(ok.snapshot.learners[0].name).toBe("Ava");
    expect(ok.snapshot.learners[0].progress).toEqual({});
    expect(validateSnapshot(snap({}, [{ id: "main", name: "Ava" }, { id: "l-abc123", name: "ava" }])).ok).toBe(false);
    expect(validateSnapshot(snap({}, [{ id: "main", name: "A" }, { id: "main", name: "B" }])).ok).toBe(false);
    expect(validateSnapshot(snap({}, [{ id: "bad", name: "A" }])).ok).toBe(false);
    expect(validateSnapshot(snap({}, [{ id: "l-abc123", name: "   " }])).ok).toBe(false);
    const many = Array.from({ length: 13 }, (_, i) => ({ id: "l-abcd" + String(i).padStart(2, "0"), name: "K" + i }));
    expect(validateSnapshot(snap({}, many)).ok).toBe(false);
  });

  test("learner progress is validated like any year's", () => {
    const bad = snap({}, [{ id: "l-abc123", name: "Ben", progress: { year3: { v: 2, currentWeek: 1, words: { "year3:x": { box: 9 } } } } }]);
    expect(validateSnapshot(bad).ok).toBe(false);
  });

  test("a file with named learners but no main entry keeps the top-level progress with a new learner", () => {
    const s = validateSnapshot(snap({ year3: year(["year3:badge"]) }, [{ id: "l-abc123", name: "Learner 1" }])).snapshot;
    const list = snapshotLearners(s);
    expect(list.map((l) => l.id)).toEqual(["main", "l-abc123"]);
    expect(list[0].name).toBe("Learner 2");
    expect(Object.keys(list[0].progress.year3.words)).toEqual(["year3:badge"]);
  });
});

describe("merging", () => {
  test("a backup from before learners goes to the main learner, whoever is on the device", () => {
    twoLearners();
    const inc = snap({ year3: year(["year3:extra"]) });
    const r = mergeSnapshots(local(), inc);
    expect(Object.keys(r.progress.year3.words).sort()).toEqual(["year3:badge", "year3:extra", "year3:ghost"]);
    expect(r.learners.roster).toBeNull();
    expect(r.learners.progress).toEqual({});
    expect(r.summary.learners.map((l) => [l.name, l.added])).toEqual([["Learner 1", 1]]);
  });

  test("learners are matched by name, and never merged into someone else", () => {
    const ben = twoLearners();
    const inc = snap({ year3: year(["year3:badge"], 1, 5) }, [
      { id: "main", name: "Zed", createdAt: "" },
      { id: "l-zzzzzz", name: "ben", createdAt: "", progress: { year3: year(["year3:frost", "year3:new"], 3) } },
    ]);
    const r = mergeSnapshots(local(), inc, { random: seeded() });
    // Ben matched by name, keeping this device's id.
    expect(Object.keys(r.learners.progress)).toContain(ben);
    expect(Object.keys(r.learners.progress[ben].year3.words).sort()).toEqual(["year3:frost", "year3:new"]);
    // Zed is not on this device, so he is added, not merged into Learner 1.
    const zed = r.learners.roster.find((l) => l.name === "Zed");
    expect(zed).toBeTruthy();
    expect(zed.id).not.toBe("main");
    expect(Object.keys(r.learners.progress[zed.id].year3.words)).toEqual(["year3:badge"]);
    expect(Object.keys(r.progress)).toEqual([]);
    expect(r.learners.roster.map((l) => l.name)).toEqual(["Learner 1", "Ben", "Zed"]);
    expect(r.summary.learners.map((l) => [l.name, l.isNew])).toEqual([["Zed", true], ["ben", false]]);
  });

  test("a device with one unnamed learner takes the name of the backup's main learner", () => {
    saveProgress("year3", year(["year3:badge"]));
    const inc = snap({ year3: year(["year3:ghost"]) }, [{ id: "main", name: "Ava", createdAt: "" }]);
    const r = mergeSnapshots(local(), inc);
    expect(r.learners.roster).toEqual([{ id: "main", name: "Ava", createdAt: "" }]);
    expect(Object.keys(r.progress.year3.words).sort()).toEqual(["year3:badge", "year3:ghost"]);
  });

  test("an unnamed device gets the whole roster, with its own learner named first", () => {
    saveProgress("year3", year(["year3:badge"]));
    const inc = snap({ year3: year(["year3:a"]) }, [
      { id: "main", name: "Learner 1", createdAt: "" },
      { id: "l-bbbbbb", name: "Cy", createdAt: "t", progress: { year3: year(["year3:c"]) } },
    ]);
    const r = mergeSnapshots(local(), inc);
    expect(r.learners.roster.map((l) => [l.id, l.name])).toEqual([["main", "Learner 1"], ["l-bbbbbb", "Cy"]]);
    expect(Object.keys(r.progress.year3.words).sort()).toEqual(["year3:a", "year3:badge"]);
    expect(Object.keys(r.learners.progress["l-bbbbbb"].year3.words)).toEqual(["year3:c"]);
  });

  test("a new learner whose id is taken by someone else gets a fresh id", () => {
    const ben = twoLearners();
    const inc = snap({}, [
      { id: "main", name: "Learner 1", createdAt: "" },
      { id: ben, name: "Someone else", createdAt: "", progress: { year3: year(["year3:z"]) } },
    ]);
    const r = mergeSnapshots(local(), inc, { random: seeded() });
    const added = r.learners.roster.find((l) => l.name === "Someone else");
    expect(added.id).not.toBe(ben);
    expect(r.learners.roster.find((l) => l.id === ben).name).toBe("Ben");
  });

  test("the device limit is respected and reported", () => {
    saveProgress("year3", year(["year3:badge"]));
    for (let i = 1; i < 12; i++) addLearner(store(), "Kid " + i);
    const inc = snap({}, [{ id: "main", name: "Learner 1", createdAt: "" }, { id: "l-newnew", name: "Extra", createdAt: "" }]);
    const r = mergeSnapshots(local(), inc);
    expect(r.summary.learnersSkipped).toBe(1);
    expect(r.learners.roster).toBeNull();
  });

  test("merging the same backup again changes nothing", () => {
    twoLearners();
    const s = local();
    expect(isNoOp(mergeSnapshots(s, JSON.parse(JSON.stringify(s))))).toBe(true);
    const after = validateSnapshot(JSON.parse(JSON.stringify(s))).snapshot;
    expect(isNoOp(mergeSnapshots(s, after))).toBe(true);
  });

  test("merge is the same whichever device it is done on", () => {
    saveProgress("year3", year(["year3:a"]));
    addLearner(store(), "Ben");
    const A = local();
    store().clear();
    saveProgress("year3", year(["year3:b"]));
    addLearner(store(), "Ben");
    const ben = loadLearners(store())[1].id;
    saveProgress("year3", year(["year3:c"]), ben);
    const B = local();
    const ab = mergeSnapshots(A, B);
    const ba = mergeSnapshots(B, A);
    expect(Object.keys(ab.progress.year3.words).sort()).toEqual(Object.keys(ba.progress.year3.words).sort());
    const benA = A.learners[1].id;
    const benOn = (r, id) => Object.keys((r.learners.progress[id].year3 || { words: {} }).words).sort();
    // A gains Ben's word; B already has it, so there is nothing to write.
    expect(benOn(ab, benA)).toEqual(["year3:c"]);
    expect(benOn(ba, ben)).toEqual([]);
    // Neither side adds a second Ben.
    expect(ab.learners.roster).toBeNull();
    expect(ba.learners.roster).toBeNull();
  });

  test("different current weeks are reported per learner, and only count when they will be applied", () => {
    const ben = twoLearners();
    const inc = snap({ year3: year(["year3:badge", "year3:ghost"], 1) }, [
      { id: "main", name: "Learner 1", createdAt: "" },
      { id: "l-qqqqqq", name: "Ben", createdAt: "", progress: { year3: year(["year3:frost"], 5) } },
    ]);
    const r = mergeSnapshots(local(), inc);
    expect(r.summary.weekDiffers).toEqual([{ slug: "year3", here: 2, there: 5, learnerId: ben }]);
    expect(isNoOp(r)).toBe(true);
    const r2 = mergeSnapshots(local(), inc, { useIncomingWeeks: true });
    expect(r2.learners.progress[ben].year3.currentWeek).toBe(5);
    expect(isNoOp(r2)).toBe(false);
  });
});

describe("replacing", () => {
  test("makes the device match the backup, removing learners who are not in it", () => {
    const ben = twoLearners();
    store().setItem(progressKeyFor("year3", ben) + ".v1", "{}");
    const inc = snap({ year3: year(["year3:only"]) }, [
      { id: "main", name: "Ava", createdAt: "" },
      { id: "l-cccccc", name: "Cy", createdAt: "", progress: { year3: year(["year3:c"]) } },
    ]);
    const r = mergeSnapshots(local(), inc, { mode: "replace" });
    expect(r.learners.roster.map((l) => l.name)).toEqual(["Ava", "Cy"]);
    expect(r.learners.removedYears[ben]).toEqual(["year3"]);
    expect(r.summary.learners.find((l) => l.id === ben).removedLearner).toBe(true);
    expect(applyMergeResult(store(), r).ok).toBe(true);
    const after = local();
    expect(after.learners.map((l) => l.name)).toEqual(["Ava", "Cy"]);
    expect(Object.keys(after.progress.year3.words)).toEqual(["year3:only"]);
    expect(store().getItem(progressKeyFor("year3", ben))).toBeNull();
    expect(Object.keys(after.learners[1].progress.year3.words)).toEqual(["year3:c"]);
  });

  test("keeps a learner's id when the backup has the same name, so the active learner stays put", () => {
    const ben = twoLearners();
    const inc = snap({}, [
      { id: "main", name: "Learner 1", createdAt: "" },
      { id: "l-dddddd", name: "Ben", createdAt: "", progress: {} },
    ]);
    const r = mergeSnapshots(local(), inc, { mode: "replace" });
    expect(r.learners.roster.map((l) => l.id)).toEqual(["main", ben]);
  });

  test("a backup from before learners returns the device to one unnamed learner", () => {
    twoLearners();
    const r = mergeSnapshots(local(), snap({ year3: year(["year3:badge"]) }), { mode: "replace" });
    expect(r.learners.roster).toEqual([]);
    expect(applyMergeResult(store(), r).ok).toBe(true);
    expect(store().getItem(LEARNERS_KEY)).toBeNull();
    expect(local().learners).toEqual([]);
    expect(Object.keys(local().progress.year3.words)).toEqual(["year3:badge"]);
  });
});

describe("applying and undoing", () => {
  test("keysToChange lists learner keys and the roster, and undo puts everything back", () => {
    const ben = twoLearners();
    const before = JSON.stringify(Object.entries({ ...store() }).sort());
    const inc = snap({ year3: year(["year3:new"]) }, [
      { id: "main", name: "Learner 1", createdAt: "" },
      { id: "l-eeeeee", name: "Di", createdAt: "", progress: { year3: year(["year3:d"]) } },
      { id: "l-ffffff", name: "Ben", createdAt: "", progress: { year3: year(["year3:f"]) } },
    ]);
    const r = mergeSnapshots(local(), inc, { random: seeded() });
    const keys = keysToChange(r);
    expect(keys).toContain(LEARNERS_KEY);
    expect(keys).toContain(progressKeyFor("year3", ben));
    expect(keys).toContain(progressKeyFor("year3", "main"));
    expect(applyMergeResult(store(), r).ok).toBe(true);
    const after = local();
    expect(after.learners.map((l) => l.name)).toEqual(["Learner 1", "Ben", "Di"]);
    expect(Object.keys(after.learners[1].progress.year3.words).sort()).toEqual(["year3:f", "year3:frost"]);
    restoreBackup(store(), readBackup(store()));
    expect(JSON.stringify(Object.entries({ ...store() }).sort())).toBe(before);
  });

  test("undo never writes outside the app's own keys, but does accept learner keys", () => {
    store().setItem(
      "spellstars.syncBackup",
      JSON.stringify({
        at: Date.now(),
        entries: {
          "spellstars.l-abc123.year3.progress": "{}",
          [LEARNERS_KEY]: "[]",
          "somethingelse": "x",
          "spellstars.l-abc123.year3.progress.v1": "x",
        },
      }),
    );
    restoreBackup(store(), readBackup(store()));
    expect(store().getItem("spellstars.l-abc123.year3.progress")).toBe("{}");
    expect(store().getItem(LEARNERS_KEY)).toBe("[]");
    expect(store().getItem("somethingelse")).toBeNull();
    expect(store().getItem("spellstars.l-abc123.year3.progress.v1")).toBeNull();
  });
});
