import {
  parseRuleQuery, ruleLabel, wordFits, focusFits, flattenYears, searchRules, listLearningPoints,
  wordsForRule, mixRules, toListWords, suggestName,
} from "../ruleSearch";

const e = (yearSlug, word, focus, extra = {}) => ({ yearSlug, word, focus, contentType: "word", weekOfYear: 1, definition: "d " + word, exampleSentence: "s " + word, ...extra });
const DATA = [
  e("year2", "table", "-le ending", { weekOfYear: 6 }),
  e("year2", "apple", "-le ending", { weekOfYear: 6 }),
  e("year2", "little", "-le ending", { weekOfYear: 6 }),
  e("year2", "knit", "kn/gn at the start of words", { weekOfYear: 4 }),
  e("year2", "gnat", "kn/gn at the start of words", { weekOfYear: 4 }),
  e("year1", "tree", "ee spelling", { weekOfYear: 9 }),
  e("year1", "feet", "ee spelling", { weekOfYear: 9 }),
  e("year3", "bee", "NC Appendix 1 statutory word list (Years 3/4)"),
  e("year3", "table", "Baseline review: Year 2 spelling rules", { definition: "", exampleSentence: "" }),
  e("year3", "suffix", "suffix -ous", { word: "famous" }),
  { yearSlug: "reception", contentType: "letter", id: "r-a" },
];

describe("parseRuleQuery", () => {
  test.each([
    ["/ee/", { kind: "contains", value: "ee" }],
    ["-le", { kind: "ends", value: "le" }],
    ["-le ending", { kind: "ends", value: "le" }],
    ["–ous", { kind: "ends", value: "ous" }],
    ["kn-", { kind: "starts", value: "kn" }],
    ["kn at the start", { kind: "starts", value: "kn" }],
    ["wr at the start of words", { kind: "starts", value: "wr" }],
    ["-ous-", { kind: "contains", value: "ous" }],
    ["ee", { kind: "contains", value: "ee" }],
    ["  EE  ", { kind: "contains", value: "ee" }],
    ["suffix", { kind: "text", value: "suffix" }],
    ["doubling the final consonant", { kind: "text", value: "doubling the final consonant" }],
  ])("%s", (input, expected) => expect(parseRuleQuery(input)).toEqual(expected));

  test("empty input is no rule", () => {
    expect(parseRuleQuery("")).toBeNull();
    expect(parseRuleQuery("   ")).toBeNull();
  });
});

test("labels", () => {
  expect(ruleLabel({ kind: "ends", value: "le" })).toBe("-le");
  expect(ruleLabel({ kind: "starts", value: "kn" })).toBe("kn-");
  expect(ruleLabel({ kind: "contains", value: "ee" })).toBe("/ee/");
});

test("wordFits ignores hyphens and capitals", () => {
  expect(wordFits({ kind: "ends", value: "ate" }, "Co-operate")).toBe(true);
  expect(wordFits({ kind: "contains", value: "oo" }, "co-operate")).toBe(true);
  expect(wordFits({ kind: "starts", value: "kn" }, "Knit")).toBe(true);
  expect(wordFits({ kind: "ends", value: "le" }, "leaf")).toBe(false);
});

test("focusFits reads the way learning points are written", () => {
  expect(focusFits({ kind: "ends", value: "le" }, "-le ending")).toBe(true);
  expect(focusFits({ kind: "ends", value: "le" }, "Unstressed /l/ spelled –le/–el/–al")).toBe(true);
  expect(focusFits({ kind: "starts", value: "kn" }, "kn/gn at the start of words")).toBe(true);
  expect(focusFits({ kind: "contains", value: "ee" }, "ee spelling")).toBe(true);
  expect(focusFits({ kind: "contains", value: "ee" }, "ea spelling")).toBe(false);
  expect(focusFits({ kind: "ends", value: "le" }, "Suffix \u2013ment, \u2013ness, \u2013ful, \u2013less")).toBe(false);
  expect(focusFits({ kind: "text", value: "suffix" }, "Suffix –ment")).toBe(true);
});

describe("searchRules", () => {
  const entries = flattenYears({ year1: DATA.filter((d) => d.yearSlug === "year1"), year2: DATA.filter((d) => d.yearSlug === "year2"), year3: DATA.filter((d) => d.yearSlug === "year3") });

  test("letters are not words", () => {
    expect(flattenYears({ reception: DATA.filter((d) => d.yearSlug === "reception") })).toEqual([]);
  });

  test("-le finds words once and the learning point", () => {
    const r = searchRules("-le ending", entries);
    expect(r.words.map((w) => w.word).sort()).toEqual(["apple", "little", "table"]);
    expect(r.points.map((p) => p.focus)).toEqual(["-le ending"]);
    expect(r.points[0].weeks).toEqual([6]);
  });

  test("/ee/ finds words from every year, including statutory pools", () => {
    expect(searchRules("/ee/", entries).words.map((w) => w.word).sort()).toEqual(["bee", "feet", "tree"]);
  });

  test("year filter narrows words", () => {
    expect(searchRules("/ee/", entries, { years: ["year1"] }).words.map((w) => w.word).sort()).toEqual(["feet", "tree"]);
  });

  test("a repeated word keeps its meaning from the year that has one", () => {
    const w = searchRules("-le", entries).words.find((x) => x.word === "table");
    expect(w.years).toEqual(["year2", "year3"]);
    expect(w.definition).toBe("d table");
  });

  test("text queries search learning points, not words", () => {
    const r = searchRules("suffix", entries);
    expect(r.words).toEqual([]);
    expect(r.points.map((p) => p.focus)).toEqual(["suffix -ous"]);
  });

  test("baseline and statutory focuses are not offered as learning points", () => {
    const focuses = listLearningPoints(entries).map((p) => p.focus);
    expect(focuses.some((f) => /baseline|statutory/i.test(f))).toBe(false);
  });

  test("nothing typed finds nothing", () => {
    expect(searchRules("", entries)).toEqual({ rule: null, points: [], words: [] });
  });
});

describe("mixRules", () => {
  const entries = flattenYears({ year1: DATA.filter((d) => d.yearSlug === "year1"), year2: DATA.filter((d) => d.yearSlug === "year2") });
  const le = { kind: "ends", value: "le" };
  const kn = { kind: "starts", value: "kn" };

  test("takes turns between rules", () => {
    const { words, perRule } = mixRules([le, kn], entries, { total: 4, seed: 1 });
    expect(words).toHaveLength(4);
    expect(words.filter((w) => w.rules[0] === "-le")).toHaveLength(3);
    expect(perRule.map((p) => p.taken)).toEqual([3, 1]);
  });

  test("equal turns when there are plenty", () => {
    const { words } = mixRules([le, { kind: "contains", value: "ee" }], entries, { total: 4, seed: 2 });
    expect(words.filter((w) => w.rules[0] === "-le")).toHaveLength(2);
    expect(words.filter((w) => w.rules[0] === "/ee/")).toHaveLength(2);
  });

  test("a word that fits two rules is used once", () => {
    const { words } = mixRules([le, { kind: "contains", value: "t" }], entries, { total: 10, seed: 3 });
    const keys = words.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("never more than the list cap", () => {
    const many = flattenYears({ y: Array.from({ length: 80 }, (_, i) => e("y", "word" + String.fromCharCode(97 + (i % 26)) + i, "f")) });
    expect(mixRules([{ kind: "starts", value: "word" }], many, { total: 500 }).words.length).toBeLessThanOrEqual(50);
  });

  test("must fit all rules keeps only words that fit every one", () => {
    const { words } = mixRules([{ kind: "starts", value: "k" }, { kind: "ends", value: "it" }], entries, { total: 10, mustFitAll: true });
    expect(words.map((w) => w.word)).toEqual(["knit"]);
  });

  test("words chosen by hand are never picked again", () => {
    const all = mixRules([le], entries, { total: 10, seed: 1 }).words;
    const skipKey = all[0].key;
    const { words } = mixRules([le], entries, { total: 10, seed: 1, exclude: [skipKey] });
    expect(words.map((w) => w.key)).not.toContain(skipKey);
    expect(words).toHaveLength(all.length - 1);
  });

  test("same seed gives the same words", () => {
    const a = mixRules([le], entries, { total: 2, seed: 9 }).words.map((w) => w.word);
    const b = mixRules([le], entries, { total: 2, seed: 9 }).words.map((w) => w.word);
    expect(a).toEqual(b);
  });

  test("a learning-point rule gives that week's words only", () => {
    const point = listLearningPoints(entries).find((p) => p.focus === "kn/gn at the start of words").rule;
    expect(wordsForRule(point, entries).map((w) => w.word).sort()).toEqual(["gnat", "knit"]);
  });

  test("a text rule gives the words of every learning point it matches", () => {
    expect(wordsForRule({ kind: "text", value: "kn/gn" }, entries).map((w) => w.word).sort()).toEqual(["gnat", "knit"]);
  });
});

test("toListWords and suggestName", () => {
  expect(toListWords([{ word: "tree", definition: "a plant", exampleSentence: "" }])).toEqual([{ word: "tree", definition: "a plant" }]);
  expect(suggestName([{ kind: "ends", value: "le" }, { kind: "starts", value: "kn" }, { kind: "contains", value: "ee" }])).toBe("-le, kn- and /ee/");
  expect(suggestName([])).toBe("My spelling session");
});
