// Lightweight SRS ("spaced repetition-lite") engine.
//
// Not a full SM-2/Anki-grade algorithm — a simple 6-box Leitner system.
// Every word gets a "box" (0-5). A correct answer promotes it a box and
// pushes its next-due date out further; an incorrect answer drops it back
// to box 0 (due again immediately). This is intentionally simple and easy
// to reason about / tune — see the "sessionCaps are placeholders" note in
// next-steps-year-capabilities.md.
//
// Progress is namespaced per year in localStorage as
// `spellstars.<yearSlug>.progress`, per the routing plan (switching years
// must never clobber another year's saved progress).
//
// Storage format versions (the `v` field):
//   (none)  words are keyed by slot id, e.g. "year3-w01-01"
//   2       words are keyed by wordKey, e.g. "year3:badge" (see wordKey.js).
//           migrateProgress() converts a year's saved progress from the
//           first format to this one the first time that year's word data
//           is loaded.

import { progressKey } from "./wordKey";

const STORAGE_PREFIX = "spellstars";

export const PROGRESS_VERSION = 2;

// Days until a word is due again, indexed by box (0-5).
export const LEITNER_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateISO, days) {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function storageKey(yearSlug) {
  return STORAGE_PREFIX + "." + yearSlug + ".progress";
}

function defaultProgress() {
  return { v: PROGRESS_VERSION, currentWeek: 1, words: {} };
}

/** Reads a year's progress from localStorage. Never throws — falls back
 * to a fresh default if storage is unavailable or corrupt (private
 * browsing, disabled storage, hand-edited JSON, etc). */
export function loadProgress(yearSlug) {
  try {
    const raw = window.localStorage.getItem(storageKey(yearSlug));
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.words) return defaultProgress();
    // `v` is carried through untouched: it stays undefined for progress
    // saved before word keys existed, so migrateProgress() can tell.
    return { v: parsed.v, currentWeek: parsed.currentWeek || 1, words: parsed.words };
  } catch (err) {
    return defaultProgress();
  }
}

/** Writes a year's progress to localStorage. Silently no-ops if storage
 * isn't available rather than throwing and breaking the session. */
export function saveProgress(yearSlug, progress) {
  try {
    window.localStorage.setItem(storageKey(yearSlug), JSON.stringify(progress));
  } catch (err) {
    // Storage full / unavailable — practice still works this session,
    // it just won't persist. Not fatal.
  }
}

export function getCurrentWeek(progress) {
  return progress.currentWeek || 1;
}

/** Pure updater — returns a new progress object with currentWeek set.
 * Caller is responsible for saveProgress(). */
export function withCurrentWeek(progress, week) {
  return { ...progress, currentWeek: week };
}

export function getWordState(progress, wordId) {
  return progress.words[wordId] || null;
}

/** A word is due if it's never been seen, or its dueDate has arrived. */
export function isDue(wordState, todayISOStr) {
  if (!wordState) return true;
  return wordState.dueDate <= todayISOStr;
}

/** Pure updater — records one attempt at a word and returns a NEW progress
 * object (does not mutate, does not save). Caller calls saveProgress()
 * with the result if they want it persisted. */
export function recordAttempt(progress, wordId, correct, todayISOStr) {
  const today = todayISOStr || todayISO();
  const prev = progress.words[wordId];
  const prevBox = prev ? prev.box : 0;
  const nextBox = correct ? Math.min(prevBox + 1, LEITNER_INTERVAL_DAYS.length - 1) : 0;
  const nextState = {
    box: nextBox,
    dueDate: addDays(today, LEITNER_INTERVAL_DAYS[nextBox]),
    attempts: (prev ? prev.attempts : 0) + 1,
    correctCount: (prev ? prev.correctCount : 0) + (correct ? 1 : 0),
    lastResult: correct ? "correct" : "incorrect",
    lastSeen: today,
  };
  return { ...progress, words: { ...progress.words, [wordId]: nextState } };
}

function shuffledCopy(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** difficultyRank ascending, then random — the tie-break order specified
 * in spell-stars-wordlist-spec.md §3. */
function byDifficultyThenRandom(words) {
  const withRandomKey = words.map((w) => ({ w, r: Math.random() }));
  withRandomKey.sort((a, b) => {
    const da = a.w.difficultyRank ?? 3;
    const db = b.w.difficultyRank ?? 3;
    if (da !== db) return da - db;
    return a.r - b.r;
  });
  return withRandomKey.map((x) => x.w);
}

/** Words from `pool` that are due for review, most-overdue first (earliest
 * dueDate first), falling back to difficultyRank/random among words with
 * the same dueDate. Capped at `limit`. */
export function pickReviewWords(pool, progress, todayISOStr, limit) {
  const today = todayISOStr || todayISO();
  const due = pool
    .map((w) => ({ w, state: getWordState(progress, progressKey(w)) }))
    .filter(({ state }) => state && isDue(state, today))
    .sort((a, b) => {
      if (a.state.dueDate !== b.state.dueDate) return a.state.dueDate < b.state.dueDate ? -1 : 1;
      return (a.w.difficultyRank ?? 3) - (b.w.difficultyRank ?? 3);
    })
    .map(({ w }) => w);
  return limit == null ? due : due.slice(0, limit);
}

/** Words from `pool` never attempted before, ordered by difficultyRank
 * ascending then random. Capped at `limit`. */
export function pickNewWords(pool, progress, limit) {
  const unseen = pool.filter((w) => !getWordState(progress, progressKey(w)));
  const ordered = byDifficultyThenRandom(unseen);
  return limit == null ? ordered : ordered.slice(0, limit);
}

/**
 * Builds one practice/word-search session's word list from a scope pool.
 *
 * Respects capabilities.sessionCaps (newItemsPerDay / reviewsPerDay) as a
 * ceiling on how many brand-new vs. due-for-review words go into the
 * reviews+new mix, then tops the session up to `requestedCount` (the
 * user's 10/15/20 picker) from the remaining pool if the capped mix came
 * up short, so the session size the user asked for is still honoured.
 *
 * Per spec, "By week" scope does NOT go through this — it's always just
 * that week's fixed list, untouched by SRS selection.
 */
export function selectSessionWords(pool, { progress, sessionCaps, requestedCount, todayISOStr }) {
  const today = todayISOStr || todayISO();
  const caps = sessionCaps || {};
  // Revision cycling puts the same word in several slots. Everything below
  // works on one entry per word, so a session never asks for a word twice.
  const seenKeys = new Set();
  const uniquePool = pool.filter((w) => {
    const key = progressKey(w);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  pool = uniquePool;

  const reviews = pickReviewWords(pool, progress, today, caps.reviewsPerDay);
  const chosenIds = new Set(reviews.map((w) => progressKey(w)));
  const remainingNewLimit = caps.newItemsPerDay != null
    ? Math.max(caps.newItemsPerDay - 0, 0)
    : undefined;
  const newWords = pickNewWords(pool, progress, remainingNewLimit).filter((w) => !chosenIds.has(progressKey(w)));
  newWords.forEach((w) => chosenIds.add(progressKey(w)));

  let session = reviews.concat(newWords);

  if (requestedCount != null && session.length < requestedCount) {
    // Top up from the rest of the pool (already-mastered words not yet
    // due, or anything not caught above) so the user gets the session
    // size they asked for.
    const fillers = byDifficultyThenRandom(pool.filter((w) => !chosenIds.has(progressKey(w))));
    for (const w of fillers) {
      if (session.length >= requestedCount) break;
      session.push(w);
      chosenIds.add(progressKey(w));
    }
  } else if (requestedCount != null && session.length > requestedCount) {
    session = session.slice(0, requestedCount);
  }

  return session;
}

// ── Migration: slot-id keys -> word keys ───────────────────────────────

/** Combines two saved records for the same word (they came from different
 * slots of that word). Counts add up, because each record is a separate
 * run of practice; box, due date and last result come from whichever was
 * seen most recently. */
function mergeWordStates(a, b) {
  const aSeen = a.lastSeen || "";
  const bSeen = b.lastSeen || "";
  let latest = a;
  if (bSeen > aSeen) latest = b;
  else if (bSeen === aSeen && (b.box || 0) > (a.box || 0)) latest = b;
  return {
    ...latest,
    attempts: (a.attempts || 0) + (b.attempts || 0),
    correctCount: (a.correctCount || 0) + (b.correctCount || 0),
  };
}

/**
 * Converts one year's saved progress from slot-id keys to word keys. Call
 * it once that year's word data (decorated with wordKey by yearData.js) is
 * available.
 *
 * Returns the migrated progress object when it changed something, or null
 * when there was nothing to do (no saved progress, or already migrated).
 * Safe to call repeatedly.
 *
 * - The old saved value is kept, once, under
 *   `spellstars.<yearSlug>.progress.v1` as a fallback.
 * - Records under a key that is neither a known slot id nor already a word
 *   key (for example a word since removed from the data) are kept as they
 *   are rather than dropped.
 * - When one word had records in several slots, they are combined.
 */
export function migrateProgress(yearSlug, words) {
  let raw;
  try {
    raw = window.localStorage.getItem(storageKey(yearSlug));
  } catch (err) {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.words) return null;
  if (parsed.v === PROGRESS_VERSION) return null;
  if (!Array.isArray(words) || words.length === 0) return null;

  const keyForId = new Map();
  for (const entry of words) {
    if (entry && entry.id) keyForId.set(entry.id, progressKey(entry));
  }

  // Safety check: if none of the saved keys match this word data at all
  // (for example the wrong year's words were passed in), leave the saved
  // progress alone rather than stamping it as migrated.
  const savedKeys = Object.keys(parsed.words);
  const recognised = savedKeys.filter((k) => keyForId.has(k) || k.startsWith(yearSlug + ":"));
  if (savedKeys.length > 0 && recognised.length === 0) return null;

  const migratedWords = {};
  for (const [oldKey, state] of Object.entries(parsed.words)) {
    const newKey = keyForId.get(oldKey) || oldKey;
    migratedWords[newKey] = migratedWords[newKey]
      ? mergeWordStates(migratedWords[newKey], state)
      : state;
  }

  const migrated = {
    v: PROGRESS_VERSION,
    currentWeek: parsed.currentWeek || 1,
    words: migratedWords,
  };

  try {
    const backupKey = storageKey(yearSlug) + ".v1";
    if (window.localStorage.getItem(backupKey) === null) {
      window.localStorage.setItem(backupKey, raw);
    }
    window.localStorage.setItem(storageKey(yearSlug), JSON.stringify(migrated));
  } catch (err) {
    // Storage full or unavailable: the app still works this session with
    // the migrated object in memory. The next visit simply migrates again.
  }
  return migrated;
}
