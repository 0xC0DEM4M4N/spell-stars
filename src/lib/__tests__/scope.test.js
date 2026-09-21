import { resolveScopePool } from "../scope";
import { withWordKeys } from "../wordKey";

const termStructure = {
  autumn: { teachingWeeks: [1, 14], halfTermAfterWeek: 7 },
  spring: { teachingWeeks: [15, 26], halfTermAfterWeek: 20 },
  summer: { teachingWeeks: [27, 38], halfTermAfterWeek: 32 },
};

// "actually" is taught in week 2 and comes back as revision in week 10 and
// again in spring, week 16.
const words = withWordKeys("year3", [
  { id: "year3-w02-01", contentType: "word", word: "actually", weekOfYear: 2, term: "autumn" },
  { id: "year3-w02-02", contentType: "word", word: "address", weekOfYear: 2, term: "autumn" },
  { id: "year3-w10-01", contentType: "word", word: "actually", weekOfYear: 10, term: "autumn", revision: true },
  { id: "year3-w16-01", contentType: "word", word: "actually", weekOfYear: 16, term: "spring", revision: true },
  { id: "year3-w16-02", contentType: "word", word: "answer", weekOfYear: 16, term: "spring" },
]);

describe("resolveScopePool", () => {
  test("day keeps the week's slots exactly as they are", () => {
    const pool = resolveScopePool(words, { scope: "day", currentWeek: 10, termStructure });
    expect(pool.map((w) => w.id)).toEqual(["year3-w10-01"]);
  });

  test("term lists each word once, at its first appearance in that term", () => {
    const pool = resolveScopePool(words, { scope: "term", currentWeek: 10, termStructure });
    expect(pool.map((w) => w.id)).toEqual(["year3-w02-01", "year3-w02-02"]);
  });

  test("a revised word still appears in the later term it is revised in", () => {
    const pool = resolveScopePool(words, { scope: "term", currentWeek: 16, termStructure });
    expect(pool.map((w) => w.word)).toEqual(["actually", "answer"]);
  });

  test("all lists each word once", () => {
    const pool = resolveScopePool(words, { scope: "all", currentWeek: 16, termStructure });
    expect(pool.map((w) => w.word)).toEqual(["actually", "address", "answer"]);
    expect(pool[0].id).toBe("year3-w02-01");
  });

  test("all only covers weeks up to the current week", () => {
    const pool = resolveScopePool(words, { scope: "all", currentWeek: 2, termStructure });
    expect(pool.map((w) => w.word)).toEqual(["actually", "address"]);
  });
});
