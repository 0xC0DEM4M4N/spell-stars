import { motion } from "framer-motion";
import { revealOnScroll } from "@/lib/motion";

// Shared building blocks for the long-form pages (/how-it-works,
// /for-educators, /faq). Markup and classes match what the home page
// used before the content was split out, so the pages look the same.

export const Section = ({ id, testId, eyebrow, title, intro, children, className = "py-16" }) => (
  <section id={id} className={`px-5 sm:px-8 ${className}`} data-testid={testId}>
    <div className="mx-auto max-w-7xl">
      {eyebrow && <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">{eyebrow}</div>}
      <h2 className="mt-3 max-w-2xl type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 max-w-2xl type-body text-sm text-muted-foreground">{intro}</p>}
      {children}
    </div>
  </section>
);

const COLS = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

// Rounded glass cards: icon, title, body.
export const CardGrid = ({ items, cols = 4 }) => (
  <div className={`mt-8 grid grid-cols-1 gap-4 ${COLS[cols]}`}>
    {items.map((item, index) => (
      <motion.div key={item.title} {...revealOnScroll(index)} className="holo-card rounded-2xl p-6">
        <item.icon className="h-6 w-6 text-primary" />
        <h3 className="mt-4 type-card font-display text-lg font-bold text-foreground">{item.title}</h3>
        <p className="mt-2 type-body text-sm text-muted-foreground">{item.body}</p>
      </motion.div>
    ))}
  </div>
);

// Numbered steps in a hairline-divided row.
export const StepRow = ({ items }) => (
  <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-foreground/10 bg-foreground/10 sm:grid-cols-5">
    {items.map((item, index) => (
      <motion.div key={item.step} {...revealOnScroll(index)} className="bg-background p-6">
        {item.icon && <item.icon className="h-5 w-5 text-primary" />}
        <div className={`font-mono text-xs text-primary ${item.icon ? "mt-3" : ""}`}>{item.step}</div>
        <h3 className={`type-card font-display text-base font-bold text-foreground ${item.icon ? "mt-2" : "mt-3"}`}>{item.title}</h3>
        <p className="mt-2 type-body text-sm text-muted-foreground">{item.body}</p>
      </motion.div>
    ))}
  </div>
);
