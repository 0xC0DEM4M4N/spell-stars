import { buildCrossword, clueFor, enumeration, meaningOf, withClueMode } from "../crossword";

const entry = (word, extra = {}) => ({ word, ...extra });

const WORDS = [
  entry("because", { exampleSentence: "I stayed in because it rained.", definition: "For the reason that." }),
  entry("friend", { exampleSentence: "My friend came to tea.", definition: "Someone you like." }),
  entry("people", { exampleSentence: "Many people came.", definition: "More than one person." }),
  entry("beautiful", { exampleSentence: "It was a beautiful day.", definition: "Very pretty." }),
  entry("again", { exampleSentence: "Try again.", definition: "Once more." }),
  entry("believe", { exampleSentence: "I believe you.", definition: "To think something is true." }),
  entry("famous", { exampleSentence: "A famous singer.", definition: "Known by many people." }),
  entry("grow", { exampleSentence: "Plants grow.", definition: "To get bigger." }),
];

// Every listed word reads correctly in the grid, and every run of two or more
// letters in the grid is a listed word (no accidental extra words).
function checkPuzzle(p) {
  const listed = new Set();
  for (const c of p.across) {
    listed.add(`a${c.row},${c.col},${c.length}`);
    for (let i = 0; i < c.length; i++) expect(p.grid[c.row][c.col + i]).toBe(c.answer[i]);
  }
  for (const c of p.down) {
    listed.add(`d${c.row},${c.col},${c.length}`);
    for (let i = 0; i < c.length; i++) expect(p.grid[c.row + i][c.col]).toBe(c.answer[i]);
  }
  for (let r = 0; r < p.height; r++) {
    for (let c = 0; c < p.width; ) {
      if (!p.grid[r][c]) { c++; continue; }
      const start = c;
      while (c < p.width && p.grid[r][c]) c++;
      if (c - start > 1) expect(listed.has(`a${r},${start},${c - start}`)).toBe(true);
    }
  }
  for (let c = 0; c < p.width; c++) {
    for (let r = 0; r < p.height; ) {
      if (!p.grid[r][c]) { r++; continue; }
      const start = r;
      while (r < p.height && p.grid[r][c]) r++;
      if (r - start > 1) expect(listed.has(`d${start},${c},${r - start}`)).toBe(true);
    }
  }
}

describe("buildCrossword", () => {
  it("lays words out so they cross and never make stray words", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = buildCrossword(WORDS, { seed });
      expect(p).not.toBeNull();
      checkPuzzle(p);
    }
  });

  it("is repeatable for the same seed", () => {
    const a = buildCrossword(WORDS, { seed: 4 });
    const b = buildCrossword(WORDS, { seed: 4 });
    expect(a.grid).toEqual(b.grid);
  });

  it("numbers squares from left to right, top to bottom", () => {
    const p = buildCrossword(WORDS, { seed: 2 });
    const all = [...p.across, ...p.down].map((c) => c.number);
    expect(Math.max(...all)).toBe(new Set(all).size);
    const seen = [];
    p.numbers.forEach((row) => row.forEach((n) => n && seen.push(n)));
    expect(seen).toEqual([...seen].sort((x, y) => x - y));
  });

  it("returns null when there aren't two usable words", () => {
    expect(buildCrossword([])).toBeNull();
    expect(buildCrossword([entry("cat")])).toBeNull();
    expect(buildCrossword([entry("a"), entry("b")])).toBeNull();
  });

  it("ignores repeats and picks a selection when there are too many words", () => {
    const many = Array.from({ length: 40 }, (_, i) => entry("word" + "abcdefghij"[i % 10] + "klmnopqrstuvwxyz"[Math.floor(i / 10)] + "e"));
    const p = buildCrossword([...many, ...many], { seed: 3, maxWords: 8 });
    expect(p.across.length + p.down.length).toBeLessThanOrEqual(8);
  });

  it("only uses letters in the grid", () => {
    const p = buildCrossword([entry("co-operate"), entry("ice cream"), entry("operate"), entry("cream")], { seed: 1 });
    p.grid.flat().filter(Boolean).forEach((ch) => expect(ch).toMatch(/^\p{L}$/u));
  });
});

describe("clues", () => {
  const because = WORDS[0];

  it("blanks the word out of the example sentence", () => {
    expect(clueFor(because)).toEqual({ text: "I stayed in ______ it rained.", kind: "sentence" });
  });

  it("can use the meaning instead, and skips the origin", () => {
    expect(clueFor(because, "meaning")).toEqual({ text: "For the reason that.", kind: "meaning" });
    expect(meaningOf("From Latin 'antiquus', old — belonging to long ago.")).toBe("belonging to long ago.");
  });

  it("never gives the answer away as a whole word", () => {
    const e = entry("live", { definition: "To live in a place.", exampleSentence: "Where do you live?" });
    expect(clueFor(e).text).not.toMatch(/\blive\b/i);
    expect(clueFor(e, "meaning").text).not.toMatch(/\blive\b/i);
  });

  it("falls back to the other kind, then to a hint", () => {
    expect(clueFor(entry("cat", { definition: "A pet." })).kind).toBe("meaning");
    expect(clueFor(entry("cat", { exampleSentence: "The cat sat." }), "meaning").kind).toBe("sentence");
    expect(clueFor(entry("cat"))).toEqual({ text: "Starts with C and has 3 letters", kind: "hint" });
  });

  it("writes how many letters each answer has", () => {
    expect(enumeration("because")).toBe("(7)");
    expect(enumeration("ice cream")).toBe("(3,5)");
    expect(enumeration("co-operate")).toBe("(2-7)");
  });

  it("can change the clue style without changing the layout", () => {
    const p = buildCrossword(WORDS, { seed: 5 });
    const q = withClueMode(p, "meaning");
    expect(q.grid).toEqual(p.grid);
    expect(q.across[0].kind).toBe("meaning");
  });
});
