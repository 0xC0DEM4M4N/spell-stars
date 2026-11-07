// Who is signed in, plus the background sync of lessons and series.
//
// useAccount() is for pages. <AccountSyncRunner /> (below) is mounted once in
// the app and does the syncing: when someone signs in, when lessons change,
// and when the tab comes back into view.
import { useEffect, useSyncExternalStore } from "react";
import { getSupabase } from "./supabaseClient";
import { syncLessons } from "./cloudSync";
import { CHANGED_EVENT } from "./deletions";

// ── Sign-in state ──────────────────────────────────────────────────────

let auth = { ready: false, user: null };
const authListeners = new Set();
let authStarted = false;

function setAuth(next) {
  auth = next;
  authListeners.forEach((fn) => fn());
}

function startAuth() {
  if (authStarted) return;
  authStarted = true;
  const client = getSupabase();
  if (!client) {
    setAuth({ ready: true, user: null });
    return;
  }
  client.auth.getSession().then(({ data }) => setAuth({ ready: true, user: (data.session && data.session.user) || null }));
  client.auth.onAuthStateChange((_event, session) => setAuth({ ready: true, user: (session && session.user) || null }));
}

const subscribeAuth = (fn) => {
  startAuth();
  authListeners.add(fn);
  return () => authListeners.delete(fn);
};

// ── Sync state ─────────────────────────────────────────────────────────

let sync = { state: "idle", message: "", lastAt: null };
const syncListeners = new Set();
const setSync = (next) => {
  sync = { ...sync, ...next };
  syncListeners.forEach((fn) => fn());
};
const subscribeSync = (fn) => {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
};

let running = false;
let queued = false;

export async function runSync() {
  const client = getSupabase();
  if (!client || !auth.user) return { ok: false, error: "Not signed in." };
  if (running) {
    queued = true;
    return { ok: true, queued: true };
  }
  running = true;
  setSync({ state: "syncing", message: "" });
  let result;
  try {
    result = await syncLessons(client, auth.user.id);
  } catch (err) {
    result = { ok: false, error: "Couldn't sync. Check your connection and try again." };
  }
  running = false;
  if (result.ok) setSync({ state: "done", message: "", lastAt: Date.now(), last: result });
  else setSync({ state: "error", message: result.error });
  if (queued) {
    queued = false;
    runSync();
  }
  return result;
}

// ── Hooks and the runner ───────────────────────────────────────────────

export function useAccount() {
  const a = useSyncExternalStore(subscribeAuth, () => auth, () => auth);
  const s = useSyncExternalStore(subscribeSync, () => sync, () => sync);
  const client = getSupabase();
  return {
    enabled: Boolean(client),
    ready: a.ready,
    user: a.user,
    sync: s,
    syncNow: runSync,
    async sendLink(email) {
      const res = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/account", shouldCreateUser: true },
      });
      return res.error ? { ok: false, error: friendly(res.error) } : { ok: true };
    },
    async verifyCode(email, token) {
      const res = await client.auth.verifyOtp({ email, token: token.trim(), type: "email" });
      return res.error ? { ok: false, error: "That code didn't work. Check it, or ask for a new one." } : { ok: true };
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}

function friendly(error) {
  const msg = String((error && error.message) || "");
  if (/rate limit|too many|seconds/i.test(msg)) return "Please wait a minute before asking for another link.";
  if (/invalid.*email|email.*invalid/i.test(msg)) return "That doesn't look like an email address.";
  return "We couldn't send the link. Check the address and try again.";
}

/** Mount once. Renders nothing. */
export function AccountSyncRunner() {
  const { user } = useAccount();
  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) return undefined;
    let timer = null;
    let lastRun = Date.now();
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastRun = Date.now();
        runSync();
      }, 1500);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRun > 30000) soon();
    };
    runSync();
    window.addEventListener(CHANGED_EVENT, soon);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", soon);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(CHANGED_EVENT, soon);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", soon);
    };
  }, [userId]);

  return null;
}
