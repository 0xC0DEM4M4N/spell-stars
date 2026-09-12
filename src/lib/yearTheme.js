/**
 * Per-year accent colours — a progression across the cyan family, lightest
 * for Reception through deepest for Year 6, used to tie the "choose a
 * year" cards on the homepage to that year's own page.
 */
export const YEAR_ACCENTS = {
  reception: "#a5f3fc", // cyan-200
  year1: "#67e8f9", // cyan-300
  year2: "#22d3ee", // cyan-400
  year3: "#06b6d4", // cyan-500
  year4: "#0891b2", // cyan-600
  year5: "#0e7490", // cyan-700
  year6: "#155e75", // cyan-800
};

export const YEAR_ORDER = ["reception", "year1", "year2", "year3", "year4", "year5", "year6"];

export function getYearAccent(slug) {
  return YEAR_ACCENTS[slug] || YEAR_ACCENTS.year2;
}

export function getYearDepth(slug) {
  const index = YEAR_ORDER.indexOf(slug);
  return index === -1 ? 2 : index;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h, s;
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) {
    h = 0;
    s = 0;
  } else {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

/**
 * The per-year accent hexes above are tuned to pop against the app's dark
 * background -- even the deepest of them (year6) is still far lighter
 * than a near-black page. On a light background that ramp inverts: the
 * paler swatches (reception, year1, year2...) fall well under WCAG
 * contrast as text. getYearInk keeps the same hue per year (so the
 * per-year colour identity survives) but clamps lightness/saturation to
 * a value that reads clearly as text on a light card, and leaves dark
 * theme untouched since the raw accent already works there.
 */
export function getYearInk(slug, theme) {
  const hex = getYearAccent(slug);
  if (theme === "light" || theme === "dyslexia" || theme === "highContrast") {
    const { h, s } = hexToHsl(hex);
    return hslToHex(h, Math.max(s, 0.55), 0.28);
  }
  return hex;
}
