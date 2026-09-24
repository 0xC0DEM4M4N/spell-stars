// Crossword puzzles for a week's words (or a custom list). Pure functions,
// shared by the on-screen puzzle (components/Crossword.jsx) and the print
// sheet (lib/printSheets.js), so both show exactly the same puzzle.
//
// A puzzle is built from entries shaped like a year's words.json
// ({ word, definition, exampleSentence }). Each word is placed so it crosses
// the words already on the grid; the layout with the most words, then the
// most crossings and the most compact shape, wins out of many random tries.
// The clue for a word is either its example sentence with the word blanked
// out, or its meaning, with a fall-back to a plain hint if the word has
// neither.

export const MAX_CROSSWORD_WORDS = 15;
export const MIN_ANSWER_LENGTH = 2;
const DEFAULT_TRIES = 400;
const BLANK = "______";

// ── Small helpers ──────────────────────────────────────────────────────

const answerOf = (word) => String(word || "").toUpperCase().replace(/[^\p{L}]/gu, "");

// Seedable random numbers, so a puzzle can be reproduced (tests, reprints).
export function makeRandom(seed) {
  if (seed == null) return Math.random;
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const shuffle = (list, random) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "ice cream" -> "(3,5)", "co-operate" -> "(2-7)", "because" -> "(7)". */
export function enumeration(word) {
  const parts = String(word || "").trim().split(/([ -])/);
  let out = "";
  for (const part of parts) {
    if (part === " ") out += ",";
    else if (part === "-") out += "-";
    else out += answerOf(part).length;
  }
  return "(" + out + ")";
}

// ── Clues ──────────────────────────────────────────────────────────────

const maskWord = (text, word) => {
  const re = new RegExp("(?<![\\p{L}])" + escapeRegExp(word) + "(?![\\p{L}])", "giu");
  return re.test(text) ? text.replace(re, BLANK) : null;
};

/** The meaning part of a definition: "From Latin 'x', old — belonging to..." gives "belonging to...". */
export function meaningOf(definition) {
  const text = String(definition || "").trim();
  const parts = text.split(" — ");
  return (parts.length > 1 ? parts.slice(1).join(" — ") : text).trim();
}

const sentenceClue = (entry) => {
  const sentence = String(entry.exampleSentence || "").trim();
  return sentence ? maskWord(sentence, entry.word) : null;
};

const meaningClue = (entry) => {
  const meaning = meaningOf(entry.definition);
  if (!meaning) return null;
  // A meaning that contains the answer would give it away.
  return maskWord(meaning, entry.word) || meaning;
};

/**
 * The clue text for one entry. `mode` is "sentence" (default) or "meaning".
 * If the preferred kind isn't available, the other is used, then a plain hint.
 * @returns {{ text: string, kind: "sentence" | "meaning" | "hint" }}
 */
export function clueFor(entry, mode = "sentence") {
  const order = mode === "meaning" ? [["meaning", meaningClue], ["sentence", sentenceClue]] : [["sentence", sentenceClue], ["meaning", meaningClue]];
  for (const [kind, make] of order) {
    const text = make(entry);
    if (text) return { text, kind };
  }
  const answer = answerOf(entry.word);
  return { text: "Starts with " + answer.charAt(0) + " and has " + answer.length + " letters", kind: "hint" };
}

// ── Layout ─────────────────────────────────────────────────────────────

const key = (r, c) => r + "," + c;

// One attempt: place words (longest first, with some shuffling) so each new
// word crosses the words already there, picking the crossing that adds the
// least to the grid.
function attempt(items, random) {
  const order = items
    .map((item) => ({ item, sort: item.answer.length + random() * 3 }))
    .sort((a, b) => b.sort - a.sort)
    .map((x) => x.item);

  const cells = new Map(); // "r,c" -> { letter, across, down }
  const placed = [];
  let minR = 0, maxR = 0, minC = 0, maxC = 0;

  const fits = (answer, r, c, dr, dc) => {
    const before = key(r - dr, c - dc);
    const after = key(r + dr * answer.length, c + dc * answer.length);
    if (cells.has(before) || cells.has(after)) return -1;
    let crossings = 0;
    for (let i = 0; i < answer.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const cell = cells.get(key(rr, cc));
      if (cell) {
        if (cell.letter !== answer[i]) return -1;
        // Can't run along a word that is already going the same way.
        if (dr === 0 ? cell.across : cell.down) return -1;
        crossings++;
      } else {
        // A new letter mustn't touch a neighbouring word sideways.
        if (cells.has(key(rr + dc, cc + dr)) || cells.has(key(rr - dc, cc - dr))) return -1;
      }
    }
    return crossings;
  };

  const put = (item, r, c, dr, dc) => {
    for (let i = 0; i < item.answer.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const cell = cells.get(key(rr, cc)) || { letter: item.answer[i], across: false, down: false };
      if (dr === 0) cell.across = true;
      else cell.down = true;
      cells.set(key(rr, cc), cell);
      minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
      minC = Math.min(minC, cc); maxC = Math.max(maxC, cc);
    }
    placed.push({ item, r, c, dir: dr === 0 ? "across" : "down" });
  };

  put(order[0], 0, 0, 0, 1);

  for (const item of order.slice(1)) {
    let best = null;
    const answer = item.answer;
    for (const [pos, cell] of cells) {
      for (let i = 0; i < answer.length; i++) {
        if (answer[i] !== cell.letter) continue;
        const [r, c] = pos.split(",").map(Number);
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          if (dr === 0 ? cell.across : cell.down) continue;
          const r0 = r - dr * i;
          const c0 = c - dc * i;
          const crossings = fits(answer, r0, c0, dr, dc);
          if (crossings < 1) continue;
          const grow =
            (Math.max(maxR, r0 + dr * (answer.length - 1)) - Math.min(minR, r0) + 1) *
              (Math.max(maxC, c0 + dc * (answer.length - 1)) - Math.min(minC, c0) + 1) -
            (maxR - minR + 1) * (maxC - minC + 1);
          const score = crossings * 6 - grow + random() * 2;
          if (!best || score > best.score) best = { score, r0, c0, dr, dc };
        }
      }
    }
    if (best) put(item, best.r0, best.c0, best.dr, best.dc);
  }

  const height = maxR - minR + 1;
  const width = maxC - minC + 1;
  let crossingCells = 0;
  for (const cell of cells.values()) if (cell.across && cell.down) crossingCells++;
  // More words first, then denser and squarer.
  const score = placed.length * 1000 + crossingCells * 8 - width * height - Math.abs(width - height) * 3;
  return { score, placed, cells, minR, minC, width, height };
}

/**
 * Builds a crossword.
 *
 * @param {{word: string, definition?: string, exampleSentence?: string}[]} entries
 * @param {{ maxWords?: number, tries?: number, seed?: number, clueMode?: "sentence"|"meaning" }} [options]
 * @returns {null | {
 *   width: number, height: number,
 *   grid: (string|null)[][],            // the answer letter, or null for a black square
 *   numbers: (number|null)[][],         // the clue number in a cell, if a word starts there
 *   across: Clue[], down: Clue[],       // Clue = { number, row, col, length, answer, word, clue, kind, enumeration, entry }
 *   unplaced: object[],                 // entries that didn't fit
 * }} null if there aren't enough usable words (at least two that can cross)
 */
export function buildCrossword(entries, options = {}) {
  const { maxWords = MAX_CROSSWORD_WORDS, tries = DEFAULT_TRIES, seed, clueMode = "sentence" } = options;
  const random = makeRandom(seed);

  // Usable entries: a word of 2+ letters, no repeats.
  const seen = new Set();
  const usable = [];
  for (const entry of entries || []) {
    const answer = answerOf(entry && entry.word);
    if (answer.length < MIN_ANSWER_LENGTH || seen.has(answer)) continue;
    seen.add(answer);
    usable.push({ entry, answer });
  }
  if (usable.length < 2) return null;

  // Too many words for one puzzle: pick a random selection.
  const chosen = usable.length > maxWords ? shuffle(usable, random).slice(0, maxWords) : usable;

  let best = null;
  for (let t = 0; t < tries; t++) {
    const result = attempt(chosen, random);
    if (!best || result.score > best.score) best = result;
    if (best.placed.length === chosen.length && t > tries / 2) break;
  }
  if (!best || best.placed.length < 2) return null;

  const { placed, cells, minR, minC, width, height } = best;
  const grid = Array.from({ length: height }, () => Array(width).fill(null));
  for (const [pos, cell] of cells) {
    const [r, c] = pos.split(",").map(Number);
    grid[r - minR][c - minC] = cell.letter;
  }

  // Number the squares where words start, reading left to right, top to bottom.
  const starts = new Map(); // "r,c" -> { across?, down? }
  for (const p of placed) {
    const k = key(p.r - minR, p.c - minC);
    starts.set(k, { ...(starts.get(k) || {}), [p.dir]: p });
  }
  const numbers = Array.from({ length: height }, () => Array(width).fill(null));
  const across = [];
  const down = [];
  let n = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const start = starts.get(key(r, c));
      if (!start) continue;
      n++;
      numbers[r][c] = n;
      for (const dir of ["across", "down"]) {
        const p = start[dir];
        if (!p) continue;
        const { text, kind } = clueFor(p.item.entry, clueMode);
        const clue = {
          number: n,
          row: r,
          col: c,
          dir,
          length: p.item.answer.length,
          answer: p.item.answer,
          word: p.item.entry.word,
          clue: text,
          kind,
          enumeration: enumeration(p.item.entry.word),
          entry: p.item.entry,
        };
        (dir === "across" ? across : down).push(clue);
      }
    }
  }

  const placedAnswers = new Set(placed.map((p) => p.item.answer));
  const unplaced = usable.filter((u) => !placedAnswers.has(u.answer)).map((u) => u.entry);
  return { width, height, grid, numbers, across, down, unplaced };
}

/** The same puzzle with its clues written in another style (no new layout). */
export function withClueMode(puzzle, clueMode) {
  const redo = (clue) => {
    const { text, kind } = clueFor(clue.entry, clueMode);
    return { ...clue, clue: text, kind };
  };
  return { ...puzzle, across: puzzle.across.map(redo), down: puzzle.down.map(redo) };
}
