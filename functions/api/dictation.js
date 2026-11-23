// Cloudflare Pages Function behind dictation's "Write with AI" button.
//
// POST /api/dictation  { n, shared?, words?, yearSlug?, yearLabel?, language, avoid? }
// (coveredWeek, for lessons with a year group, limits the vocabulary to what is covered by then)
// returns { lines: [{ text, words }], source: "shared" | "new", total }
//
// How the sentences are kept:
//   - For a built-in week (`shared: { yearSlug, week }`, English only) every set
//     ever written is saved in KV under "dict:<yearSlug>|w<week>|<language>", up
//     to MAX_AI_SETS. Asking for set number `n` gives the saved one if it exists,
//     so a week's sentences are written once and then served to everyone, and the
//     AI is only asked when someone has seen every saved set and wants another.
//     The week's words are read from the site's own word list, never from the
//     request, so nobody can store sentences against words the week doesn't have.
//   - For anything else (a lesson of your own, a term, a whole year) nothing is
//     stored here, because the words belong to that person. Every call writes a
//     new set, and the page keeps it on the device.
//   Reading a saved set needs no sign-in. Asking the AI for a new set does, and
//   is capped per person per day.
//
// One-time setup, in the Cloudflare Pages dashboard for this project:
//   Settings -> Functions -> Bindings
//     - Workers AI: add a binding named AI
//     - KV namespace: create one and bind it as DICTATION_KV
//   Settings -> Environment variables
//     - SUPABASE_URL and SUPABASE_ANON_KEY (the same two values the site is built
//       with; they are only used to check that a token belongs to a real person)
// Then build the site with REACT_APP_DICTATION_AI=true, and redeploy.
//
// Admin: GET and DELETE on this same URL, with the ADMIN_PASSWORD from the
// feedback setup, power /admin/dictation: daily usage (sets written, Neurons
// used against the free 10,000 a day) and the saved sets, any of which can be
// deleted (the next person to ask gets a new one written). Free-plan KV allows
// 1,000 writes a day and a new set uses three, so that is about 330 new sets a
// day; reading a saved set writes nothing.

import { LANGUAGES, MAX_AI_SETS, DAILY_AI_LIMIT, levelFor, sentenceHasWord } from "../../src/lib/dictation.js";
import { blockedWords, checkSentence, coveredWords, pointFor } from "../../src/lib/dictationVocab.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
// Cloudflare's published price for that model, in Neurons per million tokens
// (developers.cloudflare.com/workers-ai/platform/pricing). Used to turn token
// counts into the Neurons the free daily allowance is measured in.
const NEURONS_PER_M_INPUT = 4119;
const NEURONS_PER_M_OUTPUT = 34868;
export const DAILY_NEURON_ALLOWANCE = 10000;
const STAT_DAYS_KEPT = 120;
const YEARS = ["reception", "year1", "year2", "year3", "year4", "year5", "year6"];
const LANGUAGE_NAMES = {
  "en-GB": "British English",
  "en-US": "American English",
  "cy-GB": "Welsh",
  "fr-FR": "French",
  "es-ES": "Spanish",
  "de-DE": "German",
  "it-IT": "Italian",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// What each year group should hear, in plain terms.
function lengthAdvice(yearSlug, wordsPerLine) {
  if (yearSlug === "reception") return "very short, 3 to 5 words, using only simple everyday words";
  if (yearSlug === "year1") return "short, 4 to 6 words";
  if (yearSlug === "year2") return "one clear sentence of 7 to 10 words";
  if (wordsPerLine >= 3) return "one longer sentence of 15 to 22 words, which can use a comma or a joining word";
  return "one sentence of 11 to 16 words";
}

// Checks the token belongs to a signed-in person. Returns { id } or { reason },
// where reason says why not (shown in the response, to help with setup).
async function signedInUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { reason: "no_token" };
  if (!env.SUPABASE_URL) return { reason: "SUPABASE_URL_not_set" };
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY || "" },
    });
    if (!res.ok) return { reason: `supabase_rejected_${res.status}` };
    const user = await res.json();
    return user && user.id ? { id: String(user.id) } : { reason: "supabase_no_user" };
  } catch {
    return { reason: "supabase_unreachable" };
  }
}

// The words in a built-in week, from the site's own data.
async function weekWords(request, env, yearSlug, week) {
  const res = await env.ASSETS.fetch(new URL(`/data/${yearSlug}/words.json`, request.url));
  if (!res.ok) return [];
  const entries = await res.json();
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (e.weekOfYear !== week || e.contentType === "letter" || !e.word) continue;
    const k = e.word.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e.word);
  }
  return out;
}

function parseSentences(reply) {
  let data = reply;
  if (typeof reply === "string") {
    const start = reply.indexOf("{");
    const end = reply.lastIndexOf("}");
    if (start < 0 || end < start) return [];
    try {
      data = JSON.parse(reply.slice(start, end + 1));
    } catch {
      return [];
    }
  }
  const list = data && Array.isArray(data.sentences) ? data.sentences : [];
  return list.map((s) => (typeof s === "string" ? s : s && s.text)).filter((t) => typeof t === "string");
}

// The site's word lists with the point each word is first covered, read once
// per instance. Null if it can't be read, in which case only the language
// check applies.
let vocabCache = null;
async function loadVocab(request, env) {
  if (vocabCache) return vocabCache;
  try {
    const res = await env.ASSETS.fetch(new URL("/data/vocab.json", request.url));
    if (!res.ok) return null;
    const data = await res.json();
    vocabCache = data && data.words ? data.words : null;
  } catch {
    vocabCache = null;
  }
  return vocabCache;
}

// One go at writing a story. Returns the sentences that passed the checks, how
// many were asked for, what was wrong with the others, and the tokens used.
async function attemptSet(env, { words, yearSlug, yearLabel, language, avoid, lines, vocab, point, fix }) {
  const level = levelFor(yearSlug);
  const perLine = level.per;
  const known = vocab && point ? coveredWords(vocab, point) : [];
  const englishOnly = language.startsWith("en-");
  const knownBlock =
    known.length && englishOnly
      ? `\n\nWords the children have already learned to spell (use only these, plus the lesson words and very simple everyday words like "the", "and", "was", "went", "big", "mum"; any name should be a simple one):\n${known.join(", ")}`
      : "";
  const prompt = `You write dictation for children learning to spell. The sentences together make one short story.

Lesson words: ${words.join(", ")}
Year group: ${yearLabel || "Year 3"}
Language: ${LANGUAGE_NAMES[language]}${knownBlock}

Write exactly ${lines} sentences that read in order as one short story with a beginning, a middle and a gentle ending. Each sentence follows on from the one before, about the same few characters (say "a girl" or "the fox", and do not give anyone a name). Each sentence must be ${lengthAdvice(yearSlug, perLine)}, and must use ${perLine === 1 ? "one" : String(perLine)} of the lesson words exactly as written (same spelling, no endings added). Between them the sentences should use as many different lesson words as possible, and no lesson word should be used in two sentences. Write only words that children of this year group can read and understand. The story must be kind, happy and completely suitable for young children: no swearing, rude words, violence, scary or sad events, or grown-up topics. Do not mention the lesson.${
    avoid.length ? `\n\nDo not repeat or closely copy any of these sentences:\n${avoid.map((s) => "- " + s).join("\n")}` : ""
  }${fix ? `\n\nA previous try was turned down. ${fix}` : ""}

Reply with only JSON, no other text: {"sentences":[{"text":"..."}]}`;

  const result = await env.AI.run(MODEL, { messages: [{ role: "user", content: prompt }], max_tokens: 700 });
  const reply = result && (result.response ?? result);
  // Token counts come back with the reply; if they ever don't, estimate from length.
  const reported = result && result.usage;
  const usage =
    reported && Number.isFinite(reported.prompt_tokens) && Number.isFinite(reported.completion_tokens)
      ? { input: reported.prompt_tokens, output: reported.completion_tokens, estimated: false }
      : {
          input: Math.ceil(prompt.length / 4),
          output: Math.ceil((typeof reply === "string" ? reply : JSON.stringify(reply || "")).length / 4),
          estimated: true,
        };
  const set = [];
  const problems = [];
  for (const raw of parseSentences(reply)) {
    const text = raw.trim();
    if (!text || text.length > 300) continue;
    const used = words.filter((w) => sentenceHasWord(text, w));
    if (used.length === 0) continue; // must use a lesson word
    if (set.some((s) => s.text.toLowerCase() === text.toLowerCase())) continue;
    // Vocabulary and language checks only make sense for English.
    const check = englishOnly
      ? checkSentence(text, { vocab, point, lessonWords: words })
      : { ok: blockedWords(text).length === 0, blocked: blockedWords(text), future: [], hard: [] };
    if (!check.ok) {
      problems.push(...check.blocked, ...check.future, ...check.hard);
      continue;
    }
    set.push({ text, words: used });
    if (set.length === lines) break;
  }
  return { set, problems, usage };
}

// Writes a set, trying a second time (and saying what to avoid) when the first
// has too many sentences turned down. Returns the better of the two.
async function writeSet(env, options) {
  const first = await attemptSet(env, options);
  const total = { input: first.usage.input, output: first.usage.output, estimated: first.usage.estimated };
  let best = first;
  if (first.set.length < options.lines) {
    const avoidWords = [...new Set(first.problems)].slice(0, 12);
    const fix = avoidWords.length
      ? `Do not use these words: ${avoidWords.join(", ")}. Use simpler words and keep every sentence suitable for young children.`
      : "Use simpler words and keep every sentence suitable for young children.";
    try {
      const second = await attemptSet(env, { ...options, fix });
      total.input += second.usage.input;
      total.output += second.usage.output;
      total.estimated = total.estimated || second.usage.estimated;
      if (second.set.length > best.set.length) best = second;
    } catch {
      // keep the first try
    }
  }
  const { lines } = options;
  // Too few usable sentences: better to say so than to save a poor story.
  return { set: best.set.length >= Math.ceil(lines * 0.75) ? best.set : null, usage: total };
}

// One small record per day, for /admin/dictation.
async function recordStat(env, day, add) {
  const key = `stat:${day}`;
  const now = (await env.DICTATION_KV.get(key, "json")) || {};
  for (const [k, v] of Object.entries(add)) now[k] = k === "estimated" ? Boolean(now[k] || v) : (now[k] || 0) + v;
  await env.DICTATION_KV.put(key, JSON.stringify(now), { expirationTtl: 60 * 60 * 24 * STAT_DAYS_KEPT });
}

const neuronsFor = (usage) =>
  Math.round(((usage.input * NEURONS_PER_M_INPUT + usage.output * NEURONS_PER_M_OUTPUT) / 1e6) * 100) / 100;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!env.AI || !env.DICTATION_KV) return json({ error: "Not set up." }, 503);

  const n = Number(body?.n);
  const language = body?.language;
  if (!Number.isInteger(n) || n < 0 || n >= MAX_AI_SETS) return json({ error: "Bad set number." }, 400);
  if (!LANGUAGES.some((l) => l.id === language)) return json({ error: "Unknown language." }, 400);

  let words;
  let storeKey = null;
  let yearSlug = typeof body.yearSlug === "string" ? body.yearSlug : "";
  const shared = body.shared;
  if (shared) {
    const week = Number(shared.week);
    yearSlug = String(shared.yearSlug || "");
    if (!YEARS.includes(yearSlug) || !Number.isInteger(week) || week < 1 || week > 40) return json({ error: "Bad lesson." }, 400);
    if (!language.startsWith("en-")) return json({ error: "Built-in weeks are English only." }, 400);
    words = await weekWords(request, env, yearSlug, week);
    storeKey = `dict:${yearSlug}|w${week}|${language}`;
  } else {
    words = Array.isArray(body.words)
      ? [...new Set(body.words.filter((w) => typeof w === "string" && w.length > 0 && w.length <= 40))].slice(0, 20)
      : [];
  }
  if (words.length === 0) return json({ error: "No words." }, 400);

  // A saved set is served to anyone, signed in or not.
  let saved = [];
  if (storeKey) {
    saved = (await env.DICTATION_KV.get(storeKey, "json")) || [];
    if (saved[n]) return json({ lines: saved[n], source: "shared", total: saved.length });
  }

  // Asking the AI for something new needs a signed-in person, with a daily cap.
  const who = await signedInUser(request, env);
  if (!who.id) return json({ error: "signin", reason: who.reason }, 401);
  const userId = who.id;
  const day = new Date().toISOString().slice(0, 10);
  const usageKey = `use:${userId}:${day}`;
  const used = Number(await env.DICTATION_KV.get(usageKey)) || 0;
  if (used >= DAILY_AI_LIMIT) return json({ error: "limit" }, 429);

  const avoid = storeKey
    ? saved.flat().map((l) => l.text)
    : (Array.isArray(body.avoid) ? body.avoid : []).filter((s) => typeof s === "string").map((s) => s.slice(0, 300));
  const lines = Math.min(levelFor(yearSlug).lines, words.length);
  // What the class has covered so far: the week itself for a built-in week, the
  // week given for a term or lesson with a year group, else the whole year.
  const coveredWeek = shared ? Number(shared.week) : Number(body.coveredWeek);
  const point = pointFor(yearSlug, Number.isInteger(coveredWeek) ? coveredWeek : null);
  const vocab = point ? await loadVocab(request, env) : null;

  let outcome;
  try {
    outcome = await writeSet(env, {
      words,
      yearSlug,
      yearLabel: typeof body.yearLabel === "string" ? body.yearLabel.slice(0, 20) : "",
      language,
      avoid: avoid.slice(0, 16),
      lines,
      vocab,
      point,
    });
  } catch {
    await recordStat(env, day, { failed: 1 });
    return json({ error: "failed" }, 502);
  }
  const { set, usage } = outcome;
  await recordStat(env, day, {
    written: set ? 1 : 0,
    failed: set ? 0 : 1,
    inputTokens: usage.input,
    outputTokens: usage.output,
    neurons: neuronsFor(usage),
    estimated: usage.estimated,
  });
  if (!set) return json({ error: "failed" }, 502);

  await env.DICTATION_KV.put(usageKey, String(used + 1), { expirationTtl: 60 * 60 * 48 });

  if (storeKey) {
    // Someone else may have saved a set while this one was being written;
    // keep theirs and add ours after it.
    const latest = (await env.DICTATION_KV.get(storeKey, "json")) || [];
    if (latest.length < MAX_AI_SETS) {
      latest.push(set);
      await env.DICTATION_KV.put(storeKey, JSON.stringify(latest));
    }
    return json({ lines: set, source: "new", total: latest.length });
  }
  return json({ lines: set, source: "new", total: 1 });
}

// ── Admin: usage and saved sets ────────────────────────────────────────

const isAdmin = (request, env) => {
  const password = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(env.ADMIN_PASSWORD) && password === env.ADMIN_PASSWORD;
};

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);

  const statKeys = (await env.DICTATION_KV.list({ prefix: "stat:" })).keys.map((k) => k.name).sort().slice(-14);
  const days = (await Promise.all(statKeys.map((k) => env.DICTATION_KV.get(k, "json")))).map((row, i) => ({
    day: statKeys[i].slice(5),
    written: 0,
    failed: 0,
    inputTokens: 0,
    outputTokens: 0,
    neurons: 0,
    estimated: false,
    ...(row || {}),
  }));

  const dictKeys = (await env.DICTATION_KV.list({ prefix: "dict:" })).keys.map((k) => k.name).sort();
  const shown = dictKeys.slice(0, 100);
  const lessons = (await Promise.all(shown.map((k) => env.DICTATION_KV.get(k, "json")))).map((sets, i) => ({
    key: shown[i],
    sets: sets || [],
  }));

  return json({ allowance: DAILY_NEURON_ALLOWANCE, days, lessonCount: dictKeys.length, lessons });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Unauthorized" }, 401);
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("dict:")) return json({ error: "Bad key." }, 400);
  await env.DICTATION_KV.delete(key);
  return json({ ok: true });
}
