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
