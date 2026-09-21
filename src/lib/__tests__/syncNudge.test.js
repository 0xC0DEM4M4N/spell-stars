import { shouldShowNudge, quietNudge, NUDGE_KEY, NUDGE_MIN_WORDS, NUDGE_QUIET_DAYS, practisedWordCount } from "../syncNudge";

const st = { box: 1, dueDate: "2026-09-10", attempts: 1, correctCount: 1, lastResult: "correct", lastSeen: "2026-09-09" };
const words = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => ["year3:w" + i, st]));
const put = (n) => window.localStorage.setItem("spellstars.year3.progress", JSON.stringify({ v: 2, currentWeek: 1, words: words(n) }));
const DAY = 86400000;

beforeEach(() => window.localStorage.clear());

test("stays quiet until there is something worth keeping", () => {
  put(NUDGE_MIN_WORDS - 1);
  expect(shouldShowNudge(window.localStorage)).toBe(false);
  put(NUDGE_MIN_WORDS);
  expect(shouldShowNudge(window.localStorage)).toBe(true);
});

test("counts across years", () => {
  put(10);
  window.localStorage.setItem("spellstars.year4.progress", JSON.stringify({ v: 2, currentWeek: 1, words: words(5) }));
  expect(practisedWordCount(window.localStorage)).toBe(15);
});

test("quiet for a month after being dismissed or after a backup", () => {
  put(NUDGE_MIN_WORDS);
  const t0 = Date.UTC(2026, 8, 21);
  quietNudge(window.localStorage, t0);
  expect(shouldShowNudge(window.localStorage, t0 + DAY)).toBe(false);
  expect(shouldShowNudge(window.localStorage, t0 + (NUDGE_QUIET_DAYS - 1) * DAY)).toBe(false);
  expect(shouldShowNudge(window.localStorage, t0 + (NUDGE_QUIET_DAYS + 1) * DAY)).toBe(true);
});

test("unreadable data never throws", () => {
  window.localStorage.setItem(NUDGE_KEY, "{bad");
  expect(shouldShowNudge(window.localStorage)).toBe(false);
});
