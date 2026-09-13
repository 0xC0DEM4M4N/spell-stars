// Word Search letter-case preference — persisted app-wide (not per-year),
// mirroring timerPrefs.js. A year's capabilities.wordSearchGrid.letterCase
// is still the *default* the first time someone plays (e.g. Reception
// grids default to lowercase, matching what's taught first), but once a
// user picks a case in the game they mean it for every week after that.

const STORAGE_KEY = "spellstars.letterCasePref";

export function loadLetterCasePref() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "uppercase" || raw === "lowercase" ? raw : null;
  } catch (err) {
    return null;
  }
}

export function saveLetterCasePref(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch (err) {
    // Storage unavailable — the choice still works this session, just
    // won't be remembered next time. Not fatal.
  }
}
