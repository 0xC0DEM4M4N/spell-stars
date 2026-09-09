// Word Search timer preferences — persisted app-wide (not per-year),
// since "which timer style do I like" is a user preference, not
// curriculum content. Defaults to a 3-minute countdown the first time.

const STORAGE_KEY = "spellstars.timerPrefs";
const DEFAULT_PREFS = { mode: "countdown", countdownSeconds: 180 };

export function loadTimerPrefs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    const countdownSeconds = Number(parsed?.countdownSeconds);
    return {
      mode: parsed?.mode === "countup" ? "countup" : "countdown",
      countdownSeconds: Number.isFinite(countdownSeconds) && countdownSeconds > 0
        ? countdownSeconds
        : DEFAULT_PREFS.countdownSeconds,
    };
  } catch (err) {
    return { ...DEFAULT_PREFS };
  }
}

export function saveTimerPrefs(prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    // Storage unavailable — timer still works this session, just won't
    // remember the choice next time. Not fatal.
  }
}
