// Stable identity for a word, independent of where it sits in the year.
//
// Word entries in each year's words.json carry a position-based `id`
// (e.g. "year3-w01-01": year, week, slot). That id is fine as a React key
// and for anything that means "this exact slot", but it is a poor key for
// saved progress:
//
//   - Revision cycling (see public/data/README.md) repeats the same word in
//     several slots, each with a different id, so one word ends up with
//     several unrelated progress records.
//   - Adding words to a pool or reordering a week shifts every later slot,
//     so a child's saved progress would attach to the wrong words.
//
// Progress is therefore keyed by `wordKey`: "<yearSlug>:<normalised word>",
// e.g. "year3:badge". `wordKey` is attached to entries when a year's
// words.json is loaded (see yearData.js), not stored in the data files.
//
// Letter entries (Reception's letter-of-the-day weeks) have no `word`, so
// they have no wordKey and keep using their id.

/** Lower-cases, trims, collapses whitespace and straightens curly
 * apostrophes so "Can’t" and "can't" are the same word. */
export function normaliseWord(text) {
  return String(text == null ? "" : text)
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, " ");
}

/** "year3" + { word: "Badge" } -> "year3:badge". Returns null for entries
 * that are not spelling words (letters) or have no word text. */
export function makeWordKey(yearSlug, entry) {
  if (!entry || entry.contentType === "letter" || !entry.word) return null;
  const normalised = normaliseWord(entry.word);
  return normalised ? yearSlug + ":" + normalised : null;
}

/** The key progress is stored under for an entry: its wordKey when it has
 * one, otherwise its slot id (letters, or entries loaded without
 * decoration). */
export function progressKey(entry) {
  return (entry && (entry.wordKey || entry.id)) || null;
}

/** Copies each entry with a `wordKey` added. Entries that cannot have one
 * are returned as they are. */
export function withWordKeys(yearSlug, entries) {
  return entries.map((entry) => {
    const wordKey = makeWordKey(yearSlug, entry);
    return wordKey ? { ...entry, wordKey } : entry;
  });
}

/** Keeps the first entry for each progress key. Used for the "by term" and
 * "by all" pools, where revision cycling would otherwise list the same
 * word several times. */
export function dedupeByProgressKey(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = progressKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
