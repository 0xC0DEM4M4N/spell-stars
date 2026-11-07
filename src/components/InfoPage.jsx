import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ART_BY_PATH, PageArt } from "@/components/PageArt";
import { useYearsConfig } from "@/lib/yearData";
import { SPRING, revealOnScroll } from "@/lib/motion";

export const INFO_PAGES = [
  { to: "/how-it-works", label: "How it works", blurb: "Practice, word searches and how a week runs." },
  { to: "/digital-journey", label: "The digital journey", blurb: "Four daily ways to practise on screen." },
  { to: "/offline-journey", label: "The offline journey", blurb: "Five steps that take the list onto paper and out loud." },
  { to: "/for-educators", label: "For educators & parents", blurb: "Pacing, differentiation and an offline routine." },
  { to: "/faq", label: "FAQs", blurb: "Year groups, practice time, progress and more." },
  { to: "/about", label: "About", blurb: "Why spelling still matters, and who made this." },
  { to: "/feedback", label: "Give feedback", blurb: "Request a feature, report an error, or share a thought." },
];

/**
 * Shell for the long-form pages: shared header, a title band, the page's
 * own sections, links onward to the other pages, and the site footer.
 * `children` can be a function, which receives `{ totalYears }` from the
 * years config for copy that quotes it.
 */
export function InfoPage({ path, title, description, eyebrow, heading, intro, art, children }) {
  const { yearsConfig } = useYearsConfig();
  const totalYears = yearsConfig?.years.length;
  const totalWords = yearsConfig?.years.reduce((sum, y) => sum + (y.wordCount || 0), 0);
  const others = INFO_PAGES.filter((page) => page.to !== path);
  const picture = art !== undefined ? art : ART_BY_PATH[path] ? <PageArt name={ART_BY_PATH[path]} /> : null;

  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      {/* React 19 hoists these into <head> and restores the defaults on
          unmount -- see YearIndex.jsx. */}
      <title>{`${title} | SPELL// STARS`}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`https://spell-stars.pages.dev${path}`} />

      <SiteHeader />

      <div className="hero-grid px-5 pb-10 pt-28 sm:px-8 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.reveal}
          className="mx-auto max-w-7xl"
        >
          <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors duration-300 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <div className="mt-8 flex items-center justify-between gap-10">
            <div className="min-w-0">
              <div className="font-mono text-xs text-primary">{eyebrow}</div>
              <h1 className="mt-3 max-w-3xl type-section font-display text-4xl font-extrabold text-foreground sm:text-5xl" data-testid="info-page-title">
                {heading}
              </h1>
              <p className="mt-5 max-w-2xl type-body text-base text-muted-foreground">{intro}</p>
            </div>
            {picture && (
              <div className="hidden shrink-0 lg:block" aria-hidden="true">
                {picture}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* A clear gap between the header band and whatever the page starts with. */}
      <div aria-hidden="true" className="h-8 sm:h-10" />

      {typeof children === "function" ? children({ totalYears }) : children}

      <section className="px-5 pb-16 pt-6 sm:px-8" data-testid="keep-exploring">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs text-primary">Keep exploring</div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {others.map((page) => (
              <TeaserLink key={page.to} {...page} />
            ))}
            <TeaserLink to="/#years" label="Pick a year" blurb="Reception to Year 6, one week at a time." />
          </div>
        </div>
      </section>

      <SiteFooter totalWords={totalWords} teachingWeeks={yearsConfig?.totalWeeks} />
    </div>
  );
}

export function TeaserLink({ to, label, blurb, icon: Icon, index }) {
  return (
    <motion.div
      {...(index != null ? revealOnScroll(index) : {})}
      whileHover={{ y: -3, transition: SPRING.settle }}
      whileTap={{ scale: 0.985, transition: SPRING.snappy }}
    >
      <Link
        to={to}
        className="group flex h-full items-start justify-between gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 transition-colors duration-300 hover:border-primary/40"
      >
        <span>
          {Icon && <Icon className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />}
          <span className="block type-card font-display text-lg font-bold text-foreground">{label}</span>
          <span className="mt-1.5 block type-body text-sm text-muted-foreground">{blurb}</span>
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
