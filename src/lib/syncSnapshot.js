// Account-free sync, part 1: the snapshot.
//
// A "snapshot" is a copy of everything the app keeps in localStorage that is
// worth carrying to another device: each year's saved progress and a few
// display settings. It can travel three ways, all built on this one shape:
//
//   - a backup file (the snapshot as JSON),
//   - a link (the snapshot compressed into the URL fragment, which browsers
//     never send to a server), and
//   - a QR code (the same link drawn as an image).
//
// Nothing here talks to a server. See syncMerge.js for combining a snapshot
// with what is already on the device, and syncService.js for the async glue.

import { z } from "zod";
import { PROGRESS_VERSION } from "./srs";
import { MAX_LISTS, listSchema, loadLists } from "./customLists";

export const SNAPSHOT_APP = "spell-stars";
export const SNAPSHOT_VERSION = 1;

// ── What is included ───────────────────────────────────────────────────

// `spellstars.<slug>.progress` — one per year group. The ".v1" fallback the
// progress migration leaves behind ("...progress.v1") deliberately does not
// match.
export const PROGRESS_KEY_RE = /^spellstars\.([a-z0-9-]{1,40})\.progress$/;
export const progressStorageKey = (slug) => "spellstars." + slug + ".progress";

// Display and behaviour settings, all under the `spellstars.` prefix. Values
// are stored as the raw strings the app writes, so they round-trip exactly.
export const SETTING_NAMES = [
  "theme",
  "textScale",
  "reducedMotion",
  "dyslexiaFont",
  "timerPrefs",
  "letterCasePref",
  "scopeExplainerDismissed",
];
export const settingStorageKey = (name) => "spellstars." + name;

// ── Schema ─────────────────────────────────────────────────────────────

const MAX_YEARS = 40;
const MAX_WORDS_PER_YEAR = 5000;
const MAX_KEY_LENGTH = 120;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const dateString = z.string().regex(DATE_RE);

export const wordStateSchema = z.object({
  box: z.number().int().min(0).max(5),
  dueDate: dateString,
  attempts: z.number().int().min(0).max(1_000_000),
  correctCount: z.number().int().min(0).max(1_000_000),
  lastResult: z.enum(["correct", "incorrect"]),
  lastSeen: dateString,
});

const yearProgressSchema = z
  .object({
    v: z.literal(PROGRESS_VERSION),
    currentWeek: z.number().int().min(1).max(60),
    words: z.record(z.string().min(1).max(MAX_KEY_LENGTH), wordStateSchema),
  })
  .refine((y) => Object.keys(y.words).length <= MAX_WORDS_PER_YEAR, "too many words");

const timerPrefsValue = z.string().max(200).refine((s) => {
  try {
    const p = JSON.parse(s);
    return (
      p && typeof p === "object" &&
      (p.mode === "countdown" || p.mode === "countup") &&
      Number.isFinite(p.countdownSeconds) && p.countdownSeconds > 0 && p.countdownSeconds <= 3600
    );
  } catch (err) {
    return false;
  }
}, "bad timer preferences");

const settingsSchema = z
  .object({
    theme: z.enum(["light", "dark", "dyslexia", "highContrast"]).optional(),
    textScale: z.enum(["standard", "large", "extraLarge"]).optional(),
    reducedMotion: z.enum(["true", "false"]).optional(),
    dyslexiaFont: z.enum(["lexend", "opendyslexic"]).optional(),
    timerPrefs: timerPrefsValue.optional(),
    letterCasePref: z.enum(["uppercase", "lowercase"]).optional(),
    scopeExplainerDismissed: z.literal("1").optional(),
  });

export const snapshotSchema = z.object({
  app: z.literal(SNAPSHOT_APP),
  v: z.literal(SNAPSHOT_VERSION),
  exportedAt: z.string().max(40),
  progress: z
    .record(z.string().regex(/^[a-z0-9-]{1,40}$/), yearProgressSchema)
    .refine((p) => Object.keys(p).length <= MAX_YEARS, "too many years"),
  settings: settingsSchema,
  // Custom spelling lists (see customLists.js). Backups made before lists
  // existed have none, which reads as an empty set.
  lists: z.array(listSchema).max(MAX_LISTS).default([]),
});

// ── Reading the device ─────────────────────────────────────────────────

/** Keeps only the well-formed word records of a saved year, dropping any
 * that were hand-edited or damaged so one bad record cannot block a backup. */
function cleanYear(parsed) {
  const words = {};
  for (const [key, state] of Object.entries(parsed.words || {})) {
    if (key.length > MAX_KEY_LENGTH) continue;
    const ok = wordStateSchema.safeParse(state);
    if (ok.success) words[key] = ok.data;
  }
  const week = Number.isInteger(parsed.currentWeek) ? Math.min(Math.max(parsed.currentWeek, 1), 60) : 1;
  return { v: PROGRESS_VERSION, currentWeek: week, words };
}

/**
 * Builds a snapshot from localStorage.
 *
 * Years whose saved progress has not been converted to word keys yet
 * (syncService.ensureProgressMigrated does that) are left out and listed in
 * `unmigrated`, so a snapshot never carries the old slot-id format.
 *
 * @returns {{ snapshot: object, unmigrated: string[] }}
 */
export function readLocalSnapshot(storage = window.localStorage, now = new Date()) {
  const progress = {};
  const unmigrated = [];
  const settings = {};

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const match = key && PROGRESS_KEY_RE.exec(key);
    if (!match) continue;
    let parsed;
    try {
      parsed = JSON.parse(storage.getItem(key));
    } catch (err) {
      continue;
    }
    if (!parsed || typeof parsed !== "object" || !parsed.words || typeof parsed.words !== "object") continue;
    if (parsed.v !== PROGRESS_VERSION) {
      unmigrated.push(match[1]);
      continue;
    }
    progress[match[1]] = cleanYear(parsed);
  }

  for (const name of SETTING_NAMES) {
    const raw = storage.getItem(settingStorageKey(name));
    if (raw === null) continue;
    const ok = settingsSchema.shape[name].safeParse(raw);
    if (ok.success) settings[name] = ok.data;
  }

  return {
    snapshot: {
      app: SNAPSHOT_APP,
      v: SNAPSHOT_VERSION,
      exportedAt: now.toISOString(),
      progress,
      settings,
      lists: loadLists(storage),
    },
    unmigrated: unmigrated.sort(),
  };
}

/** True when a snapshot carries no practice and no custom lists. */
export function isEmptySnapshot(snapshot) {
  return (
    (snapshot.lists || []).length === 0 &&
    Object.values(snapshot.progress).every((y) => Object.keys(y.words).length === 0)
  );
}

// ── File format ────────────────────────────────────────────────────────

export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function snapshotFileName(now = new Date()) {
  return "spell-stars-progress-" + now.toISOString().slice(0, 10) + ".json";
}

export function snapshotToFileText(snapshot) {
  return JSON.stringify(snapshot);
}

/** Validates already-parsed data. */
export function validateSnapshot(data) {
  if (data && typeof data === "object" && data.app === SNAPSHOT_APP && typeof data.v === "number" && data.v > SNAPSHOT_VERSION) {
    return { ok: false, error: "newer", message: "This backup was made by a newer version of SPELL// STARS. Refresh the page and try again." };
  }
  const result = snapshotSchema.safeParse(data);
  if (!result.success) {
    return { ok: false, error: "invalid", message: "That doesn't look like a SPELL// STARS backup, or it has been changed." };
  }
  return { ok: true, snapshot: result.data };
}

/** Parses the text of a backup file. */
export function parseSnapshotText(text) {
  if (typeof text !== "string" || text.length > MAX_FILE_BYTES) {
    return { ok: false, error: "too-large", message: "That file is too large to be a SPELL// STARS backup." };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: "invalid", message: "That doesn't look like a SPELL// STARS backup." };
  }
  return validateSnapshot(data);
}

// ── Link / QR payload ──────────────────────────────────────────────────
//
// A payload is a short string that carries a snapshot:
//   "z1." + base64url(deflate-raw(JSON))   when the browser can compress
//   "j1." + base64url(JSON)                otherwise
// It goes after "#p=" in a link. A payload is decoded with the same strict
// validation as a file.

const MAX_PAYLOAD_CHARS = 400_000;

// Rough limits for how a payload can be shared. Messaging apps can cut very
// long links, and dense QR codes are hard to scan from a screen. These are
// cautious guesses, not tested against particular apps; the tests print
// real sizes. Past a limit the page offers the backup file instead.
export const LINK_MAX_CHARS = 6000;
export const QR_MAX_CHARS = 1200;

function toBase64Url(bytes) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const canCompress = () => typeof CompressionStream === "function" && typeof Blob === "function";
const canDecompress = () => typeof DecompressionStream === "function" && typeof Blob === "function";

async function streamBytes(bytes, transform, maxOutput) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (maxOutput && total > maxOutput) {
      await reader.cancel();
      throw new Error("output too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Turns a snapshot into a payload string. */
export async function encodePayload(snapshot) {
  const json = new TextEncoder().encode(JSON.stringify(snapshot));
  if (canCompress()) {
    try {
      const packed = await streamBytes(json, new CompressionStream("deflate-raw"));
      return "z1." + toBase64Url(packed);
    } catch (err) {
      // fall through to the uncompressed form
    }
  }
  return "j1." + toBase64Url(json);
}

/** Reads a payload string back into a validated snapshot. */
export async function decodePayload(payload) {
  const bad = { ok: false, error: "invalid", message: "That link or code isn't a valid SPELL// STARS backup. If it was sent in a message it may have been cut short. Try the backup file instead." };
  if (typeof payload !== "string" || payload.length > MAX_PAYLOAD_CHARS) return bad;
  const match = /^(z1|j1)\.([A-Za-z0-9_-]+)$/.exec(payload.trim());
  if (!match) return bad;

  let bytes;
  try {
    bytes = fromBase64Url(match[2]);
    if (match[1] === "z1") {
      if (!canDecompress()) {
        return { ok: false, error: "unsupported", message: "This link needs a newer browser. Try the backup file instead." };
      }
      bytes = await streamBytes(bytes, new DecompressionStream("deflate-raw"), MAX_FILE_BYTES);
    } else if (bytes.length > MAX_FILE_BYTES) {
      return bad;
    }
    return parseSnapshotText(new TextDecoder().decode(bytes));
  } catch (err) {
    return bad;
  }
}

/** The address that opens the import screen with a payload attached. */
export function buildSyncUrl(origin, payload) {
  return origin.replace(/\/+$/, "") + "/sync#p=" + payload;
}

/** Pulls a payload out of a location hash ("#p=...") or a pasted link. */
export function readPayloadFromText(text) {
  if (typeof text !== "string") return null;
  const match = /(?:^|[#&?\s])p=((?:z1|j1)\.[A-Za-z0-9_-]+)/.exec(text.trim());
  if (match) return match[1];
  const bare = /^(?:z1|j1)\.[A-Za-z0-9_-]+$/.exec(text.trim());
  return bare ? bare[0] : null;
}

/** What a link of this length can be used for. */
export function transportsFor(url) {
  return { chars: url.length, link: url.length <= LINK_MAX_CHARS, qr: url.length <= QR_MAX_CHARS };
}
