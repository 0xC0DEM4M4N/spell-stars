import {
  CUSTOM_LISTS_KEY, MAX_WORDS, MAX_LISTS, parseWordList, wordsToText, createList, makeListId,
  listToEntries, gridSettingsFor, loadLists, saveLists, getList, upsertList, deleteList,
  addBuiltInMeanings, listHasMeanings,
} from "../customLists";

const words = (text, opts) => parseWordList(text, opts).words.map((w) => w.word);

describe("parseWordList", () => {
  test.each([
    ["one per line", "because\nfriend\nthought", ["because", "friend", "thought"]],
    ["windows line endings", "because\r\nfriend\r\nthought\r\n", ["because", "friend", "thought"]],
    ["commas", "because, friend, thought", ["because", "friend", "thought"]],
    ["semicolons", "because; friend; thought", ["because", "friend", "thought"]],
    ["one long line of spaces", "because friend thought", ["because", "friend", "thought"]],
    ["numbered list", "1. because\n2. friend\n3) thought", ["because", "friend", "thought"]],
    ["bullets", "- because\n• friend\n* thought\n– again", ["because", "friend", "thought", "again"]],
    ["a spreadsheet column", "because\nfriend\nthought", ["because", "friend", "thought"]],
    ["a heading before the words (WhatsApp)", "Spellings this week: because, friend, thought", ["because", "friend", "thought"]],
    ["blank lines and stray spaces", "\n  because  \n\n friend\n", ["because", "friend"]],
    ["trailing full stops", "because.\nfriend.", ["because", "friend"]],
    ["curly apostrophes become straight", "can’t\nchild’s", ["can't", "child's"]],
    ["keeps capitals", "February\nWednesday", ["February", "Wednesday"]],
    ["keeps hyphens and short phrases", "well-known\nice cream", ["well-known", "ice cream"]],
    ["accented letters", "café\nnaïve", ["café", "naïve"]],
    ["digits are dropped from words", "cat2\nbe4", ["cat", "be"]],
  ])("%s", (_name, text, expected) => {
    expect(words(text)).toEqual(expected);
  });

  test("keeps a sentence after a bar or in a second tab-separated column", () => {
    const r = parseWordList("their | It is their house.\nthere\tOver there, by the door.\nthey're");
    expect(r.words).toEqual([
      { word: "their", exampleSentence: "It is their house." },
      { word: "there", exampleSentence: "Over there, by the door." },
      { word: "they're" },
    ]);
  });

  test("a single word with a sentence, on one line, is not split on spaces", () => {
    expect(parseWordList("because | I stayed in because it rained").words).toEqual([
      { word: "because", exampleSentence: "I stayed in because it rained" },
    ]);
  });

  test("a sentence with commas is not split into words", () => {
    expect(words("their | It is, of course, their house.")).toEqual(["their"]);
  });

  test("removes duplicates ignoring case and keeps the first", () => {
    const r = parseWordList("Because\nfriend\nbecause\nFRIEND\nthought");
    expect(r.words.map((w) => w.word)).toEqual(["Because", "friend", "thought"]);
    expect(r.duplicates).toBe(2);
  });

  test("caps a list and says how many were left out", () => {
    const text = Array.from({ length: 60 }, (_, i) => "word" + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26))).join("\n");
    const r = parseWordList(text);
    expect(r.words).toHaveLength(MAX_WORDS);
    expect(r.overCap).toBe(10);
  });

  test("reports things that are not words", () => {
    const r = parseWordList("because\n12345\nthis is a whole sentence of words\n!!!");
    expect(r.words.map((w) => w.word)).toEqual(["because"]);
    expect(r.ignored).toEqual(expect.arrayContaining(["12345", "this is a whole sentence of words", "!!!"]));
  });

  test("copes with empty and odd input", () => {
    expect(parseWordList("").words).toEqual([]);
    expect(parseWordList(null).words).toEqual([]);
    expect(parseWordList("   \n  \n").words).toEqual([]);
    expect(parseWordList("x".repeat(200)).words).toEqual([]); // too long to be a word
  });

  test("ignores text beyond the size limit", () => {
    const r = parseWordList("cat\n".repeat(5000) + "zebra");
    expect(r.words.map((w) => w.word)).toEqual(["cat"]);
  });

  test("wordsToText round trips", () => {
    const list = [{ word: "their", exampleSentence: "It is their house." }, { word: "there" }];
    expect(parseWordList(wordsToText(list)).words).toEqual(list);
  });
});

describe("lists", () => {
  const w = [{ word: "because" }, { word: "friend" }, { word: "ice cream" }];

  test("createList", () => {
    const l = createList({ name: "  Week 4  ", yearHint: "year3", words: w, now: new Date("2026-09-21T10:00:00Z"), id: "custom-abc123" });
    expect(l).toMatchObject({ id: "custom-abc123", name: "Week 4", yearHint: "year3", createdAt: "2026-09-21T10:00:00.000Z" });
    expect(createList({ name: "", words: w }).name).toBe("My spelling list");
    expect(createList({ name: "x", words: w }).yearHint).toBeNull();
  });

  test("makeListId avoids clashes and always fits the id pattern", () => {
    const first = makeListId([], () => 0);
    expect(first).toBe("custom-aaaaaa");
    let n = 0;
    const id = makeListId([first], () => (n++ < 6 ? 0 : 0.5));
    expect(id).not.toBe(first);
    expect(id).toMatch(/^custom-[a-z0-9]{6}$/);
  });

  test("listToEntries has the shape of a year's words", () => {
    const l = createList({ name: "Week 4", yearHint: "year3", words: [{ word: "Because", exampleSentence: "Because I said so." }, { word: "friend" }], id: "custom-abc123" });
    const [a, b] = listToEntries(l);
    expect(a).toMatchObject({
      id: "custom-abc123-001", contentType: "word", word: "Because", wordKey: "custom-abc123:because",
      exampleSentence: "Because I said so.", definition: "", focus: "Week 4", weekOfYear: 1,
    });
    expect(b.id).toBe("custom-abc123-002");
  });

  test("gridSettingsFor uses the year's settings and grows for long words", () => {
    const caps = { wordSearchGrid: { size: 8, directions: ["horizontal", "vertical"], letterCase: "lowercase" } };
    const short = createList({ name: "x", words: [{ word: "cat" }], id: "custom-aaaaaa" });
    expect(gridSettingsFor(short, caps)).toMatchObject({ size: 8, letterCase: "lowercase", tooLong: [] });
    const long = createList({ name: "x", words: [{ word: "extraordinarily" }], id: "custom-aaaaaa" });
    expect(gridSettingsFor(long, caps).size).toBe(16);
    const huge = createList({ name: "x", words: [{ word: "a".repeat(30) }], id: "custom-aaaaaa" });
    const g = gridSettingsFor(huge, caps);
    expect(g.size).toBe(20);
    expect(g.tooLong).toEqual(["a".repeat(30)]);
    expect(gridSettingsFor(short, null)).toMatchObject({ size: 10, letterCase: "uppercase" });
  });
});

describe("storage", () => {
  beforeEach(() => window.localStorage.clear());
  const mk = (id, name, updatedAt) => ({ ...createList({ name, words: [{ word: "cat" }], id }), updatedAt, createdAt: updatedAt });

  test("save, load, get, update, delete", () => {
    const a = mk("custom-aaaaaa", "A", "2026-09-01T00:00:00.000Z");
    const b = mk("custom-bbbbbb", "B", "2026-09-02T00:00:00.000Z");
    expect(upsertList(window.localStorage, a)).toEqual({ ok: true });
    expect(upsertList(window.localStorage, b)).toEqual({ ok: true });
    expect(loadLists(window.localStorage).map((l) => l.name)).toEqual(["B", "A"]); // newest first
    expect(getList(window.localStorage, "custom-aaaaaa").name).toBe("A");
    upsertList(window.localStorage, { ...a, name: "A2" });
    expect(loadLists(window.localStorage)).toHaveLength(2);
    expect(getList(window.localStorage, "custom-aaaaaa").name).toBe("A2");
    deleteList(window.localStorage, "custom-aaaaaa");
    expect(loadLists(window.localStorage).map((l) => l.id)).toEqual(["custom-bbbbbb"]);
  });

  test("deleting a list deletes its progress too, and nothing else", () => {
    upsertList(window.localStorage, mk("custom-aaaaaa", "A", "2026-09-01T00:00:00.000Z"));
    window.localStorage.setItem("spellstars.custom-aaaaaa.progress", "{}");
    window.localStorage.setItem("spellstars.custom-aaaaaa.progress.v1", "{}");
    window.localStorage.setItem("spellstars.year3.progress", "{}");
    deleteList(window.localStorage, "custom-aaaaaa");
    expect(window.localStorage.getItem("spellstars.custom-aaaaaa.progress")).toBeNull();
    expect(window.localStorage.getItem("spellstars.custom-aaaaaa.progress.v1")).toBeNull();
    expect(window.localStorage.getItem("spellstars.year3.progress")).toBe("{}");
  });

  test("damaged data is skipped, not fatal", () => {
    window.localStorage.setItem(CUSTOM_LISTS_KEY, "{nope");
    expect(loadLists(window.localStorage)).toEqual([]);
    window.localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify([{ id: "bad" }, mk("custom-aaaaaa", "A", "2026-09-01T00:00:00.000Z"), "x", null]));
    expect(loadLists(window.localStorage).map((l) => l.id)).toEqual(["custom-aaaaaa"]);
    window.localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify({ not: "an array" }));
    expect(loadLists(window.localStorage)).toEqual([]);
  });

  test("duplicate ids in storage keep one", () => {
    const a = mk("custom-aaaaaa", "A", "2026-09-01T00:00:00.000Z");
    window.localStorage.setItem(CUSTOM_LISTS_KEY, JSON.stringify([a, { ...a, name: "again" }]));
    expect(loadLists(window.localStorage)).toHaveLength(1);
  });

  test("a full set of lists refuses another, but lets you edit one", () => {
    for (let i = 0; i < MAX_LISTS; i++) {
      const id = "custom-" + String(100000 + i);
      expect(upsertList(window.localStorage, mk(id, "L" + i, "2026-09-01T00:00:00.000Z")).ok).toBe(true);
    }
    const out = upsertList(window.localStorage, mk("custom-zzzzzz", "one too many", "2026-09-01T00:00:00.000Z"));
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/up to 20/);
    expect(upsertList(window.localStorage, mk("custom-100000", "edited", "2026-09-02T00:00:00.000Z")).ok).toBe(true);
  });

  test("rejects an invalid list and reports a full disk", () => {
    expect(upsertList(window.localStorage, { id: "nope" }).ok).toBe(false);
    const full = { setItem: () => { throw new Error("Quota"); } };
    expect(saveLists(full, []).ok).toBe(false);
  });

  test("progress for a list works with the year progress code", () => {
    const { loadProgress, saveProgress, recordAttempt } = require("../srs");
    const l = createList({ name: "A", words: [{ word: "Because" }], id: "custom-aaaaaa" });
    const [entry] = listToEntries(l);
    let p = loadProgress("custom-aaaaaa");
    p = recordAttempt(p, entry.wordKey, true, "2026-09-21");
    saveProgress("custom-aaaaaa", p);
    const back = loadProgress("custom-aaaaaa");
    expect(back.v).toBe(2);
    expect(back.words["custom-aaaaaa:because"].attempts).toBe(1);
  });
});

describe("addBuiltInMeanings", () => {
  const loaders = (years) => ({
    getYearsConfig: async () => ({ years: Object.keys(years).map((slug) => ({ slug, wordListPath: "/" + slug })) }),
    getYearWords: async (slug) => years[slug],
  });

  test("fills a meaning and sentence for words that are in the built-in lists", async () => {
    const r = await addBuiltInMeanings(
      [{ word: "Because" }, { word: "zebra" }],
      loaders({ year3: [{ contentType: "word", word: "because", definition: "for the reason that", exampleSentence: "I ran because I was late." }] }),
    );
    expect(r.filled).toBe(1);
    expect(r.words[0]).toEqual({ word: "Because", definition: "for the reason that", exampleSentence: "I ran because I was late." });
    expect(r.words[1]).toEqual({ word: "zebra" });
  });

  test("never replaces what the person wrote", async () => {
    const r = await addBuiltInMeanings(
      [{ word: "because", exampleSentence: "Mine." }, { word: "friend", definition: "Mine too." }],
      loaders({ y: [
        { contentType: "word", word: "because", definition: "d1", exampleSentence: "theirs" },
        { contentType: "word", word: "friend", definition: "d2", exampleSentence: "theirs" },
      ] }),
    );
    expect(r.words[0]).toEqual({ word: "because", exampleSentence: "Mine.", definition: "d1" });
    expect(r.words[1]).toEqual({ word: "friend", definition: "Mine too." });
  });

  test("skips entries without a definition, and copes with a year that fails to load", async () => {
    const l = {
      getYearsConfig: async () => ({ years: [{ slug: "a", wordListPath: "/a" }, { slug: "b", wordListPath: "/b" }] }),
      getYearWords: async (slug) => { if (slug === "a") throw new Error("offline"); return [{ contentType: "word", word: "cat", definition: "" }, { contentType: "letter", word: "c", definition: "x" }]; },
    };
    const r = await addBuiltInMeanings([{ word: "cat" }], l);
    expect(r).toEqual({ words: [{ word: "cat" }], filled: 0 });
  });

  test("never rejects", async () => {
    const r = await addBuiltInMeanings([{ word: "cat" }], { getYearsConfig: async () => { throw new Error("x"); }, getYearWords: async () => [] });
    expect(r).toEqual({ words: [{ word: "cat" }], filled: 0 });
  });

  test("listHasMeanings", () => {
    expect(listHasMeanings({ words: [{ word: "a" }] })).toBe(false);
    expect(listHasMeanings({ words: [{ word: "a" }, { word: "b", definition: "x" }] })).toBe(true);
  });
});
