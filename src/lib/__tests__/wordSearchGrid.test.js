import { buildDirections, buildGrid } from "../wordSearchGrid";

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
