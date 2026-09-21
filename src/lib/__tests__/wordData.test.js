// Checks the real word lists in public/data against the assumptions the
// progress storage relies on (see lib/wordKey.js).
import fs from "fs";
import path from "path";
import { withWordKeys } from "../wordKey";

const DATA_DIR = path.join(__dirname, "..", "..", "..", "public", "data");
const config = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "years.config.json"), "utf8"));

// Words that appear twice as ordinary (non-revision) slots in the same year,
// found when this test was written. They are harmless to progress storage
// (both slots share one word key) but look like data slips: either the later
// slot should be flagged `revision: true` or the word should be replaced.
// Fix the data, then delete the entry here. New repeats fail the test.
const KNOWN_UNFLAGGED_REPEATS = new Set([
  "year1-w27-08", // where
  "year4-w06-12", // various
  "year4-w12-04", // scene
  "year6-w07-10", // thorough
]);

describe.each(config.years.map((y) => [y.slug]))("%s word list", (slug) => {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, slug, "words.json"), "utf8"));
  const entries = withWordKeys(slug, raw);

  test("every slot id is unique", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every spelling word gets a word key", () => {
    const missing = entries.filter((e) => e.contentType !== "letter" && !e.wordKey);
    expect(missing.map((e) => e.id)).toEqual([]);
  });

  test("a word is not taught twice unless the repeat is flagged as revision", () => {
    const taught = new Set();
    const unflagged = [];
    for (const e of entries) {
      if (!e.wordKey || e.revision) continue;
      if (taught.has(e.wordKey) && !KNOWN_UNFLAGGED_REPEATS.has(e.id)) {
        unflagged.push(e.id + " " + e.word);
      }
      taught.add(e.wordKey);
    }
    expect(unflagged).toEqual([]);
  });

  test("every revision slot repeats an earlier word, or reviews the previous year", () => {
    const seen = new Set();
    const orphans = [];
    for (const e of entries) {
      if (!e.wordKey) continue;
      const reviewsLastYear = e.source === "previous-year-review";
      if (e.revision && !reviewsLastYear && !seen.has(e.wordKey)) orphans.push(e.id + " " + e.word);
      seen.add(e.wordKey);
    }
    expect(orphans).toEqual([]);
  });
});
