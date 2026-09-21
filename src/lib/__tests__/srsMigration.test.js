import {
  PROGRESS_VERSION,
  loadProgress,
  migrateProgress,
  recordAttempt,
  saveProgress,
  selectSessionWords,
} from "../srs";
import { withWordKeys } from "../wordKey";

const KEY = "spellstars.year3.progress";

// Two slots of "accidentally" (a first appearance and a revision), plus two
// other words.
const words = withWordKeys("year3", [
  { id: "year3-w02-01", contentType: "word", word: "accidentally", weekOfYear: 2 },
  { id: "year3-w02-02", contentType: "word", word: "actually", weekOfYear: 2 },
  { id: "year3-w10-11", contentType: "word", word: "accidentally", weekOfYear: 10, revision: true },
  { id: "year3-w10-12", contentType: "word", word: "address", weekOfYear: 10 },
]);

const state = (over) => ({
  box: 2,
  dueDate: "2026-09-10",
  attempts: 2,
  correctCount: 2,
  lastResult: "correct",
  lastSeen: "2026-09-09",
  ...over,
});

const store = (value) => window.localStorage.setItem(KEY, JSON.stringify(value));
const stored = () => JSON.parse(window.localStorage.getItem(KEY));

beforeEach(() => {
  window.localStorage.clear();
});

describe("loadProgress", () => {
  test("a fresh child starts on the current format", () => {
    expect(loadProgress("year3").v).toBe(PROGRESS_VERSION);
  });

  test("old saved progress stays unversioned until it is migrated", () => {
    store({ currentWeek: 4, words: {} });
    expect(loadProgress("year3").v).toBeUndefined();
  });
});

describe("migrateProgress", () => {
  test("re-keys saved words from slot ids to word keys", () => {
    store({
      currentWeek: 5,
      words: { "year3-w02-01": state({ box: 3 }), "year3-w02-02": state({ box: 1 }) },
    });
    const migrated = migrateProgress("year3", words);
    expect(migrated.v).toBe(PROGRESS_VERSION);
    expect(migrated.currentWeek).toBe(5);
    expect(Object.keys(migrated.words).sort()).toEqual(["year3:accidentally", "year3:actually"]);
    expect(migrated.words["year3:accidentally"].box).toBe(3);
    expect(stored()).toEqual(migrated);
  });

  test("combines the slots of a repeated word", () => {
    store({
      currentWeek: 12,
      words: {
        "year3-w02-01": state({ attempts: 3, correctCount: 2, box: 2, lastSeen: "2026-09-09", dueDate: "2026-09-10" }),
        "year3-w10-11": state({ attempts: 1, correctCount: 1, box: 4, lastSeen: "2026-10-20", dueDate: "2026-11-03" }),
      },
    });
    const merged = migrateProgress("year3", words).words["year3:accidentally"];
    expect(merged.attempts).toBe(4);
    expect(merged.correctCount).toBe(3);
    // Box and due date come from the most recent practice.
    expect(merged.box).toBe(4);
    expect(merged.dueDate).toBe("2026-11-03");
    expect(merged.lastSeen).toBe("2026-10-20");
  });

  test("keeps the original saved value once, as a fallback", () => {
    const original = { currentWeek: 2, words: { "year3-w02-01": state() } };
    store(original);
    migrateProgress("year3", words);
    expect(JSON.parse(window.localStorage.getItem(KEY + ".v1"))).toEqual(original);

    // A later re-migration must not overwrite the fallback.
    store({ currentWeek: 2, words: { "year3-w02-02": state() } });
    migrateProgress("year3", words);
    expect(JSON.parse(window.localStorage.getItem(KEY + ".v1"))).toEqual(original);
  });

  test("does nothing the second time", () => {
    store({ currentWeek: 2, words: { "year3-w02-01": state() } });
    expect(migrateProgress("year3", words)).not.toBeNull();
    const after = window.localStorage.getItem(KEY);
    expect(migrateProgress("year3", words)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe(after);
  });

  test("does nothing when there is no saved progress", () => {
    expect(migrateProgress("year3", words)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  test("keeps records whose word is no longer in the data", () => {
    store({
      currentWeek: 3,
      words: { "year3-w02-01": state(), "year3-w99-99": state({ box: 5 }) },
    });
    const migrated = migrateProgress("year3", words);
    expect(migrated.words["year3-w99-99"].box).toBe(5);
    expect(migrated.words["year3:accidentally"]).toBeDefined();
  });

  test("copes with progress that is already partly on word keys", () => {
    store({
      currentWeek: 3,
      words: { "year3:actually": state({ attempts: 5 }), "year3-w02-01": state() },
    });
    const migrated = migrateProgress("year3", words);
    expect(migrated.words["year3:actually"].attempts).toBe(5);
    expect(migrated.words["year3:accidentally"]).toBeDefined();
  });

  test("leaves progress alone if the word data belongs to another year", () => {
    store({ currentWeek: 3, words: { "year3-w02-01": state() } });
    const year4Words = withWordKeys("year4", [
      { id: "year4-w02-01", contentType: "word", word: "actually" },
    ]);
    expect(migrateProgress("year3", year4Words)).toBeNull();
    expect(stored().v).toBeUndefined();
  });

  test("ignores corrupt or unusable saved data", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(migrateProgress("year3", words)).toBeNull();
    window.localStorage.setItem(KEY, JSON.stringify({ currentWeek: 1 }));
    expect(migrateProgress("year3", words)).toBeNull();
  });

  test("does nothing without word data", () => {
    store({ currentWeek: 3, words: { "year3-w02-01": state() } });
    expect(migrateProgress("year3", [])).toBeNull();
    expect(stored().v).toBeUndefined();
  });

  test("after migrating, new attempts update the same word record", () => {
    store({ currentWeek: 2, words: { "year3-w02-01": state({ box: 2, attempts: 2 }) } });
    const migrated = migrateProgress("year3", words);
    const next = recordAttempt(migrated, "year3:accidentally", true, "2026-10-01");
    expect(Object.keys(next.words)).toEqual(["year3:accidentally"]);
    expect(next.words["year3:accidentally"].attempts).toBe(3);
    expect(next.words["year3:accidentally"].box).toBe(3);
    expect(next.v).toBe(PROGRESS_VERSION);
    saveProgress("year3", next);
    expect(loadProgress("year3").words["year3:accidentally"].attempts).toBe(3);
  });
});

describe("session selection uses word keys", () => {
  test("a word practised in its first slot is due when it shows up as a revision", () => {
    store({
      currentWeek: 10,
      words: { "year3-w02-01": state({ box: 1, dueDate: "2026-09-01", lastSeen: "2026-08-31" }) },
    });
    const progress = migrateProgress("year3", words);
    // Pool holds only the revision slot of "accidentally".
    const pool = words.filter((w) => w.id === "year3-w10-11" || w.id === "year3-w10-12");
    const session = selectSessionWords(pool, {
      progress,
      sessionCaps: { newItemsPerDay: 0, reviewsPerDay: 10 },
      requestedCount: 1,
      todayISOStr: "2026-10-01",
    });
    expect(session.map((w) => w.word)).toEqual(["accidentally"]);
  });

  test("never lists the same word twice", () => {
    const progress = loadProgress("year3");
    const session = selectSessionWords(words, {
      progress,
      sessionCaps: { newItemsPerDay: 10, reviewsPerDay: 10 },
      requestedCount: 10,
      todayISOStr: "2026-10-01",
    });
    const keys = session.map((w) => w.wordKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(3); // accidentally, actually, address
  });
});
