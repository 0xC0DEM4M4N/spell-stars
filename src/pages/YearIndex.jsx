import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDown, ClipboardCheck, MessageCircleQuestion, Plus, Sparkles, Star } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TeaserLink } from "@/components/InfoPage";
import { KeyFeatures } from "@/components/KeyFeatures";
import { useYearsConfig } from "@/lib/yearData";
import { loadLists } from "@/lib/customLists";
import { useTheme } from "@/context/ThemeContext";
import { getYearAccent, getYearDepth, getYearInk, rgba } from "@/lib/yearTheme";
import { PRESS, SPRING, revealOnScroll } from "@/lib/motion";

const HERO_BG_WORDS = [
  { text: "b", top: "10%", left: "4%", rotate: -10, size: "text-6xl", tone: "text-white/[0.15]" },
  { text: "cat", top: "16%", left: "86%", rotate: 9, size: "text-5xl", tone: "text-cyan-200/[0.17]" },
  { text: "wh_re", top: "62%", left: "3%", rotate: -6, size: "text-4xl", tone: "text-white/[0.15]" },
  { text: "fri_nd", top: "74%", left: "78%", rotate: 8, size: "text-4xl", tone: "text-amber-200/[0.16]" },
  { text: "sh", top: "2%", left: "48%", rotate: 5, size: "text-7xl", tone: "text-white/[0.14]" },
  { text: "necessa*y", top: "42%", left: "90%", rotate: -8, size: "text-2xl", tone: "text-cyan-200/[0.16]" },
  { text: "qu", top: "82%", left: "52%", rotate: -14, size: "text-6xl", tone: "text-white/[0.15]" },
  { text: "beautif_l", top: "30%", left: "68%", rotate: 6, size: "text-2xl", tone: "text-white/[0.15]" },
  { text: "//", top: "48%", left: "18%", rotate: 0, size: "text-8xl", tone: "text-cyan-200/[0.15]" },
  { text: "ck", top: "6%", left: "72%", rotate: -18, size: "text-5xl", tone: "text-white/[0.15]" },
  { text: "a b c", top: "88%", left: "8%", rotate: 4, size: "text-3xl", tone: "text-white/[0.15]" },
  { text: "igh", top: "34%", left: "8%", rotate: 10, size: "text-4xl", tone: "text-amber-200/[0.15]" },
  { text: "-tion", top: "92%", left: "34%", rotate: -5, size: "text-3xl", tone: "text-white/[0.14]" },
  { text: "kn_w", top: "20%", left: "58%", rotate: -9, size: "text-5xl", tone: "text-cyan-200/[0.15]" },
  { text: "though", top: "56%", left: "38%", rotate: 4, size: "text-3xl", tone: "text-white/[0.13]" },
  { text: "j", top: "70%", left: "94%", rotate: -12, size: "text-6xl", tone: "text-white/[0.15]" },
  { text: "ph", top: "0%", left: "22%", rotate: -4, size: "text-6xl", tone: "text-amber-200/[0.15]" },
  { text: "believ_", top: "88%", left: "60%", rotate: 7, size: "text-3xl", tone: "text-cyan-200/[0.15]" },
  { text: "listen", top: "12%", left: "36%", rotate: -7, size: "text-3xl", tone: "text-white/[0.13]" },
  { text: "y", top: "50%", left: "62%", rotate: 15, size: "text-7xl", tone: "text-white/[0.13]" },
  { text: "ar", top: "78%", left: "20%", rotate: -3, size: "text-4xl", tone: "text-cyan-200/[0.14]" },
  { text: "oo", top: "26%", left: "96%", rotate: 6, size: "text-5xl", tone: "text-white/[0.14]" },
  { text: "gr_at", top: "6%", left: "60%", rotate: -6, size: "text-3xl", tone: "text-amber-200/[0.14]" },
  { text: "ea", top: "96%", left: "88%", rotate: 8, size: "text-4xl", tone: "text-white/[0.14]" },
];

// The lists this browser has saved; none if storage isn't available.
function readCustomLists() {
  try {
    return loadLists(window.localStorage);
  } catch (err) {
    return [];
  }
}

export default function YearIndex() {
  const { status, yearsConfig, error } = useYearsConfig();
  const { theme } = useTheme();
  const [customLists] = useState(readCustomLists);

  if (status === "loading") {
    return <Centered>Loading…</Centered>;
  }
  if (status === "error") {
    return <Centered>Couldn't load years.config.json: {String(error?.message || error)}</Centered>;
  }

  const totalWords = yearsConfig.years.reduce((sum, y) => sum + (y.wordCount || 0), 0);
  const teachingWeeks = yearsConfig.totalWeeks;

  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      {/* React 19 hoists title/meta/link tags rendered anywhere in the
          tree into <head> automatically, and restores index.html's
          defaults on unmount -- no react-helmet needed. */}
      <title>SPELL// STARS — Free UK Primary Spelling Practice, Reception to Year 6</title>
      <meta
        name="description"
        content="Free weekly spelling practice for UK primary schools. Interactive word lists, spelling quizzes, word searches and phonics games matched to the National Curriculum, for Reception through to Year 6."
      />
      <link rel="canonical" href="https://spell-stars.pages.dev/" />
      <SiteHeader />

      {/* Hero */}
      {/* The hero is intentionally always dark-styled, independent of the
          light/dark theme toggle -- the vivid brand cyan used in "ST☆RS"
          only reads at ~2:1 contrast against a light background (fails
          WCAG even for large text), so it needs a dark surface behind it
          to stay both legible and vivid. Everything below the hero
          follows the selected theme normally. */}
      <section
        id="top"
        className="hero-grid relative overflow-hidden px-5 pb-8 pt-28 text-slate-50 sm:px-8 lg:pt-32"
        style={{ backgroundColor: "#05070d" }}
        data-testid="hero-section"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden" data-testid="hero-bg-words">
          {HERO_BG_WORDS.map((item, index) => (
            <span
              key={`${item.text}-${index}`}
              className={`absolute font-handwritten ${item.size} ${item.tone}`}
              style={{ top: item.top, left: item.left, transform: `rotate(${item.rotate}deg)` }}
            >
              {item.text}
            </span>
          ))}
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.reveal} className="mb-8 inline-flex items-center gap-3 border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-[#09c4dc]">
              <Sparkles className="h-4 w-4" /> Reception – Year 6 // National Curriculum aligned
            </motion.div>
            <h1 className="type-display font-display text-6xl font-extrabold uppercase text-slate-50 sm:text-7xl lg:text-8xl">
              <span className="block overflow-hidden">
                <motion.span className="block" initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ ...SPRING.reveal, duration: 0.8 }}>
                  SPELL
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span className="block pb-4 text-[#09c4dc]" initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ ...SPRING.reveal, duration: 0.8, delay: 0.1 }}>
                  ST<Star className="inline-block h-[0.72em] w-[0.72em] text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]" style={{ verticalAlign: "-0.1em" }} aria-hidden="true" />RS
                </motion.span>
              </span>
            </h1>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.reveal, delay: 0.35 }} className="mt-6 flex flex-wrap items-center gap-4">
              <motion.a
                href="#years"
                whileHover={{ y: -3, transition: SPRING.settle }}
                whileTap={{ ...PRESS, transition: SPRING.snappy }}
                className="group inline-flex items-center gap-3 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition-colors duration-300 hover:bg-cyan-300"
              >
                Jump to your year <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
              </motion.a>
              <motion.a
                href="#features"
                whileHover={{ y: -3, transition: SPRING.settle }}
                whileTap={{ ...PRESS, transition: SPRING.snappy }}
                className="inline-flex items-center gap-3 rounded-full border border-cyan-300/40 px-6 py-3 font-semibold text-cyan-200 transition-colors duration-300 hover:bg-cyan-300/10"
                data-testid="hero-features-link"
              >
                What's included
              </motion.a>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.reveal, delay: 0.45 }} className="mt-5 max-w-2xl border-l border-cyan-300/30 pl-5 font-mono text-sm text-slate-400">
              Progressive spelling practice for keen beans — from first letter sounds in
              Reception through to Year 6 spelling confidence, one week at a time.
            </motion.p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#05070d]"
        />
      </section>

      {/* Practice stats band */}
      <section className="relative w-full bg-cyan-400" data-testid="practice-stats-band">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 sm:grid-cols-4 sm:px-8 sm:py-12 text-sm">
          {[
            { value: "10 min", label: "Recommended daily practice — little and often beats cramming" },
            { value: "6", label: "SRS boxes — words you get wrong come back around sooner" },
            { value: String(teachingWeeks), label: "Weeks mapped to the school year, term by term" },
            { value: "Reception\u2013Yr6", label: "Every year group covered, in one place" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                {stat.value}
              </div>
              <div className="mt-1 font-mono text-xs leading-snug text-slate-900/70">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why use it: right under the hero and stats, before the year picker. */}
      <KeyFeatures totalWords={totalWords} />

      {/* Year grid */}
      <section id="years" className="px-5 py-16 sm:px-8" data-testid="year-grid-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Choose a year</div>
          <h2 className="mt-3 type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">Pick up where you are.</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {yearsConfig.years.map((year, index) => {
              const accent = getYearAccent(year.slug);
              const ink = getYearInk(year.slug, theme);
              const depth = getYearDepth(year.slug);
              const bgAlpha = 0.1 + depth * 0.035;
              const borderAlpha = 0.38 + depth * 0.03;
              return (
                <motion.div
                  key={year.slug}
                  {...revealOnScroll(index)}
                  whileHover={{ y: -4, transition: SPRING.settle }}
                  whileTap={{ ...PRESS, transition: SPRING.snappy }}
                >
                  <Link
                    to={`/${year.slug}`}
                    className="group relative block h-full overflow-hidden rounded-2xl border p-5 text-center transition-[filter] duration-300 hover:brightness-110"
                    style={{ backgroundColor: rgba(accent, bgAlpha), borderColor: rgba(accent, borderAlpha) }}
                    data-testid={`year-link-${year.slug}`}
                  >
                    <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} aria-hidden="true" />
                    <div className="type-card font-display text-xl font-bold text-foreground">{year.label}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: ink }}>
                      {year.wordsPerWeek}/week · {year.wordCount} words
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {/* The visitor's own lists sit with the years, then a way to add one. */}
            {customLists.map((list, index) => {
              const accent = list.yearHint ? getYearAccent(list.yearHint) : getYearAccent("year2");
              return (
                <motion.div
                  key={list.id}
                  {...revealOnScroll(yearsConfig.years.length + index)}
                  whileHover={{ y: -4, transition: SPRING.settle }}
                  whileTap={{ ...PRESS, transition: SPRING.snappy }}
                >
                  <Link
                    to={`/custom/${list.id}`}
                    className="group relative block h-full overflow-hidden rounded-2xl border p-5 text-center transition-[filter] duration-300 hover:brightness-110"
                    style={{ backgroundColor: rgba(accent, 0.1), borderColor: rgba(accent, 0.38) }}
                    data-testid={`custom-list-link-${list.id}`}
                  >
                    <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} aria-hidden="true" />
                    <div className="type-card break-words font-display text-xl font-bold text-foreground">{list.name}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Your list · {list.words.length} {list.words.length === 1 ? "word" : "words"}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            <motion.div
              {...revealOnScroll(yearsConfig.years.length + customLists.length)}
              whileHover={{ y: -4, transition: SPRING.settle }}
              whileTap={{ ...PRESS, transition: SPRING.snappy }}
            >
              <Link
                to="/custom"
                className="group flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/25 p-5 text-center transition-colors duration-300 hover:border-primary/60 hover:bg-primary/5"
                data-testid="add-custom-list-card"
              >
                <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
                <div className="mt-1 type-card font-display text-xl font-bold text-foreground">Add your own list</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Paste any words</div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Where the long-form content went: one row of links, not seven sections. */}
      <section id="learn-more" className="px-5 pb-20 pt-4 sm:px-8" data-testid="learn-more-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">New here?</div>
          <h2 className="mt-3 max-w-2xl type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">Find out more.</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TeaserLink
              index={0}
              to="/how-it-works"
              icon={Sparkles}
              label="How it works"
              blurb="Typed practice, word searches and a spaced-repetition engine, in five steps."
            />
            <TeaserLink
              index={1}
              to="/for-educators"
              icon={ClipboardCheck}
              label="For educators & parents"
              blurb="Curriculum sequencing, pacing, differentiation and an offline routine."
            />
            <TeaserLink
              index={2}
              to="/faq"
              icon={MessageCircleQuestion}
              label="FAQs"
              blurb="Year groups, how much to practise, and where progress is saved."
            />
          </div>
        </div>
      </section>

      <SiteFooter totalWords={totalWords} teachingWeeks={teachingWeeks} />
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-muted-foreground">
      <div>{children}</div>
    </div>
  );
}
