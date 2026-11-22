import fs from "fs";
import path from "path";
import { YEAR_ORDER, blockedWords, checkSentence, coveredWords, pointFor, wordStatus } from "../dictationVocab";

const dataDir = path.join(__dirname, "../../../public/data");
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(dataDir, ...p), "utf8"));
const vocabFile = readJson("vocab.json");
const vocab = vocabFile.words;

describe("public/data/vocab.json", () => {
  test("is up to date with the word lists (run scripts/build_vocab.py if not)", () => {
    const expected = {};
    YEAR_ORDER.forEach((slug, yi) => {
      for (const e of readJson(slug, "words.json")) {
        if (e.contentType !== "word" || !e.word) continue;
        const k = e.word.toLowerCase();
        const pt = [yi, e.weekOfYear];
        if (!expected[k] || pt[0] < expected[k][0] || (pt[0] === expected[k][0] && pt[1] < expected[k][1])) expected[k] = pt;
      }
    });
    expect(vocabFile.years).toEqual(YEAR_ORDER);
    expect(vocab).toEqual(expected);
  });
});

describe("wordStatus", () => {
  test("a word is covered from the week it first appears, and future before that", () => {
    const [year, week] = vocab.conscience;
    const slugYear = year;
    expect(wordStatus("conscience", vocab, [slugYear, week])).toBe("covered");
    expect(wordStatus("conscience", vocab, [Math.max(0, slugYear - 1), 40])).toBe("future");
    expect(wordStatus("conscience", vocab, [slugYear, week - 1])).toBe("future");
  });
  test("endings are understood, and words not in the lists are unlisted", () => {
    expect(wordStatus("walks", { walk: [1, 1] }, [1, 5])).toBe("covered");
    expect(wordStatus("stopped", { stop: [1, 1] }, [1, 5])).toBe("covered");
    expect(wordStatus("birthday", vocab, [3, 10])).toBe("unlisted");
  });
});

describe("checkSentence", () => {
  const year1Week2 = pointFor("year1", 2);
  test("an easy sentence passes", () => {
    expect(checkSentence("The cat sat on the mat.", { vocab, point: year1Week2, lessonWords: ["cat"] }).ok).toBe(true);
  });
  test("a word the class hasn't reached yet is turned down from Year 3 up", () => {
    const point = pointFor("year3", 1);
    const result = checkSentence("Her conscience was clear after the apology.", { vocab, point, lessonWords: ["apology"] });
    expect(result.future).toContain("conscience");
    expect(result.ok).toBe(false);
  });
  test("the lesson's own words are always allowed", () => {
    expect(checkSentence("Her conscience was clear.", { vocab, point: pointFor("year3", 1), lessonWords: ["conscience"] }).ok).toBe(true);
  });
  test("more than one long unlisted word is turned down, names are ignored", () => {
    const point = pointFor("year2", 5);
    expect(checkSentence("The archaeologists uncovered mysterious artefacts.", { vocab, point }).ok).toBe(false);
    expect(checkSentence("The girl met Penelope at the shop.", { vocab, point }).ok).toBe(true);
  });
  test("bad language is always turned down, even with no year group", () => {
    expect(blockedWords("What the hell was that?")).toEqual(["hell"]);
    expect(checkSentence("That was damn silly.", { vocab: null, point: null }).ok).toBe(false);
    expect(checkSentence("The fox ran home.", { vocab: null, point: null }).ok).toBe(true);
  });
  test("a lesson with no year group skips the vocabulary check", () => {
    expect(pointFor("custom", 3)).toBeNull();
    expect(checkSentence("Extraordinarily complicated vocabulary appears.", { vocab, point: null }).ok).toBe(true);
  });
});

describe("the check against the site's own example sentences", () => {
  // They were written for these year groups, so most should pass. If this fails
  // after the check or the lists change, the limits in dictationVocab.js have
  // become too strict.
  test.each(YEAR_ORDER.map((slug, yi) => [slug, yi]))("%s", (slug, yi) => {
    let total = 0;
    let passed = 0;
    for (const e of readJson(slug, "words.json")) {
      if (e.contentType !== "word" || !e.exampleSentence) continue;
      total++;
      if (checkSentence(e.exampleSentence, { vocab, point: [yi, e.weekOfYear], lessonWords: [e.word] }).ok) passed++;
    }
    expect(passed / total).toBeGreaterThan(0.85);
  });
});

describe("coveredWords", () => {
  test("grows through the programme", () => {
    const early = coveredWords(vocab, pointFor("year1", 1)).length;
    const later = coveredWords(vocab, pointFor("year6", 40)).length;
    expect(later).toBeGreaterThan(early);
    expect(later).toBe(Object.keys(vocab).length);
  });
});
