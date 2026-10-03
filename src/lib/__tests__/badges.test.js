import {
  BADGES,
  GALAXY_STEP,
  STATUS_TIERS,
  badgeProgress,
  checkStatus,
  computeStatus,
  loadBadges,
  recordCompletion,
  saveBadges,
  totalCorrectCount,
} from "../badges";
import { MAIN_LEARNER_ID, addLearner, progressKeyFor } from "../learners";
import { loadProgress, recordAttempt, saveProgress, todayISO } from "../srs";

const store = () => window.localStorage;
beforeEach(() => store().clear());

function practise(slug, wordKeys, { learnerId, correct = true } = {}) {
  let progress = loadProgress(slug, learnerId);
  for (const key of wordKeys) {
    progress = recordAttempt(progress, key, correct, todayISO());
  }
  saveProgress(slug, progress, learnerId);
  return progress;
}

describe("totalCorrectCount", () => {
  test("is 0 for a learner who has never practised", () => {
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(0);
  });

  test("sums correct answers across years and custom lists for one learner", () => {
    practise("year3", ["year3:badge", "year3:ghost"]);
    practise("custom-abc123", ["custom-abc123:w1"]);
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(3);
  });

  test("an incorrect attempt doesn't add to the total", () => {
    practise("year3", ["year3:badge"], { correct: false });
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(0);
  });

  test("repeated correct attempts at the same word keep accumulating", () => {
    let progress = loadProgress("year3", MAIN_LEARNER_ID);
    progress = recordAttempt(progress, "year3:badge", true, todayISO());
    progress = recordAttempt(progress, "year3:badge", true, todayISO());
    progress = recordAttempt(progress, "year3:badge", false, todayISO());
    saveProgress("year3", progress, MAIN_LEARNER_ID);
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(2);
  });

  test("keeps learners' points separate", () => {
    const ben = addLearner(store(), "Ben").learner.id;
    practise("year3", ["year3:badge", "year3:ghost"], { learnerId: MAIN_LEARNER_ID });
    practise("year3", ["year3:badge"], { learnerId: ben });
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(2);
    expect(totalCorrectCount(store(), ben)).toBe(1);
  });

  test("a migration's .v1 backup isn't double-counted", () => {
    // Mirrors what migrateProgress() leaves behind: the live key plus a
    // one-time backup of the pre-migration data under the same correct
    // counts, keyed by the old slot ids.
    practise("year3", ["year3:badge", "year3:ghost"]);
    store().setItem(
      progressKeyFor("year3", MAIN_LEARNER_ID) + ".v1",
      JSON.stringify({ currentWeek: 1, words: { "year3-w01-01": { box: 1, attempts: 1, correctCount: 1 } } }),
    );
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(2);
  });

  test("ignores corrupt or unrelated storage entries", () => {
    store().setItem(progressKeyFor("year3", MAIN_LEARNER_ID), "{not json");
    store().setItem("spellstars.settings", JSON.stringify({ theme: "dark" }));
    expect(totalCorrectCount(store(), MAIN_LEARNER_ID)).toBe(0);
  });
});

describe("computeStatus", () => {
  test("starts as Letter Explorer the Mouse at 0 points", () => {
    const status = computeStatus(0);
    expect(status.key).toBe("mouse");
    expect(status.status).toBe("Letter Explorer");
    expect(status.animal).toBe("Mouse");
    expect(status.nextKey).toBe("rabbit");
    expect(status.progress).toBe(0);
  });

  test("every tier's exact minPoints already counts as having reached it", () => {
    for (const tier of STATUS_TIERS) {
      if (tier.key === "galaxy") continue;
      expect(computeStatus(tier.minPoints).key).toBe(tier.key);
    }
  });

  test("one point under a tier's threshold is still the tier below", () => {
    expect(computeStatus(39).key).toBe("mouse");
    expect(computeStatus(40).key).toBe("rabbit");
    expect(computeStatus(2499).key).toBe("shootingstar");
    expect(computeStatus(2500).key).toBe("constellation");
  });

  test("progress is the fraction of the way through the current tier", () => {
    // Rabbit: 40 -> 120 (Fox). Halfway is 80.
    const status = computeStatus(80);
    expect(status.key).toBe("rabbit");
    expect(status.progress).toBeCloseTo(0.5);
    expect(status.pointsToNext).toBe(40);
  });

  test("Galaxy is reached at 4000 and is uncapped beyond it", () => {
    expect(computeStatus(3999).key).toBe("constellation");
    const first = computeStatus(4000);
    expect(first.key).toBe("galaxy");
    expect(first.level).toBe(1);
    expect(first.label).toBe("Galaxy");

    const second = computeStatus(4000 + GALAXY_STEP);
    expect(second.level).toBe(2);
    expect(second.label).toBe("Galaxy ×2");

    const far = computeStatus(4000 + GALAXY_STEP * 9 + 10);
    expect(far.level).toBe(10);
    expect(far.label).toBe("Galaxy ×10");
    expect(far.progress).toBeGreaterThan(0);
    expect(far.progress).toBeLessThan(1);
  });

  test("never throws on bad input", () => {
    expect(computeStatus(-50).key).toBe("mouse");
    expect(computeStatus(NaN).key).toBe("mouse");
    expect(computeStatus(undefined).key).toBe("mouse");
  });
});

describe("loadBadges / saveBadges", () => {
  test("defaults to empty counters and no earned badges", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    expect(data.counters).toEqual({ crossword: 0, wordsearch: 0, gold: 0 });
    expect(data.earned).toEqual({});
    expect(data.statusReached).toEqual({});
  });

  test("round-trips through storage", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    data.counters.crossword = 3;
    data.earned["crossword-10"] = "2026-10-01";
    saveBadges(store(), MAIN_LEARNER_ID, data);
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.crossword).toBe(3);
    expect(loadBadges(store(), MAIN_LEARNER_ID).earned["crossword-10"]).toBe("2026-10-01");
  });

  test("keeps separate learners' badges apart", () => {
    const ben = addLearner(store(), "Ben").learner.id;
    recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 0 });
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.crossword).toBe(1);
    expect(loadBadges(store(), ben).counters.crossword).toBe(0);
  });

  test("recovers from corrupt storage rather than throwing", () => {
    store().setItem("spellstars.badges", "{not json");
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.crossword).toBe(0);
  });
});

describe("recordCompletion: milestones", () => {
  test("unlocks a milestone badge the moment the count is reached, not before", () => {
    for (let i = 0; i < 9; i++) recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 1 });
    expect(loadBadges(store(), MAIN_LEARNER_ID).earned["crossword-10"]).toBeUndefined();

    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 1 });
    expect(unlocked.map((b) => b.id)).toContain("crossword-10");
    expect(loadBadges(store(), MAIN_LEARNER_ID).earned["crossword-10"]).toBeTruthy();
  });

  test("doesn't re-unlock (or re-report) an already earned badge", () => {
    for (let i = 0; i < 10; i++) recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 1 });
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 1 });
    expect(unlocked.map((b) => b.id)).not.toContain("crossword-10");
  });

  test("crossword and word search milestones are counted separately", () => {
    for (let i = 0; i < 10; i++) recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 1 });
    expect(loadBadges(store(), MAIN_LEARNER_ID).earned["wordsearch-10"]).toBeUndefined();
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.wordsearch).toBe(0);
  });

  test("an activity other than crossword/wordsearch is a no-op", () => {
    const before = loadBadges(store(), MAIN_LEARNER_ID);
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, { activity: "spelling-test", errors: 0 });
    expect(unlocked).toEqual([]);
    expect(loadBadges(store(), MAIN_LEARNER_ID)).toEqual(before);
  });
});

describe("recordCompletion: gold star and gold streak", () => {
  test("a zero-error run earns the gold star the first time it happens", () => {
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, { activity: "wordsearch", errors: 0 });
    expect(unlocked.map((b) => b.id)).toContain("gold-star");
  });

  test("a run with any errors doesn't count towards gold", () => {
    recordCompletion(store(), MAIN_LEARNER_ID, { activity: "wordsearch", errors: 2 });
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.gold).toBe(0);
  });

  test("gold streak badges unlock at 5 and 20 cumulative clean runs", () => {
    let unlockedIds = [];
    for (let i = 0; i < 20; i++) {
      const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, { activity: i % 2 ? "crossword" : "wordsearch", errors: 0 });
      unlockedIds = unlockedIds.concat(unlocked.map((b) => b.id));
    }
    expect(unlockedIds).toContain("gold-star");
    expect(unlockedIds).toContain("gold-streak-5");
    expect(unlockedIds).toContain("gold-streak-20");
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.gold).toBe(20);
  });

  test("gold counts both activities together", () => {
    recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 0 });
    recordCompletion(store(), MAIN_LEARNER_ID, { activity: "wordsearch", errors: 0 });
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.gold).toBe(2);
  });
});

describe("recordCompletion: speed badges", () => {
  test("quick solve unlocks for a clean crossword within ~15s/word", () => {
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, {
      activity: "crossword",
      errors: 0,
      wordCount: 10,
      seconds: 140,
    });
    expect(unlocked.map((b) => b.id)).toContain("quick-solve");
  });

  test("quick solve does not unlock over the threshold", () => {
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, {
      activity: "crossword",
      errors: 0,
      wordCount: 10,
      seconds: 200,
    });
    expect(unlocked.map((b) => b.id)).not.toContain("quick-solve");
  });

  test("speedster scales by word search size (~20s/word), independent of quick solve", () => {
    const slow = recordCompletion(store(), MAIN_LEARNER_ID, {
      activity: "wordsearch",
      errors: 0,
      wordCount: 6,
      seconds: 200,
    });
    expect(slow.unlocked.map((b) => b.id)).not.toContain("speedster");

    const fast = recordCompletion(store(), MAIN_LEARNER_ID, {
      activity: "wordsearch",
      errors: 0,
      wordCount: 6,
      seconds: 100,
    });
    expect(fast.unlocked.map((b) => b.id)).toContain("speedster");
  });

  test("errors rule out a speed badge even if the time would qualify", () => {
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, {
      activity: "crossword",
      errors: 1,
      wordCount: 10,
      seconds: 50,
    });
    expect(unlocked.map((b) => b.id)).not.toContain("quick-solve");
  });

  test("a logged offline completion (no seconds/wordCount) never earns a speed badge", () => {
    const { unlocked } = recordCompletion(store(), MAIN_LEARNER_ID, { activity: "crossword", errors: 0 });
    expect(unlocked.map((b) => b.id)).not.toContain("quick-solve");
    // ...but still counts towards milestones and gold, same as a digital run.
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.crossword).toBe(1);
    expect(loadBadges(store(), MAIN_LEARNER_ID).counters.gold).toBe(1);
  });
});

describe("the badge catalogue", () => {
  test("every badge id is unique", () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("badgeProgress", () => {
  const find = (id) => BADGES.find((b) => b.id === id);

  test("an earned badge reports its date, not a running count", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    data.earned["crossword-10"] = "2026-10-01";
    expect(badgeProgress(data, find("crossword-10"))).toEqual({ earned: true, date: "2026-10-01", current: null, threshold: null });
  });

  test("a milestone badge not yet earned reports progress towards its threshold", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    data.counters.crossword = 4;
    expect(badgeProgress(data, find("crossword-10"))).toEqual({ earned: false, date: null, current: 4, threshold: 10 });
  });

  test("a gold badge's progress comes from the shared gold counter", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    data.counters.gold = 3;
    expect(badgeProgress(data, find("gold-streak-5"))).toEqual({ earned: false, date: null, current: 3, threshold: 5 });
  });

  test("progress never reports past the threshold", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    data.counters.crossword = 50; // earned 10 and 25 too, but neither is stamped here
    expect(badgeProgress(data, find("crossword-10")).current).toBe(10);
  });

  test("a speed badge not yet earned has no running count to show", () => {
    const data = loadBadges(store(), MAIN_LEARNER_ID);
    expect(badgeProgress(data, find("quick-solve"))).toEqual({ earned: false, date: null, current: null, threshold: null });
  });
});

describe("checkStatus", () => {
  test("stamps today's date the first time a tier is reached, and only once", () => {
    practise("year3", Array.from({ length: 40 }, (_, i) => "year3:w" + i));
    const first = checkStatus(store(), MAIN_LEARNER_ID, { now: new Date("2026-10-03T00:00:00Z") });
    expect(first.status.key).toBe("rabbit");
    expect(first.justReached).toBe(true);
    expect(first.reachedOn).toBe("2026-10-03");

    const second = checkStatus(store(), MAIN_LEARNER_ID, { now: new Date("2026-10-04T00:00:00Z") });
    expect(second.justReached).toBe(false);
    expect(second.reachedOn).toBe("2026-10-03");
  });

  test("crossing into a new tier later is its own one-time moment", () => {
    practise("year3", Array.from({ length: 40 }, (_, i) => "year3:w" + i));
    checkStatus(store(), MAIN_LEARNER_ID, { now: new Date("2026-10-03T00:00:00Z") });

    practise("year4", Array.from({ length: 80 }, (_, i) => "year4:w" + i));
    const upgraded = checkStatus(store(), MAIN_LEARNER_ID, { now: new Date("2026-10-05T00:00:00Z") });
    expect(upgraded.status.key).toBe("fox");
    expect(upgraded.justReached).toBe(true);

    const again = checkStatus(store(), MAIN_LEARNER_ID, { now: new Date("2026-10-06T00:00:00Z") });
    expect(again.justReached).toBe(false);
  });

  test("each Galaxy level gets its own one-time moment", () => {
    practise("year3", Array.from({ length: 4000 }, (_, i) => "year3:w" + i));
    const g1 = checkStatus(store(), MAIN_LEARNER_ID);
    expect(g1.status.label).toBe("Galaxy");
    expect(g1.justReached).toBe(true);

    practise("year4", Array.from({ length: GALAXY_STEP }, (_, i) => "year4:w" + i));
    const g2 = checkStatus(store(), MAIN_LEARNER_ID);
    expect(g2.status.label).toBe("Galaxy ×2");
    expect(g2.justReached).toBe(true);
  });
});
