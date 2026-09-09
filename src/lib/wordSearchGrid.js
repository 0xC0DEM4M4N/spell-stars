// Word-search grid generation, shared by the interactive game
// (WordSearch.jsx) and the print-only sheets (printSheets.js) so both
// stay in sync and there's only one placement algorithm to maintain.

export const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ALPHA_LOWER = "abcdefghijklmnopqrstuvwxyz";
const DEFAULT_DIRECTIONS = ["horizontal", "vertical"];

// capabilities.wordSearchGrid.directions (category names) -> concrete
// [dr, dc] step vectors. "backwards" is a modifier on the other
// categories, not a direction of its own — per
// next-steps-year-capabilities.md §4: reserved for Year 3+ so a
// reversed/diagonal word is only ever placed for years with the reading
// fluency to spot one.
export function buildDirections(directions) {
  const set = new Set(directions && directions.length ? directions : DEFAULT_DIRECTIONS);
  const dirs = [];
  if (set.has("horizontal")) dirs.push([0, 1]);
  if (set.has("vertical")) dirs.push([1, 0]);
  if (set.has("diagonal")) dirs.push([1, 1], [1, -1]);
  if (set.has("backwards")) {
    if (set.has("horizontal")) dirs.push([0, -1]);
    if (set.has("vertical")) dirs.push([-1, 0]);
    if (set.has("diagonal")) dirs.push([-1, 1], [-1, -1]);
  }
  return dirs.length ? dirs : [[0, 1], [1, 0]];
}

export function buildGrid(words, size, dirs, letterCase) {
  const toGridCase = (w) => (letterCase === "lowercase" ? w.toLowerCase() : w.toUpperCase());
  const alphabet = letterCase === "lowercase" ? ALPHA_LOWER : ALPHA;
  const clean = words.map(w => toGridCase(w).replace(/['']/g, ""));
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ letter: "", wis: [] }))
  );
  const placed = [];
  for (let wi = 0; wi < clean.length; wi++) {
    const up = clean[wi];
    let ok = false;
    for (let t = 0; t < 400 && !ok; t++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const rMin = dr > 0 ? 0 : dr < 0 ? up.length - 1 : 0;
      const rMax = dr > 0 ? size - up.length : dr < 0 ? size - 1 : size - 1;
      const cMin = dc > 0 ? 0 : dc < 0 ? up.length - 1 : 0;
      const cMax = dc > 0 ? size - up.length : dc < 0 ? size - 1 : size - 1;
      if (rMin > rMax || cMin > cMax) continue;
      const r0 = rMin + Math.floor(Math.random() * (rMax - rMin + 1));
      const c0 = cMin + Math.floor(Math.random() * (cMax - cMin + 1));
      let valid = true;
      for (let i = 0; i < up.length && valid; i++) {
        const ex = grid[r0 + i * dr][c0 + i * dc].letter;
        if (ex && ex !== up[i]) valid = false;
      }
      if (valid) {
        for (let i = 0; i < up.length; i++) {
          grid[r0 + i * dr][c0 + i * dc].letter = up[i];
          grid[r0 + i * dr][c0 + i * dc].wis.push(wi);
        }
        placed.push({ word: words[wi], up, wi });
        ok = true;
      }
    }
    if (!ok) placed.push({ word: words[wi], up, wi, failed: true });
  }
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c].letter)
        grid[r][c].letter = alphabet[Math.floor(Math.random() * 26)];
  return { grid, placed };
}
