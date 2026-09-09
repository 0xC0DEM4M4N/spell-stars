// Turns a year's weekOfYear number into a real calendar "week
// commencing" date, anchored to the autumn term's start Monday. Every
// year shares this anchor — a school year starts on the same date
// regardless of which year group you're in, even though the number of
// weeks (and what's taught in week 1) can differ per year.
const TERM_START = new Date(2026, 8, 7); // 7 Sep 2026 (month is 0-indexed)

export function getWeekStartDate(weekOfYear) {
  const d = new Date(TERM_START);
  d.setDate(d.getDate() + (weekOfYear - 1) * 7);
  return d;
}

export function formatWeekCommencing(weekOfYear) {
  const d = getWeekStartDate(weekOfYear);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  return `W/C ${day} ${month} ${d.getFullYear()}`;
}
