// Account-free sync, part 3: the async glue the sync page uses.
//
// Saved progress is only shareable once it is in the word-key format (see
// srs.migrateProgress). Normally that happens when a child opens that year,
// but someone can open /sync first, so this finds any year still in the old
// format and migrates it by loading that year's word list.

import { getYearsConfig, findYearBySlug, getYearWords } from "./yearData";
import { migrateProgress } from "./srs";
import { readLocalSnapshot, isEmptySnapshot } from "./syncSnapshot";
import { mergeSnapshots, applyMergeResult, readBackup, restoreBackup, clearBackup } from "./syncMerge";

const store = () => window.localStorage;

/**
 * Converts any year whose saved progress is still in the old format.
 * @returns {Promise<{ migrated: string[], failed: string[] }>} `failed` lists
 *   years that could not be converted (word list would not load, or the year
 *   is not one this version of the site knows).
 */
export async function ensureProgressMigrated() {
  const { unmigrated } = readLocalSnapshot(store());
  const migrated = [];
  const failed = [];
  if (unmigrated.length === 0) return { migrated, failed };

  let config;
  try {
    config = await getYearsConfig();
  } catch (err) {
    return { migrated, failed: [...unmigrated] };
  }

  for (const slug of unmigrated) {
    const year = findYearBySlug(config, slug);
    if (!year) {
      failed.push(slug);
      continue;
    }
    try {
      const words = await getYearWords(slug, year.wordListPath);
      migrateProgress(slug, words);
    } catch (err) {
      failed.push(slug);
      continue;
    }
    migrated.push(slug);
  }

  // migrateProgress leaves a year alone if the data looks wrong, so check.
  const still = new Set(readLocalSnapshot(store()).unmigrated);
  return {
    migrated: migrated.filter((s) => !still.has(s)),
    failed: [...failed, ...migrated.filter((s) => still.has(s))],
  };
}

/**
 * Everything needed to offer a backup, file, link or code.
 * @returns {Promise<{ snapshot: object, empty: boolean, failed: string[] }>}
 *   `failed` years are not in the snapshot; the page should say so rather
 *   than quietly leave them out.
 */
export async function prepareExport() {
  const { failed } = await ensureProgressMigrated();
  const { snapshot } = readLocalSnapshot(store());
  return { snapshot, empty: isEmptySnapshot(snapshot), failed };
}

/**
 * Works out what importing a snapshot would do, without changing anything.
 * @returns {Promise<{ result: object, failed: string[] }>}
 */
export async function previewImport(incoming, options) {
  const { failed } = await ensureProgressMigrated();
  const { snapshot: local } = readLocalSnapshot(store());
  const result = mergeSnapshots(local, incoming, { ...options, skipYears: failed });
  return { result, failed };
}

/** Applies a previewed result. Backs up first, so it can be undone. */
export function applyImport(result) {
  return applyMergeResult(store(), result);
}

/** The undo backup, if one is still fresh. */
export function currentUndo() {
  return readBackup(store());
}

export function undoImport() {
  const backup = readBackup(store());
  if (!backup) return false;
  restoreBackup(store(), backup);
  return true;
}

export function dismissUndo() {
  clearBackup(store());
}

/**
 * Asks the browser not to clear this site's storage when space is short.
 * Called only when someone takes a sync action; some browsers show a prompt
 * for it, which shouldn't happen out of the blue.
 */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch (err) {
    // not available
  }
  return false;
}
