// Account-free sync, part 2: combining a snapshot with what is already on this
// device, and being able to take it back.
//
// Everything here is synchronous and works on plain objects plus a
// localStorage-like `storage`, so it can be tested without a browser.

import { CUSTOM_LISTS_KEY, MAX_LISTS } from "./customLists";
import {
  LEARNERS_KEY,
  LEARNER_PROGRESS_KEY_RE,
  MAIN_LEARNER_ID,
  MAX_LEARNERS,
  makeLearnerId,
  nameKey,
  progressKeyFor,
  uniqueDefaultName,
} from "./learners";
import {
  PROGRESS_KEY_RE,
  SETTING_NAMES,
  emptyBadges,
  settingStorageKey,
  snapshotLearners,
} from "./syncSnapshot";
import { badgesKeyFor } from "./badges";

// ── Merging ────────────────────────────────────────────────────────────

/** Which of two versions of the same list to keep: the later edit; on a tie,
 * the same one whichever side asks. Positive when `a` should win. */
function compareLists(a, b) {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1;
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  return ja === jb ? 0 : ja < jb ? -1 : 1;
}

function mergeLists(localLists, incomingLists, mode) {
  const counts = { added: 0, updated: 0, unchanged: 0, removed: 0, skipped: 0 };
  if (mode === "replace") {
    const have = new Map(localLists.map((l) => [l.id, l]));
    for (const l of incomingLists) {
      const mine = have.get(l.id);
      if (!mine) counts.added++;
      else if (compareLists(l, mine) === 0) counts.unchanged++;
      else counts.updated++;
    }
    const keep = new Set(incomingLists.map((l) => l.id));
    counts.removed = localLists.filter((l) => !keep.has(l.id)).length;
    return { lists: incomingLists.map((l) => ({ ...l })), counts };
  }
  const lists = localLists.map((l) => ({ ...l }));
  for (const l of incomingLists) {
    const index = lists.findIndex((m) => m.id === l.id);
    if (index === -1) {
      if (lists.length >= MAX_LISTS) counts.skipped++;
      else {
        lists.push({ ...l });
        counts.added++;
      }
    } else if (compareLists(l, lists[index]) > 0) {
      lists[index] = { ...l };
      counts.updated++;
    } else {
      counts.unchanged++;
    }
  }
  return { lists, counts };
}

/**
 * Orders two saved records of the same word. Returns a positive number when
 * `a` should win. More practice wins; if that is equal, the more recent
 * practice wins; if that is equal too, the record is picked by its contents so
 * both devices choose the same one. That makes a merge give the same answer
 * whichever way round it is done.
 */
function compareWordStates(a, b) {
  if (a.attempts !== b.attempts) return a.attempts - b.attempts;
  if (a.lastSeen !== b.lastSeen) return a.lastSeen < b.lastSeen ? -1 : 1;
  if (a.box !== b.box) return a.box - b.box;
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  return ja === jb ? 0 : ja < jb ? -1 : 1;
}

const sameState = (a, b) => compareWordStates(a, b) === 0;

/**
 * Merges one learner's years. `local` and `inc` are { slug: year } objects.
 * Returns what to write and the counts for the preview.
 */
function mergeYears(local, inc, { mode, useIncomingWeeks, skip }) {
  const progress = {};
  const years = {};
  const skipped = [];
  const weekDiffers = [];
  const total = { added: 0, updated: 0, unchanged: 0, removed: 0 };

  for (const [slug, incYear] of Object.entries(inc)) {
    if (skip.has(slug)) {
      skipped.push(slug);
      continue;
    }
    const loc = local[slug];
    const counts = { added: 0, updated: 0, unchanged: 0, removed: 0 };

    if (mode === "replace" || !loc) {
      const localWords = loc ? loc.words : {};
      for (const [key, state] of Object.entries(incYear.words)) {
        if (!localWords[key]) counts.added++;
        else if (sameState(localWords[key], state)) counts.unchanged++;
        else counts.updated++;
      }
      for (const key of Object.keys(localWords)) if (!incYear.words[key]) counts.removed++;
      progress[slug] = { v: incYear.v, currentWeek: incYear.currentWeek, words: { ...incYear.words } };
    } else {
      const words = { ...loc.words };
      for (const [key, state] of Object.entries(incYear.words)) {
        const have = words[key];
        if (!have) {
          words[key] = state;
          counts.added++;
        } else if (compareWordStates(state, have) > 0) {
          words[key] = state;
          counts.updated++;
        } else {
          counts.unchanged++;
        }
      }
      if (incYear.currentWeek !== loc.currentWeek) weekDiffers.push({ slug, here: loc.currentWeek, there: incYear.currentWeek });
      progress[slug] = {
        v: loc.v,
        currentWeek: useIncomingWeeks ? incYear.currentWeek : loc.currentWeek,
        words,
      };
    }

    years[slug] = counts;
    for (const k of Object.keys(total)) total[k] += counts[k];
  }

  const removedYears = [];
  if (mode === "replace") {
    for (const [slug, loc] of Object.entries(local)) {
      if (inc[slug] || skip.has(slug)) continue;
      removedYears.push(slug);
      const n = Object.keys(loc.words).length;
      years[slug] = { added: 0, updated: 0, unchanged: 0, removed: n };
      total.removed += n;
    }
  }
  return { progress, removedYears, years, skipped, weekDiffers, total };
}

const countWords = (progress) => Object.values(progress).reduce((n, y) => n + Object.keys(y.words).length, 0);

/**
 * Combines one learner's badge data from both sides. Unlike years/lists,
 * this never has a "replace" behaviour — a restore should never cost
 * someone a badge or a status date they'd already earned, so counters take
 * the higher value and earned-badge/status dates take whichever is
 * earliest. Returns the merged data plus whether it differs from `local`.
 */
function mergeBadges(local, inc) {
  const a = local || emptyBadges();
  const b = inc || emptyBadges();
  const earliest = (x, y) => (x && (!y || x < y) ? x : y);

  const counters = {
    crossword: Math.max(a.counters.crossword, b.counters.crossword),
    wordsearch: Math.max(a.counters.wordsearch, b.counters.wordsearch),
    gold: Math.max(a.counters.gold, b.counters.gold),
  };
  const earned = { ...a.earned };
  for (const [id, date] of Object.entries(b.earned)) earned[id] = earliest(earned[id], date);
  const statusReached = { ...a.statusReached };
  for (const [key, date] of Object.entries(b.statusReached)) statusReached[key] = earliest(statusReached[key], date);

  const badges = { v: 1, counters, earned, statusReached };
  return { badges, changed: JSON.stringify(badges) !== JSON.stringify(a) };
}

/**
 * Decides which learner on this device each learner in the backup goes to.
 * Returns { plan, roster, skipped }:
 *   plan     [{ inc, id, isNew, name }] one per learner taken from the backup
 *   roster   the roster to store afterwards, or null when it is unchanged
 *   skipped  learners not added because the device is at its limit
 *
 * Merge: a learner is matched to one on the device by name. A backup from
 * before learners existed (one unnamed learner) goes to the main learner, and
 * so does a named main learner when the device's main learner has no name yet.
 * Anyone left over is added as a new learner.
 * Replace: the backup's main learner replaces this device's main learner, the
 * others are matched by name so their ids stay, and anyone on the device who
 * is not in the backup is removed.
 */
function planLearners(localLearners, incLearners, hadRoster, mode, random) {
  const localMain = localLearners.find((l) => l.id === MAIN_LEARNER_ID);
  const taken = new Set(localLearners.map((l) => l.id));
  const byName = new Map(localLearners.filter((l) => l.name).map((l) => [nameKey(l.name), l.id]));
  const claimed = new Set();
  const plan = [];
  let skipped = 0;
  let count = mode === "replace" ? 0 : localLearners.length;

  for (const inc of incLearners) {
    const nk = inc.name ? nameKey(inc.name) : "";
    let id = null;
    if (mode === "replace") {
      if (inc.id === MAIN_LEARNER_ID) id = MAIN_LEARNER_ID;
      else if (nk && byName.has(nk) && byName.get(nk) !== MAIN_LEARNER_ID && !claimed.has(byName.get(nk))) id = byName.get(nk);
    } else if (nk && byName.has(nk) && !claimed.has(byName.get(nk))) {
      id = byName.get(nk);
    } else if (inc.id === MAIN_LEARNER_ID && !claimed.has(MAIN_LEARNER_ID) && (!inc.name || !localMain.name)) {
      id = MAIN_LEARNER_ID;
    }

    if (id) {
      claimed.add(id);
      const takesName = mode === "merge" && id === MAIN_LEARNER_ID && !localMain.name && inc.name;
      plan.push({ inc, id, isNew: false, name: mode === "replace" ? inc.name : takesName ? inc.name : null });
      continue;
    }

    if (count >= MAX_LEARNERS) {
      skipped++;
      continue;
    }
    id = inc.id !== MAIN_LEARNER_ID && !taken.has(inc.id) ? inc.id : makeLearnerId([...taken], random);
    taken.add(id);
    claimed.add(id);
    count++;
    plan.push({ inc, id, isNew: true, name: inc.name });
  }

  // The roster to store afterwards.
  let roster = null;
  if (mode === "replace") {
    if (incLearners.length === 1 && !incLearners[0].name) {
      roster = hadRoster ? [] : null;
    } else {
      const next = plan.map((p) => ({ id: p.id, name: p.inc.name, createdAt: p.inc.createdAt || "" }));
      const before = localLearners.filter((l) => !l.implicit);
      if (JSON.stringify(next) !== JSON.stringify(before.map((l) => ({ id: l.id, name: l.name, createdAt: l.createdAt || "" })))) roster = next;
    }
  } else {
    const additions = plan.filter((p) => p.isNew);
    const naming = plan.find((p) => p.id === MAIN_LEARNER_ID && p.name);
    if (additions.length > 0 || naming) {
      const others = additions.map((p) => p.name);
      const mainName = naming
        ? naming.name
        : localMain.name || uniqueDefaultName([...localLearners.map((l) => l.name), ...others]);
      roster = [
        ...localLearners.map((l) => ({ id: l.id, name: l.id === MAIN_LEARNER_ID ? mainName : l.name, createdAt: l.createdAt || "" })),
        ...additions.map((p) => ({ id: p.id, name: p.name, createdAt: p.inc.createdAt || "" })),
      ];
    }
  }
  return { plan, roster, skipped };
}

/**
 * Works out what applying `incoming` on top of `local` would do.
 *
 * @param {object} local     snapshot read from this device
 * @param {object} incoming  validated snapshot from a file, link or code
 * @param {object} [options]
 * @param {"merge"|"replace"} [options.mode="merge"]
 *        merge: keep the better record of every word, from both sides.
 *        replace: make this device match the backup (years, lists and
 *        learners the backup does not have are removed).
 * @param {boolean} [options.useIncomingWeeks=false]  merge only: also take
 *        the backup's current week for years that exist on both sides.
 * @param {boolean} [options.copySettings=false]  also copy display settings.
 * @param {string[]} [options.skipYears=[]]  years that must not be touched
 *        (the main learner's saved progress could not be read in the current
 *        format).
 * @param {() => number} [options.random]  for choosing ids of new learners.
 * @returns {{ progress: object, removedYears: string[], learners: object,
 *             settings: object, summary: object }}
 *   `progress` and `removedYears` are for the main learner. `learners` is
 *   { roster, progress: { [id]: years }, removedYears: { [id]: slugs } }.
 */
export function mergeSnapshots(local, incoming, options = {}) {
  const { mode = "merge", useIncomingWeeks = false, copySettings = false, skipYears = [], random = Math.random } = options;
  const skip = new Set(skipYears);

  const localLearners = snapshotLearners(local).map((l, i, all) => ({
    ...l,
    implicit: (local.learners || []).length === 0 && all.length === 1,
  }));
  const incLearners = snapshotLearners(incoming);
  const { plan, roster, skipped } = planLearners(localLearners, incLearners, (local.learners || []).length > 0, mode, random);
  const localById = new Map(localLearners.map((l) => [l.id, l]));

  const summary = {
    mode,
    years: {},
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    weekDiffers: [],
    skippedYears: [],
    settingsChanged: [],
    lists: { added: 0, updated: 0, unchanged: 0, removed: 0, skipped: 0 },
    learners: [],
    learnersSkipped: skipped,
    badgesChanged: false,
  };
  const out = {
    progress: {},
    removedYears: [],
    badges: emptyBadges(),
    learners: { roster, progress: {}, removedYears: {}, badges: {}, removedBadges: [] },
  };

  for (const p of plan) {
    const isMain = p.id === MAIN_LEARNER_ID;
    const loc = localById.get(p.id);
    const merged = mergeYears(loc ? loc.progress : {}, p.inc.progress, { mode, useIncomingWeeks, skip: isMain ? skip : new Set() });
    const mergedBadges = mergeBadges(loc ? loc.badges : emptyBadges(), p.inc.badges);
    if (mergedBadges.changed) summary.badgesChanged = true;
    if (isMain) {
      out.progress = merged.progress;
      out.removedYears = merged.removedYears;
      out.badges = mergedBadges.badges;
      summary.years = merged.years;
      summary.skippedYears.push(...merged.skipped);
      summary.weekDiffers.push(...merged.weekDiffers);
    } else {
      out.learners.progress[p.id] = merged.progress;
      out.learners.removedYears[p.id] = merged.removedYears;
      out.learners.badges[p.id] = mergedBadges.badges;
      summary.weekDiffers.push(...merged.weekDiffers.map((d) => ({ ...d, learnerId: p.id })));
    }
    for (const k of ["added", "updated", "unchanged", "removed"]) summary[k] += merged.total[k];
    summary.learners.push({
      id: p.id,
      name: p.inc.name || (loc && loc.name) || "",
      isNew: p.isNew,
      isMain,
      years: merged.years,
      ...merged.total,
    });
  }

  // Replace: anyone on the device who is not in the backup is removed.
  if (mode === "replace") {
    const kept = new Set(plan.map((p) => p.id));
    for (const l of localLearners) {
      if (kept.has(l.id)) continue;
      const slugs = Object.keys(l.progress);
      const n = countWords(l.progress);
      out.learners.removedYears[l.id] = slugs;
      out.learners.removedBadges.push(l.id);
      const hadBadges = l.badges && (Object.keys(l.badges.earned || {}).length > 0 ||
        l.badges.counters.crossword > 0 || l.badges.counters.wordsearch > 0 || l.badges.counters.gold > 0);
      if (hadBadges) summary.badgesChanged = true;
      summary.removed += n;
      summary.learners.push({ id: l.id, name: l.name, isNew: false, isMain: false, removedLearner: true, years: {}, added: 0, updated: 0, unchanged: 0, removed: n });
    }
  }

  const merged = mergeLists(local.lists || [], incoming.lists || [], mode);
  summary.lists = merged.counts;
  out.lists = merged.lists;
  out.listsChanged = merged.counts.added + merged.counts.updated + merged.counts.removed > 0;

  const settings = {};
  if (copySettings) {
    for (const name of SETTING_NAMES) {
      const value = incoming.settings[name];
      if (value === undefined) continue;
      if (local.settings[name] !== value) summary.settingsChanged.push(name);
      settings[name] = value;
    }
  }
  out.settings = settings;
  out.summary = summary;
  return out;
}

/** True when applying the result would change nothing. */
export function isNoOp(result) {
  const s = result.summary;
  const l = result.learners || { roster: null, progress: {}, removedYears: {}, badges: {}, removedBadges: [] };
  const weekPending = (id, progress) =>
    Object.entries(progress).some(([slug, y]) => {
      const d = s.weekDiffers.find((w) => w.slug === slug && (w.learnerId || MAIN_LEARNER_ID) === id);
      // A different current week is a change only if it is going to be applied.
      return d && d.here !== y.currentWeek;
    });
  return (
    s.added === 0 && s.updated === 0 && s.removed === 0 &&
    !result.listsChanged &&
    result.removedYears.length === 0 &&
    l.roster === null &&
    Object.values(l.removedYears).every((slugs) => slugs.length === 0) &&
    s.settingsChanged.length === 0 &&
    !s.badgesChanged &&
    !weekPending(MAIN_LEARNER_ID, result.progress) &&
    !Object.entries(l.progress).some(([id, progress]) => weekPending(id, progress))
  );
}

// ── Backup and undo ────────────────────────────────────────────────────

export const BACKUP_KEY = "spellstars.syncBackup";
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

/** The storage keys applying a result will write or remove. */
export function keysToChange(result) {
  const l = result.learners || { roster: null, progress: {}, removedYears: {}, badges: {}, removedBadges: [] };
  const learnerKeys = [];
  for (const [id, years] of Object.entries(l.progress)) {
    for (const slug of Object.keys(years)) learnerKeys.push(progressKeyFor(slug, id));
  }
  for (const [id, slugs] of Object.entries(l.removedYears)) {
    for (const slug of slugs) learnerKeys.push(progressKeyFor(slug, id));
  }
  const badgeKeys = [
    badgesKeyFor(MAIN_LEARNER_ID),
    ...Object.keys(l.badges || {}).map((id) => badgesKeyFor(id)),
    ...(l.removedBadges || []).map((id) => badgesKeyFor(id)),
  ];
  return [
    ...Object.keys(result.progress).map((slug) => progressKeyFor(slug, MAIN_LEARNER_ID)),
    ...result.removedYears.map((slug) => progressKeyFor(slug, MAIN_LEARNER_ID)),
    ...learnerKeys,
    ...(l.roster !== null ? [LEARNERS_KEY] : []),
    ...Object.keys(result.settings).map(settingStorageKey),
    ...(result.listsChanged ? [CUSTOM_LISTS_KEY] : []),
    ...badgeKeys,
  ];
}

/** Saves the current value of each key so the change can be undone. */
export function createBackup(storage, keys, now = Date.now()) {
  const entries = {};
  for (const key of keys) entries[key] = storage.getItem(key); // null = was absent
  storage.setItem(BACKUP_KEY, JSON.stringify({ at: now, entries }));
}

const BADGES_KEY_RE = /^spellstars\.(?:l-[a-z0-9]{4,12}\.)?badges$/;

function isKnownKey(key) {
  if (key === CUSTOM_LISTS_KEY || key === LEARNERS_KEY) return true;
  if (PROGRESS_KEY_RE.test(key) || LEARNER_PROGRESS_KEY_RE.test(key) || BADGES_KEY_RE.test(key)) return true;
  return SETTING_NAMES.some((n) => settingStorageKey(n) === key);
}

/** The undo backup, if there is one that is still fresh. */
export function readBackup(storage, now = Date.now()) {
  let parsed;
  try {
    parsed = JSON.parse(storage.getItem(BACKUP_KEY));
  } catch (err) {
    return null;
  }
  if (!parsed || typeof parsed.at !== "number" || !parsed.entries || typeof parsed.entries !== "object") return null;
  if (now - parsed.at > UNDO_WINDOW_MS || now < parsed.at) {
    clearBackup(storage);
    return null;
  }
  return parsed;
}

export function clearBackup(storage) {
  try {
    storage.removeItem(BACKUP_KEY);
  } catch (err) {
    // nothing to do
  }
}

/** Puts every backed-up key back as it was, then forgets the backup. */
export function restoreBackup(storage, backup) {
  for (const [key, value] of Object.entries(backup.entries)) {
    if (!isKnownKey(key)) continue; // never write outside the app's own keys
    if (value === null) storage.removeItem(key);
    else if (typeof value === "string") storage.setItem(key, value);
  }
  clearBackup(storage);
}

/**
 * Applies a merge result to storage, with an undo backup taken first. If any
 * write fails (storage full, for example) everything is put back.
 *
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function applyMergeResult(storage, result, now = Date.now()) {
  const keys = keysToChange(result);
  try {
    createBackup(storage, keys, now);
  } catch (err) {
    return { ok: false, error: "Couldn't save an undo copy, so nothing was changed. The device may be out of storage space." };
  }
  const backup = readBackup(storage, now);
  try {
    for (const [slug, year] of Object.entries(result.progress)) {
      storage.setItem(progressKeyFor(slug, MAIN_LEARNER_ID), JSON.stringify(year));
    }
    for (const slug of result.removedYears) storage.removeItem(progressKeyFor(slug, MAIN_LEARNER_ID));
    const l = result.learners || { roster: null, progress: {}, removedYears: {}, badges: {}, removedBadges: [] };
    for (const [id, years] of Object.entries(l.progress)) {
      for (const [slug, year] of Object.entries(years)) storage.setItem(progressKeyFor(slug, id), JSON.stringify(year));
    }
    for (const [id, slugs] of Object.entries(l.removedYears)) {
      for (const slug of slugs) storage.removeItem(progressKeyFor(slug, id));
    }
    if (l.roster !== null) {
      if (l.roster.length === 0) storage.removeItem(LEARNERS_KEY);
      else storage.setItem(LEARNERS_KEY, JSON.stringify(l.roster));
    }
    if (result.badges) storage.setItem(badgesKeyFor(MAIN_LEARNER_ID), JSON.stringify(result.badges));
    for (const [id, badges] of Object.entries(l.badges || {})) {
      storage.setItem(badgesKeyFor(id), JSON.stringify(badges));
    }
    for (const id of l.removedBadges || []) storage.removeItem(badgesKeyFor(id));
    for (const [name, value] of Object.entries(result.settings)) {
      storage.setItem(settingStorageKey(name), value);
    }
    if (result.listsChanged) storage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(result.lists));
    return { ok: true };
  } catch (err) {
    try {
      if (backup) restoreBackup(storage, backup);
    } catch (err2) {
      // best effort
    }
    return { ok: false, error: "Couldn't save the changes, so nothing was changed. The device may be out of storage space." };
  }
}
