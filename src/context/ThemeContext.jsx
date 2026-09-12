// Global display/accessibility preferences: theme, text scale and reduced
// motion. These are device/user preferences (not tied to which year a
// child is practising), so this context sits above the router in App.js
// and is read by a single persistent settings icon (AccessibilityMenu).
//
// Each preference is mirrored onto <html> as a data-* attribute (rather
// than kept only in React state) because that's what the CSS in
// index.css actually themes off, and because public/index.html runs an
// inline script that sets the same attributes from localStorage before
// React ever mounts -- this component's initial state just has to agree
// with that script so there's no flash of the wrong theme.
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export const THEMES = ["light", "dark", "dyslexia", "highContrast"];
export const TEXT_SCALES = ["standard", "large", "extraLarge"];
export const DYSLEXIA_FONTS = ["lexend", "opendyslexic"];

const STORAGE_KEYS = {
  theme: "spellstars.theme",
  textScale: "spellstars.textScale",
  reducedMotion: "spellstars.reducedMotion",
  dyslexiaFont: "spellstars.dyslexiaFont",
};

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing / storage disabled -- preference just won't
    // persist across visits, nothing else depends on it.
  }
}

function readInitialTheme() {
  const stored = readStorage(STORAGE_KEYS.theme);
  if (stored && THEMES.includes(stored)) return stored;
  // First visit, no saved preference: follow the OS/browser light-vs-dark
  // setting, same as the FOUC-prevention script in public/index.html.
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readInitialTextScale() {
  const stored = readStorage(STORAGE_KEYS.textScale);
  return stored && TEXT_SCALES.includes(stored) ? stored : "standard";
}

function readInitialReducedMotion() {
  const stored = readStorage(STORAGE_KEYS.reducedMotion);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function readInitialDyslexiaFont() {
  const stored = readStorage(STORAGE_KEYS.dyslexiaFont);
  return stored && DYSLEXIA_FONTS.includes(stored) ? stored : "lexend";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);
  const [textScale, setTextScale] = useState(readInitialTextScale);
  const [reducedMotion, setReducedMotion] = useState(readInitialReducedMotion);
  const [dyslexiaFont, setDyslexiaFont] = useState(readInitialDyslexiaFont);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeStorage(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-text-scale", textScale);
    writeStorage(STORAGE_KEYS.textScale, textScale);
  }, [textScale]);

  useEffect(() => {
    document.documentElement.setAttribute("data-reduced-motion", String(reducedMotion));
    writeStorage(STORAGE_KEYS.reducedMotion, String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.setAttribute("data-dyslexia-font", dyslexiaFont);
    writeStorage(STORAGE_KEYS.dyslexiaFont, dyslexiaFont);
  }, [dyslexiaFont]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      textScale,
      setTextScale,
      reducedMotion,
      setReducedMotion,
      dyslexiaFont,
      setDyslexiaFont,
    }),
    [theme, textScale, reducedMotion, dyslexiaFont],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
