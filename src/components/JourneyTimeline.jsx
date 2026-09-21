import { motion } from "framer-motion";
import { revealOnScroll } from "@/lib/motion";
import { JOURNEYS } from "@/content/journeys";

// A vertical timeline: a rail with a numbered card per step, then a note.
// `journey` picks the content ("digital" or "offline") and the accent
// colour. Colours come from the site's theme tokens so it reads in every
// theme (light, dark, dyslexia-friendly, high contrast).

const Svg = ({ className, children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS = {
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5c2.2-1 5-1 8 0 3-1 5.8-1 8 0v13c-2.2-1-5-1-8 0-3-1-5.8-1-8 0v-13z" />
      <path d="M12 5.5V19" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3M16 3v3" />
    </>
  ),
  sheet: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.6" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </>
  ),
  checklist: (
    <>
      <path d="M9 4H6.5A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0017.5 4H15" />
      <rect x="9" y="3" width="6" height="3.4" rx="0.8" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.3 9.6a2.7 2.7 0 015.2 1c0 1.7-2.5 1.9-2.5 3.6" />
      <path d="M12 17.3h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3" />
      <path d="M18 4v3h-3M6 20v-3h3" />
    </>
  ),
  clock: (
    <>
      <path d="M12 8v4l3 2" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
};

const Icon = ({ name, className }) => <Svg className={className}>{ICONS[name]}</Svg>;

const TONES = {
  digital: {
    text: "text-primary",
    node: "bg-primary/10 ring-1 ring-inset ring-primary/40",
    note: "border-amber-300/20 bg-amber-400/5 text-warning",
    noteIcon: "text-warning",
  },
  offline: {
    text: "text-warning",
    node: "bg-amber-400/10 ring-1 ring-inset ring-amber-400/40",
    note: "border-foreground/10 text-muted-foreground",
    noteIcon: "text-muted-foreground",
  },
};

export function JourneyTimeline({ journey }) {
  const { count, steps, note } = JOURNEYS[journey];
  const tone = TONES[journey];

  return (
    <div className="max-w-3xl" data-testid={`journey-${journey}`}>
      <div className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{count}</div>

      <ol className="relative list-none space-y-6 pl-[46px] sm:pl-[54px]">
        <div
          className={`absolute bottom-2.5 left-[17px] top-2.5 w-0.5 opacity-40 sm:left-[19px] ${tone.text}`}
          style={{ background: "linear-gradient(currentColor, transparent 96%)" }}
          aria-hidden="true"
        />
        {steps.map((step, index) => (
          <motion.li key={step.title} {...revealOnScroll(index)} className="relative">
            <span
              className={`absolute -left-[46px] top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:-left-[54px] sm:h-10 sm:w-10 ${tone.node} ${tone.text}`}
              aria-hidden="true"
            >
              <Icon name={step.icon} className="h-[19px] w-[19px]" />
            </span>
            <div className="holo-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="type-card font-display text-base font-bold text-foreground">{step.title}</h3>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-2 max-w-[60ch] type-body text-sm text-muted-foreground">{step.body}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      <p className={`mt-7 flex items-start gap-3 rounded-xl border p-4 text-sm ${tone.note}`}>
        <Icon name={note.icon} className={`mt-0.5 h-[17px] w-[17px] shrink-0 ${tone.noteIcon}`} />
        <span>{note.text}</span>
      </p>
    </div>
  );
}
