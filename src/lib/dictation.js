// Dictation: a few sentences, read aloud, for a child to write down.
//
// Every sentence is built from the lesson's own words, so a lesson's
// dictation always practises the words in that lesson. Sentences come from
// each word's own example sentence (every built-in word has one; lessons
// made from the child's own words may). Where a word has none, a plain
// "The word is ..." sentence is used instead, in the chosen language.
//
// How long the sentences get follows the year group: one short sentence per
// word for Reception and Year 1, a full sentence for Year 2, then two or three
// words joined into one longer sentence for Years 3 to 6.
//
// Optionally a signed-in grown-up can ask for the sentences to be written by
// an AI instead (see requestAiDictation); this file's builder is always the
// fallback, so dictation works with no account and no network.

export const SPEEDS = [
  { id: "slow", label: "Slow", rate: 0.6 },
  { id: "steady", label: "Steady", rate: 0.8 },
  { id: "normal", label: "Normal", rate: 1 },
];
export const DEFAULT_SPEED = "steady";

// Sets of AI-written sentences kept per lesson, and how many new sets one
// signed-in person can ask for in a day (see functions/api/dictation.js).
export const MAX_AI_SETS = 8;
export const DAILY_AI_LIMIT = 20;

// Spoken language. `lang` goes to the speech engine, `frame` is the plain
// sentence used for a word that has no example sentence.
export const LANGUAGES = [
  { id: "en-GB", label: "English (UK)", frame: "The word is {w}." },
  { id: "en-US", label: "English (US)", frame: "The word is {w}." },
  { id: "cy-GB", label: "Cymraeg (Welsh)", frame: "Y gair yw {w}." },
  { id: "fr-FR", label: "Français (French)", frame: "Le mot est {w}." },
  { id: "es-ES", label: "Español (Spanish)", frame: "La palabra es {w}." },
  { id: "de-DE", label: "Deutsch (German)", frame: "Das Wort ist {w}." },
  { id: "it-IT", label: "Italiano (Italian)", frame: "La parola è {w}." },
];
export const DEFAULT_LANGUAGE = "en-GB";

export const findLanguage = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES[0];

// lines: how many sentences; per: lesson words in each sentence; shortest:
// prefer the shortest example sentences (for the youngest children).
const LEVELS = {
  reception: { lines: 3, per: 1, shortest: true },
  year1: { lines: 4, per: 1, shortest: false },
  year2: { lines: 4, per: 1, shortest: false },
  year3: { lines: 4, per: 2, shortest: false },
  year4: { lines: 4, per: 2, shortest: false },
  year5: { lines: 4, per: 3, shortest: false },
  year6: { lines: 4, per: 3, shortest: false },
};
const DEFAULT_LEVEL = LEVELS.year3;

export const levelFor = (yearSlug) => LEVELS[yearSlug] || DEFAULT_LEVEL;

// Words that are safe to lower-case when one sentence is joined on to
// another ("The dog ran" -> "and the dog ran"). Anything else (a name, "I")
// is left alone and the two sentences simply stay separate.
const SAFE_LOWER = new Set(["the", "a", "an", "it", "he", "she", "we", "they", "my", "our", "his", "her", "this", "that", "some", "many", "every", "each", "there"]);
const JOINERS = [", and "]; // the only joiner that never claims a reason or a contrast

const stripEnd = (s) => s.replace(/[.!?…]+["”']?\s*$/, "");
const hasEnd = (s) => /[.!?…]["”']?\s*$/.test(s);
const words = (s) => s.trim().split(/\s+/).filter(Boolean);

function shuffle(list, rng) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sentenceFor(entry, language) {
  const given = entry.exampleSentence && entry.exampleSentence.trim();
  // Only use the example sentence if it has the word itself in it, not
  // "pointed" for "point": the child must be writing the lesson's word.
  if (given && sentenceHasWord(given, entry.word)) return hasEnd(given) ? given : given + ".";
  return findLanguage(language).frame.replace("{w}", entry.word);
}

function joinSentences(parts, rng) {
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const next = parts[i];
    const first = next.split(/\s+/)[0].toLowerCase();
    if (SAFE_LOWER.has(first) && !/[,;:]/.test(first)) {
      const joiner = JOINERS[Math.floor(rng() * JOINERS.length)];
      out = stripEnd(out) + joiner + next.charAt(0).toLowerCase() + next.slice(1);
    } else {
      out = out + " " + next;
    }
  }
  return out;
}

/**
 * Builds a dictation from a lesson's words.
 *
 * @param {{word: string, exampleSentence?: string, contentType?: string}[]} entries
 * @param {{yearSlug?: string, language?: string, rng?: () => number}} options
 * @returns {{ lines: {id: string, text: string, words: string[]}[] }}
 *   `lines` is empty when the lesson has no spelling words.
 */
export function buildDictation(entries, { yearSlug, language = DEFAULT_LANGUAGE, rng = Math.random } = {}) {
  const spellable = (entries || []).filter((e) => e && e.word && e.contentType !== "letter");
  const seen = new Set();
  const pool = spellable.filter((e) => {
    const k = e.word.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (pool.length === 0) return { lines: [] };

  const level = levelFor(yearSlug);
  let candidates = shuffle(pool, rng);
  if (level.shortest) {
    // The youngest children get the shortest sentences, still in a random order.
    const byLength = candidates.map((e) => ({ e, n: words(sentenceFor(e, language)).length }));
    byLength.sort((a, b) => a.n - b.n);
    candidates = shuffle(
      byLength.slice(0, Math.max(level.lines, Math.ceil(byLength.length * 0.7))).map((x) => x.e),
      rng,
    );
  }

  const lineCount = Math.min(level.lines, Math.ceil(candidates.length / level.per));
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const group = candidates.slice(i * level.per, i * level.per + level.per);
    if (group.length === 0) break;
    lines.push({
      id: "line-" + i,
      text: joinSentences(group.map((e) => sentenceFor(e, language)), rng),
      words: group.map((e) => e.word),
    });
  }
  return { lines };
}

/** True if `text` contains `word` as a whole word, ignoring case. */
export function sentenceHasWord(text, word) {
  const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}'])" + escaped + "($|[^\\p{L}'])", "iu").test(text);
}

// ── Remembered on this device ──────────────────────────────────────────

const PREFS_KEY = "spellstars.dictation";

export function loadDictationPrefs() {
  const fallback = { speed: DEFAULT_SPEED, language: DEFAULT_LANGUAGE };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      speed: SPEEDS.some((x) => x.id === parsed.speed) ? parsed.speed : fallback.speed,
      language: LANGUAGES.some((x) => x.id === parsed.language) ? parsed.language : fallback.language,
    };
  } catch (err) {
    return fallback;
  }
}

export function saveDictationPrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ speed: prefs.speed, language: prefs.language }));
  } catch (err) {
    // The choice just won't be remembered.
  }
}

// ── Optional: sentences written by an AI ──────────────────────────────
//
// "Write with AI" works through sets. A set is one dictation's worth of
// sentences. For each lesson the device remembers the sets it has seen, in
// order, and which one comes next. Pressing the button shows the next set the
// device already has; if it has shown them all, it asks /api/dictation for
// the next one. For a built-in week the server keeps every set it has ever
// written, so that is usually just a saved set written for someone else and
// the AI is only used once everyone's seen them all (see
// functions/api/dictation.js). Once a lesson has MAX_AI_SETS sets, the
// button goes round them again.

const CACHE_KEY = "spellstars.dictationSets";
const CACHE_LIMIT = 40; // lessons remembered; the oldest are dropped

/** A short, stable fingerprint of a list of words (case and order ignored). */
export function wordsHash(entries) {
  const text = [...new Set((entries || []).filter((e) => e && e.word).map((e) => e.word.toLowerCase()))].sort().join("|");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function readCache(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(CACHE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function writeCache(storage, cache) {
  const keys = Object.keys(cache);
  if (keys.length > CACHE_LIMIT) {
    keys
      .sort((a, b) => (cache[a].at || 0) - (cache[b].at || 0))
      .slice(0, keys.length - CACHE_LIMIT)
      .forEach((k) => delete cache[k]);
  }
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    // Storage full: the sets just won't be remembered.
  }
}

/** The key a lesson's sets are remembered under on this device. */
export function aiCacheKey({ shared, entries, yearSlug, language }) {
  return shared
    ? `${shared.yearSlug}|w${shared.week}|${language}`
    : `own|${yearSlug || "-"}|${language}|${wordsHash(entries)}`;
}

// Keeps only sentences that really use one of this lesson's words.
function cleanLines(lines, entries) {
  const lessonWords = [...new Set((entries || []).filter((e) => e && e.word).map((e) => e.word))];
  const out = [];
  for (const item of Array.isArray(lines) ? lines.slice(0, 8) : []) {
    const text = item && typeof item.text === "string" ? item.text.trim() : "";
    if (!text || text.length > 400) continue;
    const used = lessonWords.filter((w) => sentenceHasWord(text, w));
    if (used.length === 0) continue;
    out.push({ id: "line-" + out.length, text, words: used });
  }
  return out;
}

/**
 * Asks the server for set number `n`. Returns `{ lines }`, or `{ error }`
 * where error is "signin" (a new set needs a signed-in person), "limit" (they
 * have used today's allowance) or "failed".
 */
export async function fetchAiSet({ token, n, shared, entries, yearSlug, yearLabel, coveredWeek, language, avoid = [], fetcher }) {
  const doFetch = fetcher || (typeof fetch === "function" ? fetch : null);
  if (!doFetch) return { error: "failed" };
  try {
    const res = await doFetch("/api/dictation", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: JSON.stringify({
        n,
        language,
        yearSlug,
        yearLabel,
        avoid,
        ...(Number.isInteger(coveredWeek) ? { coveredWeek } : {}),
        ...(shared
          ? { shared: { yearSlug: shared.yearSlug, week: shared.week } }
          : { words: [...new Set((entries || []).filter((e) => e && e.word).map((e) => e.word))] }),
      }),
    });
    if (res.status === 401) return { error: "signin" };
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "failed" };
    const data = await res.json();
    const lines = cleanLines(data && data.lines, entries);
    return lines.length > 0 ? { lines } : { error: "failed" };
  } catch (err) {
    return { error: "failed" };
  }
}

/**
 * The next set of AI sentences for a lesson: one the device already has if
 * there is one it hasn't shown yet, otherwise a saved or newly written one
 * from the server. Returns `{ lines, fromDevice }` or `{ error }`.
 */
export async function getNextAiSet(
  { shared, entries, yearSlug, yearLabel, coveredWeek, language, token },
  { storage = window.localStorage, fetcher } = {},
) {
  const key = aiCacheKey({ shared, entries, yearSlug, language });
  const cache = readCache(storage);
  const mine = cache[key] && Array.isArray(cache[key].sets) ? cache[key] : { sets: [], pos: 0 };

  // Everything the device has is shown first, and a full lesson goes round again.
  if (mine.sets.length > 0 && (mine.pos < mine.sets.length || mine.sets.length >= MAX_AI_SETS)) {
    const at = mine.pos % mine.sets.length;
    cache[key] = { sets: mine.sets, pos: at + 1, at: Date.now() };
    writeCache(storage, cache);
    return { lines: mine.sets[at], fromDevice: true };
  }

  const avoid = shared ? [] : mine.sets.flat().map((l) => l.text).slice(-12);
  const result = await fetchAiSet({
    token,
    n: mine.sets.length,
    shared,
    entries,
    yearSlug,
    yearLabel,
    coveredWeek,
    language,
    avoid,
    fetcher,
  });
  if (result.error) return { error: result.error };
  const sets = [...mine.sets, result.lines];
  cache[key] = { sets, pos: sets.length, at: Date.now() };
  writeCache(storage, cache);
  return { lines: result.lines, fromDevice: false };
}
