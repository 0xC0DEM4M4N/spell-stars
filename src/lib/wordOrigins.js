// Pulls the word-origin (etymology) entries out of the year word lists, for
// the hidden /word-origins review page. An origin entry is a definition
// written as "From Latin 'root', literal meaning — what it means today".

const DASH = " — ";

/**
 * Splits one definition into its origin parts, or returns null if it isn't
 * written as an origin.
 *   { language, origin, meaning }
 */
export function parseOrigin(definition) {
  const text = String(definition || "").trim();
  if (/^imitating the sound/i.test(text)) {
    const [head, ...rest] = text.split(DASH);
    return { language: "Imitative", origin: head, meaning: rest.join(DASH) };
  }
  const match = text.match(/^From (?:the )?((?:Old |Middle |Late )?[A-Z][a-z]+)\b/);
  if (!match) return null;
  const [head, ...rest] = text.split(DASH);
  return {
    language: match[1],
    origin: head.replace(/^From (?:the )?/, ""),
    meaning: rest.join(DASH),
  };
}

/**
 * One row per distinct word, with the years it appears in.
 * @param {Record<string, object[]>} entriesByYear  year slug -> words.json entries
 */
export function collectOrigins(entriesByYear) {
  const rows = new Map();
  for (const [year, entries] of Object.entries(entriesByYear)) {
    for (const e of entries) {
      if (e.contentType === "letter" || !e.word) continue;
      const parsed = parseOrigin(e.definition);
      if (!parsed) continue;
      const key = e.word.toLowerCase();
      const row = rows.get(key);
      if (row) {
        if (!row.years.includes(year)) row.years.push(year);
      } else {
        rows.set(key, { word: e.word, years: [year], ...parsed });
      }
    }
  }
  return [...rows.values()].sort((a, b) => a.word.localeCompare(b.word));
}
