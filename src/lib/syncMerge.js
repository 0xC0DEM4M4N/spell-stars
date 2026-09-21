// Account-free sync, part 2: combining a snapshot with what is already on this
// device, and being able to take it back.
//
// Everything here is synchronous and works on plain objects plus a
// localStorage-like `storage`, so it can be tested without a browser.

import { CUSTOM_LISTS_KEY, MAX_LISTS } from "./customLists";
import {
  PROGRESS_KEY_RE,
  SETTING_NAMES,
  progressStorageKey,
  settingStorageKey,
} from "./syncSnapshot";

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
 * Works out what applying `incoming` on top of `local` would do.
 *
 * @param {object} local     snapshot read from this device
 * @param {object} incoming  validated snapshot from a file, link or code
 * @param {object} [options]
 * @param {"merge"|"replace"} [options.mode="merge"]
 *        merge: keep the better record of every word, from both sides.
 *        replace: make this device match the backup (years the backup does
 *        not have are removed).
 * @param {boolean} [options.useIncomingWeeks=false]  merge only: also take
 *        the backup's current week for years that exist on both sides.
 * @param {boolean} [options.copySettings=false]  also copy display settings.
 * @param {string[]} [options.skipYears=[]]  years that must not be touched
 *        (their saved progress could not be read in the current format).
 * @returns {{ progress: object, removedYears: string[], settings: object,
 *             summary: object }}
 */
export function mergeSnapshots(local, incoming, options = {}) {
  const { mode = "merge", useIncomingWeeks = false, copySettings = false, skipYears = [] } = options;
  const skip = new Set(skipYears);

  const progress = {}; // years to write
  const years = {};    // per-year counts for the preview
  const summary = {
    mode,
    years,
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    weekDiffers: [],
    skippedYears: [],
    settingsChanged: [],
    lists: { added: 0, updated: 0, unchanged: 0, removed: 0, skipped: 0 },
  };

  for (const [slug, inc] of Object.entries(incoming.progress)) {
    if (skip.has(slug)) {
      summary.skippedYears.push(slug);
      continue;
    }
    const loc = local.progress[slug];
    const counts = { added: 0, updated: 0, unchanged: 0, removed: 0 };

    if (mode === "replace" || !loc) {
      const localWords = loc ? loc.words : {};
      for (const [key, state] of Object.entries(inc.words)) {
        if (!localWords[key]) counts.added++;
        else if (sameState(localWords[key], state)) counts.unchanged++;
        else counts.updated++;
      }
      for (const key of Object.keys(localWords)) if (!inc.words[key]) counts.removed++;
      progress[slug] = { v: inc.v, currentWeek: inc.currentWeek, words: { ...inc.words } };
    } else {
      const words = { ...loc.words };
      for (const [key, state] of Object.entries(inc.words)) {
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
      if (inc.currentWeek !== loc.currentWeek) summary.weekDiffers.push({ slug, here: loc.currentWeek, there: inc.currentWeek });
      progress[slug] = {
        v: loc.v,
        currentWeek: useIncomingWeeks ? inc.currentWeek : loc.currentWeek,
        words,
      };
    }

    years[slug] = counts;
    summary.added += counts.added;
    summary.updated += counts.updated;
    summary.unchanged += counts.unchanged;
    summary.removed += counts.removed;
  }

  const removedYears = [];
  if (mode === "replace") {
    for (const [slug, loc] of Object.entries(local.progress)) {
      if (incoming.progress[slug] || skip.has(slug)) continue;
      removedYears.push(slug);
      const n = Object.keys(loc.words).length;
      years[slug] = { added: 0, updated: 0, unchanged: 0, removed: n };
      summary.removed += n;
    }
  }

  const merged = mergeLists(local.lists || [], incoming.lists || [], mode);
  summary.lists = merged.counts;
  const listsChanged = merged.counts.added + merged.counts.updated + merged.counts.removed > 0;

  const settings = {};
  if (copySettings) {
    for (const name of SETTING_NAMES) {
      const value = incoming.settings[name];
      if (value === undefined) continue;
      if (local.settings[name] !== value) summary.settingsChanged.push(name);
      settings[name] = value;
    }
  }

  return { progress, removedYears, settings, lists: merged.lists, listsChanged, summary };
}

/** True when applying the result would change nothing. */
export function isNoOp(result) {
  const s = result.summary;
  return (
    s.added === 0 && s.updated === 0 && s.removed === 0 &&
    !result.listsChanged &&
    result.removedYears.length === 0 &&
    s.settingsChanged.length === 0 &&
    // A different current week is a change only if it is going to be applied.
    Object.entries(result.progress).every(([slug, y]) => {
      const d = s.weekDiffers.find((w) => w.slug === slug);
      return !d || d.here === y.currentWeek;
    })
  );
}

// ── Backup and undo ────────────────────────────────────────────────────

export const BACKUP_KEY = "spellstars.syncBackup";
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

/** The storage keys applying a result will write or remove. */
export function keysToChange(result) {
  return [
    ...Object.keys(result.progress).map(progressStorageKey),
    ...result.removedYears.map(progressStorageKey),
    ...Object.keys(result.settings).map(settingStorageKey),
    ...(result.listsChanged ? [CUSTOM_LISTS_KEY] : []),
  ];
}

/** Saves the current value of each key so the change can be undone. */
export function createBackup(storage, keys, now = Date.now()) {
  const entries = {};
  for (const key of keys) entries[key] = storage.getItem(key); // null = was absent
  storage.setItem(BACKUP_KEY, JSON.stringify({ at: now, entries }));
}

function isKnownKey(key) {
  if (key === CUSTOM_LISTS_KEY || PROGRESS_KEY_RE.test(key)) return true;
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
      storage.setItem(progressStorageKey(slug), JSON.stringify(year));
    }
    for (const slug of result.removedYears) storage.removeItem(progressStorageKey(slug));
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
