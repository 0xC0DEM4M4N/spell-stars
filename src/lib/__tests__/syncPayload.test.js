/** @jest-environment node */
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { encodePayload, decodePayload, buildSyncUrl, transportsFor, snapshotToFileText } from "../syncSnapshot";

// Older Jest versions run this file without some browser-style globals that
// current Node has. Fill in the simple one, and skip the compression tests
// where compression itself isn't available (the uncompressed "j1" form is
// still tested either way).
if (typeof btoa !== "function") global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
if (typeof atob !== "function") global.atob = (s) => Buffer.from(s, "base64").toString("binary");
const hasCompression = typeof CompressionStream === "function" && typeof DecompressionStream === "function" && typeof Blob === "function";
const testIfCompression = hasCompression ? test : test.skip;
const describeIfCompression = hasCompression ? describe : describe.skip;

const DATA = path.join(__dirname, "..", "..", "..", "public", "data");
const realWords = (slug) =>
  JSON.parse(fs.readFileSync(path.join(DATA, slug, "words.json"), "utf8"))
    .filter((w) => w.contentType !== "letter")
    .map((w) => w.word.toLowerCase());

// Deterministic pseudo-random so the sizes are repeatable.
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }

const IV = [0, 1, 3, 7, 14, 30];
const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
// Practice happens on a couple of dozen distinct days, as it would for a child.
const PRACTICE_DAYS = Array.from({ length: 24 }, (_, i) => addDays("2026-09-01", i * 2));

function snapshotWith(slug, count) {
  const rand = rng(42);
  const words = {};
  const all = [...new Set(realWords(slug))];
  for (const w of all.slice(0, count)) {
    const attempts = 1 + Math.floor(rand() * 8);
    const box = Math.floor(rand() * 6);
    const lastSeen = PRACTICE_DAYS[Math.floor(rand() * PRACTICE_DAYS.length)];
    words[slug + ":" + w] = {
      box, dueDate: addDays(lastSeen, IV[box]), attempts,
      correctCount: Math.floor(rand() * (attempts + 1)),
      lastResult: rand() > 0.3 ? "correct" : "incorrect", lastSeen,
    };
  }
  return words;
}

const snapshot = (progress) => ({ app: "spell-stars", v: 1, exportedAt: "2026-09-21T10:00:00.000Z", progress, settings: {}, lists: [] });

describe("payload", () => {
  testIfCompression("round trips through z1", async () => {
    const s = snapshot({ year3: { v: 2, currentWeek: 5, words: snapshotWith("year3", 60) } });
    const payload = await encodePayload(s);
    expect(payload.startsWith("z1.")).toBe(true);
    const back = await decodePayload(payload);
    expect(back.ok).toBe(true);
    expect(back.snapshot).toEqual(s);
  });

  test("round trips through j1", async () => {
    const s = snapshot({ year3: { v: 2, currentWeek: 5, words: snapshotWith("year3", 20) } });
    const orig = global.CompressionStream;
    global.CompressionStream = undefined;
    let payload;
    try { payload = await encodePayload(s); } finally { global.CompressionStream = orig; }
    expect(payload.startsWith("j1.")).toBe(true);
    const back = await decodePayload(payload);
    expect(back.ok).toBe(true);
    expect(back.snapshot).toEqual(s);
  });

  testIfCompression("z1 without DecompressionStream gives a clear message", async () => {
    const s = snapshot({ year3: { v: 2, currentWeek: 1, words: snapshotWith("year3", 5) } });
    const payload = await encodePayload(s);
    const orig = global.DecompressionStream;
    global.DecompressionStream = undefined;
    try {
      expect(await decodePayload(payload)).toMatchObject({ ok: false, error: "unsupported" });
    } finally { global.DecompressionStream = orig; }
  });

  test.each([
    ["empty", ""],
    ["no prefix", "abcdef"],
    ["wrong prefix", "z9.abc"],
    ["bad characters", "z1.abc$%"],
    ["not deflate data", "z1.AAAAAAAA"],
    ["not json", "j1.AAAA"],
    ["number", 5],
  ])("rejects %s", async (_n, payload) => {
    const r = await decodePayload(payload);
    expect(r.ok).toBe(false);
  });

  testIfCompression("a compression bomb is stopped", async () => {
    const zeros = "0".repeat(4 * 1024 * 1024);
    const stream = new Blob([zeros]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const packed = Buffer.from(await new Response(stream).arrayBuffer());
    const payload = "z1." + packed.toString("base64url");
    expect(payload.length).toBeLessThan(20000);
    expect(await decodePayload(payload)).toMatchObject({ ok: false });
  });

  test("valid payload of a wrong-shaped snapshot is rejected", async () => {
    const payload = await encodePayload({ hello: "world" });
    expect(await decodePayload(payload)).toMatchObject({ ok: false, error: "invalid" });
  });
});

describeIfCompression("real sizes (printed for reference)", () => {
  const origin = "https://spell-stars.pages.dev";
  // Year 1 has the most distinct words (281), so a fully practised Year 1 is
  // the largest single year.
  const cases = [
    ["one week practised (12 words)", "year1", 12],
    ["about a term (60 words)", "year1", 60],
    ["half a year (140 words)", "year1", 140],
    ["a fully practised Year 1 (281 words)", "year1", 1000],
  ];
  test.each(cases)("%s", async (label, slug, n) => {
    const s = snapshot({ [slug]: { v: 2, currentWeek: 20, words: snapshotWith(slug, n) } });
    const actual = Object.keys(s.progress[slug].words).length;
    const payload = await encodePayload(s);
    const url = buildSyncUrl(origin, payload);
    const t = transportsFor(url);
    let qrModules = null;
    if (t.qr) {
      const qr = QRCode.create(url, { errorCorrectionLevel: "L" });
      qrModules = qr.modules.size;
    }
    // eslint-disable-next-line no-console
    console.log(label + ": words=" + actual + " json=" + snapshotToFileText(s).length + "B link=" + url.length + " chars, link ok=" + t.link + ", qr ok=" + t.qr + (qrModules ? " (qr " + qrModules + "x" + qrModules + ")" : ""));
    expect(await decodePayload(payload)).toMatchObject({ ok: true });
  });
});
