import {
  ACTIVE_LEARNER_KEY,
  LEARNERS_KEY,
  MAIN_LEARNER_ID,
  MAX_LEARNERS,
  addLearner,
  clearLearnerProgress,
  cleanName,
  getActiveLearnerId,
  getLearners,
  learnerProgressKeys,
  loadLearners,
  progressKeyFor,
  removeLearner,
  removeProgressForSlug,
  renameLearner,
  sanitiseRoster,
  setActiveLearnerId,
} from "../learners";
import { PROGRESS_VERSION, loadProgress, migrateProgress, recordAttempt, saveProgress } from "../srs";
import { PROGRESS_KEY_RE, readLocalSnapshot } from "../syncSnapshot";
import { CUSTOM_LISTS_KEY, createList, deleteList, upsertList } from "../customLists";

const store = () => window.localStorage;
beforeEach(() => store().clear());

const seq = () => {
  let n = 0;
  return () => (n++ % 36) / 36;
};

describe("names", () => {
  test("cleanName tidies typed names", () => {
    expect(cleanName("  Ava   May ")).toBe("Ava May");
    expect(cleanName("A\u0000\nB")).toBe("A B");
    expect(cleanName("x".repeat(80)).length).toBe(24);
    expect(cleanName(null)).toBe("");
  });
});

describe("the roster", () => {
  test("a fresh device has one unnamed main learner and no stored roster", () => {
    expect(loadLearners(store())).toEqual([]);
    expect(getLearners(store())).toEqual([{ id: "main", name: "", createdAt: "", implicit: true }]);
    expect(getActiveLearnerId(store())).toBe("main");
  });

  test("adding the first extra learner names the main learner", () => {
    const r = addLearner(store(), "  Ben ", { random: seq() });
    expect(r.ok).toBe(true);
    expect(r.learner.name).toBe("Ben");
    expect(r.learner.id).toMatch(/^l-[a-z0-9]{6}$/);
    expect(loadLearners(store()).map((l) => l.name)).toEqual(["Learner 1", "Ben"]);
    expect(loadLearners(store())[0].id).toBe(MAIN_LEARNER_ID);
  });

  test("names must be present and unique whatever the case", () => {
    addLearner(store(), "Ben");
    expect(addLearner(store(), "   ").ok).toBe(false);
    const dup = addLearner(store(), "bEN");
    expect(dup.ok).toBe(false);
    expect(dup.error).toMatch(/already/);
    expect(addLearner(store(), "learner 1").ok).toBe(false);
  });

  test("there is a limit", () => {
    for (let i = 1; i < MAX_LEARNERS; i++) expect(addLearner(store(), "Kid " + i).ok).toBe(true);
    const over = addLearner(store(), "One too many");
    expect(over.ok).toBe(false);
    expect(loadLearners(store()).length).toBe(MAX_LEARNERS);
  });

  test("renaming the only learner starts a roster of one", () => {
    expect(renameLearner(store(), "main", "Ava").ok).toBe(true);
    expect(loadLearners(store())).toEqual([{ id: "main", name: "Ava", createdAt: "" }]);
    expect(renameLearner(store(), "l-nope12", "X").ok).toBe(false);
  });

  test("renaming rejects another learner's name but allows a change of case", () => {
    addLearner(store(), "Ben");
    const id = loadLearners(store())[1].id;
    expect(renameLearner(store(), id, "learner 1").ok).toBe(false);
    expect(renameLearner(store(), id, "BEN").ok).toBe(true);
    expect(loadLearners(store())[1].name).toBe("BEN");
  });

  test("a damaged roster is repaired, never thrown", () => {
    store().setItem(LEARNERS_KEY, "not json");
    expect(loadLearners(store())).toEqual([]);
    const fixed = sanitiseRoster([
      { id: "l-abc123", name: "Cy" },
      { id: "l-abc123", name: "Dupe id" },
      { id: "l-def456", name: "cy" },
      { id: "bad id", name: "Nope" },
      { id: "l-ghi789", name: "   " },
      null,
      { id: "l-jkl012", name: "Di", createdAt: 5 },
    ]);
    expect(fixed.map((l) => l.id)).toEqual(["main", "l-abc123", "l-jkl012"]);
    expect(fixed[0].name).toBe("Learner 1");
    expect(fixed[2].createdAt).toBe("");
    expect(sanitiseRoster([{ id: "main", name: "Learner 1" }, { id: "l-abc123", name: "Learner 1" }]).length).toBe(1);
  });

  test("a roster with no main learner gets one whose name does not clash", () => {
    const fixed = sanitiseRoster([{ id: "l-abc123", name: "Learner 1" }]);
    expect(fixed.map((l) => l.name)).toEqual(["Learner 2", "Learner 1"]);
  });
});

describe("who is practising", () => {
  test("is remembered, and falls back to the main learner when that learner is gone", () => {
    addLearner(store(), "Ben");
    const ben = loadLearners(store())[1].id;
    setActiveLearnerId(store(), ben);
    expect(getActiveLearnerId(store())).toBe(ben);
    store().setItem(LEARNERS_KEY, JSON.stringify([{ id: "main", name: "Learner 1" }]));
    expect(getActiveLearnerId(store())).toBe("main");
    store().removeItem(ACTIVE_LEARNER_KEY);
    expect(getActiveLearnerId(store())).toBe("main");
  });
});

describe("progress is kept separately for each learner", () => {
  test("keys", () => {
    expect(progressKeyFor("year3")).toBe("spellstars.year3.progress");
    expect(progressKeyFor("year3", "main")).toBe("spellstars.year3.progress");
    expect(progressKeyFor("year3", "l-abc123")).toBe("spellstars.l-abc123.year3.progress");
    expect(PROGRESS_KEY_RE.test(progressKeyFor("year3", "l-abc123"))).toBe(false);
  });

  test("load and save do not leak between learners", () => {
    const a = recordAttempt(loadProgress("year3"), "year3:badge", true, "2026-09-21");
    saveProgress("year3", a);
    const b = recordAttempt(loadProgress("year3", "l-abc123"), "year3:ghost", false, "2026-09-21");
    saveProgress("year3", b, "l-abc123");
    expect(Object.keys(loadProgress("year3").words)).toEqual(["year3:badge"]);
    expect(Object.keys(loadProgress("year3", "l-abc123").words)).toEqual(["year3:ghost"]);
    expect(Object.keys(loadProgress("year3", "l-other1").words)).toEqual([]);
  });

  test("a learner's progress never appears as the main learner's in a snapshot", () => {
    saveProgress("year3", { v: PROGRESS_VERSION, currentWeek: 1, words: {} }, "l-abc123");
    expect(Object.keys(readLocalSnapshot(store()).snapshot.progress)).toEqual([]);
  });

  test("migrateProgress works on a learner's key", () => {
    const words = [{ id: "year3-w01-01", wordKey: "year3:badge", word: "badge" }];
    store().setItem(
      progressKeyFor("year3", "l-abc123"),
      JSON.stringify({ currentWeek: 2, words: { "year3-w01-01": { box: 1, dueDate: "2026-09-22", attempts: 1, correctCount: 1, lastResult: "correct", lastSeen: "2026-09-21" } } }),
    );
    const out = migrateProgress("year3", words, "l-abc123");
    expect(Object.keys(out.words)).toEqual(["year3:badge"]);
    expect(store().getItem("spellstars.l-abc123.year3.progress.v1")).not.toBeNull();
    expect(store().getItem("spellstars.year3.progress")).toBeNull();
  });
});

describe("removing and clearing", () => {
  const seed = () => {
    const y = { v: PROGRESS_VERSION, currentWeek: 1, words: {} };
    saveProgress("year3", y);
    saveProgress("year4", y);
    saveProgress("custom-abc123", y);
    saveProgress("year3", y, "l-abc123");
    saveProgress("custom-abc123", y, "l-abc123");
    saveProgress("year3", y, "l-def456");
    store().setItem("spellstars.year3.progress.v1", "{}");
  };

  test("learnerProgressKeys finds only that learner's keys", () => {
    seed();
    expect(learnerProgressKeys(store(), "l-abc123").sort()).toEqual([
      "spellstars.l-abc123.custom-abc123.progress",
      "spellstars.l-abc123.year3.progress",
    ]);
    expect(learnerProgressKeys(store(), "main").length).toBe(4);
  });

  test("clearing one learner leaves the others", () => {
    seed();
    clearLearnerProgress(store(), "main");
    expect(learnerProgressKeys(store(), "main")).toEqual([]);
    expect(learnerProgressKeys(store(), "l-abc123").length).toBe(2);
  });

  test("removing a learner removes their progress and cannot remove main", () => {
    addLearner(store(), "Ben");
    const ben = loadLearners(store())[1].id;
    saveProgress("year3", { v: PROGRESS_VERSION, currentWeek: 1, words: {} }, ben);
    setActiveLearnerId(store(), ben);
    expect(removeLearner(store(), "main").ok).toBe(false);
    expect(removeLearner(store(), ben).ok).toBe(true);
    expect(loadLearners(store()).map((l) => l.name)).toEqual(["Learner 1"]);
    expect(store().getItem(progressKeyFor("year3", ben))).toBeNull();
    expect(getActiveLearnerId(store())).toBe("main");
    expect(removeLearner(store(), ben).ok).toBe(false);
  });

  test("removeProgressForSlug clears one slug for everyone", () => {
    seed();
    removeProgressForSlug(store(), "custom-abc123");
    expect(store().getItem("spellstars.custom-abc123.progress")).toBeNull();
    expect(store().getItem("spellstars.l-abc123.custom-abc123.progress")).toBeNull();
    expect(store().getItem("spellstars.l-abc123.year3.progress")).not.toBeNull();
    expect(store().getItem("spellstars.year3.progress")).not.toBeNull();
  });

  test("deleting a custom list removes every learner's practice of it", () => {
    const list = createList({ name: "Trip", words: [{ word: "frost" }], existingIds: [] });
    expect(upsertList(store(), list).ok).toBe(true);
    const y = { v: PROGRESS_VERSION, currentWeek: 1, words: {} };
    saveProgress(list.id, y);
    saveProgress(list.id, y, "l-abc123");
    saveProgress("year3", y, "l-abc123");
    deleteList(store(), list.id);
    expect(store().getItem(CUSTOM_LISTS_KEY)).toBe("[]");
    expect(learnerProgressKeys(store(), "main")).toEqual([]);
    expect(learnerProgressKeys(store(), "l-abc123")).toEqual(["spellstars.l-abc123.year3.progress"]);
  });
});
