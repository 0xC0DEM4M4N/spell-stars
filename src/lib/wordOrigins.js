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
  const [head, ...rest] = text.split(DASH);
  if (!match) {
    // "From an old trading word meaning ... — what it means": an origin with no named language.
    if (/^From /.test(text) && rest.length) {
      return { language: "Not named", origin: head.replace(/^From /, ""), meaning: rest.join(DASH) };
    }
    return null;
  }
  return {
    language: match[1],
    origin: head.replace(/^From (?:the )?/, ""),
    meaning: rest.join(DASH),
  };
}

/**
 * One row per distinct word, with the years it appears in. Words whose
 * definition doesn't give an origin are included with the origin fields
 * left empty, so every word is listed in one place.
 * @param {Record<string, object[]>} entriesByYear  year slug -> words.json entries
 */
export function collectOrigins(entriesByYear) {
  const rows = new Map();
  for (const [year, entries] of Object.entries(entriesByYear)) {
    for (const e of entries) {
      if (e.contentType === "letter" || !e.word) continue;
      const parsed = parseOrigin(e.definition);
      const key = e.word.toLowerCase();
      const row = rows.get(key);
      if (row) {
        if (!row.years.includes(year)) row.years.push(year);
        // A word can be written up in one year and not another: keep the origin.
        if (parsed && !row.language) Object.assign(row, parsed);
        if (!row.sentence && e.exampleSentence) row.sentence = e.exampleSentence;
        // Plain (non-origin) definitions still give the meaning.
        if (!row.meaning && !parsed && e.definition) row.meaning = String(e.definition).trim();
        if (parsed && parsed.meaning) row.meaning = parsed.meaning;
      } else {
        rows.set(key, {
          word: e.word,
          years: [year],
          language: "",
          origin: "",
          meaning: "",
          sentence: e.exampleSentence || "",
          ...(parsed || {}),
        });
        // Years 1-4 definitions are plain meanings rather than origins.
        if (!parsed && e.definition) rows.get(key).meaning = String(e.definition).trim();
      }
    }
  }
  return [...rows.values()].sort((a, b) => a.word.localeCompare(b.word));
}
