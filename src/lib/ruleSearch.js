// Find words by spelling rule.
//
// Two ways in, both over the built-in year lists:
//
//   1. A pattern in the word itself: "/ee/" (anywhere), "-le" or "-le ending"
//      (ends with), "kn-" or "kn at the start" (starts with). A plain run of
//      letters such as "ee" is treated as "anywhere" as well.
//   2. A learning point: the focus each week is built around ("-le ending",
//      "kn/gn at the start of words", "suffix -ous"). Typing words that are
//      not a pattern ("suffix", "double") searches these.
//
// A "rule" is the thing a person ends up with, either a pattern or one
// learning point from one year. Several rules can be mixed into one set of
// words (see mixRules), which the page saves as an ordinary custom list.
//
// Everything here is pure: pass in entries, get answers back.

import { MAX_WORDS } from "./customLists";
import { normaliseWord } from "./wordKey";

export const RULE_KINDS = ["ends", "starts", "contains", "text", "point"];

// Weeks that are not a spelling rule: the baseline review and the long
// statutory pools. Their words still turn up in pattern searches, but they
// are not offered as learning points.
const NOT_A_RULE_RE = /^baseline review|statutory word list/i;

const lettersOnly = (s) => normaliseWord(s).replace(/[^\p{L}]/gu, "");
export const normaliseFocus = (s) =>
  String(s == null ? "" : s).normalize("NFC").toLowerCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, " ").trim();

const LETTERS_RE = /^[a-z]{1,12}$/i;

// ── Reading what was typed ─────────────────────────────────────────────

/**
 * Turns typed text into a rule, or null for empty input.
 *   "/ee/"          -> contains "ee"
 *   "-le", "-le ending", "–ous"  -> ends with
 *   "kn-", "kn at the start"     -> starts with
 *   "-ous-"         -> contains
 *   "ee"            -> contains (and learning points that mention it)
 *   "suffix", "doubling" ...     -> text (searches learning points)
 */
export function parseRuleQuery(input) {
  let s = normaliseFocus(input);
  if (!s) return null;

  const slashed = /^\/([^/]+)\/$/.exec(s);
  if (slashed && LETTERS_RE.test(slashed[1].trim())) return { kind: "contains", value: slashed[1].trim().toLowerCase() };

  let m = /^-([a-z]{1,12})-$/.exec(s);
  if (m) return { kind: "contains", value: m[1] };
  m = /^-([a-z]{1,12})(?:\s+(?:ending|endings|suffix|at the end(?: of words)?))?$/.exec(s);
  if (m) return { kind: "ends", value: m[1] };
  m = /^([a-z]{1,12})-(?:\s+(?:start|starts|beginning|prefix))?$/.exec(s);
  if (m) return { kind: "starts", value: m[1] };
  m = /^([a-z]{1,12})\s+(?:at the )?(?:start|beginning)(?: of words?)?$/.exec(s);
  if (m) return { kind: "starts", value: m[1] };
  m = /^([a-z]{1,12})\s+(?:at the )?end(?:ing)?(?: of words?)?$/.exec(s);
  if (m && m[1] !== "word") return { kind: "ends", value: m[1] };

  if (LETTERS_RE.test(s) && s.length <= 4) return { kind: "contains", value: s };
  return { kind: "text", value: s };
}

export function ruleLabel(rule) {
  switch (rule.kind) {
    case "ends":
      return "-" + rule.value;
    case "starts":
      return rule.value + "-";
    case "contains":
      return "/" + rule.value + "/";
    case "point":
      return rule.label || rule.value;
    default:
      return "“" + rule.value + "”";
  }
}

export const ruleKey = (rule) => rule.kind + ":" + rule.value + (rule.year ? "@" + rule.year : "");

export const describeRule = (rule) =>
  ({
    ends: "words ending -" + rule.value,
    starts: "words starting " + rule.value + "-",
    contains: "words with " + rule.value + " in them",
    text: "learning points about “" + rule.value + "”",
    point: "this week's learning point",
  })[rule.kind];

// ── Matching ───────────────────────────────────────────────────────────

const isWord = (e) => e && e.contentType !== "letter" && e.word;

/** Does the word's spelling fit a pattern rule? Hyphens and spaces are ignored. */
export function wordFits(rule, word) {
  const w = lettersOnly(word);
  if (!w) return false;
  if (rule.kind === "ends") return w.endsWith(rule.value);
  if (rule.kind === "starts") return w.startsWith(rule.value);
  if (rule.kind === "contains") return w.includes(rule.value);
  return false;
}

/** Whole letter-runs in a focus: "kn/gn at the start" -> kn, gn, at, the, start. */
const focusTokens = (focus) => normaliseFocus(focus).match(/[a-z]+/g) || [];

/** Does a learning point (focus text) talk about this rule? */
export function focusFits(rule, focus) {
  const f = normaliseFocus(focus);
  if (rule.kind === "text") return f.includes(rule.value);
  if (rule.kind === "point") return f === rule.value;
  const tokens = focusTokens(f);
  // "-le" must not match "-less": the letters after the hyphen have to end there.
  if (rule.kind === "ends") return new RegExp("-" + rule.value + "(?![a-z])").test(f) || (tokens.includes(rule.value) && /\bend/.test(f));
  if (rule.kind === "starts") return new RegExp("(?<![a-z])" + rule.value + "-").test(f) || (tokens.includes(rule.value) && /\b(start|begin)/.test(f));
  return tokens.includes(rule.value);
}

/** Does one entry belong to a rule? */
export function entryFits(rule, entry) {
  if (!isWord(entry)) return false;
  if (rule.kind === "point") return normaliseFocus(entry.focus) === rule.value && (!rule.year || entry.yearSlug === rule.year);
  if (rule.kind === "text") return false;
  return wordFits(rule, entry.word);
}

// ── Gathering entries ──────────────────────────────────────────────────

/** Flattens { slug: entries[] } into one array, each entry tagged with its yearSlug. */
export function flattenYears(byYear, yearOrder = Object.keys(byYear)) {
  const out = [];
  for (const slug of yearOrder) {
    for (const e of byYear[slug] || []) if (isWord(e)) out.push({ ...e, yearSlug: slug });
  }
  return out;
}

const inYears = (entries, years) => (years && years.length ? entries.filter((e) => years.includes(e.yearSlug)) : entries);

/** One row per distinct word, keeping the year it was met in first and any meaning found. */
function distinctWords(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = normaliseWord(e.word);
    const have = map.get(key);
    if (!have) {
      map.set(key, { word: e.word, key, years: [e.yearSlug], definition: e.definition || "", exampleSentence: e.exampleSentence || "", focus: e.focus, rank: e.difficultyRank || 0 });
      continue;
    }
    if (!have.years.includes(e.yearSlug)) have.years.push(e.yearSlug);
    if (!have.definition && e.definition) have.definition = e.definition;
    if (!have.exampleSentence && e.exampleSentence) have.exampleSentence = e.exampleSentence;
  }
  return [...map.values()];
}

// ── Searching ──────────────────────────────────────────────────────────

/**
 * Every learning point in the data, one per (year, focus), with its weeks and words.
 * Baseline-review and statutory-pool focuses are left out.
 */
export function listLearningPoints(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!isWord(e) || !e.focus || NOT_A_RULE_RE.test(e.focus)) continue;
    const value = normaliseFocus(e.focus);
    const key = e.yearSlug + "|" + value;
    let p = map.get(key);
    if (!p) {
      p = { key, rule: { kind: "point", value, year: e.yearSlug, label: e.focus.trim() }, focus: e.focus.trim(), year: e.yearSlug, weeks: [], words: new Map() };
      map.set(key, p);
    }
    if (e.weekOfYear && !p.weeks.includes(e.weekOfYear)) p.weeks.push(e.weekOfYear);
    if (!p.words.has(normaliseWord(e.word))) p.words.set(normaliseWord(e.word), e.word);
  }
  return [...map.values()].map((p) => ({ ...p, words: [...p.words.values()], weeks: p.weeks.sort((a, b) => a - b) }));
}

/**
 * Searches for a typed query.
 * @returns {{ rule, points: object[], words: object[] }}
 *   points: learning points that talk about the rule (newest year last)
 *   words: distinct words that fit a pattern rule
 */
export function searchRules(query, entries, { years = [] } = {}) {
  const rule = typeof query === "string" ? parseRuleQuery(query) : query;
  if (!rule) return { rule: null, points: [], words: [] };
  const pool = inYears(entries, years);
  const points = listLearningPoints(pool).filter((p) => focusFits(rule, p.focus));
  const words = rule.kind === "text" ? [] : distinctWords(pool.filter((e) => entryFits(rule, e)));
  words.sort((a, b) => a.word.length - b.word.length || a.word.localeCompare(b.word));
  return { rule, points, words };
}

/** Words for a rule that came from a learning point or a pattern. */
export function wordsForRule(rule, entries, { years = [] } = {}) {
  const pool = inYears(entries, years);
  if (rule.kind === "text") {
    const hits = listLearningPoints(pool).filter((p) => focusFits(rule, p.focus));
    const keys = new Set(hits.map((p) => p.key));
    return distinctWords(pool.filter((e) => keys.has(e.yearSlug + "|" + normaliseFocus(e.focus))));
  }
  return distinctWords(pool.filter((e) => entryFits(rule, e)));
}

// ── Mixing rules into a session ────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, random = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks words from several rules, taking turns so every rule is represented.
 * A word that fits more than one rule is used once. Rules with few matches
 * give up their unused turns to the others.
 *
 * @param {object[]} rules
 * @param {object[]} entries  flat entries from flattenYears
 * @param {{ total?: number, years?: string[], seed?: number, mustFitAll?: boolean, exclude?: string[] }} opts
 *   exclude: word keys already chosen by hand, never picked again
 * @returns {{ words: object[], perRule: {rule, available: number, taken: number}[] }}
 */
export function mixRules(rules, entries, { total = 10, years = [], seed, mustFitAll = false, exclude = [] } = {}) {
  const random = seed == null ? Math.random : mulberry32(seed);
  const cap = Math.max(0, Math.min(total, MAX_WORDS));
  const pools = rules.map((rule) => ({ rule, list: shuffle(wordsForRule(rule, entries, { years }), random), taken: 0 }));

  if (mustFitAll && rules.length > 1) {
    const sets = pools.map((p) => new Set(p.list.map((w) => w.key)));
    const skip = new Set(exclude);
    const common = pools[0].list.filter((w) => !skip.has(w.key) && sets.every((s) => s.has(w.key))).slice(0, cap);
    return {
      words: common.map((w) => ({ ...w, rules: rules.map(ruleLabel) })),
      perRule: pools.map((p) => ({ rule: p.rule, available: common.length, taken: common.length })),
    };
  }

  const used = new Set(exclude);
  const words = [];
  let progressed = true;
  while (words.length < cap && progressed) {
    progressed = false;
    for (const p of pools) {
      if (words.length >= cap) break;
      while (p.list.length) {
        const next = p.list.shift();
        if (used.has(next.key)) continue;
        used.add(next.key);
        words.push({ ...next, rules: [ruleLabel(p.rule)] });
        p.taken++;
        progressed = true;
        break;
      }
    }
  }
  return {
    words,
    perRule: pools.map((p) => ({ rule: p.rule, available: wordsForRule(p.rule, entries, { years }).length, taken: p.taken })),
  };
}

/** Words ready for createList: { word, definition?, exampleSentence? }. */
export function toListWords(words) {
  return words.map((w) => {
    const out = { word: w.word };
    if (w.definition) out.definition = w.definition.slice(0, 200);
    if (w.exampleSentence) out.exampleSentence = w.exampleSentence.slice(0, 200);
    return out;
  });
}

/** A name for a saved session: "-le, /ee/ and kn-". */
export function suggestName(rules) {
  const labels = rules.map(ruleLabel);
  if (!labels.length) return "My spelling session";
  const text = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
  return text.length > 56 ? labels.slice(0, 3).join(", ") + "…" : text;
}
