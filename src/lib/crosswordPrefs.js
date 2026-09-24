// Which kind of clue the person likes: "sentence" (the example sentence with
// the word blanked out) or "meaning". Remembered on this device; used by the
// on-screen crossword and by the print menu.

const KEY = "spellstars.crosswordClues";

export function loadCrosswordClueMode() {
  try {
    return window.localStorage.getItem(KEY) === "meaning" ? "meaning" : "sentence";
  } catch (err) {
    return "sentence";
  }
}

export function saveCrosswordClueMode(mode) {
  try {
    window.localStorage.setItem(KEY, mode === "meaning" ? "meaning" : "sentence");
  } catch (err) {
    // The choice just won't be remembered.
  }
}
