import fs from "fs";
import path from "path";
import { buildDictation, sentenceHasWord, getNextAiSet, fetchAiSet, wordsHash, aiCacheKey, levelFor, MAX_AI_SETS } from "../dictation";

// Seeded so the tests are repeatable.
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const load = (slug) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/data", slug, "words.json"), "utf8"));
const week = (entries, n) => entries.filter((e) => e.weekOfYear === n && e.contentType !== "letter");

describe("buildDictation", () => {
  test("every line uses the lesson's own words", () => {
    for (const slug of ["reception", "year1", "year2", "year3", "year4", "year5", "year6"]) {
      const entries = load(slug);
      const weeks = [...new Set(entries.filter((e) => e.word).map((e) => e.weekOfYear))];
      for (const n of weeks) {
        const lesson = week(entries, n);
        const { lines } = buildDictation(lesson, { yearSlug: slug, rng: seeded(n) });
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line.words.length).toBeGreaterThan(0);
          for (const w of line.words) {
            expect(lesson.some((e) => e.word === w)).toBe(true);
            expect(sentenceHasWord(line.text, w)).toBe(true);
          }
        }
      }
    }
  });

  test("sentences get longer with the year group", () => {
    const average = (slug) => {
      const entries = load(slug);
      let total = 0;
      let count = 0;
      for (let n = 10; n <= 30; n++) {
        const { lines } = buildDictation(week(entries, n), { yearSlug: slug, rng: seeded(n) });
        for (const l of lines) {
          total += l.text.split(/\s+/).length;
          count++;
        }
      }
      return total / count;
    };
    const lengths = ["reception", "year1", "year2", "year3", "year5"].map(average);
    for (let i = 1; i < lengths.length; i++) expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
    expect(lengths[0]).toBeLessThan(6);
  });

  test("regenerating gives different sentences", () => {
    const lesson = week(load("year4"), 12);
    const a = buildDictation(lesson, { yearSlug: "year4", rng: seeded(1) }).lines.map((l) => l.text).join("|");
    const b = buildDictation(lesson, { yearSlug: "year4", rng: seeded(99) }).lines.map((l) => l.text).join("|");
    expect(a).not.toBe(b);
  });

  test("a word with no example sentence gets a plain sentence in the chosen language", () => {
    const out = buildDictation([{ word: "chat" }], { yearSlug: "year1", language: "fr-FR", rng: seeded() });
    expect(out.lines[0].text).toBe("Le mot est chat.");
  });

  test("ignores letters and duplicates; empty lesson gives no lines", () => {
    expect(buildDictation([{ contentType: "letter", prompt: "s" }], {}).lines).toEqual([]);
    const out = buildDictation([{ word: "cat" }, { word: "Cat" }], { yearSlug: "year1" });
    expect(out.lines).toHaveLength(1);
  });

  test("unknown year (custom list) uses the middle level", () => {
    expect(levelFor("custom")).toEqual(levelFor("year3"));
  });
});

describe("sentenceHasWord", () => {
  test("whole word only, any case", () => {
    expect(sentenceHasWord("The Cat sat.", "cat")).toBe(true);
    expect(sentenceHasWord("A category.", "cat")).toBe(false);
    expect(sentenceHasWord("It can't stop.", "can't")).toBe(true);
  });
});

describe("AI sets: device first, then the server", () => {
  const entries = [{ word: "frost" }, { word: "stamp" }];
  const shared = { yearSlug: "year2", week: 8 };
  const reply = (text, status = 200) => ({ ok: status === 200, status, json: async () => ({ lines: [{ text }] }) });
  const memory = () => {
    const data = {};
    return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
  };
  const ctx = (extra = {}) => ({ shared, entries, yearSlug: "year2", yearLabel: "Year 2", language: "en-GB", token: "t", ...extra });

  test("a set is fetched, kept on the device, then shown again before asking for another", async () => {
    const storage = memory();
    const fetcher = jest.fn()
      .mockResolvedValueOnce(reply("Frost covered the grass."))
      .mockResolvedValueOnce(reply("She licked the stamp."));
    const first = await getNextAiSet(ctx(), { storage, fetcher });
    expect(first.fromDevice).toBe(false);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).n).toBe(0);
    // Pressing again goes to the server for set 1, because set 0 has been seen.
    const second = await getNextAiSet(ctx(), { storage, fetcher });
    expect(JSON.parse(fetcher.mock.calls[1][1].body).n).toBe(1);
    expect(second.lines[0].text).toContain("stamp");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("a different visit to the same lesson on this device starts from the saved sets", async () => {
    const storage = memory();
    const fetcher = jest.fn().mockResolvedValue(reply("Frost covered the grass."));
    await getNextAiSet(ctx(), { storage, fetcher });
    // Start again from the beginning of the cache by resetting only the position.
    const key = "spellstars.dictationSets";
    const cache = JSON.parse(storage.getItem(key));
    const k = Object.keys(cache)[0];
    cache[k].pos = 0;
    storage.setItem(key, JSON.stringify(cache));
    const again = await getNextAiSet(ctx(), { storage, fetcher });
    expect(again.fromDevice).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("once a lesson has the most sets, it goes round them again without the server", async () => {
    const storage = memory();
    const fetcher = jest.fn().mockImplementation(async () => reply("Frost covered the grass."));
    for (let i = 0; i < MAX_AI_SETS; i++) await getNextAiSet(ctx(), { storage, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(MAX_AI_SETS);
    const next = await getNextAiSet(ctx(), { storage, fetcher });
    expect(next.fromDevice).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(MAX_AI_SETS);
  });

  test("passes the error back and remembers nothing", async () => {
    const storage = memory();
    for (const [status, error] of [[401, "signin"], [429, "limit"], [500, "failed"]]) {
      const fetcher = jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) });
      expect(await getNextAiSet(ctx(), { storage, fetcher })).toEqual({ error });
    }
    expect(storage.getItem("spellstars.dictationSets")).toBeNull();
  });

  test("a built-in week sends no words (the server uses its own); your own lesson sends its words and what it has seen", async () => {
    const fetcher = jest.fn().mockResolvedValue(reply("Frost covered the grass."));
    await fetchAiSet({ ...ctx(), fetcher });
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.shared).toEqual(shared);
    expect(sent.words).toBeUndefined();
    await fetchAiSet({ ...ctx({ shared: null }), n: 0, avoid: ["x"], fetcher });
    const own = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(own.words).toEqual(["frost", "stamp"]);
    expect(own.avoid).toEqual(["x"]);
  });

  test("sentences that don't use a lesson word are dropped", async () => {
    const fetcher = jest.fn().mockResolvedValue(reply("Nothing relevant here."));
    expect(await fetchAiSet({ ...ctx(), fetcher })).toEqual({ error: "failed" });
  });

  test("a lesson's key ignores word order and case", () => {
    expect(wordsHash([{ word: "Frost" }, { word: "stamp" }])).toBe(wordsHash([{ word: "stamp" }, { word: "frost" }]));
    expect(aiCacheKey({ shared, entries, language: "en-GB" })).toBe("year2|w8|en-GB");
  });
});
