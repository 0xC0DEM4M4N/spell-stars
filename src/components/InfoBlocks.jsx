import { motion } from "framer-motion";
import { revealOnScroll } from "@/lib/motion";
import { LineArt } from "@/components/LineArt";

// Shared building blocks for the long-form pages (/how-it-works,
// /for-educators, /faq). Markup and classes match what the home page
// used before the content was split out, so the pages look the same.

export const Section = ({ id, testId, eyebrow, title, intro, art, children, className = "py-8" }) => (
  <section id={id} className={`px-5 sm:px-8 ${className}`} data-testid={testId}>
    <div className="mx-auto max-w-7xl">
      {/* A solid panel, so the text never sits straight on the page's grid. */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div className={art ? "grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]" : ""}>
          <div>
            {eyebrow && (
              <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{eyebrow}</div>
            )}
            <h2 className="mt-4 max-w-2xl type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h2>
            {intro && <p className="mt-4 max-w-2xl type-body text-base text-foreground/80">{intro}</p>}
          </div>
          {art && <LineArt name={art} className="mx-auto hidden w-full max-w-[17rem] lg:block" />}
        </div>
        {children}
      </div>
    </div>
  </section>
);

const COLS = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

// Solid cards: an outlined icon, a clear title, a readable paragraph.
export const CardGrid = ({ items, cols = 4 }) => (
  <div className={`mt-8 grid grid-cols-1 gap-4 ${COLS[cols]}`}>
    {items.map((item, index) => (
      <motion.div key={item.title} {...revealOnScroll(index)} className="rounded-2xl border border-border bg-background p-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/50 bg-primary/5" aria-hidden="true">
          <item.icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
        </span>
        <h3 className="mt-5 type-card font-display text-lg font-bold text-foreground">{item.title}</h3>
        <p className="mt-2 type-body text-base text-foreground/80">{item.body}</p>
      </motion.div>
    ))}
  </div>
);

// Numbered steps, one per row: the number, then what to do, in full-width
// cards so the longer descriptions stay easy to read.
export const StepRow = ({ items }) => (
  <ol className="mt-8 space-y-4">
    {items.map((item, index) => (
      <motion.li key={item.step} {...revealOnScroll(index)} className="flex items-start gap-4 rounded-2xl border border-border bg-background p-5 sm:gap-6 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary font-display text-lg font-bold text-primary">
          {String(item.step).replace(/\D/g, "") || index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 type-card font-display text-lg font-bold text-foreground">
            {item.icon && <item.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.6} aria-hidden="true" />}
            {item.title}
          </h3>
          <p className="mt-2 max-w-3xl type-body text-base text-foreground/80">{item.body}</p>
        </div>
      </motion.li>
    ))}
  </ol>
);
