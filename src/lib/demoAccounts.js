// A stand-in for the account service, for trying the sign-in screens and the
// sync without setting anything up. Turn it on with REACT_APP_ACCOUNTS_DEMO=true.
//
// It only mimics the few calls the site makes. "Signing in" accepts any email
// address; the code is always 000000 (no email is sent). The "cloud" is kept in
// this browser's localStorage, so it is NOT a real second device: to pretend to
// be one, sign in, sync, clear your lessons, then sync again.
// Never enable this on the live site.

const SESSION_KEY = "spellstars.demoSession";
const CLOUD_KEY = "spellstars.demoCloud";
export const DEMO_CODE = "000000";

const read = (key, fallback) => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(key));
    return raw === null || raw === undefined ? fallback : raw;
  } catch (err) {
    return fallback;
  }
};
const write = (key, value) => window.localStorage.setItem(key, JSON.stringify(value));
const idFor = (email) => "demo-" + btoa(email.toLowerCase()).replace(/[^a-z0-9]/gi, "").slice(0, 20);
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export function createDemoClient() {
  const listeners = new Set();
  const current = () => read(SESSION_KEY, null);
  const emit = () => listeners.forEach((fn) => fn("TOKEN", current()));

  const table = () => {
    let uid = null;
    const api = {
      select: () => api,
      eq: (_col, value) => {
        uid = value;
        return api;
      },
      async maybeSingle() {
        await wait();
        const row = read(CLOUD_KEY, {})[uid];
        return { data: row ? { data: row.data } : null, error: null };
      },
      async upsert(row) {
        await wait();
        write(CLOUD_KEY, { ...read(CLOUD_KEY, {}), [row.user_id]: row });
        return { error: null };
      },
      delete: () => ({
        eq: async (_col, value) => {
          await wait();
          const all = read(CLOUD_KEY, {});
          delete all[value];
          write(CLOUD_KEY, all);
          return { error: null };
        },
      }),
    };
    return api;
  };

  return {
    auth: {
      async getSession() {
        return { data: { session: current() } };
      },
      onAuthStateChange(fn) {
        listeners.add(fn);
        return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } };
      },
      async signInWithOtp({ email }) {
        await wait();
        if (!/^\S+@\S+\.\S+$/.test(email)) return { error: { message: "invalid email" } };
        return { error: null };
      },
      async verifyOtp({ email, token }) {
        await wait();
        if (token !== DEMO_CODE) return { error: { message: "bad code" } };
        write(SESSION_KEY, { user: { id: idFor(email), email } });
        emit();
        return { error: null };
      },
      async signOut() {
        window.localStorage.removeItem(SESSION_KEY);
        emit();
        return { error: null };
      },
    },
    from: () => table(),
    async rpc() {
      await wait();
      const session = current();
      if (session) {
        const all = read(CLOUD_KEY, {});
        delete all[session.user.id];
        write(CLOUD_KEY, all);
      }
      return { error: null };
    },
  };
}
