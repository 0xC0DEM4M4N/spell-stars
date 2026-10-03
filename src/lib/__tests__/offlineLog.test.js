import {
  OFFLINE_STEPS,
  getWeekLog,
  loadOfflineLog,
  markOfflineStep,
  offlineLogKeyFor,
  saveOfflineLog,
} from "../offlineLog";
import { MAIN_LEARNER_ID } from "../learners";
import { loadBadges } from "../badges";

const store = () => window.localStorage;
beforeEach(() => store().clear());

describe("offlineLogKeyFor", () => {
  test("main learner uses the unscoped key", () => {
    expect(offlineLogKeyFor(MAIN_LEARNER_ID)).toBe("spellstars.offlineLog");
    expect(offlineLogKeyFor(undefined)).toBe("spellstars.offlineLog");
  });

  test("another learner is namespaced", () => {
    expect(offlineLogKeyFor("l-abcd")).toBe("spellstars.l-abcd.offlineLog");
  });
});

describe("loadOfflineLog / saveOfflineLog", () => {
  test("starts empty", () => {
    expect(loadOfflineLog(store(), MAIN_LEARNER_ID)).toEqual({ v: 1, weeks: {} });
  });

  test("round-trips through save/load", () => {
    const data = { v: 1, weeks: { "year3:2": { wordsearch: { done: true, date: "2026-10-03", cleanRun: true } } } };
    saveOfflineLog(store(), MAIN_LEARNER_ID, data);
    expect(loadOfflineLog(store(), MAIN_LEARNER_ID)).toEqual(data);
  });

  test("never throws on corrupt storage, falls back to empty", () => {
    store().setItem(offlineLogKeyFor(MAIN_LEARNER_ID), "not json");
    expect(loadOfflineLog(store(), MAIN_LEARNER_ID)).toEqual({ v: 1, weeks: {} });

    store().setItem(offlineLogKeyFor(MAIN_LEARNER_ID), JSON.stringify({ weeks: "nope" }));
    expect(loadOfflineLog(store(), MAIN_LEARNER_ID)).toEqual({ v: 1, weeks: {} });
  });
});

describe("getWeekLog", () => {
  test("is {} for a week nothing has been logged against", () => {
    const data = loadOfflineLog(store(), MAIN_LEARNER_ID);
    expect(getWeekLog(data, "year3", 2)).toEqual({});
  });

  test("returns what's logged for that exact year+week, not another one", () => {
    const data = { v: 1, weeks: { "year3:2": { verbal: { done: true, date: "2026-10-03", cleanRun: null } } } };
    expect(getWeekLog(data, "year3", 2)).toEqual({ verbal: { done: true, date: "2026-10-03", cleanRun: null } });
    expect(getWeekLog(data, "year3", 3)).toEqual({});
    expect(getWeekLog(data, "year4", 2)).toEqual({});
  });
});

describe("markOfflineStep", () => {
  test("a fresh tick is applied and logged", () => {
    const result = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "verbal" });
    expect(result.applied).toBe(true);
    const data = loadOfflineLog(store(), MAIN_LEARNER_ID);
    expect(getWeekLog(data, "year3", 2).verbal.done).toBe(true);
  });

  test("the same step for the same learner+year+week is only ever applied once", () => {
    const first = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "verbal" });
    const second = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "verbal" });
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.unlocked).toEqual([]);
    expect(second.status).toBeNull();
  });

  test("the same step on a different week, or for a different learner, applies again", () => {
    markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "verbal" });
    const otherWeek = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 3, stepId: "verbal" });
    const otherLearner = markOfflineStep(store(), "l-abcd", { yearSlug: "year3", week: 2, stepId: "verbal" });
    expect(otherWeek.applied).toBe(true);
    expect(otherLearner.applied).toBe(true);
  });

  test("an unknown step id is a no-op", () => {
    const result = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "nonsense" });
    expect(result.applied).toBe(false);
    expect(loadOfflineLog(store(), MAIN_LEARNER_ID)).toEqual({ v: 1, weeks: {} });
  });

  test("missing yearSlug or week is a no-op", () => {
    expect(markOfflineStep(store(), MAIN_LEARNER_ID, { week: 2, stepId: "verbal" }).applied).toBe(false);
    expect(markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", stepId: "verbal" }).applied).toBe(false);
  });

  test("a wordsearch/crossword tick feeds the matching badges.js activity counter", () => {
    markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "wordsearch" });
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    expect(data.counters.wordsearch).toBe(1);
    expect(data.counters.gold).toBe(0); // not a clean run by default
  });

  test("cleanRun:true on a badge-eligible step counts as a gold run too", () => {
    markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "crossword", cleanRun: true });
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    expect(data.counters.crossword).toBe(1);
    expect(data.counters.gold).toBe(1);
  });

  test("look-cover-write-check and verbal test never touch badges.js counters", () => {
    markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "lcwc", cleanRun: true });
    markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "verbal", cleanRun: true });
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    expect(data.counters).toEqual({ crossword: 0, wordsearch: 0, gold: 0 });
  });

  test("ticking crossword ×10 via offline check-ins alone unlocks the crossword-10 badge", () => {
    let lastResult;
    for (let week = 1; week <= 10; week++) {
      lastResult = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week, stepId: "crossword" });
    }
    expect(lastResult.unlocked.map((b) => b.id)).toContain("crossword-10");
  });

  test("status is only computed (and returned) on a fresh, applied tick", () => {
    const result = markOfflineStep(store(), MAIN_LEARNER_ID, { yearSlug: "year3", week: 2, stepId: "verbal" });
    expect(result.status).not.toBeNull();
    expect(result.status.status.key).toBe("mouse");
  });

  test("respects a passed-in `now` for the logged date", () => {
    markOfflineStep(store(), MAIN_LEARNER_ID, {
      yearSlug: "year3",
      week: 2,
      stepId: "verbal",
      now: new Date("2026-01-05T12:00:00Z"),
    });
    const data = loadOfflineLog(store(), MAIN_LEARNER_ID);
    expect(getWeekLog(data, "year3", 2).verbal.date).toBe("2026-01-05");
  });
});

describe("OFFLINE_STEPS", () => {
  test("has exactly the four catalogue entries, in week order", () => {
    expect(OFFLINE_STEPS.map((s) => s.id)).toEqual(["wordsearch", "crossword", "lcwc", "verbal"]);
  });

  test("only the two puzzle steps carry a badges.js activity", () => {
    const withActivity = OFFLINE_STEPS.filter((s) => s.activity).map((s) => s.id);
    expect(withActivity.sort()).toEqual(["crossword", "wordsearch"]);
  });
});
