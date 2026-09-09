// Whether the "what does this scope mean?" explainer (shown the first time
// someone picks "By term" / "By all up to now") has been permanently
// dismissed. Persisted globally (not per-year) — once you get it, you get
// it everywhere.
const KEY = "spellstars.scopeExplainerDismissed";

export function isScopeExplainerDismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissScopeExplainer() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // ignore — worst case the explainer reappears next time
  }
}
