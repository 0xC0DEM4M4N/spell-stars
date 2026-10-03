// Badges and status levels: a small reward layer on top of real practice.
// Nothing here replaces srs.js's Leitner boxes — it only reads and reacts
// to them. Everything "only ever goes up": a later wrong answer can't cost
// a badge or a status level, same principle as the Leitner boxes moving a
// word back without erasing what was already earned.
//
// Storage, one learner at a time (see learners.js for the id scheme):
//   main learner    spellstars.badges
//   anyone else     spellstars.<learnerId>.badges
//
// Shape saved at that key:
//   {
//     v: 1,
//     counters: { crossword, wordsearch, gold },  // lifetime completions
//     earned: { "<badgeId>": "<ISO date first unlocked>" },
//     statusReached: { "<tierKey or galaxy-N>": "<ISO date first reached>" },
//   }
//
// Points (what drives status levels) are not stored here at all — they are
// the sum of correctCount across every word a learner has ever practised,
// which already lives in srs.js's per-year/list progress. See
// totalCorrectCount().

import { MAIN_LEARNER_ID, learnerProgressKeys } from "./learners";

const todayISO = (now) => (now || new Date()).toISOString().slice(0, 10);

// ── Points ─────────────────────────────────────────────────────────────

/** The progress keys that hold real (not backup) data for one learner. */
function liveProgressKeys(storage, learnerId) {
  // learnerProgressKeys also matches the one-time ".progress.v1" backup
  // migrateProgress() leaves behind, which holds the *same* attempts under
  // the old slot-id keys — summing it too would double every count.
  return learnerProgressKeys(storage, learnerId).filter((key) => !key.endsWith(".v1"));
}

/**
 * The total number of correct answers a learner has ever given, across
 * every year and custom list they've practised. This is the one running
 * number status levels are built from — nothing new is stored for it.
 */
export function totalCorrectCount(storage, learnerId) {
  let total = 0;
  for (const key of liveProgressKeys(storage, learnerId)) {
    let raw;
    try {
      raw = storage.getItem(key);
    } catch (err) {
      continue;
    }
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      continue;
    }
    if (!parsed || typeof parsed !== "object" || !parsed.words || typeof parsed.words !== "object") continue;
    for (const state of Object.values(parsed.words)) {
      const count = state && Number(state.correctCount);
      if (Number.isFinite(count)) total += count;
    }
  }
  return total;
}

// ── Status levels ──────────────────────────────────────────────────────

// Milestone counts are the same for every year group (this is about
// effort, not difficulty); only the two speed badges below scale by size.
export const STATUS_TIERS = [
  { key: "mouse", status: "Letter Explorer", animal: "Mouse", minPoints: 0 },
  { key: "rabbit", status: "Word Builder", animal: "Rabbit", minPoints: 40 },
  { key: "fox", status: "Spelling Fox", animal: "Fox", minPoints: 120 },
  { key: "owl", status: "Word-Wise Owl", animal: "Owl", minPoints: 280 },
  { key: "eagle", status: "Spelling Eagle", animal: "Eagle", minPoints: 550 },
  { key: "star", status: "Spelling Star", animal: "Star", minPoints: 900 },
  { key: "shootingstar", status: "Shooting Star", animal: "Shooting star", minPoints: 1500 },
  { key: "constellation", status: "Constellation", animal: "Constellation", minPoints: 2500 },
  { key: "galaxy", status: "Galaxy", animal: "Galaxy", minPoints: 4000 },
];

// Beyond the Galaxy tier there's no ceiling: every further GALAXY_STEP
// points is another level ("Galaxy", then "Galaxy ×2", "Galaxy ×3", ...).
export const GALAXY_STEP = 1500;

const GALAXY_TIER = STATUS_TIERS[STATUS_TIERS.length - 1];

/**
 * Works out a learner's status from their points total. Never throws and
 * never goes backwards in spirit — callers always pass a cumulative total
 * that only grows, so the status it returns only grows too.
 *
 * Returns the current tier/animal/label, how far through it they are
 * (0-1), and what's next — including the uncapped "Galaxy ×N" ladder once
 * a learner is past the last named tier.
 */
export function computeStatus(points) {
  const p = Math.max(0, Math.floor(Number(points)) || 0);

  if (p < GALAXY_TIER.minPoints) {
    let tierIndex = 0;
    for (let i = STATUS_TIERS.length - 2; i >= 0; i--) {
      if (p >= STATUS_TIERS[i].minPoints) {
        tierIndex = i;
        break;
      }
    }
    const tier = STATUS_TIERS[tierIndex];
    const next = STATUS_TIERS[tierIndex + 1];
    const span = next.minPoints - tier.minPoints;
    const progress = span > 0 ? Math.min(1, Math.max(0, (p - tier.minPoints) / span)) : 1;
    return {
      key: tier.key,
      status: tier.status,
      animal: tier.animal,
      level: 1,
      label: tier.status,
      points: p,
      tierMinPoints: tier.minPoints,
      nextKey: next.key,
      nextStatus: next.status,
      nextAnimal: next.animal,
      nextMinPoints: next.minPoints,
      pointsToNext: next.minPoints - p,
      progress,
    };
  }

  // Galaxy and beyond.
  const level = 1 + Math.floor((p - GALAXY_TIER.minPoints) / GALAXY_STEP);
  const levelMin = GALAXY_TIER.minPoints + (level - 1) * GALAXY_STEP;
  const nextMin = levelMin + GALAXY_STEP;
  const progress = Math.min(1, Math.max(0, (p - levelMin) / GALAXY_STEP));
  return {
    key: GALAXY_TIER.key,
    status: GALAXY_TIER.status,
    animal: GALAXY_TIER.animal,
    level,
    label: level > 1 ? GALAXY_TIER.status + " ×" + level : GALAXY_TIER.status,
    points: p,
    tierMinPoints: levelMin,
    nextKey: GALAXY_TIER.key,
    nextStatus: GALAXY_TIER.status,
    nextAnimal: GALAXY_TIER.animal,
    nextMinPoints: nextMin,
    pointsToNext: nextMin - p,
    progress,
  };
}

/** The key a status is recorded under in `statusReached` (galaxy levels
 * each get their own key, so "You've reached Galaxy ×2!" can fire once). */
function statusReachedKey(status) {
  return status.key === GALAXY_TIER.key ? "galaxy-" + status.level : status.key;
}

// ── Badge catalogue ────────────────────────────────────────────────────

// Data, not code: the "My badges" view reads this list to render every
// badge (earned or still locked), and recordCompletion() below checks
// against it. Seconds-per-word for the two speed badges is deliberately
// the only thing that scales with puzzle size — a fixed time wouldn't be
// fair across a 6-word Reception list and a 15-word Year 6 one.
const SPEED_SECONDS_PER_WORD = { crossword: 15, wordsearch: 20 };

export const BADGES = [
  { id: "crossword-10", activity: "crossword", kind: "milestone", threshold: 10, label: "Crossword ×10", hint: "Complete 10 crosswords." },
  { id: "crossword-25", activity: "crossword", kind: "milestone", threshold: 25, label: "Crossword ×25", hint: "Complete 25 crosswords." },
  { id: "crossword-50", activity: "crossword", kind: "milestone", threshold: 50, label: "Crossword ×50", hint: "Complete 50 crosswords." },
  { id: "wordsearch-10", activity: "wordsearch", kind: "milestone", threshold: 10, label: "Word search ×10", hint: "Complete 10 word searches." },
  { id: "wordsearch-25", activity: "wordsearch", kind: "milestone", threshold: 25, label: "Word search ×25", hint: "Complete 25 word searches." },
  { id: "wordsearch-50", activity: "wordsearch", kind: "milestone", threshold: 50, label: "Word search ×50", hint: "Complete 50 word searches." },
  { id: "gold-star", activity: "either", kind: "gold", threshold: 1, label: "Gold star", hint: "Finish a crossword or word search with no mistakes." },
  { id: "gold-streak-5", activity: "either", kind: "gold", threshold: 5, label: "Gold streak ×5", hint: "5 clean runs in total, crossword or word search." },
  { id: "gold-streak-20", activity: "either", kind: "gold", threshold: 20, label: "Gold streak ×20", hint: "20 clean runs in total, crossword or word search." },
  { id: "speedster", activity: "wordsearch", kind: "speed", label: "Speedster", hint: "Finish a word search quickly, with no mistakes." },
  { id: "quick-solve", activity: "crossword", kind: "speed", label: "Quick solve", hint: "Finish a crossword quickly, with no mistakes." },
];

export function badgesKeyFor(learnerId) {
  if (!learnerId || learnerId === MAIN_LEARNER_ID) return "spellstars.badges";
  return "spellstars." + learnerId + ".badges";
}

function defaultBadgesData() {
  return { v: 1, counters: { crossword: 0, wordsearch: 0, gold: 0 }, earned: {}, statusReached: {} };
}

/** Reads one learner's badge progress, checked — never throws, never
 * returns a shape the rest of this file can't trust. */
export function loadBadges(storage, learnerId) {
  try {
    const raw = storage.getItem(badgesKeyFor(learnerId));
    if (!raw) return defaultBadgesData();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultBadgesData();
    const counters = parsed.counters && typeof parsed.counters === "object" ? parsed.counters : {};
    return {
      v: 1,
      counters: {
        crossword: Number.isFinite(Number(counters.crossword)) ? Math.max(0, Number(counters.crossword)) : 0,
        wordsearch: Number.isFinite(Number(counters.wordsearch)) ? Math.max(0, Number(counters.wordsearch)) : 0,
        gold: Number.isFinite(Number(counters.gold)) ? Math.max(0, Number(counters.gold)) : 0,
      },
      earned: parsed.earned && typeof parsed.earned === "object" ? { ...parsed.earned } : {},
      statusReached: parsed.statusReached && typeof parsed.statusReached === "object" ? { ...parsed.statusReached } : {},
    };
  } catch (err) {
    return defaultBadgesData();
  }
}

export function saveBadges(storage, learnerId, data) {
  try {
    storage.setItem(badgesKeyFor(learnerId), JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Couldn't save. The device may be out of storage space." };
  }
}

function checkMilestones(data, activity, dateISO, unlocked) {
  for (const badge of BADGES) {
    if (badge.kind !== "milestone" || badge.activity !== activity) continue;
    if (data.earned[badge.id]) continue;
    if (data.counters[activity] >= badge.threshold) {
      data.earned[badge.id] = dateISO;
      unlocked.push(badge);
    }
  }
}

function checkGoldBadges(data, dateISO, unlocked) {
  for (const badge of BADGES) {
    if (badge.kind !== "gold") continue;
    if (data.earned[badge.id]) continue;
    if (data.counters.gold >= badge.threshold) {
      data.earned[badge.id] = dateISO;
      unlocked.push(badge);
    }
  }
}

function checkSpeedBadge(data, activity, errors, seconds, wordCount, dateISO, unlocked) {
  const badge = BADGES.find((b) => b.kind === "speed" && b.activity === activity);
  if (!badge || data.earned[badge.id]) return;
  if (errors > 0 || seconds == null || !wordCount) return;
  const perWord = SPEED_SECONDS_PER_WORD[activity];
  if (!perWord) return;
  if (seconds <= wordCount * perWord) {
    data.earned[badge.id] = dateISO;
    unlocked.push(badge);
  }
}

/**
 * Call this the moment a crossword or word search is finished (digital or,
 * for the milestone/gold-star side, a logged offline completion — see
 * offlineLog). Updates that learner's lifetime counters, checks every
 * badge in the catalogue for anything newly crossed, saves, and returns
 * what (if anything) just unlocked so the UI can show an "unlocked!"
 * moment.
 *
 * @param {Storage} storage
 * @param {string} learnerId
 * @param {{activity: "crossword"|"wordsearch", errors?: number, seconds?: number, wordCount?: number, now?: Date}} entry
 *   `errors` of 0 counts as a clean run for the gold star / gold streak
 *   badges. `seconds`/`wordCount` are only needed for the two speed
 *   badges — omit them (as a logged offline completion must, since there's
 *   no honest way to self-report a paper completion time) and those two
 *   badges are simply never checked for that completion.
 */
export function recordCompletion(storage, learnerId, { activity, errors = 0, seconds, wordCount, now } = {}) {
  const data = loadBadges(storage, learnerId);
  if (activity !== "crossword" && activity !== "wordsearch") return { data, unlocked: [] };

  const dateISO = todayISO(now);
  const unlocked = [];

  data.counters[activity] = (data.counters[activity] || 0) + 1;
  checkMilestones(data, activity, dateISO, unlocked);

  if (errors === 0) {
    data.counters.gold = (data.counters.gold || 0) + 1;
    checkGoldBadges(data, dateISO, unlocked);
  }

  checkSpeedBadge(data, activity, errors, seconds, wordCount, dateISO, unlocked);

  saveBadges(storage, learnerId, data);
  return { data, unlocked };
}

/**
 * Computes a learner's current status from their practice so far and, the
 * first time it's called after they've crossed into a new tier (including
 * a new uncapped Galaxy level), stamps today's date against it so the "You've
 * become a..." moment — and the certificate for it — can be shown once
 * rather than recomputed every visit. Safe to call on every page load.
 */
/**
 * What to show for one catalogue badge, given a learner's saved badge data:
 * whether it's earned (and when), and — for a milestone or gold badge not
 * yet earned — progress towards its threshold ("7/10"). A speed badge has
 * no running count to show; it's simply earned or not yet.
 */
export function badgeProgress(data, badge) {
  const date = data.earned[badge.id] || null;
  if (date) return { earned: true, date, current: null, threshold: null };
  if (badge.kind === "speed") return { earned: false, date: null, current: null, threshold: null };
  const current = badge.kind === "gold" ? data.counters.gold : data.counters[badge.activity] || 0;
  return { earned: false, date: null, current: Math.min(current, badge.threshold), threshold: badge.threshold };
}

export function checkStatus(storage, learnerId, { now } = {}) {
  const points = totalCorrectCount(storage, learnerId);
  const status = computeStatus(points);
  const data = loadBadges(storage, learnerId);
  const key = statusReachedKey(status);
  let justReached = false;
  if (!data.statusReached[key]) {
    data.statusReached[key] = todayISO(now);
    justReached = true;
    saveBadges(storage, learnerId, data);
  }
  return { status, justReached, reachedOn: data.statusReached[key] };
}
