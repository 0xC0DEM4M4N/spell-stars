import {
  SNAPSHOT_APP, SNAPSHOT_VERSION, readLocalSnapshot, isEmptySnapshot, validateSnapshot,
  parseSnapshotText, snapshotToFileText, snapshotFileName, MAX_FILE_BYTES, readPayloadFromText,
  buildSyncUrl, transportsFor,
} from "../syncSnapshot";

const state = (over) => ({
  box: 2, dueDate: "2026-09-10", attempts: 2, correctCount: 2,
  lastResult: "correct", lastSeen: "2026-09-09", ...over,
});
const put = (key, value) => window.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));

beforeEach(() => window.localStorage.clear());

describe("readLocalSnapshot", () => {
  test("collects migrated years and known settings", () => {
    put("spellstars.year3.progress", { v: 2, currentWeek: 4, words: { "year3:badge": state() } });
    put("spellstars.theme", "dark");
    put("spellstars.letterCasePref", "lowercase");
    put("unrelated.key", "x");
    const { snapshot, unmigrated } = readLocalSnapshot(window.localStorage, new Date("2026-09-21T10:00:00Z"));
    expect(unmigrated).toEqual([]);
    expect(snapshot.app).toBe(SNAPSHOT_APP);
    expect(snapshot.v).toBe(SNAPSHOT_VERSION);
    expect(snapshot.exportedAt).toBe("2026-09-21T10:00:00.000Z");
    expect(snapshot.progress.year3.currentWeek).toBe(4);
    expect(snapshot.settings).toEqual({ theme: "dark", letterCasePref: "lowercase" });
    expect(JSON.stringify(snapshot)).not.toContain("unrelated");
  });

  test("leaves out and reports years still in the old format", () => {
    put("spellstars.year2.progress", { currentWeek: 2, words: { "year2-w01-01": state() } });
    put("spellstars.year3.progress", { v: 2, currentWeek: 1, words: {} });
    const { snapshot, unmigrated } = readLocalSnapshot();
    expect(unmigrated).toEqual(["year2"]);
    expect(Object.keys(snapshot.progress)).toEqual(["year3"]);
  });

  test("ignores the .v1 fallback copy and the undo backup", () => {
    put("spellstars.year3.progress.v1", { currentWeek: 2, words: { a: state() } });
    put("spellstars.syncBackup", { at: 1, entries: {} });
    const { snapshot, unmigrated } = readLocalSnapshot();
    expect(snapshot.progress).toEqual({});
    expect(unmigrated).toEqual([]);
  });

  test("drops damaged word records but keeps the rest", () => {
    put("spellstars.year3.progress", {
      v: 2, currentWeek: 3,
      words: { "year3:badge": state(), "year3:bad": { box: 99 }, "year3:junk": "no" },
    });
    const { snapshot } = readLocalSnapshot();
    expect(Object.keys(snapshot.progress.year3.words)).toEqual(["year3:badge"]);
    expect(validateSnapshot(snapshot).ok).toBe(true);
  });

  test("skips corrupt JSON and invalid setting values", () => {
    put("spellstars.year3.progress", "{nope");
    put("spellstars.theme", "neon");
    put("spellstars.timerPrefs", JSON.stringify({ mode: "countdown", countdownSeconds: 30 }));
    const { snapshot } = readLocalSnapshot();
    expect(snapshot.progress).toEqual({});
    expect(snapshot.settings).toEqual({ timerPrefs: JSON.stringify({ mode: "countdown", countdownSeconds: 30 }) });
  });

  test("clamps an out-of-range week", () => {
    put("spellstars.year3.progress", { v: 2, currentWeek: 500, words: {} });
    expect(readLocalSnapshot().snapshot.progress.year3.currentWeek).toBe(60);
  });

  test("isEmptySnapshot", () => {
    expect(isEmptySnapshot(readLocalSnapshot().snapshot)).toBe(true);
    put("spellstars.year3.progress", { v: 2, currentWeek: 1, words: {} });
    expect(isEmptySnapshot(readLocalSnapshot().snapshot)).toBe(true);
    put("spellstars.year3.progress", { v: 2, currentWeek: 1, words: { "year3:a": state() } });
    expect(isEmptySnapshot(readLocalSnapshot().snapshot)).toBe(false);
  });
});

describe("file format", () => {
  const snap = () => {
    put("spellstars.year3.progress", { v: 2, currentWeek: 4, words: { "year3:badge": state() } });
    put("spellstars.theme", "dyslexia");
    return readLocalSnapshot().snapshot;
  };

  test("round trips", () => {
    const s = snap();
    const parsed = parseSnapshotText(snapshotToFileText(s));
    expect(parsed.ok).toBe(true);
    expect(parsed.snapshot).toEqual(s);
  });

  test("file name carries the date", () => {
    expect(snapshotFileName(new Date("2026-09-21T23:00:00Z"))).toBe("spell-stars-progress-2026-09-21.json");
  });

  test.each([
    ["not json", "{oops"],
    ["a different app", JSON.stringify({ app: "other", v: 1 })],
    ["an array", "[]"],
    ["null", "null"],
  ])("rejects %s", (_n, text) => {
    const r = parseSnapshotText(text);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid");
  });

  test("rejects a newer version with a helpful error", () => {
    const r = validateSnapshot({ ...snap(), v: 2 });
    expect(r).toMatchObject({ ok: false, error: "newer" });
  });

  test("rejects oversized text", () => {
    expect(parseSnapshotText("x".repeat(MAX_FILE_BYTES + 1))).toMatchObject({ ok: false, error: "too-large" });
  });

  test("rejects out-of-range or malformed values", () => {
    const s = snap();
    const bad = (mut) => { const c = JSON.parse(JSON.stringify(s)); mut(c); return validateSnapshot(c).ok; };
    expect(bad((c) => { c.progress.year3.words["year3:badge"].box = 6; })).toBe(false);
    expect(bad((c) => { c.progress.year3.words["year3:badge"].dueDate = "tomorrow"; })).toBe(false);
    expect(bad((c) => { c.progress.year3.words["year3:badge"].attempts = -1; })).toBe(false);
    expect(bad((c) => { c.progress.year3.words["year3:badge"].attempts = 1.5; })).toBe(false);
    expect(bad((c) => { c.progress.year3.currentWeek = 0; })).toBe(false);
    expect(bad((c) => { c.progress["Bad Slug!"] = c.progress.year3; })).toBe(false);
    expect(bad((c) => { c.settings.theme = "neon"; })).toBe(false);
    expect(bad((c) => { c.settings.timerPrefs = "{}"; })).toBe(false);
    expect(bad((c) => { c.progress.year3.words["k".repeat(121)] = c.progress.year3.words["year3:badge"]; })).toBe(false);
    expect(bad(() => {})).toBe(true);
  });

  test("strips unknown top-level and word fields rather than storing them", () => {
    const s = snap();
    s.extra = "<script>";
    s.progress.year3.words["year3:badge"].evil = "x";
    const r = validateSnapshot(s);
    expect(r.ok).toBe(true);
    expect(r.snapshot.extra).toBeUndefined();
    expect(r.snapshot.progress.year3.words["year3:badge"].evil).toBeUndefined();
  });

  test("a prototype-pollution attempt does not reach Object.prototype", () => {
    const text = '{"app":"spell-stars","v":1,"exportedAt":"x","progress":{"year3":{"v":2,"currentWeek":1,"words":{"__proto__":{"box":1,"dueDate":"2026-01-01","attempts":1,"correctCount":1,"lastResult":"correct","lastSeen":"2026-01-01"}}}},"settings":{}}';
    parseSnapshotText(text);
    expect({}.box).toBeUndefined();
  });
});

describe("links", () => {
  test("readPayloadFromText finds a payload in a hash, a pasted link or bare", () => {
    expect(readPayloadFromText("#p=z1.abc_-")).toBe("z1.abc_-");
    expect(readPayloadFromText("https://spell-stars.pages.dev/sync#p=j1.AAAA")).toBe("j1.AAAA");
    expect(readPayloadFromText("  see https://x.dev/sync#p=z1.QQ  thanks")).toBe("z1.QQ");
    expect(readPayloadFromText("z1.abc")).toBe("z1.abc");
    expect(readPayloadFromText("https://x.dev/sync")).toBeNull();
    expect(readPayloadFromText(null)).toBeNull();
  });

  test("buildSyncUrl", () => {
    expect(buildSyncUrl("https://spell-stars.pages.dev/", "z1.abc")).toBe("https://spell-stars.pages.dev/sync#p=z1.abc");
  });

  test("transportsFor", () => {
    expect(transportsFor("x".repeat(100))).toEqual({ chars: 100, link: true, qr: true });
    expect(transportsFor("x".repeat(1500))).toEqual({ chars: 1500, link: true, qr: false });
    // A fully practised Year 1 is about 4,700 characters and should still fit in a link.
    expect(transportsFor("x".repeat(5000)).link).toBe(true);
    expect(transportsFor("x".repeat(7000))).toEqual({ chars: 7000, link: false, qr: false });
  });
});
