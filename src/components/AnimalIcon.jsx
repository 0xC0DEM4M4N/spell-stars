// The one icon set for every status tier (see lib/badges.js's STATUS_TIERS)
// — used on the My progress banner, the badge grid and the printed
// certificate, so the same character always means the same thing wherever
// it appears. Simple stroke-based line art, drawn in the same visual
// language as the lucide icons used everywhere else in the app.
const PATHS = {
  mouse: (
    <>
      <circle cx="12" cy="14" r="6" />
      <circle cx="7.5" cy="7" r="2.6" />
      <circle cx="16.5" cy="7" r="2.6" />
      <circle cx="10" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M12 15.5l-.9 1.2h1.8L12 15.5z" fill="currentColor" stroke="none" />
      <path d="M18 16c2.2 1 3.3 3.4 2 5.4" />
    </>
  ),
  rabbit: (
    <>
      <ellipse cx="9" cy="6" rx="1.8" ry="5" transform="rotate(-12 9 6)" />
      <ellipse cx="15" cy="6" rx="1.8" ry="5" transform="rotate(12 15 6)" />
      <circle cx="12" cy="15.5" r="6" />
      <circle cx="10" cy="15" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="15" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  fox: (
    <>
      <path d="M6.3 8.3l-2.3-4.6 4.4 2.4" />
      <path d="M17.7 8.3l2.3-4.6-4.4 2.4" />
      <path d="M12 8.8c5.3 0 7.7 4.1 7.7 7.4a7.7 7.7 0 01-15.4 0c0-3.3 2.4-7.4 7.7-7.4z" />
      <circle cx="9.1" cy="15.8" r="0.65" fill="currentColor" stroke="none" />
      <circle cx="14.9" cy="15.8" r="0.65" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.2" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  owl: (
    <>
      <path d="M8 5.5l-1.3-3M16 5.5l1.3-3" />
      <circle cx="12" cy="13.5" r="7.2" />
      <circle cx="9" cy="12.5" r="2.2" />
      <circle cx="15" cy="12.5" r="2.2" />
      <circle cx="9" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <path d="M12 15l-1 1.6h2L12 15z" fill="currentColor" stroke="none" />
    </>
  ),
  eagle: (
    <>
      <path d="M12 6.8c1.1 0 2 .9 2 1.8l-2 1-2-1c0-.9.9-1.8 2-1.8z" />
      <path d="M2.2 17.5c3.2-5.2 7-6.3 9.8-6.3s6.6 1.1 9.8 6.3c-4-1.1-6.9-2.9-9.8-2.9s-5.8 1.8-9.8 2.9z" />
    </>
  ),
  star: <path d="M12 3l2.5 5.4L20.5 9l-4.3 4 .9 6.2L12 16.3l-5.1 2.9.9-6.2L3.5 9l6-.6L12 3z" />,
  shootingstar: (
    <>
      <path d="M3.5 20.5l6-6" />
      <path d="M3 22l1.4-.5.5-1.4" />
      <path d="M15 3.5l1.6 3.4 3.8.4-2.8 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.8-2.6 3.8-.4L15 3.5z" />
    </>
  ),
  constellation: (
    <>
      <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
      <path d="M5 17L9.5 8.5l6.5 3.5 3-7" />
    </>
  ),
  galaxy: (
    <>
      <path d="M12 12c0-1.6.9-2.6 2.2-2.6 1.3 0 2.4.9 2.4 2.1 0 1-.7 1.7-1.7 1.7" />
      <path d="M12 12c1.8 0 3.2-1.3 3.2-3.2 0-2.3-2-4-4.5-4-3 0-5.3 2.3-5.3 5.3 0 3.6 2.9 6.5 6.5 6.5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="7" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="17" cy="18.5" r="0.45" fill="currentColor" stroke="none" />
    </>
  ),
};

/** One status tier's icon, drawn at the current text color. */
export function AnimalIcon({ kind, className = "h-6 w-6", title }) {
  const content = PATHS[kind] || PATHS.mouse;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  );
}

/** The icon in its usual coloured, circular medallion. `dim` fades it for a
 * not-yet-reached next tier. */
export function AnimalMedal({ kind, title, size = "h-16 w-16", dim = false }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition-opacity ${size} ${dim ? "opacity-40 grayscale" : ""}`}
      aria-hidden={title ? undefined : "true"}
    >
      <AnimalIcon kind={kind} title={dim ? undefined : title} className="h-[58%] w-[58%]" />
    </div>
  );
}
