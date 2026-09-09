// Scope pool logic — the content-selection half of ScopeSelector.
// See spell-stars-wordlist-spec.md §3.
//
// This is deliberately separate from srs.js: this file decides WHICH
// words are in play (a content-scope concept), srs.js decides which OF
// THOSE to actually show in a session (a scheduling concept). "By day"
// uses only this file; "By term"/"By all" feed this file's output into
// srs.selectSessionWords.

export const SCOPES = [
  { value: "day", label: "By day" },
  { value: "term", label: "By term" },
  { value: "all", label: "By all up to now" },
];

export const SESSION_COUNT_OPTIONS = [10, 15, 20];

/** Resolves which term a given weekOfYear falls in, from
 * years.config.json's top-level termStructure block. Falls back to
 * "autumn" if the week is out of range rather than throwing, since a
 * manually-set current week is exactly the kind of value that can be
 * off (typo, new year not configured yet, etc). */
export function termForWeek(weekOfYear, termStructure) {
  if (termStructure) {
    for (const [term, config] of Object.entries(termStructure)) {
      const [start, end] = config.teachingWeeks;
      if (weekOfYear >= start && weekOfYear <= end) return term;
    }
  }
  return "autumn";
}

/**
 * Filters a year's full word list down to the pool for the given scope.
 *
 * - "day": exactly this week's words (fixed size = that year's
 *   wordsPerWeek) — the same list every day of the week.
 * - "term": every word in the given term (an explicit `term` override,
 *   e.g. from a term picker/carousel — defaults to whichever term
 *   `currentWeek` falls in). The *current* term is still capped to "up
 *   to and including the current week" so nothing not yet taught shows
 *   up; a term the student isn't currently in returns its full word
 *   list, since there's no "current week" within it to cap against.
 * - "all": every word up to and including the current week, any term.
 */
export function resolveScopePool(words, { scope, currentWeek, termStructure, term }) {
  if (scope === "day") {
    return words.filter((w) => w.weekOfYear === currentWeek);
  }
  if (scope === "term") {
    const activeTerm = term || termForWeek(currentWeek, termStructure);
    const isCurrentTerm = activeTerm === termForWeek(currentWeek, termStructure);
    return words.filter((w) => w.term === activeTerm && (!isCurrentTerm || w.weekOfYear <= currentWeek));
  }
  // "all"
  return words.filter((w) => w.weekOfYear <= currentWeek);
}


/**
 * Groups a year's full word/letter list into per-week "cards" for the
 * carousel browser, 1..totalWeeks. Each week is tagged with a `kind`:
 * "letters" for Reception's first 7 weeks (contentType: "letter" — one
 * grapheme per school day, matching Reception's wordsPerWeek: 5) or
 * "words" for everything else. The carousel renders a different card
 * component per kind.
 */
export function buildWeeksForYear(entries, totalWeeks) {
  const byWeek = new Map();
  for (const e of entries) {
    if (!byWeek.has(e.weekOfYear)) byWeek.set(e.weekOfYear, []);
    byWeek.get(e.weekOfYear).push(e);
  }
  const weeks = [];
  for (let week = 1; week <= (totalWeeks || 38); week++) {
    const items = byWeek.get(week);
    if (!items || !items.length) continue;
    const first = items[0];
    const kind = first.contentType === "letter" ? "letters" : "words";
    weeks.push({
      week,
      kind,
      term: first.term,
      weekOfTerm: first.weekOfTerm,
      focus: first.focus,
      // "words" keeps the old field name for word weeks (WeekCard reads
      // weekData.words); "letters" is the day-by-day grapheme list for
      // LetterWeekCard.
      words: kind === "words" ? items : undefined,
      letters: kind === "letters" ? items : undefined,
    });
  }
  return weeks;
}
