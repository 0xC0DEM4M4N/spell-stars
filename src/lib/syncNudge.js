// A gentle, rare reminder to save a backup once there is something worth
// keeping. Progress lives only in this browser, and browsers can lose it, so
// a child who has practised for weeks is the person who most needs a copy.

import { readLocalSnapshot } from "./syncSnapshot";

export const NUDGE_KEY = "spellstars.syncNudge";
export const NUDGE_MIN_WORDS = 40;
export const NUDGE_QUIET_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Number of words with any saved practice, across all saved years. */
export function practisedWordCount(storage) {
  const { snapshot } = readLocalSnapshot(storage);
  return Object.values(snapshot.progress).reduce((n, y) => n + Object.keys(y.words).length, 0);
}

/**
 * True when the reminder should show: enough practice, and no backup made or
 * reminder dismissed within the last NUDGE_QUIET_DAYS days. Never throws.
 */
export function shouldShowNudge(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(NUDGE_KEY);
    if (raw) {
      const at = Number(JSON.parse(raw).at);
      if (Number.isFinite(at) && now >= at && now - at < NUDGE_QUIET_DAYS * DAY_MS) return false;
    }
    return practisedWordCount(storage) >= NUDGE_MIN_WORDS;
  } catch (err) {
    return false;
  }
}

/** Records "backed up" or "not now", so the reminder stays quiet for a while. */
export function quietNudge(storage, now = Date.now()) {
  try {
    storage.setItem(NUDGE_KEY, JSON.stringify({ at: now }));
  } catch (err) {
    // If this can't be saved the reminder may come back; not worth an error.
  }
}
