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

function buildGridOnce(words, size, dirs, letterCase) {
  // Default (no explicit choice) is lowercase; "uppercase" is the opt-in.
  const toGridCase = (w) => (letterCase === "uppercase" ? w.toUpperCase() : w.toLowerCase());
  const alphabet = letterCase === "uppercase" ? ALPHA : ALPHA_LOWER;
  // Only letters go in the grid: apostrophes, hyphens and spaces ("don't",
  // "well-known", "ice cream") are left out, whatever the list contains.
  const clean = words.map(w => toGridCase(w).replace(/[^\p{L}]/gu, ""));
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ letter: "", wis: [] }))
  );
  const placed = [];
  const fits = (up, r0, c0, dr, dc) => {
    for (let i = 0; i < up.length; i++) {
      const ex = grid[r0 + i * dr][c0 + i * dc].letter;
      if (ex && ex !== up[i]) return false;
    }
    return true;
  };
  const inBounds = (up, r0, c0, dr, dc) => {
    const er = r0 + (up.length - 1) * dr;
    const ec = c0 + (up.length - 1) * dc;
    return up.length > 0 && r0 >= 0 && c0 >= 0 && er >= 0 && ec >= 0 && er < size && ec < size;
  };
  // Longest words go in first, while there is still room; they are the ones
  // that fail to fit once the grid fills up. `wi` stays the word's position in
  // the list so everything else can keep using it.
  const order = clean.map((_, wi) => wi).sort((a, b) => clean[b].length - clean[a].length);
  for (const wi of order) {
    const up = clean[wi];
    let spot = null;
    for (let t = 0; t < 400 && !spot; t++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r0 = Math.floor(Math.random() * size);
      const c0 = Math.floor(Math.random() * size);
      if (inBounds(up, r0, c0, dr, dc) && fits(up, r0, c0, dr, dc)) spot = { r0, c0, dr, dc };
    }
    if (!spot) {
      // Random tries ran out: look at every possible place, so a word is only
      // left out when it genuinely cannot go anywhere.
      const options = [];
      for (const [dr, dc] of dirs)
        for (let r0 = 0; r0 < size; r0++)
          for (let c0 = 0; c0 < size; c0++)
            if (inBounds(up, r0, c0, dr, dc) && fits(up, r0, c0, dr, dc)) options.push({ r0, c0, dr, dc });
      if (options.length) spot = options[Math.floor(Math.random() * options.length)];
    }
    if (spot) {
      for (let i = 0; i < up.length; i++) {
        const cell = grid[spot.r0 + i * spot.dr][spot.c0 + i * spot.dc];
        cell.letter = up[i];
        cell.wis.push(wi);
      }
      placed.push({ word: words[wi], up, wi });
    } else {
      placed.push({ word: words[wi], up, wi, failed: true });
    }
  }
  // Back into list order.
  placed.sort((a, b) => a.wi - b.wi);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c].letter)
        grid[r][c].letter = alphabet[Math.floor(Math.random() * 26)];
  return { grid, placed };
}

const ALL_STEPS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, 1], [-1, -1]];
const MIN_UNIQUE_LEN = 3;

// How many EXTRA times the words (3+ letters) turn up in the grid, in any of
// the eight directions, beyond the one place each was hidden. A word found
// in a second spot confuses a child ("I found it but it won't count"), so
// the grid is regenerated until this is zero. Reading a palindrome backwards
// over the same cells is the same spot, not a second one.
export function countDuplicateWords(grid, placed) {
  const size = grid.length;
  let extras = 0;
  const seen = new Set();
  for (const p of placed) {
    if (p.failed || p.up.length < MIN_UNIQUE_LEN || seen.has(p.up)) continue;
    seen.add(p.up);
    const spots = new Set();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const [dr, dc] of ALL_STEPS) {
          const er = r + dr * (p.up.length - 1);
          const ec = c + dc * (p.up.length - 1);
          if (er < 0 || ec < 0 || er >= size || ec >= size) continue;
          let ok = true;
          for (let i = 0; i < p.up.length && ok; i++) {
            if (grid[r + i * dr][c + i * dc].letter !== p.up[i]) ok = false;
          }
          if (!ok) continue;
          const cells = [];
          for (let i = 0; i < p.up.length; i++) cells.push((r + i * dr) * size + (c + i * dc));
          spots.add(cells.sort((a, b) => a - b).join("-"));
        }
      }
    }
    extras += Math.max(0, spots.size - 1);
  }
  return extras;
}

// Is every word that was placed really in the grid, along the cells recorded
// for it? A last check that nothing listed is missing.
export function placedWordsAreInGrid(grid, placed) {
  return placed
    .filter((p) => !p.failed)
    .every((p) => {
      const cells = [];
      grid.forEach((row, r) => row.forEach((cell, c) => cell.wis.includes(p.wi) && cells.push([r, c])));
      return cells.length === p.up.length && p.up.length > 0;
    });
}

// The words that are actually in the grid, which is what to list for the child.
// A word that couldn't be placed is never listed.
export const listedWords = (placed) => placed.filter((p) => !p.failed);

export function buildGrid(words, size, dirs, letterCase) {
  let best = null;
  let bestScore = Infinity;
  // Plenty of tries while a word is still left out; fewer once all are in.
  for (let attempt = 0; attempt < (bestScore >= 1000 ? 400 : 60); attempt++) {
    const g = buildGridOnce(words, size, dirs, letterCase);
    // A word left out of the grid matters far more than one found twice.
    const missing = g.placed.filter((p) => p.failed).length;
    const score = missing * 1000 + countDuplicateWords(g.grid, g.placed);
    if (score < bestScore) { best = g; bestScore = score; }
    if (score === 0) break;
  }
  return best;
}
