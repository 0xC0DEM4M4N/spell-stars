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

const STORAGE_PREFIX = "spellstars";

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
  return { currentWeek: 1, words: {} };
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
    return { currentWeek: parsed.currentWeek || 1, words: parsed.words };
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
    .map((w) => ({ w, state: getWordState(progress, w.id) }))
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
  const unseen = pool.filter((w) => !getWordState(progress, w.id));
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
  const reviews = pickReviewWords(pool, progress, today, caps.reviewsPerDay);
  const chosenIds = new Set(reviews.map((w) => w.id));
  const remainingNewLimit = caps.newItemsPerDay != null
    ? Math.max(caps.newItemsPerDay - 0, 0)
    : undefined;
  const newWords = pickNewWords(pool, progress, remainingNewLimit).filter((w) => !chosenIds.has(w.id));
  newWords.forEach((w) => chosenIds.add(w.id));

  let session = reviews.concat(newWords);

  if (requestedCount != null && session.length < requestedCount) {
    // Top up from the rest of the pool (already-mastered words not yet
    // due, or anything not caught above) so the user gets the session
    // size they asked for.
    const fillers = byDifficultyThenRandom(pool.filter((w) => !chosenIds.has(w.id)));
    for (const w of fillers) {
      if (session.length >= requestedCount) break;
      session.push(w);
      chosenIds.add(w.id);
    }
  } else if (requestedCount != null && session.length > requestedCount) {
    session = session.slice(0, requestedCount);
  }

  return session;
}
