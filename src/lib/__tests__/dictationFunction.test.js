import { onRequestPost } from "../../../functions/api/dictation.js";
import { DAILY_AI_LIMIT, MAX_AI_SETS } from "../dictation";

// Fakes for what Cloudflare provides: KV storage, the AI, and the site's own files.
const makeEnv = (aiReplies = []) => {
  const store = new Map();
  const replies = [...aiReplies];
  const env = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon",
    DICTATION_KV: {
      get: async (k, type) => (store.has(k) ? (type === "json" ? JSON.parse(store.get(k)) : store.get(k)) : null),
      put: async (k, v) => void store.set(k, v),
    },
    AI: { run: jest.fn(async () => ({ response: JSON.stringify({ sentences: replies.shift() || [] }) })) },
    ASSETS: {
      fetch: async () => ({
        ok: true,
        json: async () => [
          { weekOfYear: 8, contentType: "word", word: "frost" },
          { weekOfYear: 8, contentType: "word", word: "stamp" },
          { weekOfYear: 8, contentType: "word", word: "stump" },
          { weekOfYear: 8, contentType: "word", word: "crisp" },
          { weekOfYear: 9, contentType: "word", word: "other" },
        ],
      }),
    },
  };
  return { env, store };
};

const call = (env, body, token = "good") =>
  onRequestPost({
    request: {
      url: "https://site.test/api/dictation",
      headers: { get: (h) => (h.toLowerCase() === "authorization" && token ? "Bearer " + token : "") },
      json: async () => body,
    },
    env,
  });

const sentences = (...t) => t.map((text) => ({ text }));
const shared = { yearSlug: "year2", week: 8 };
const ask = (n, extra = {}) => ({ n, language: "en-GB", shared, yearLabel: "Year 2", ...extra });

beforeEach(() => {
  global.fetch = jest.fn(async (url, init) =>
    String(url).includes("/auth/v1/user") && init.headers.Authorization === "Bearer good"
      ? { ok: true, json: async () => ({ id: "user-1" }) }
      : { ok: false, json: async () => ({}) },
  );
});

describe("dictation function: shared sets for a built-in week", () => {
  const set1 = sentences("Frost covered the grass.", "She licked the stamp.", "He tripped on a stump.", "The crisp was tasty.");
  const set2 = sentences("The frost melted fast.", "Post the stamp today.", "A stump sat there.", "Crisp air filled the room.");

  test("first person writes set 1, second person gets it without the AI, regenerate gives set 2, then the AI is used", async () => {
    const { env } = makeEnv([set1, set2]);

    // Person A asks for set 0: nothing saved, so the AI writes it.
    let res = await call(env, ask(0));
    expect((await res.json()).source).toBe("new");
    expect(env.AI.run).toHaveBeenCalledTimes(1);

    // Person B (not even signed in) asks for set 0: served from the store.
    res = await call(env, ask(0), null);
    const b = await res.json();
    expect(b.source).toBe("shared");
    expect(b.lines.map((l) => l.text)).toEqual(set1.map((s) => s.text));
    expect(env.AI.run).toHaveBeenCalledTimes(1);

    // B regenerates: set 1 isn't saved, and B is signed out, so they're asked to sign in.
    res = await call(env, ask(1), null);
    expect(res.status).toBe(401);

    // Signed in, they get a new set written, which is saved.
    res = await call(env, ask(1));
    expect((await res.json()).source).toBe("new");
    expect(env.AI.run).toHaveBeenCalledTimes(2);

    // Next person gets both from the store.
    res = await call(env, ask(1), null);
    expect((await res.json()).lines[0].text).toBe("The frost melted fast.");
    expect(env.AI.run).toHaveBeenCalledTimes(2);
  });

  test("uses the week's own words, ignoring any the request sends", async () => {
    const { env } = makeEnv([set1]);
    await call(env, ask(0, { words: ["evil"] }));
    expect(env.AI.run.mock.calls[0][1].messages[0].content).toContain("frost, stamp, stump, crisp");
    expect(env.AI.run.mock.calls[0][1].messages[0].content).not.toContain("evil");
  });

  test("later sets are told what's already been written", async () => {
    const { env } = makeEnv([set1, set2]);
    await call(env, ask(0));
    await call(env, ask(1));
    expect(env.AI.run.mock.calls[1][1].messages[0].content).toContain("Frost covered the grass.");
  });

  test("sentences without a lesson word are dropped, and a poor set is not saved", async () => {
    const { env, store } = makeEnv([sentences("Nothing relevant.", "Still nothing.", "No luck.", "Nope.")]);
    const res = await call(env, ask(0));
    expect(res.status).toBe(502);
    expect(store.size).toBe(0); // nothing saved, and a failed try isn't counted against the daily limit
  });

  test("built-in weeks are English only, and bad requests are refused", async () => {
    const { env } = makeEnv();
    expect((await call(env, ask(0, { language: "fr-FR" }))).status).toBe(400);
    expect((await call(env, ask(0, { language: "xx" }))).status).toBe(400);
    expect((await call(env, ask(MAX_AI_SETS))).status).toBe(400);
    expect((await call(env, ask(0, { shared: { yearSlug: "year9", week: 1 } }))).status).toBe(400);
  });

  test("a signed-in person has a daily limit on new sets", async () => {
    const { env, store } = makeEnv([set1]);
    store.set(`use:user-1:${new Date().toISOString().slice(0, 10)}`, String(DAILY_AI_LIMIT));
    expect((await call(env, ask(0))).status).toBe(429);
    expect(env.AI.run).not.toHaveBeenCalled();
  });

  test("a bad token counts as signed out", async () => {
    const { env } = makeEnv([set1]);
    expect((await call(env, ask(0), "bad")).status).toBe(401);
  });
});

describe("dictation function: your own lesson", () => {
  test("is written fresh each time and never stored", async () => {
    const own = sentences("Frost covered the grass.", "She licked the stamp.");
    const { env, store } = makeEnv([own]);
    const res = await call(env, { n: 0, language: "fr-FR", words: ["frost", "stamp"], yearSlug: "year3", avoid: ["old one"] });
    expect(res.status).toBe(200);
    expect(env.AI.run.mock.calls[0][1].messages[0].content).toContain("- old one");
    expect([...store.keys()].some((k) => k.startsWith("dict:"))).toBe(false);
  });

  test("needs a sign-in even for the first set", async () => {
    const { env } = makeEnv();
    expect((await call(env, { n: 0, language: "en-GB", words: ["frost"] }, null)).status).toBe(401);
  });
});
