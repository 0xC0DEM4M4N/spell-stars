// Cloudflare Pages Function backing the "Give feedback" form. Runs
// server-side on the same domain as the site — no separate backend
// service to stand up.
//
// One-time setup, in the Cloudflare Pages dashboard for this project
// (Settings -> Functions):
//   1. Create a KV namespace (Workers & Pages -> KV) and bind it to this
//      project as FEEDBACK_KV.
//   2. Add an environment variable ADMIN_PASSWORD (mark it "Encrypt") —
//      this is what unlocks the /admin/feedback page. Pick a long,
//      random value; anyone who has it can read every submission.
// Redeploy after either change, since Functions env bindings are read
// at deploy/build time.
//
// POST { category, message } -> stores one anonymous entry, no IP or
// identity captured beyond what Cloudflare logs at the edge regardless.
// GET with header "Authorization: Bearer <ADMIN_PASSWORD>" -> lists all
// entries, newest first. DELETE ?id=<id> with the same header removes one.

const CATEGORIES = new Set(["feature", "bug", "feedback"]);
const MAX_MESSAGE_LENGTH = 4000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const isAuthorized = (request, env) => {
  const header = request.headers.get("Authorization") || "";
  const password = header.replace(/^Bearer\s+/i, "");
  return Boolean(env.ADMIN_PASSWORD) && password === env.ADMIN_PASSWORD;
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const message = String(body?.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return json({ error: "Message is required." }, 400);
  const category = CATEGORIES.has(body?.category) ? body.category : "feedback";

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const entry = { id, category, message, createdAt: new Date().toISOString() };
  await env.FEEDBACK_KV.put(`fb:${id}`, JSON.stringify(entry));

  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);

  const list = await env.FEEDBACK_KV.list({ prefix: "fb:" });
  const entries = (await Promise.all(list.keys.map((k) => env.FEEDBACK_KV.get(k.name, "json")))).filter(Boolean);
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return json({ entries });
}

export async function onRequestDelete({ request, env }) {
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing id." }, 400);
  await env.FEEDBACK_KV.delete(`fb:${id}`);

  return json({ ok: true });
}
