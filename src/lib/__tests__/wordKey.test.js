import {
  dedupeByProgressKey,
  makeWordKey,
  normaliseWord,
  progressKey,
  withWordKeys,
} from "../wordKey";

describe("normaliseWord", () => {
  test("lower-cases, trims and collapses whitespace", () => {
    expect(normaliseWord("  Badge ")).toBe("badge");
    expect(normaliseWord("ice   cream")).toBe("ice cream");
  });

  test("treats curly and straight apostrophes as the same", () => {
    expect(normaliseWord("Can’t")).toBe("can't");
    expect(normaliseWord("child‘s")).toBe("child's");
    expect(normaliseWord("can't")).toBe("can't");
  });

  test("copes with missing input", () => {
    expect(normaliseWord(undefined)).toBe("");
    expect(normaliseWord(null)).toBe("");
  });
});

describe("makeWordKey", () => {
  test("joins the year slug and the normalised word", () => {
    expect(makeWordKey("year3", { contentType: "word", word: "Badge" })).toBe("year3:badge");
    expect(makeWordKey("year3", { contentType: "word", word: "February" })).toBe("year3:february");
  });

  test("gives the same key to every slot of the same word", () => {
    const first = { id: "year3-w02-01", contentType: "word", word: "accidentally" };
    const revision = { id: "year3-w10-11", contentType: "word", word: "accidentally", revision: true };
    expect(makeWordKey("year3", first)).toBe(makeWordKey("year3", revision));
  });

  test("keeps years apart", () => {
    const entry = { contentType: "word", word: "believe" };
    expect(makeWordKey("year3", entry)).not.toBe(makeWordKey("year4", entry));
  });

  test("returns null for letters and for entries without a word", () => {
    expect(makeWordKey("reception", { contentType: "letter", word: "a" })).toBeNull();
    expect(makeWordKey("year3", { contentType: "word" })).toBeNull();
    expect(makeWordKey("year3", { contentType: "word", word: "   " })).toBeNull();
    expect(makeWordKey("year3", null)).toBeNull();
  });
});

describe("progressKey", () => {
  test("uses the wordKey when there is one", () => {
    expect(progressKey({ id: "year3-w01-01", wordKey: "year3:badge" })).toBe("year3:badge");
  });

  test("falls back to the slot id (letters)", () => {
    expect(progressKey({ id: "reception-w01-01" })).toBe("reception-w01-01");
  });
});

describe("withWordKeys", () => {
  const entries = [
    { id: "a", contentType: "word", word: "Badge" },
    { id: "b", contentType: "letter", prompt: "s" },
  ];

  test("adds wordKey to words and leaves letters alone", () => {
    const result = withWordKeys("year3", entries);
    expect(result[0].wordKey).toBe("year3:badge");
    expect(result[1]).toBe(entries[1]);
  });

  test("does not change the input", () => {
    withWordKeys("year3", entries);
    expect(entries[0].wordKey).toBeUndefined();
  });
});

describe("dedupeByProgressKey", () => {
  test("keeps the first entry for each word, in order", () => {
    const list = [
      { id: "1", wordKey: "year3:a" },
      { id: "2", wordKey: "year3:b" },
      { id: "3", wordKey: "year3:a" },
      { id: "4", wordKey: "year3:c" },
    ];
    expect(dedupeByProgressKey(list).map((e) => e.id)).toEqual(["1", "2", "4"]);
  });

  test("never merges entries that only have different ids", () => {
    const list = [{ id: "x" }, { id: "y" }];
    expect(dedupeByProgressKey(list)).toHaveLength(2);
  });
});
