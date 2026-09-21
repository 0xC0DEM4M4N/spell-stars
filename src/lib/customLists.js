// Custom spelling lists: a parent or teacher pastes this week's words and gets
// practice, a word search and print sheets for exactly those words.
//
// A list behaves like a small extra "year": it is turned into entries in the
// same shape as public/data/<year>/words.json, so the practice quiz, word
// search and print builders work on it unchanged. Lists live in localStorage
// under `spellstars.customLists`; progress for a list is kept exactly like a
// year's, under `spellstars.<list id>.progress`.

import { z } from "zod";
import { normaliseWord, withWordKeys } from "./wordKey";

export const CUSTOM_LISTS_KEY = "spellstars.customLists";
export const CUSTOM_ID_RE = /^custom-[a-z0-9]{4,12}$/;

export const MAX_WORDS = 50;
export const MAX_LISTS = 20;
export const MAX_NAME_LENGTH = 60;
export const MAX_WORD_LENGTH = 40;
export const MAX_TEXT_LENGTH = 6000; // pasted text beyond this is ignored
const MAX_SENTENCE_LENGTH = 200;
const MAX_DEFINITION_LENGTH = 200;
const MAX_PARTS_PER_ENTRY = 3; // "ice cream" is a word, a whole sentence is not

// ── Schema ─────────────────────────────────────────────────────────────

export const listWordSchema = z.object({
  word: z.string().min(1).max(MAX_WORD_LENGTH),
  definition: z.string().max(MAX_DEFINITION_LENGTH).optional(),
  exampleSentence: z.string().max(MAX_SENTENCE_LENGTH).optional(),
});

export const listSchema = z.object({
  id: z.string().regex(CUSTOM_ID_RE),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  yearHint: z.string().regex(/^[a-z0-9-]{1,40}$/).nullable(),
  words: z.array(listWordSchema).min(1).max(MAX_WORDS),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

// ── Parsing pasted text ────────────────────────────────────────────────

const BULLET_RE = /^\s*(?:[-•*·–—▪◦►]+|\(?\d{1,3}\s*[.)\]:-]|\d{1,3}\s+(?=\p{L}))\s*/u;

/** Cleans one pasted item into a word, or returns null if it isn't one. */
function cleanWord(raw) {
  let s = String(raw).replace(/[‘’`´]/g, "'");
  // "Spellings this week: because" -> "because"
  if (s.includes(":")) {
    const after = s.slice(s.lastIndexOf(":") + 1);
    if (/\p{L}/u.test(after)) s = after;
  }
  s = s.replace(BULLET_RE, "");
  s = s.replace(/^[^\p{L}]+/u, "").replace(/[^\p{L}']+$/u, "");
  s = s.replace(/[^\p{L}'\- ]/gu, "").replace(/\s+/g, " ").trim();
  return s && /\p{L}/u.test(s) ? s : null;
}

function cleanSentence(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, MAX_SENTENCE_LENGTH) : "";
}

/**
 * Turns whatever was pasted (WhatsApp, Notes, email, a spreadsheet column)
 * into a list of words.
 *
 *   - lines, commas, semicolons and tabs separate words; if the text has none
 *     of these (or a bar) it is split on spaces
 *   - leading numbers and bullets are dropped ("1.", "-", "•")
 *   - "word | sentence", or a second tab-separated column, keeps a sentence
 *   - duplicates (ignoring case) are removed, keeping the first
 *   - at most MAX_WORDS words are kept
 *
 * @returns {{ words: {word: string, exampleSentence?: string}[],
 *             duplicates: number, overCap: number, ignored: string[] }}
 */
export function parseWordList(text, { max = MAX_WORDS } = {}) {
  const input = String(text || "").slice(0, MAX_TEXT_LENGTH);
  const items = []; // { raw, sentence }

  if (!/[\n,;\t|]/.test(input)) {
    for (const token of input.split(/\s+/)) if (token) items.push({ raw: token, sentence: "" });
  } else {
    for (const line of input.split(/\r?\n/)) {
      if (!line.trim()) continue;
      if (line.includes("\t")) {
        const cols = line.split("\t");
        items.push({ raw: cols[0], sentence: cleanSentence(cols[1]) });
      } else if (line.includes("|")) {
        const [first, ...rest] = line.split("|");
        items.push({ raw: first, sentence: cleanSentence(rest.join("|")) });
      } else {
        for (const piece of line.split(/[,;]/)) if (piece.trim()) items.push({ raw: piece, sentence: "" });
      }
    }
  }

  const words = [];
  const seen = new Set();
  const ignored = [];
  let duplicates = 0;
  let overCap = 0;

  for (const { raw, sentence } of items) {
    const word = cleanWord(raw);
    if (!word || word.length > MAX_WORD_LENGTH || word.split(" ").length > MAX_PARTS_PER_ENTRY) {
      if (raw.trim() && ignored.length < 5) ignored.push(raw.trim().slice(0, 40));
      continue;
    }
    const key = normaliseWord(word);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    if (words.length >= max) {
      overCap++;
      continue;
    }
    words.push(sentence ? { word, exampleSentence: sentence } : { word });
  }

  return { words, duplicates, overCap, ignored };
}

/** Puts a list's words back into text the parser reads, one per line. */
export function wordsToText(words) {
  return words.map((w) => (w.exampleSentence ? w.word + " | " + w.exampleSentence : w.word)).join("\n");
}

// ── Building a list ────────────────────────────────────────────────────

export function makeListId(existingIds = [], random = Math.random) {
  const taken = new Set(existingIds);
  for (let i = 0; i < 100; i++) {
    let id = "custom-";
    for (let j = 0; j < 6; j++) id += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(random() * 36)];
    if (!taken.has(id)) return id;
  }
  throw new Error("could not make a list id");
}

/** A new list object from parsed words. */
export function createList({ name, yearHint = null, words, existingIds = [], now = new Date(), id }) {
  const stamp = now.toISOString();
  return {
    id: id || makeListId(existingIds),
    name: (String(name || "").trim() || "My spelling list").slice(0, MAX_NAME_LENGTH),
    yearHint: yearHint || null,
    words: words.slice(0, MAX_WORDS).map((w) => ({ ...w })),
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * The list as entries in the shape of a year's words.json, so the practice
 * quiz, word search and print builders accept it as it is.
 */
export function listToEntries(list) {
  return withWordKeys(
    list.id,
    list.words.map((w, i) => ({
      id: list.id + "-" + String(i + 1).padStart(3, "0"),
      contentType: "word",
      word: w.word,
      year: list.yearHint || "custom",
      term: "autumn",
      weekOfYear: 1,
      weekOfTerm: 1,
      focus: list.name,
      definition: w.definition || "",
      exampleSentence: w.exampleSentence || "",
      difficultyRank: i + 1,
    })),
  );
}

export const listHasMeanings = (list) => list.words.some((w) => w.definition || w.exampleSentence);

// ── Word search sizing ─────────────────────────────────────────────────

const DEFAULT_GRID_SIZE = 10;
const MAX_GRID_SIZE = 20;

/**
 * Grid settings for a list: the chosen year's word-search settings (its size,
 * directions and letter case), with the grid made big enough for the longest
 * word so nothing is silently left out.
 */
export function gridSettingsFor(list, yearCapabilities) {
  const caps = (yearCapabilities && yearCapabilities.wordSearchGrid) || {};
  const longest = list.words.reduce((n, w) => Math.max(n, w.word.replace(/[^\p{L}]/gu, "").length), 0);
  const size = Math.min(MAX_GRID_SIZE, Math.max(caps.size || DEFAULT_GRID_SIZE, longest + 1, 6));
  return {
    size,
    directions: caps.directions || ["horizontal", "vertical"],
    letterCase: caps.letterCase || "uppercase",
    tooLong: list.words.filter((w) => w.word.replace(/[^\p{L}]/gu, "").length > size).map((w) => w.word),
  };
}

// ── Storage ────────────────────────────────────────────────────────────

const byNewest = (a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);

/** All saved lists, newest first. Damaged entries are skipped. Never throws. */
export function loadLists(storage = window.localStorage) {
  let raw;
  try {
    raw = JSON.parse(storage.getItem(CUSTOM_LISTS_KEY));
  } catch (err) {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const lists = [];
  const seen = new Set();
  for (const item of raw) {
    const ok = listSchema.safeParse(item);
    if (!ok.success || seen.has(ok.data.id)) continue;
    seen.add(ok.data.id);
    lists.push(ok.data);
    if (lists.length >= MAX_LISTS) break;
  }
  return lists.sort(byNewest);
}

export function saveLists(storage, lists) {
  try {
    storage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(lists));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Couldn't save the list. The device may be out of storage space." };
  }
}

export function getList(storage, id) {
  return loadLists(storage).find((l) => l.id === id) || null;
}

/** Adds a list, or replaces the one with the same id. */
export function upsertList(storage, list) {
  const parsed = listSchema.safeParse(list);
  if (!parsed.success) return { ok: false, error: "That list isn't valid." };
  const lists = loadLists(storage);
  const index = lists.findIndex((l) => l.id === list.id);
  if (index === -1 && lists.length >= MAX_LISTS) {
    return { ok: false, error: "You can keep up to " + MAX_LISTS + " lists. Delete one to make room." };
  }
  if (index === -1) lists.push(parsed.data);
  else lists[index] = parsed.data;
  return saveLists(storage, lists);
}

/** Deletes a list and the progress saved for it. */
export function deleteList(storage, id) {
  const lists = loadLists(storage).filter((l) => l.id !== id);
  const out = saveLists(storage, lists);
  if (CUSTOM_ID_RE.test(id)) {
    try {
      storage.removeItem("spellstars." + id + ".progress");
      storage.removeItem("spellstars." + id + ".progress.v1");
    } catch (err) {
      // nothing to do
    }
  }
  return out;
}

// ── Meanings from the built-in word lists ──────────────────────────────

/**
 * Fills in a definition and example sentence for words that match a word in
 * the built-in lists, so "Guess from the meaning" and the printed meanings
 * work for them. A sentence or meaning the person supplied is never replaced.
 *
 * @param {{word: string}[]} words
 * @param {{ getYearsConfig: Function, getYearWords: Function }} loaders
 * @returns {Promise<{ words: object[], filled: number }>} never rejects
 */
export async function addBuiltInMeanings(words, { getYearsConfig, getYearWords }) {
  let known;
  try {
    const config = await getYearsConfig();
    const lists = await Promise.all(
      config.years.map((y) => getYearWords(y.slug, y.wordListPath).catch(() => [])),
    );
    known = new Map();
    for (const entries of lists) {
      for (const e of entries) {
        if (e.contentType === "letter" || !e.word || !e.definition) continue;
        const key = normaliseWord(e.word);
        if (!known.has(key)) known.set(key, { definition: e.definition, exampleSentence: e.exampleSentence || "" });
      }
    }
  } catch (err) {
    return { words, filled: 0 };
  }

  let filled = 0;
  const out = words.map((w) => {
    const hit = known.get(normaliseWord(w.word));
    if (!hit || w.definition) return w;
    filled++;
    const next = { ...w, definition: hit.definition.slice(0, MAX_DEFINITION_LENGTH) };
    if (!w.exampleSentence && hit.exampleSentence) next.exampleSentence = hit.exampleSentence.slice(0, MAX_SENTENCE_LENGTH);
    return next;
  });
  return { words: out, filled };
}
