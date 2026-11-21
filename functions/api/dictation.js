// Cloudflare Pages Function behind dictation's "Write with AI" button.
//
// POST /api/dictation  { n, shared?, words?, yearSlug?, yearLabel?, language, avoid? }
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
// To remove a saved set you don't like, delete its key in the KV namespace
// (the next person to ask will get a new one written).

import { LANGUAGES, MAX_AI_SETS, DAILY_AI_LIMIT, levelFor, sentenceHasWord } from "../../src/lib/dictation.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
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

// Checks the token belongs to a signed-in person, and returns their id.
async function signedInUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !env.SUPABASE_URL) return null;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY || "" },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? String(user.id) : null;
  } catch {
    return null;
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

async function writeSet(env, { words, yearSlug, yearLabel, language, avoid, lines }) {
  const level = levelFor(yearSlug);
  const perLine = level.per;
  const prompt = `You write dictation sentences for children learning to spell.

Lesson words: ${words.join(", ")}
Year group: ${yearLabel || "Year 3"}
Language: ${LANGUAGE_NAMES[language]}

Write exactly ${lines} sentences. Each sentence must be ${lengthAdvice(yearSlug, perLine)}, and must use ${perLine === 1 ? "one" : String(perLine)} of the lesson words exactly as written (same spelling, no endings added). Between them the sentences should use as many different lesson words as possible, and no word should be used in two sentences. Keep the sentences kind, calm and suitable for school. Use no names of real people. Do not mention the lesson.${
    avoid.length ? `\n\nDo not repeat or closely copy any of these sentences:\n${avoid.map((s) => "- " + s).join("\n")}` : ""
  }

Reply with only JSON, no other text: {"sentences":[{"text":"..."}]}`;

  const result = await env.AI.run(MODEL, { messages: [{ role: "user", content: prompt }], max_tokens: 600 });
  const texts = parseSentences(result && (result.response ?? result));
  const set = [];
  for (const raw of texts) {
    const text = raw.trim();
    if (!text || text.length > 300) continue;
    const used = words.filter((w) => sentenceHasWord(text, w));
    if (used.length === 0) continue; // must use a lesson word
    if (set.some((s) => s.text.toLowerCase() === text.toLowerCase())) continue;
    set.push({ text, words: used });
    if (set.length === lines) break;
  }
  // Too few usable sentences: better to say so than to save a poor set.
  return set.length >= Math.ceil(lines / 2) ? set : null;
}

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
  const userId = await signedInUser(request, env);
  if (!userId) return json({ error: "signin" }, 401);
  const day = new Date().toISOString().slice(0, 10);
  const usageKey = `use:${userId}:${day}`;
  const used = Number(await env.DICTATION_KV.get(usageKey)) || 0;
  if (used >= DAILY_AI_LIMIT) return json({ error: "limit" }, 429);

  const avoid = storeKey
    ? saved.flat().map((l) => l.text)
    : (Array.isArray(body.avoid) ? body.avoid : []).filter((s) => typeof s === "string").map((s) => s.slice(0, 300));
  const lines = Math.min(levelFor(yearSlug).lines, words.length);

  let set;
  try {
    set = await writeSet(env, {
      words,
      yearSlug,
      yearLabel: typeof body.yearLabel === "string" ? body.yearLabel.slice(0, 20) : "",
      language,
      avoid: avoid.slice(0, 16),
      lines,
    });
  } catch {
    return json({ error: "failed" }, 502);
  }
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
