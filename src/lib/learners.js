// Named learners: several children can use one browser, each with their own
// progress.
//
// Progress is stored per year (or custom list) exactly as before. What changes
// is the key it is stored under:
//
//   main learner    spellstars.<slug>.progress              (the original key)
//   anyone else     spellstars.<learnerId>.<slug>.progress
//
// The "main" learner is whoever was using the site before learners existed, so
// nobody's saved progress has to move. When nothing is stored the device simply
// has one unnamed main learner and looks exactly as it always did. Adding a
// second child names the first one "Learner 1" (they can rename it).
//
//   spellstars.learners        the roster, as JSON: [{ id, name, createdAt }]
//   spellstars.activeLearner   who is practising on this device right now
//                              (per device: it is not part of a backup)
//
// Names are only ever kept in this browser and in backups the person makes
// themselves. Everything in this file is synchronous and takes a
// localStorage-like `storage`, so it can be tested without a browser.

export const MAIN_LEARNER_ID = "main";
export const LEARNERS_KEY = "spellstars.learners";
export const ACTIVE_LEARNER_KEY = "spellstars.activeLearner";
export const MAX_LEARNERS = 12;
export const MAX_LEARNER_NAME = 24;
export const DEFAULT_MAIN_NAME = "Learner 1";

export const LEARNER_ID_RE = /^l-[a-z0-9]{4,12}$/;
export const isLearnerId = (id) => id === MAIN_LEARNER_ID || (typeof id === "string" && LEARNER_ID_RE.test(id));

// Every progress key, with its ".v1" migration fallback where there is one.
const MAIN_KEY_RE = /^spellstars\.([a-z0-9-]{1,40})\.progress(\.v1)?$/;
const LEARNER_KEY_RE = /^spellstars\.(l-[a-z0-9]{4,12})\.([a-z0-9-]{1,40})\.progress(\.v1)?$/;

/** The key one learner's progress for one year or list is stored under. */
export function progressKeyFor(slug, learnerId) {
  if (!learnerId || learnerId === MAIN_LEARNER_ID) return "spellstars." + slug + ".progress";
  return "spellstars." + learnerId + "." + slug + ".progress";
}

/** Matches a stored (non-fallback) learner progress key: [, learnerId, slug]. */
export const LEARNER_PROGRESS_KEY_RE = /^spellstars\.(l-[a-z0-9]{4,12})\.([a-z0-9-]{1,40})\.progress$/;

// ── Names ──────────────────────────────────────────────────────────────

/** Tidies a typed name: no control characters, single spaces, trimmed, capped. */
export function cleanName(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEARNER_NAME)
    .trim();
}

/** What two names are compared by, so "ava" and " Ava " are the same. */
export const nameKey = (name) => cleanName(name).toLocaleLowerCase("en-GB");

/** What to show for a learner who has no name yet. */
export const displayName = (learner) => (learner && learner.name) || "Learner";

// ── Ids ────────────────────────────────────────────────────────────────

export function makeLearnerId(existingIds = [], random = Math.random) {
  const taken = new Set(existingIds);
  for (let i = 0; i < 100; i++) {
    let id = "l-";
    for (let j = 0; j < 6; j++) id += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(random() * 36)];
    if (!taken.has(id)) return id;
  }
  throw new Error("could not make a learner id");
}

// ── The roster ─────────────────────────────────────────────────────────

/**
 * The saved roster, checked. Returns [] when there is none (one unnamed main
 * learner). Otherwise the main learner is always present and first, ids and
 * names are unique, and the list is capped, so a damaged value can't break the
 * app.
 */
export function loadLearners(storage = window.localStorage) {
  let parsed;
  try {
    parsed = JSON.parse(storage.getItem(LEARNERS_KEY));
  } catch (err) {
    return [];
  }
  return sanitiseRoster(parsed);
}

/** Cleans an untrusted array of learners into a valid roster. */
export function sanitiseRoster(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return [];
  const seenIds = new Set();
  const seenNames = new Set();
  const out = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    if (!isLearnerId(item.id) || seenIds.has(item.id)) continue;
    const name = cleanName(item.name);
    if (!name || seenNames.has(nameKey(name))) continue;
    seenIds.add(item.id);
    seenNames.add(nameKey(name));
    out.push({
      id: item.id,
      name,
      createdAt: typeof item.createdAt === "string" ? item.createdAt.slice(0, 40) : "",
    });
    if (out.length >= MAX_LEARNERS) break;
  }
  if (out.length === 0) return [];
  if (!seenIds.has(MAIN_LEARNER_ID)) {
    out.unshift({ id: MAIN_LEARNER_ID, name: uniqueDefaultName(out.map((l) => l.name)), createdAt: "" });
    if (out.length > MAX_LEARNERS) out.pop();
  } else {
    out.sort((a, b) => (a.id === MAIN_LEARNER_ID ? -1 : b.id === MAIN_LEARNER_ID ? 1 : 0));
  }
  return out;
}

/** "Learner 1", or the first "Learner N" no one in `names` is using. */
export function uniqueDefaultName(names) {
  const used = new Set(names.map(nameKey));
  let name = DEFAULT_MAIN_NAME;
  for (let n = 2; used.has(nameKey(name)); n++) name = "Learner " + n;
  return name;
}

/** The learners to show: the roster, or the one unnamed main learner. */
export function getLearners(storage = window.localStorage) {
  const roster = loadLearners(storage);
  return roster.length > 0 ? roster : [{ id: MAIN_LEARNER_ID, name: "", createdAt: "", implicit: true }];
}

export function saveLearners(storage, roster) {
  try {
    if (roster.length === 0) storage.removeItem(LEARNERS_KEY);
    else storage.setItem(LEARNERS_KEY, JSON.stringify(roster));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Couldn't save. The device may be out of storage space." };
  }
}

function checkName(roster, raw, exceptId) {
  const name = cleanName(raw);
  if (!name) return { ok: false, error: "Please type a name." };
  const clash = roster.find((l) => l.id !== exceptId && nameKey(l.name) === nameKey(name));
  if (clash) return { ok: false, error: "There is already a learner called " + clash.name + "." };
  return { ok: true, name };
}

/** Adds a learner. The first time, the existing (main) learner is named too. */
export function addLearner(storage, rawName, { now = new Date(), random = Math.random } = {}) {
  let roster = loadLearners(storage);
  if (roster.length >= MAX_LEARNERS) {
    return { ok: false, error: "You can add up to " + MAX_LEARNERS + " learners. Remove one to make room." };
  }
  if (roster.length === 0) roster = [{ id: MAIN_LEARNER_ID, name: DEFAULT_MAIN_NAME, createdAt: "" }];
  const checked = checkName(roster, rawName);
  if (!checked.ok) return checked;
  const learner = {
    id: makeLearnerId(roster.map((l) => l.id), random),
    name: checked.name,
    createdAt: now.toISOString(),
  };
  const next = [...roster, learner];
  const saved = saveLearners(storage, next);
  if (!saved.ok) return saved;
  return { ok: true, learner, learners: next };
}

/** Renames a learner. Naming the only (unnamed) learner starts the roster. */
export function renameLearner(storage, id, rawName) {
  let roster = loadLearners(storage);
  if (roster.length === 0) {
    if (id !== MAIN_LEARNER_ID) return { ok: false, error: "That learner no longer exists." };
    roster = [{ id: MAIN_LEARNER_ID, name: "", createdAt: "" }];
  }
  const index = roster.findIndex((l) => l.id === id);
  if (index === -1) return { ok: false, error: "That learner no longer exists." };
  const checked = checkName(roster, rawName, id);
  if (!checked.ok) return checked;
  const next = roster.map((l, i) => (i === index ? { ...l, name: checked.name } : l));
  const saved = saveLearners(storage, next);
  if (!saved.ok) return saved;
  return { ok: true, learners: next };
}

// ── Stored progress ────────────────────────────────────────────────────

function allKeys(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

/** Every stored progress key that belongs to one learner (fallbacks included). */
export function learnerProgressKeys(storage, learnerId) {
  return allKeys(storage).filter((key) => {
    if (learnerId === MAIN_LEARNER_ID) return MAIN_KEY_RE.test(key);
    const m = LEARNER_KEY_RE.exec(key);
    return !!m && m[1] === learnerId;
  });
}

/** Removes one learner's saved progress, leaving the learner in place. */
export function clearLearnerProgress(storage, learnerId) {
  try {
    for (const key of learnerProgressKeys(storage, learnerId)) storage.removeItem(key);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Couldn't clear the progress." };
  }
}

/** Removes the saved progress for one year or list, for every learner. */
export function removeProgressForSlug(storage, slug) {
  try {
    for (const key of allKeys(storage)) {
      const main = MAIN_KEY_RE.exec(key);
      if (main && main[1] === slug) storage.removeItem(key);
      const other = LEARNER_KEY_RE.exec(key);
      if (other && other[2] === slug) storage.removeItem(key);
    }
  } catch (err) {
    // nothing to do
  }
}

/** Removes a learner and their progress. The main learner can't be removed. */
export function removeLearner(storage, id) {
  if (id === MAIN_LEARNER_ID) return { ok: false, error: "The first learner can't be removed, but you can clear their progress." };
  const roster = loadLearners(storage);
  if (!roster.some((l) => l.id === id)) return { ok: false, error: "That learner no longer exists." };
  const next = roster.filter((l) => l.id !== id);
  const saved = saveLearners(storage, next);
  if (!saved.ok) return saved;
  clearLearnerProgress(storage, id);
  try {
    if (storage.getItem(ACTIVE_LEARNER_KEY) === id) storage.removeItem(ACTIVE_LEARNER_KEY);
  } catch (err) {
    // nothing to do
  }
  return { ok: true, learners: next };
}

// ── Who is practising ──────────────────────────────────────────────────

/** The learner practising on this device; falls back to the main learner. */
export function getActiveLearnerId(storage = window.localStorage) {
  try {
    const id = storage.getItem(ACTIVE_LEARNER_KEY);
    if (id && getLearners(storage).some((l) => l.id === id)) return id;
  } catch (err) {
    // fall through
  }
  return MAIN_LEARNER_ID;
}

export function setActiveLearnerId(storage, id) {
  try {
    storage.setItem(ACTIVE_LEARNER_KEY, id);
  } catch (err) {
    // The choice still applies for this visit, it just isn't remembered.
  }
}
