import { buildDirections, buildGrid, countDuplicateWords, listedWords, placedWordsAreInGrid } from "../wordSearchGrid";

const dirs = buildDirections(["horizontal", "vertical"]);
const gridText = (grid) => grid.map((row) => row.map((c) => c.letter).join("")).join("\n");

describe("buildGrid with typed-in words", () => {
  test("only letters are hidden: apostrophes, hyphens and spaces are dropped", () => {
    const { grid, placed } = buildGrid(["don't", "well-known", "ice cream"], 12, dirs, "uppercase");
    expect(placed.map((p) => p.up)).toEqual(["DONT", "WELLKNOWN", "ICECREAM"]);
    expect(placed.every((p) => !p.failed)).toBe(true);
    // Every placed letter really is on the grid, and the grid has no odd characters.
    expect(gridText(grid)).toMatch(/^[A-Z\n]+$/);
  });

  test("keeps the case the caller asked for", () => {
    const { grid } = buildGrid(["Because"], 10, dirs, "lowercase");
    expect(gridText(grid)).toMatch(/^[a-z\n]+$/);
  });

  test("a word too long for the grid is marked failed, not squeezed in", () => {
    const { placed } = buildGrid(["extraordinarily"], 8, dirs, "uppercase");
    expect(placed[0].failed).toBe(true);
  });
});

describe("no word appears twice", () => {
  const all = buildDirections(["horizontal", "vertical", "diagonal", "backwards"]);
  const words = ["cat", "dog", "sun", "map", "tree", "ball", "star", "moon"];
  test.each([["straight", dirs], ["all directions", all]])("words of 3+ letters occur exactly once (%s)", (_n, d) => {
    for (let i = 0; i < 40; i++) {
      const { grid, placed } = buildGrid(words, 8, d, "lowercase");
      expect(countDuplicateWords(grid, placed)).toBe(0);
    }
  });
  test("a palindrome is not counted twice", () => {
    const { grid, placed } = buildGrid(["eye"], 8, all, "lowercase");
    expect(countDuplicateWords(grid, placed)).toBe(0);
  });
});

describe("every listed word is in the grid", () => {
  // The week from the bug report: 14 words, two of them 8 letters, in a 10 x 10 grid.
  const words = ["towel", "animal", "fossil", "middle", "tunnel", "metal", "pencil", "little", "tinsel", "hospital", "nostril", "apple", "squirrel", "capital", "table"];
  const read = (grid, r, c, dr, dc, n) => Array.from({ length: n }, (_, i) => grid[r + i * dr][c + i * dc].letter).join("");
  const isInGrid = (grid, word) => {
    const size = grid.length;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const er = r + dr * (word.length - 1);
          const ec = c + dc * (word.length - 1);
          if (er < size && ec < size && read(grid, r, c, dr, dc, word.length) === word) return true;
        }
    return false;
  };

  test("across many random grids, nothing listed is missing, and nothing is left out", () => {
    for (let i = 0; i < 200; i++) {
      const { grid, placed } = buildGrid(words, 10, dirs, "lowercase");
      for (const p of listedWords(placed)) expect(isInGrid(grid, p.up)).toBe(true);
      expect(placedWordsAreInGrid(grid, placed)).toBe(true);
      expect(placed.filter((p) => p.failed)).toHaveLength(0);
    }
  });

  test("a word that cannot fit is not listed", () => {
    const { placed } = buildGrid(["cat", "extraordinarily"], 8, dirs, "lowercase");
    expect(listedWords(placed).map((p) => p.word)).toEqual(["cat"]);
  });

  test("a list too big for the grid lists only what fits, and each of those is there", () => {
    const many = Array.from({ length: 14 }, (_, i) => "word" + "abcdefghijklmn"[i].repeat(5));
    const { grid, placed } = buildGrid(many, 8, dirs, "lowercase");
    expect(placed.some((p) => p.failed)).toBe(true);
    for (const p of listedWords(placed)) expect(isInGrid(grid, p.up)).toBe(true);
  });

  test("results stay in the order the words were given", () => {
    const { placed } = buildGrid(["cat", "elephant", "dog"], 10, dirs, "lowercase");
    expect(placed.map((p) => p.word)).toEqual(["cat", "elephant", "dog"]);
  });
});

describe("every direction a year allows", () => {
  const all = buildDirections(["horizontal", "vertical", "diagonal", "backwards"]);
  const STEPS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, 1], [-1, -1]];
  const words = ["towel", "animal", "fossil", "middle", "tunnel", "metal", "pencil", "little", "tinsel", "hospital", "nostril", "apple", "squirrel", "capital", "table"];
  const readableAnywhere = (grid, word) => {
    const size = grid.length;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        for (const [dr, dc] of STEPS) {
          const er = r + dr * (word.length - 1);
          const ec = c + dc * (word.length - 1);
          if (er < 0 || ec < 0 || er >= size || ec >= size) continue;
          if (Array.from({ length: word.length }, (_, i) => grid[r + i * dr][c + i * dc].letter).join("") === word) return true;
        }
    return false;
  };

  test("with diagonal and backwards words allowed, all listed words are readable and none are left out", () => {
    for (let i = 0; i < 100; i++) {
      const { grid, placed } = buildGrid(words, 10, all, "lowercase");
      for (const p of listedWords(placed)) expect(readableAnywhere(grid, p.up)).toBe(true);
      expect(placedWordsAreInGrid(grid, placed)).toBe(true);
      expect(placed.filter((p) => p.failed)).toHaveLength(0);
    }
  });
});
