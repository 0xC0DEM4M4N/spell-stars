// Curated picture-matching bank for Reception's "Find the letter" game
// (the first 7 weeks / 35 graphemes, one per school day, before Reception
// moves on to whole words). Every prompt that actually appears in
// data/reception/words.json's contentType:"letter" entries needs a row
// here — most single letters are picked as classic "starts with" objects
// (a is for apple); the digraphs that are really an end/mid-word sound
// (ck, ff, ll, ss, zz, ng) use words that CONTAIN that sound instead,
// since almost nothing in a 4-year-old's vocabulary starts with "ck" —
// that's also why the game copy says "makes this sound" rather than
// "starts with", so it's accurate for every prompt, not just the letters.
//
// Not phonetically rigorous (e.g. "i" uses "ice cream", a long-i word,
// alongside short-i "insect") — this follows the same loose
// alphabet-book convention ("A is for Apple") most children's letter
// games use, prioritising a recognisable picture + word pair over strict
// phonics purity.
export const LETTER_OBJECTS = {
  s: [{ word: "sun", emoji: "☀️" }, { word: "snake", emoji: "🐍" }, { word: "star", emoji: "⭐" }, { word: "sock", emoji: "🧦" }],
  a: [{ word: "apple", emoji: "🍎" }, { word: "ant", emoji: "🐜" }, { word: "alligator", emoji: "🐊" }],
  t: [{ word: "tiger", emoji: "🐯" }, { word: "tomato", emoji: "🍅" }, { word: "tree", emoji: "🌳" }],
  p: [{ word: "pig", emoji: "🐷" }, { word: "pizza", emoji: "🍕" }, { word: "pumpkin", emoji: "🎃" }],
  i: [{ word: "ice cream", emoji: "🍦" }, { word: "insect", emoji: "🐛" }, { word: "igloo", emoji: "❄️" }],
  n: [{ word: "nut", emoji: "🥜" }, { word: "nest", emoji: "🪺" }, { word: "nose", emoji: "👃" }],
  m: [{ word: "monkey", emoji: "🐒" }, { word: "moon", emoji: "🌙" }, { word: "mouse", emoji: "🐭" }],
  d: [{ word: "dog", emoji: "🐶" }, { word: "duck", emoji: "🦆" }, { word: "drum", emoji: "🥁" }],
  g: [{ word: "goat", emoji: "🐐" }, { word: "grapes", emoji: "🍇" }, { word: "guitar", emoji: "🎸" }],
  o: [{ word: "octopus", emoji: "🐙" }, { word: "orange", emoji: "🍊" }, { word: "owl", emoji: "🦉" }],
  c: [{ word: "cat", emoji: "🐱" }, { word: "car", emoji: "🚗" }, { word: "cake", emoji: "🎂" }],
  k: [{ word: "kite", emoji: "🪁" }, { word: "king", emoji: "🤴" }, { word: "kangaroo", emoji: "🦘" }],
  ck: [{ word: "duck", emoji: "🦆" }, { word: "sock", emoji: "🧦" }, { word: "clock", emoji: "🕐" }],
  e: [{ word: "elephant", emoji: "🐘" }, { word: "egg", emoji: "🥚" }],
  u: [{ word: "umbrella", emoji: "☂️" }, { word: "unicorn", emoji: "🦄" }],
  r: [{ word: "rabbit", emoji: "🐰" }, { word: "rainbow", emoji: "🌈" }, { word: "robot", emoji: "🤖" }],
  h: [{ word: "hat", emoji: "🎩" }, { word: "horse", emoji: "🐴" }, { word: "house", emoji: "🏠" }],
  b: [{ word: "ball", emoji: "⚽" }, { word: "banana", emoji: "🍌" }, { word: "bear", emoji: "🐻" }],
  f: [{ word: "fish", emoji: "🐟" }, { word: "frog", emoji: "🐸" }, { word: "fire", emoji: "🔥" }],
  ff: [{ word: "puffin", emoji: "🐦" }, { word: "cliff", emoji: "🏞️" }],
  l: [{ word: "lion", emoji: "🦁" }, { word: "leaf", emoji: "🍃" }, { word: "lemon", emoji: "🍋" }],
  ll: [{ word: "shell", emoji: "🐚" }, { word: "bell", emoji: "🔔" }],
  ss: [{ word: "grass", emoji: "🌾" }, { word: "glass", emoji: "🥛" }],
  j: [{ word: "jelly", emoji: "🍮" }, { word: "jellyfish", emoji: "🪼" }, { word: "jug", emoji: "🫙" }],
  v: [{ word: "van", emoji: "🚐" }, { word: "violin", emoji: "🎻" }, { word: "volcano", emoji: "🌋" }],
  w: [{ word: "whale", emoji: "🐳" }, { word: "watch", emoji: "⌚" }, { word: "watermelon", emoji: "🍉" }],
  x: [{ word: "x-ray", emoji: "🩻" }, { word: "xylophone", emoji: "🎹" }],
  y: [{ word: "yoyo", emoji: "🪀" }, { word: "yarn", emoji: "🧶" }],
  z: [{ word: "zebra", emoji: "🦓" }, { word: "zip", emoji: "🤐" }],
  zz: [{ word: "buzz", emoji: "🐝" }, { word: "fizz", emoji: "🥤" }, { word: "jazz", emoji: "🎷" }],
  qu: [{ word: "queen", emoji: "👸" }, { word: "quack", emoji: "🦆" }, { word: "quilt", emoji: "🧵" }],
  ch: [{ word: "chips", emoji: "🍟" }, { word: "cheese", emoji: "🧀" }, { word: "chicken", emoji: "🐔" }],
  sh: [{ word: "ship", emoji: "🚢" }, { word: "shark", emoji: "🦈" }, { word: "shoe", emoji: "👟" }],
  th: [{ word: "thumb", emoji: "👍" }, { word: "thread", emoji: "🧵" }],
  ng: [{ word: "ring", emoji: "💍" }, { word: "song", emoji: "🎵" }],
};

/** Every {word, emoji} across every prompt — used as the pool to draw
 * distractors from (excluding whatever prompt is the current target). */
function allObjects() {
  return Object.entries(LETTER_OBJECTS).flatMap(([prompt, objs]) =>
    objs.map((o) => ({ ...o, prompt }))
  );
}

function shuffledCopy(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds one round of the picture-matching game for a given grapheme:
 * every object for that prompt (marked correct: true) plus a handful of
 * distractor objects from other prompts, shuffled together.
 */
export function buildRound(prompt, distractorCount = 5) {
  const targets = (LETTER_OBJECTS[prompt] || []).map((o) => ({ ...o, correct: true }));
  const others = allObjects().filter((o) => o.prompt !== prompt);
  const distractors = shuffledCopy(others)
    .slice(0, distractorCount)
    .map((o) => ({ word: o.word, emoji: o.emoji, correct: false }));
  return shuffledCopy(targets.concat(distractors));
}

// The 25 single-character graphemes Reception covers (excludes the
// digraphs/trigraphs like "ch", "ck", "ng" — letter mode is about
// recognising one letter shape among others, which only makes sense
// for an actual single letter).
const SINGLE_LETTERS = Object.keys(LETTER_OBJECTS).filter((key) => key.length === 1);

/** Classic letter-reversal confusions for early readers — mirror-image
 * pairs (b/d, p/q) and shape-alike pairs (t/f, v/w). When the target is
 * one of these, its partner is deliberately weighted into the
 * distractor pool so the round actually tests the tricky case rather
 * than only ever offering unrelated letters. */
const CONFUSABLE_LETTERS = {
  b: ["d"],
  d: ["b"],
  p: ["q"],
  q: ["p"],
  t: ["f"],
  f: ["t"],
  v: ["w"],
  w: ["v"],
};

export function isSingleLetterPrompt(prompt) {
  return SINGLE_LETTERS.includes(prompt);
}

/**
 * Builds one round of the letter-matching game for a given single
 * letter: a fixed-size grid (12 by default) of lowercase letter tiles,
 * at least 2 of which are the target letter (marked correct: true).
 * The rest are distractors, drawn from a pool that's deliberately
 * stacked with the target's classic look-alike (b/d, p/q, t/f, v/w)
 * where one exists, so the round is a real test of telling similar
 * shapes apart, not just "spot the only letter that isn't blank".
 * Distractors repeat rather than being unique, same as the target.
 */
export function buildLetterRound(prompt, gridSize = 12) {
  if (!isSingleLetterPrompt(prompt)) return [];

  const targetCount = 2 + Math.floor(Math.random() * 3); // 2-4 target tiles
  const tiles = Array.from({ length: targetCount }, () => ({ letter: prompt, correct: true }));

  // Guarantee the classic look-alike actually shows up when this letter
  // has one, rather than just weighting it into a random pool -- that
  // is the whole point of the round for a letter like b/d or p/q, so it
  // should never be left to chance.
  const confusables = CONFUSABLE_LETTERS[prompt] || [];
  confusables.forEach((letter) => {
    const confusableCount = 1 + Math.floor(Math.random() * 2); // 1-2 of each
    for (let i = 0; i < confusableCount; i++) {
      tiles.push({ letter, correct: false });
    }
  });

  const fillerPool = SINGLE_LETTERS.filter((letter) => letter !== prompt && !confusables.includes(letter));
  const shuffledFiller = shuffledCopy(fillerPool);
  while (tiles.length < gridSize) {
    tiles.push({ letter: shuffledFiller[tiles.length % shuffledFiller.length], correct: false });
  }

  return shuffledCopy(tiles.slice(0, gridSize));
}
