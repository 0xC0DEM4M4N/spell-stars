// Remembers which lessons and series were deleted, so that signing in on
// another device does not bring them back. A deleted id is kept for 90 days.
// Ids are random, so an id that is listed here is never reused.
export const DELETED_KEY = "spellstars.deleted";
export const DELETED_KEEP_MS = 90 * 24 * 60 * 60 * 1000;
export const CHANGED_EVENT = "spellstars:lessons-changed";

export function loadDeleted(storage) {
  try {
    const raw = JSON.parse(storage.getItem(DELETED_KEY));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out = {};
    for (const [id, at] of Object.entries(raw)) {
      if (typeof at === "number" && Number.isFinite(at)) out[id] = at;
    }
    return out;
  } catch (err) {
    return {};
  }
}

export function pruneDeleted(map, now = Date.now()) {
  const out = {};
  for (const [id, at] of Object.entries(map)) {
    if (now - at < DELETED_KEEP_MS) out[id] = at;
  }
  return out;
}

/** The later time wins when both sides know the id. */
export function unionDeleted(a, b) {
  const out = { ...a };
  for (const [id, at] of Object.entries(b || {})) out[id] = Math.max(out[id] || 0, at);
  return out;
}

export function saveDeleted(storage, map) {
  try {
    storage.setItem(DELETED_KEY, JSON.stringify(map));
  } catch (err) {
    /* a full device just means a deleted lesson may come back once */
  }
}

export function recordDeletion(storage, id, now = Date.now()) {
  saveDeleted(storage, pruneDeleted({ ...loadDeleted(storage), [id]: now }, now));
}

/** Tells the account sync (if one is running) that lessons or series changed. */
export function notifyLessonsChanged() {
  try {
    if (typeof window !== "undefined" && window.dispatchEvent) window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch (err) {
    /* ignore */
  }
}
