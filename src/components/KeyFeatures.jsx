import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { KEY_FEATURES, KEY_FEATURES_HEADING, KEY_FEATURES_LEDE } from "@/content/siteContent";
import { PRESS, SPRING, revealOnScroll } from "@/lib/motion";

const resolveBody = (feature, context) => (typeof feature.body === "function" ? feature.body(context) : feature.body);

function FeatureTile({ feature, index, context }) {
  const Icon = feature.icon;
  const big = Boolean(feature.big);

  const inner = (
    <>
      <span
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground ${big ? "h-14 w-14" : "h-11 w-11"}`}
        aria-hidden="true"
      >
        <Icon className={big ? "h-7 w-7" : "h-5 w-5"} />
      </span>
      <h3 className={`mt-5 type-card font-display font-extrabold text-foreground ${big ? "text-2xl" : "text-lg"}`}>{feature.title}</h3>
      <p className={`mt-2 type-body text-muted-foreground ${big ? "text-base" : "text-sm"}`}>{resolveBody(feature, context)}</p>
      {feature.to && (
        <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-primary">
          {feature.cta}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </span>
      )}
    </>
  );

  const shape = big
    ? "border-primary/40 bg-primary/10 p-6 sm:p-7"
    : "border-foreground/10 bg-foreground/[0.03] p-5";
  const base = `group relative flex h-full flex-col rounded-3xl border ${shape}`;

  return (
    <motion.li
      {...revealOnScroll(index)}
      whileHover={feature.to ? { y: -4, transition: SPRING.settle } : undefined}
      whileTap={feature.to ? { ...PRESS, transition: SPRING.snappy } : undefined}
      className={big ? "sm:col-span-2 lg:col-span-4" : "lg:col-span-3"}
      data-testid={`key-feature-${feature.id}`}
    >
      {feature.to ? (
        <Link
          to={feature.to}
          className={`${base} transition-colors duration-300 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
        >
          {inner}
        </Link>
      ) : (
        <div className={base}>{inner}</div>
      )}
    </motion.li>
  );
}

/**
 * "Why use it": the reasons to choose SPELL// STARS, right under the hero.
 * The three things people ask about most (progress, moving between devices,
 * their own words) get the big tiles; the rest follow in a tighter grid.
 * The copy lives in content/siteContent.js.
 */
export function KeyFeatures({ totalWords }) {
  const context = { totalWords };
  const big = KEY_FEATURES.filter((f) => f.big);
  const rest = KEY_FEATURES.filter((f) => !f.big);

  return (
    <section
      id="features"
      aria-labelledby="key-features-heading"
      className="relative overflow-hidden border-b border-foreground/10 px-5 py-16 sm:px-8 sm:py-20"
      data-testid="key-features-section"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Why SPELL// STARS</div>
        <h2 id="key-features-heading" className="mt-3 max-w-5xl type-display font-display text-4xl font-extrabold text-foreground sm:text-5xl lg:text-6xl">
          {KEY_FEATURES_HEADING.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <p className="mt-5 max-w-2xl type-body text-base text-muted-foreground sm:text-lg">{KEY_FEATURES_LEDE}</p>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12" data-testid="key-features-list">
          {big.map((feature, i) => (
            <FeatureTile key={feature.id} feature={feature} index={i} context={context} />
          ))}
          {rest.map((feature, i) => (
            <FeatureTile key={feature.id} feature={feature} index={big.length + i} context={context} />
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="#years"
            className="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            data-testid="key-features-years-link"
          >
            Pick your year <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" aria-hidden="true" />
          </a>
          <Link
            to="/custom"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-6 py-3 font-semibold text-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            data-testid="key-features-custom-link"
          >
            Or use your own words
          </Link>
        </div>
      </div>
    </section>
  );
}
