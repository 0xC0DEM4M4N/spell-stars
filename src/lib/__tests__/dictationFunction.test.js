import { onRequestPost, onRequestGet, onRequestDelete } from "../../../functions/api/dictation.js";
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
      delete: async (k) => void store.delete(k),
      list: async ({ prefix }) => ({ keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
    },
    ADMIN_PASSWORD: "secret",
    // Reports token counts, as Workers AI does.
    AI: {
      run: jest.fn(async () => ({
        response: JSON.stringify({ sentences: replies.shift() || [] }),
        usage: { prompt_tokens: 250, completion_tokens: 150, total_tokens: 400 },
      })),
    },
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
    // Nothing saved, and a failed try isn't counted against the person's daily limit.
    expect([...store.keys()].some((k) => k.startsWith("use:"))).toBe(false);
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

const adminCall = (handler, env, { password = "secret", url = "https://site.test/api/dictation" } = {}) =>
  handler({
    request: { url, headers: { get: (h) => (h.toLowerCase() === "authorization" && password ? "Bearer " + password : "") } },
    env,
  });

describe("dictation function: usage report for the admin page", () => {
  const set1 = sentences("Frost covered the grass.", "She licked the stamp.", "He tripped on a stump.", "The crisp was tasty.");

  test("records the day's sets and Neurons from the reported token counts", async () => {
    const { env } = makeEnv([set1]);
    await call(env, ask(0));
    const report = await (await adminCall(onRequestGet, env)).json();
    const today = report.days[report.days.length - 1];
    expect(today.written).toBe(1);
    expect(today.inputTokens).toBe(250);
    expect(today.outputTokens).toBe(150);
    // 250 * 4119 / 1e6 + 150 * 34868 / 1e6 = 1.03 + 5.23
    expect(today.neurons).toBeCloseTo(6.26, 1);
    expect(today.estimated).toBe(false);
    expect(report.allowance).toBe(10000);
  });

  test("a failed try is counted as failed, with the Neurons it still used", async () => {
    const { env } = makeEnv([sentences("Nothing relevant.", "Still nothing.", "No.", "Nope.")]);
    await call(env, ask(0));
    const today = (await (await adminCall(onRequestGet, env)).json()).days[0];
    expect(today.written).toBe(0);
    expect(today.failed).toBe(1);
    expect(today.neurons).toBeGreaterThan(0);
  });

  test("estimates from length when no token counts come back", async () => {
    const { env } = makeEnv([set1]);
    env.AI.run = jest.fn(async () => ({ response: JSON.stringify({ sentences: set1 }) }));
    await call(env, ask(0));
    const today = (await (await adminCall(onRequestGet, env)).json()).days[0];
    expect(today.estimated).toBe(true);
    expect(today.neurons).toBeGreaterThan(0);
  });

  test("lists saved sets, and deletes them so the next person gets a new one", async () => {
    const { env } = makeEnv([set1, set1]);
    await call(env, ask(0));
    let report = await (await adminCall(onRequestGet, env)).json();
    expect(report.lessonCount).toBe(1);
    expect(report.lessons[0].key).toBe("dict:year2|w8|en-GB");
    expect(report.lessons[0].sets).toHaveLength(1);

    expect((await adminCall(onRequestDelete, env, { url: "https://site.test/api/dictation?key=dict%3Ayear2%7Cw8%7Cen-GB" })).status).toBe(200);
    report = await (await adminCall(onRequestGet, env)).json();
    expect(report.lessonCount).toBe(0);
    // Asking again writes a new set.
    expect((await (await call(env, ask(0))).json()).source).toBe("new");
  });

  test("needs the admin password, and only deletes saved sets", async () => {
    const { env, store } = makeEnv();
    expect((await adminCall(onRequestGet, env, { password: "wrong" })).status).toBe(401);
    expect((await adminCall(onRequestGet, env, { password: null })).status).toBe(401);
    expect((await adminCall(onRequestDelete, env, { password: "wrong", url: "https://site.test/api/dictation?key=dict%3Ax" })).status).toBe(401);
    store.set("fb:1", "{}");
    expect((await adminCall(onRequestDelete, env, { url: "https://site.test/api/dictation?key=fb%3A1" })).status).toBe(400);
    expect(store.has("fb:1")).toBe(true);
    delete env.ADMIN_PASSWORD;
    expect((await adminCall(onRequestGet, env, { password: "" })).status).toBe(401);
  });
});

describe("dictation function: stories that suit the year group", () => {
  const withVocab = (env) => {
    const wordsFetch = env.ASSETS.fetch;
    env.ASSETS.fetch = async (url) =>
      String(url).endsWith("/data/vocab.json")
        ? { ok: true, json: async () => ({ words: { frost: [2, 8], stamp: [2, 8], stump: [2, 8], crisp: [2, 8], cat: [1, 1], conscience: [5, 30] } }) }
        : wordsFetch(url);
    return env;
  };
  const story = sentences("A cat found a stamp.", "The stamp lay in the frost.", "The cat sat on a stump.", "It ate a crisp.");

  test("the prompt asks for one short, age-appropriate story and lists what's been covered", async () => {
    const { env } = makeEnv([story]);
    withVocab(env);
    const res = await call(env, ask(0));
    expect(res.status).toBe(200);
    const prompt = env.AI.run.mock.calls[0][1].messages[0].content;
    expect(prompt).toMatch(/one short story/i);
    expect(prompt).toMatch(/no swearing/i);
    expect(prompt).toMatch(/already learned/i);
    expect(prompt).toContain("cat");
    expect(prompt).not.toContain("conscience"); // not covered until Year 5
  });

  test("a sentence with bad language is turned down, and a second try is made", async () => {
    const bad = sentences("A cat found a stamp.", "The damn stamp lay in the frost.", "The cat sat on a stump.", "It ate a crisp.");
    const { env } = makeEnv([bad, story]);
    withVocab(env);
    const res = await call(env, ask(0));
    const body = await res.json();
    expect(env.AI.run).toHaveBeenCalledTimes(2);
    expect(env.AI.run.mock.calls[1][1].messages[0].content).toMatch(/Do not use these words: damn/);
    expect(body.lines.map((l) => l.text)).toEqual(story.map((s) => s.text));
  });

  test("a word the class hasn't reached yet is not allowed, and both tries count towards usage", async () => {
    const future = sentences("A cat found a stamp.", "Her conscience was clear.", "The frost came.", "The cat sat.");
    const { env } = makeEnv([future, future]);
    withVocab(env);
    const res = await call(env, ask(0, { shared: { yearSlug: "year3", week: 8 } }));
    expect(res.status).toBe(502);
    expect(env.AI.run).toHaveBeenCalledTimes(2);
  });

  test("your own lesson with a year group uses coveredWeek, and without one checks the language only", async () => {
    const odd = sentences("The frost was extraordinarily unbelievable.", "A cat sat on the stump.");
    const { env } = makeEnv([odd]);
    withVocab(env);
    const res = await call(env, { n: 0, language: "en-GB", words: ["frost", "stump"], yearSlug: "custom" });
    expect(res.status).toBe(200);
  });
});
