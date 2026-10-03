// Manual offline check-ins: lets a grown-up tick off this week's paper and
// verbal routine (the "offline journey" — see content/journeys.js) so it
// counts for real, not just as a reminder.
//
// A tick reuses the exact same reward paths digital practice already
// uses — recordCompletion()/checkStatus() from badges.js — so an offline
// win feeds the same badges and status points as a digital one.
// recordAttempt()/saveProgress() for the week's actual words is the
// caller's job (see the week card's offline routine section), not this
// module's: that keeps it on the same path a digital answer takes,
// flowing through whatever React state owns a year's progress, instead
// of this module reaching into localStorage behind that state's back.
//
// Storage, one learner at a time (see learners.js for the id scheme):
//   main learner    spellstars.offlineLog
//   anyone else     spellstars.<learnerId>.offlineLog
//
// Shape saved at that key:
//   {
//     v: 1,
//     weeks: {
//       "<yearSlug>:<week>": {
//         "<stepId>": { done: true, date: "<ISO date>", cleanRun: true|false|null },
//       },
//     },
//   }
//
// Each (learner, year, week, step) is only ever applied once — see
// markOfflineStep(). Unticking a step in the UI only changes how it looks;
// it never calls back into this module to retract anything already
// awarded, same "it only goes up" principle as badges.js.

import { MAIN_LEARNER_ID } from "./learners";
import { recordCompletion, checkStatus } from "./badges";

const todayISO = (now) => (now || new Date()).toISOString().slice(0, 10);

// The week's paper/verbal routine, in the order content/journeys.js lays
// the week out (word search early on, the crossword and look/cover/
// write/check mid-week, verbal test at the end). `activity` is the
// badges.js activity a clean run of that step counts towards — word
// search and crossword feed real badges the same way their digital
// twins do; look-cover-write-check and the verbal test still move words
// through the Leitner boxes but aren't tied to either puzzle's badge
// trail (there's no honest paper equivalent of "which puzzle was it").
export const OFFLINE_STEPS = [
  { id: "wordsearch", label: "Printed word search", hint: "This week's word search, done on paper.", activity: "wordsearch" },
  { id: "crossword", label: "Printed crossword", hint: "This week's crossword, done on paper.", activity: "crossword" },
  { id: "lcwc", label: "Look, cover, write, check", hint: "The printed practice sheet, word by word.", activity: null },
  { id: "verbal", label: "Verbal test", hint: "Said aloud, no page in sight.", activity: null },
];

export function offlineLogKeyFor(learnerId) {
  if (!learnerId || learnerId === MAIN_LEARNER_ID) return "spellstars.offlineLog";
  return "spellstars." + learnerId + ".offlineLog";
}

function defaultOfflineLog() {
  return { v: 1, weeks: {} };
}

function weekLogKey(yearSlug, week) {
  return yearSlug + ":" + week;
}

/** Reads one learner's offline-checklist log. Never throws — falls back
 * to an empty log if storage is unavailable or the saved value is
 * corrupt. */
export function loadOfflineLog(storage, learnerId) {
  try {
    const raw = storage.getItem(offlineLogKeyFor(learnerId));
    if (!raw) return defaultOfflineLog();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.weeks || typeof parsed.weeks !== "object") {
      return defaultOfflineLog();
    }
    return { v: 1, weeks: { ...parsed.weeks } };
  } catch (err) {
    return defaultOfflineLog();
  }
}

export function saveOfflineLog(storage, learnerId, data) {
  try {
    storage.setItem(offlineLogKeyFor(learnerId), JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Couldn't save. The device may be out of storage space." };
  }
}

/** What's logged for one year+week, keyed by step id (e.g.
 * `{ wordsearch: { done, date, cleanRun } }`), or `{}` if nothing has
 * been ticked yet. */
export function getWeekLog(data, yearSlug, week) {
  return (data.weeks && data.weeks[weekLogKey(yearSlug, week)]) || {};
}

/**
 * Ticks one offline step for a year+week, exactly once per learner.
 * Returns `{ applied, unlocked, status }`:
 *
 *   - `applied` is false (and nothing else happens — no badge/status
 *     side effect, log untouched) if this step was already logged done
 *     for this learner + year + week, so a caller never has to check
 *     first; it's always safe to call this on a tap.
 *   - on a fresh tick, `unlocked` is whatever badges (if any) just
 *     unlocked and `status` is checkStatus()'s result (so a "You've
 *     become a..." moment is caught the instant it happens, same as a
 *     digital completion).
 *
 * `cleanRun` only matters for steps with a badges.js `activity`
 * (word search / crossword): pass true when the grown-up confirms there
 * were no mistakes, so the clean run counts towards the gold star / gold
 * streak badges the same way a zero-error digital run does. Leave it out
 * (or false) and the step still counts towards that activity's lifetime
 * milestone — it just isn't a "gold" run.
 */
export function markOfflineStep(storage, learnerId, { yearSlug, week, stepId, cleanRun = false, now } = {}) {
  const step = OFFLINE_STEPS.find((s) => s.id === stepId);
  if (!step || !yearSlug || !week) return { applied: false, unlocked: [], status: null };

  const data = loadOfflineLog(storage, learnerId);
  const key = weekLogKey(yearSlug, week);
  const weekLog = data.weeks[key] || {};
  if (weekLog[stepId] && weekLog[stepId].done) {
    return { applied: false, unlocked: [], status: null };
  }

  const dateISO = todayISO(now);
  data.weeks[key] = { ...weekLog, [stepId]: { done: true, date: dateISO, cleanRun: step.activity ? !!cleanRun : null } };
  saveOfflineLog(storage, learnerId, data);

  let unlocked = [];
  if (step.activity) {
    const result = recordCompletion(storage, learnerId, { activity: step.activity, errors: cleanRun ? 0 : 1, now });
    unlocked = result.unlocked;
  }

  const status = checkStatus(storage, learnerId, { now });

  return { applied: true, unlocked, status };
}
