// Sharing a custom list: the list is packed into a link, and whoever opens
// it can add the words to their own lists (see pages/SharedListPage.jsx).
//
// The words travel in the URL's #hash, so nothing is stored on a server and
// the hash is never sent to one. Only the name, the words and any example
// sentences are shared. Never progress, and never anything else on the device.
// A link is untrusted input: decodeShare checks and cleans everything.

import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_WORDS, MAX_WORD_LENGTH } from "./customLists";
import { normaliseWord } from "./wordKey";

export const SHARE_PATH = "/shared";
const MAX_SENTENCE_LENGTH = 200;
const MAX_URL_LENGTH = 6000; // longer links break in some chat and email apps
const MAX_PARTS_PER_WORD = 3;
const WORD_RE = /^\p{L}[\p{L}'\- ]*$/u;

const toBase64Url = (text) => {
  let bin = "";
  new TextEncoder().encode(text).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (b64) => {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

const packedSchema = z.object({
  v: z.literal(1),
  n: z.string().max(200),
  w: z.array(z.union([z.string(), z.tuple([z.string(), z.string()])])).max(500),
});

function pack(list, withSentences) {
  return toBase64Url(
    JSON.stringify({
      v: 1,
      n: list.name,
      w: list.words.map((w) => (withSentences && w.exampleSentence ? [w.word, w.exampleSentence] : w.word)),
    }),
  );
}

/**
 * The link for a list. Example sentences are included when the link stays a
 * sensible length; otherwise they're left out and `sentencesDropped` is true.
 */
export function buildShareUrl(list, origin) {
  const base = origin + SHARE_PATH + "#";
  const hasSentences = list.words.some((w) => w.exampleSentence);
  const full = base + pack(list, true);
  if (full.length <= MAX_URL_LENGTH || !hasSentences) return { url: full, sentencesDropped: false };
  return { url: base + pack(list, false), sentencesDropped: true };
}

/**
 * A link short enough to scan easily as a QR code (dense codes are hard for
 * a phone camera to read). Tries the full link, then without example
 * sentences. Returns null if even the words alone are too much.
 */
export function buildQrUrl(list, origin, maxLength = 1100) {
  const base = origin + SHARE_PATH + "#";
  const hasSentences = list.words.some((w) => w.exampleSentence);
  const full = base + pack(list, true);
  if (full.length <= maxLength) return { url: full, sentencesDropped: false };
  const wordsOnly = base + pack(list, false);
  if (wordsOnly.length <= maxLength) return { url: wordsOnly, sentencesDropped: hasSentences };
  return null;
}

export function shareMessage(list) {
  const n = list.words.length;
  return (
    'I challenge you! Can you spell all ' + n + " word" + (n === 1 ? "" : "s") +
    ' on my "' + list.name + '" list on SPELL// STARS?'
  );
}

/**
 * Reads a shared link's hash. Returns { name, words } with the words cleaned
 * and de-duplicated, or null if the link is damaged or empty. Never throws.
 */
export function decodeShare(hash) {
  try {
    const raw = String(hash || "").replace(/^#/, "");
    if (!raw || raw.length > 20000) return null;
    const parsed = packedSchema.safeParse(JSON.parse(fromBase64Url(raw)));
    if (!parsed.success) return null;

    const words = [];
    const seen = new Set();
    for (const item of parsed.data.w) {
      const [rawWord, rawSentence] = Array.isArray(item) ? item : [item, ""];
      const word = rawWord.replace(/\s+/g, " ").trim();
      if (!word || word.length > MAX_WORD_LENGTH || !WORD_RE.test(word)) continue;
      if (word.split(" ").length > MAX_PARTS_PER_WORD) continue;
      const key = normaliseWord(word);
      if (seen.has(key)) continue;
      seen.add(key);
      const sentence = rawSentence.replace(/\s+/g, " ").trim().slice(0, MAX_SENTENCE_LENGTH);
      words.push(sentence ? { word, exampleSentence: sentence } : { word });
      if (words.length >= MAX_WORDS) break;
    }
    if (words.length === 0) return null;

    const name = parsed.data.n.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH) || "Shared spelling list";
    return { name, words };
  } catch (err) {
    return null;
  }
}
