// Keeps AI-written dictation sentences suitable for the year group.
//
// Used by functions/api/dictation.js (and tested against the site's own word
// lists). Two checks:
//
//   1. Vocabulary. The programme's spelling words are listed in
//      public/data/vocab.json with the year and week each is first covered. A
//      sentence is turned down if it uses a word from the lists that the class
//      has not reached yet (a Year 1 sentence with "conscience"), or more than
//      one other hard word that isn't in the lists at all. The lesson's own
//      words are always allowed, and so are very common small words, names, and
//      ordinary short words. The lists don't hold every word children can read
//      (nothing like "bike" or "birthday"), so unlisted words are only judged
//      by length. The limits were chosen so that the example sentences already
//      in the word lists pass the check 89% to 100% of the time.
//
//   2. Language. A basic backstop that turns down any sentence with bad
//      language or content that isn't for young children. The AI is also told
//      to keep things gentle; this catches the odd slip.

export const YEAR_ORDER = ["reception", "year1", "year2", "year3", "year4", "year5", "year6"];

// Very common words every child at this stage can read, which the spelling lists
// don't need to hold.
const COMMON = `a an the and but or so if as at by for from in into of on onto off out over to up with without
about after before again all also always am any are around away back be because been being both can could did do
does done down each either enough even ever every few first get gets getting go goes going gone got had has have
having he her here hers him his how i is it its just last like little made make many may me more most much must my
near never new next no not now old once one only other our own put said same see seen she should since some soon
still such than that their them then there these they this those through too under until us very was we well went
were what when where which while who why will with would yes yet you your
i'm i'll i've i'd don't doesn't didn't can't won't isn't wasn't aren't weren't it's that's he's she's let's there's
what's we're they're you're he'd she'd we'd they'd you'd he'll she'll we'll they'll
one two three four five six seven eight nine ten
mum dad mummy daddy boy girl man woman day night morning today time
big small good bad nice happy sad
came come comes coming took take takes gave give gives looked look looks saw say says
found find asked ask told tell called call felt feel
thing things people home house school`
  .split(/\s+/)
  .reduce((set, w) => set.add(w), new Set());

// Words that don't belong in a children's dictation. A backstop, not a promise:
// the prompt asks for gentle stories, and this turns down anything that slips by.
const BLOCKED = new Set(
  `damn damned hell crap shit shitty fuck fucking bitch bastard arse ass asshole piss pissed dick prick cock bollocks
  bugger wanker twat slut whore sex sexy naked drunk drugs kill kills killed killing murder murdered suicide
  gun guns shoot shot rape stupid idiot dumb hate`.split(/\s+/),
);

const tokens = (text) => String(text || "").match(/[A-Za-z’']+/g) || [];
const clean = (t) => t.replace(/’/g, "'").replace(/^'+|'+$/g, "");

/** Words in `text` that aren't for young children. */
export function blockedWords(text) {
  return tokens(text).map((t) => clean(t).toLowerCase()).filter((w) => BLOCKED.has(w));
}

// Plain endings, so "walked", "walks" and "walking" count as "walk".
function bases(word) {
  const out = [];
  const w = word;
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  const add = (stem) => {
    if (stem.length >= 2) out.push(stem);
  };
  for (const [suffix, replacement] of [["ies", "y"], ["es", ""], ["s", ""], ["ed", ""], ["d", ""], ["ing", ""], ["ly", ""], ["er", ""], ["est", ""]]) {
    if (!w.endsWith(suffix) || w.length - suffix.length < 2) continue;
    const stem = w.slice(0, -suffix.length) + replacement;
    add(stem);
    if (["ed", "ing", "er", "est"].includes(suffix)) {
      if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) add(stem.slice(0, -1));
      add(stem + "e");
    }
    if (suffix === "d") add(stem + "e");
  }
  return out;
}

const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);

/**
 * Is this word covered by `point` ([yearIndex, week])? "covered", "future" (it
 * is in the lists, but later), or "unlisted" (not in the lists at all).
 */
export function wordStatus(word, vocab, point) {
  const exact = vocab[word];
  if (exact) return before(exact, point) ? "covered" : "future";
  const found = bases(word).map((b) => vocab[b]).filter(Boolean);
  if (found.length === 0) return "unlisted";
  return found.some((p) => before(p, point)) ? "covered" : "future";
}

// How much leeway each year group gets. `future`: words from the lists not yet
// covered. `longest`: the longest unlisted word that doesn't count as hard.
const LEEWAY = [
  { future: 1, longest: 6 }, // Reception: the lists are tiny, so judge gently
  { future: 1, longest: 7 },
  { future: 1, longest: 8 },
  { future: 0, longest: 9 },
  { future: 0, longest: 10 },
  { future: 0, longest: 11 },
  { future: 0, longest: 12 },
];
const MAX_HARD_UNLISTED = 1;

/**
 * Checks one sentence.
 * @param {string} text
 * @param {{ vocab: Record<string, [number, number]>|null, point: [number, number]|null, lessonWords?: string[] }} options
 *   `point` is [yearIndex, week] the class has reached; leave vocab or point
 *   out (a lesson with no year group) to check the language only.
 * @returns {{ ok: boolean, blocked: string[], future: string[], hard: string[] }}
 */
export function checkSentence(text, { vocab, point, lessonWords = [] } = {}) {
  const blocked = blockedWords(text);
  const future = [];
  const hard = [];
  if (vocab && point) {
    const lesson = new Set(lessonWords.map((w) => w.toLowerCase()));
    const leeway = LEEWAY[point[0]] || LEEWAY[3];
    tokens(text).forEach((raw, i) => {
      const word = clean(raw).toLowerCase();
      if (!word || lesson.has(word) || COMMON.has(word)) return;
      if (i > 0 && /^[A-Z]/.test(raw)) return; // a name or a place
      const status = wordStatus(word, vocab, point);
      if (status === "future") future.push(word);
      else if (status === "unlisted" && word.length > leeway.longest) hard.push(word);
    });
    const ok = blocked.length === 0 && future.length <= leeway.future && hard.length <= MAX_HARD_UNLISTED;
    return { ok, blocked, future, hard };
  }
  return { ok: blocked.length === 0, blocked, future, hard };
}

/** The words covered up to `point`, for telling the AI what the class knows. */
export function coveredWords(vocab, point) {
  return Object.entries(vocab)
    .filter(([, p]) => before(p, point))
    .map(([w]) => w);
}

/** [yearIndex, week] for a year slug and week, or null for an unknown year. */
export function pointFor(yearSlug, week) {
  const yearIndex = YEAR_ORDER.indexOf(yearSlug);
  if (yearIndex < 0) return null;
  const w = Number.isInteger(week) && week >= 1 ? Math.min(week, 40) : 40;
  return [yearIndex, w];
}
