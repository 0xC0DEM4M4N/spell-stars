import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  BookOpen,
  Layers,
  PencilLine,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  MessageCircleQuestion,
  Plus,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { TeaserLink } from '@/components/InfoPage';
import { KeyFeatures } from '@/components/KeyFeatures';
import { useYearsConfig } from '@/lib/yearData';
import { loadLists } from '@/lib/customLists';
import { CUSTOM_LESSONS_NAME, CUSTOM_LESSONS_PATH, loadSeries, orphanLessons, seriesLessons } from '@/lib/series';
import { useTheme } from '@/context/ThemeContext';
import { getYearAccent, getYearDepth, getYearInk, rgba } from '@/lib/yearTheme';
import { PRESS, SPRING, revealOnScroll } from '@/lib/motion';

const HERO_BG_WORDS = [
  {
    text: 'b',
    top: '10%',
    left: '4%',
    rotate: -10,
    size: 'text-6xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: 'cat',
    top: '16%',
    left: '86%',
    rotate: 9,
    size: 'text-5xl',
    tone: 'text-cyan-200/[0.17]',
  },
  {
    text: 'wh_re',
    top: '62%',
    left: '3%',
    rotate: -6,
    size: 'text-4xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: 'fri_nd',
    top: '74%',
    left: '78%',
    rotate: 8,
    size: 'text-4xl',
    tone: 'text-amber-200/[0.16]',
  },
  {
    text: 'sh',
    top: '2%',
    left: '48%',
    rotate: 5,
    size: 'text-7xl',
    tone: 'text-white/[0.14]',
  },
  {
    text: 'necessa*y',
    top: '42%',
    left: '90%',
    rotate: -8,
    size: 'text-2xl',
    tone: 'text-cyan-200/[0.16]',
  },
  {
    text: 'qu',
    top: '82%',
    left: '52%',
    rotate: -14,
    size: 'text-6xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: 'beautif_l',
    top: '30%',
    left: '68%',
    rotate: 6,
    size: 'text-2xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: '//',
    top: '48%',
    left: '18%',
    rotate: 0,
    size: 'text-8xl',
    tone: 'text-cyan-200/[0.15]',
  },
  {
    text: 'ck',
    top: '6%',
    left: '72%',
    rotate: -18,
    size: 'text-5xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: 'a b c',
    top: '88%',
    left: '8%',
    rotate: 4,
    size: 'text-3xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: 'igh',
    top: '34%',
    left: '8%',
    rotate: 10,
    size: 'text-4xl',
    tone: 'text-amber-200/[0.15]',
  },
  {
    text: '-tion',
    top: '92%',
    left: '34%',
    rotate: -5,
    size: 'text-3xl',
    tone: 'text-white/[0.14]',
  },
  {
    text: 'kn_w',
    top: '20%',
    left: '58%',
    rotate: -9,
    size: 'text-5xl',
    tone: 'text-cyan-200/[0.15]',
  },
  {
    text: 'though',
    top: '56%',
    left: '38%',
    rotate: 4,
    size: 'text-3xl',
    tone: 'text-white/[0.13]',
  },
  {
    text: 'j',
    top: '70%',
    left: '94%',
    rotate: -12,
    size: 'text-6xl',
    tone: 'text-white/[0.15]',
  },
  {
    text: 'ph',
    top: '0%',
    left: '22%',
    rotate: -4,
    size: 'text-6xl',
    tone: 'text-amber-200/[0.15]',
  },
  {
    text: 'believ_',
    top: '88%',
    left: '60%',
    rotate: 7,
    size: 'text-3xl',
    tone: 'text-cyan-200/[0.15]',
  },
  {
    text: 'listen',
    top: '12%',
    left: '36%',
    rotate: -7,
    size: 'text-3xl',
    tone: 'text-white/[0.13]',
  },
  {
    text: 'y',
    top: '50%',
    left: '62%',
    rotate: 15,
    size: 'text-7xl',
    tone: 'text-white/[0.13]',
  },
  {
    text: 'ar',
    top: '78%',
    left: '20%',
    rotate: -3,
    size: 'text-4xl',
    tone: 'text-cyan-200/[0.14]',
  },
  {
    text: 'oo',
    top: '26%',
    left: '96%',
    rotate: 6,
    size: 'text-5xl',
    tone: 'text-white/[0.14]',
  },
  {
    text: 'gr_at',
    top: '6%',
    left: '60%',
    rotate: -6,
    size: 'text-3xl',
    tone: 'text-amber-200/[0.14]',
  },
  {
    text: 'ea',
    top: '96%',
    left: '88%',
    rotate: 8,
    size: 'text-4xl',
    tone: 'text-white/[0.14]',
  },
];

// The lists this browser has saved; none if storage isn't available.
function readCustomLists() {
  try {
    return loadLists(window.localStorage);
  } catch (err) {
    return [];
  }
}

// Accent for anything the visitor made themselves (series and lessons).
const MADE_BY_YOU_ACCENT = '#8b5cf6';

// The series this browser has saved; none if storage isn't available.
function readSeries() {
  try {
    return loadSeries(window.localStorage);
  } catch (err) {
    return [];
  }
}

const RULE_EXAMPLES = ['/ee/', '-le ending', 'kn-', '-ous', 'wr at the start', 'suffix'];

export default function YearIndex() {
  const { status, yearsConfig, error } = useYearsConfig();
  const { theme } = useTheme();
  const [customLists] = useState(readCustomLists);
  const [seriesList] = useState(readSeries);

  if (status === 'loading') {
    return <Centered>Loading…</Centered>;
  }
  if (status === 'error') {
    return (
      <Centered>
        Couldn't load years.config.json: {String(error?.message || error)}
      </Centered>
    );
  }

  const totalWords = yearsConfig.years.reduce(
    (sum, y) => sum + (y.wordCount || 0),
    0,
  );
  const teachingWeeks = yearsConfig.totalWeeks;

  // Series are the top level. Lessons that are in no series go in one card.
  const homeGroups = [
    ...seriesList.map((series) => ({
      key: series.id,
      to: `/series/${series.id}`,
      name: series.name,
      label: 'Series',
      Icon: Layers,
      count: seriesLessons(series, customLists).length,
      testId: `series-card-${series.id}`,
    })),
    ...(orphanLessons(seriesList, customLists).length > 0
      ? [
          {
            key: 'custom-lessons',
            to: CUSTOM_LESSONS_PATH,
            name: CUSTOM_LESSONS_NAME,
            label: 'Your lessons',
            Icon: PencilLine,
            count: orphanLessons(seriesList, customLists).length,
            testId: 'custom-lessons-card',
          },
        ]
      : []),
  ];

  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      {/* React 19 hoists title/meta/link tags rendered anywhere in the
          tree into <head> automatically, and restores index.html's
          defaults on unmount -- no react-helmet needed. */}
      <title>
        SPELL// STARS — Free UK Primary Spelling Practice, Reception to Year 6
      </title>
      <meta
        name="description"
        content="Free weekly spelling practice for UK primary schools. Interactive word lists, spelling quizzes, word searches, crosswords and phonics games matched to the National Curriculum, for Reception through to Year 6."
      />
      <link rel="canonical" href="https://spell-stars.pages.dev/" />
      <SiteHeader />

      {/* Hero */}
      {/* The hero is intentionally always dark-styled, independent of the
          light/dark theme toggle -- the vivid brand cyan only reads at ~2:1
          contrast against a light background, so it needs a dark surface
          behind it. Everything below the hero follows the selected theme. */}
      <section
        id="top"
        className="hero-grid hero-lines relative overflow-hidden px-5 pb-16 pt-28 text-slate-50 sm:px-8 sm:pb-20 lg:pt-32"
        style={{ backgroundColor: '#05070d' }}
        data-testid="hero-section"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          data-testid="hero-bg-words"
        >
          {HERO_BG_WORDS.map((item, index) => (
            <span
              key={`${item.text}-${index}`}
              className={`absolute font-handwritten ${item.size} ${item.tone}`}
              style={{
                top: item.top,
                left: item.left,
                transform: `rotate(${item.rotate}deg)`,
              }}
            >
              {item.text}
            </span>
          ))}
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING.reveal}
              className="text-lg font-light text-slate-200 sm:text-xl"
            >
              Spelling for UK primary schools
            </motion.p>
            <h1 className="type-display mt-4 font-display text-5xl font-light text-slate-50 sm:text-6xl lg:text-[4.25rem]">
              {['Weekly spelling lists,'].map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: '112%' }}
                    animate={{ y: 0 }}
                    transition={{ ...SPRING.reveal, duration: 0.8, delay: i * 0.1 }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
              <span className="block overflow-hidden pb-3">
                <motion.span
                  className="block text-[#09c4dc]"
                  initial={{ y: '112%' }}
                  animate={{ y: 0 }}
                  transition={{ ...SPRING.reveal, duration: 0.8, delay: 0.2 }}
                >
                  Reception to Year 6
                </motion.span>
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.reveal, delay: 0.35 }}
              className="mt-6 max-w-xl text-base font-light leading-relaxed text-slate-200 sm:text-lg"
            >
              Choose a year and practise this week's words. Hear each word, type
              it, then try a word search or crossword. The lists follow the
              National Curriculum.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.reveal, delay: 0.45 }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <motion.a
                href="#years"
                whileHover={{ y: -3, transition: SPRING.settle }}
                whileTap={{ ...PRESS, transition: SPRING.snappy }}
                className="group inline-flex items-center gap-3 rounded-full bg-cyan-400 px-8 py-4 text-base font-medium text-slate-950 transition-colors duration-300 hover:bg-cyan-300"
              >
                Choose your year{' '}
                <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
              </motion.a>
              <motion.div
                whileHover={{ y: -3, transition: SPRING.settle }}
                whileTap={{ ...PRESS, transition: SPRING.snappy }}
              >
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-3 rounded-full border border-cyan-300/40 px-8 py-4 text-base font-medium text-cyan-200 transition-colors duration-300 hover:bg-cyan-300/10"
                  data-testid="hero-features-link"
                >
                  How it works
                </Link>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.reveal, delay: 0.55 }}
              className="mt-12 flex items-center gap-4"
            >
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-900 ring-1 ring-white/15"
                aria-hidden="true"
              >
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              </span>
              <div>
                <div className="text-lg font-light text-slate-50">
                  Free, and no login
                </div>
                <div className="text-sm font-light text-slate-300">
                  Progress is saved on this device. An account is optional.
                </div>
              </div>
            </motion.div>
          </div>

          {/* Floating stat cards around a glowing star */}
          <div
            className="relative hidden gap-4 sm:grid sm:grid-cols-3 lg:block lg:h-[30rem]"
            data-testid="hero-stats"
          >
            <Star
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 hidden h-72 w-72 -translate-x-1/2 -translate-y-1/2 fill-amber-400 text-amber-400 opacity-90 drop-shadow-[0_0_60px_rgba(251,191,36,0.55)] lg:block"
            />
            {[
              {
                icon: BookOpen,
                label: 'Spelling words',
                value: `${totalWords.toLocaleString('en-GB')}+`,
                pos: 'lg:right-0 lg:top-8',
              },
              {
                icon: GraduationCap,
                label: 'Year groups',
                value: 'Reception to Year 6',
                pos: 'lg:right-4 lg:top-[48%]',
              },
              {
                icon: CalendarDays,
                label: 'Teaching weeks',
                value: String(teachingWeeks),
                pos: 'lg:left-0 lg:bottom-4',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING.reveal, delay: 0.5 + i * 0.12 }}
                className={`glass-card rounded-3xl p-5 lg:absolute lg:w-60 ${stat.pos}`}
              >
                <span className="relative inline-flex">
                  <stat.icon className="h-7 w-7 text-slate-100" aria-hidden="true" />
                  <span className="absolute -bottom-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </span>
                <div className="mt-3 text-sm font-light text-slate-200">
                  {stat.label}
                </div>
                <div className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl lg:text-xl xl:text-2xl">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#05070d]"
        />
      </section>

      {/* Year grid */}
      <section
        id="years"
        className="px-5 py-16 sm:px-8"
        data-testid="year-grid-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs text-primary">
            Choose a year
          </div>
          <h2 className="mt-3 type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Choose your year group
          </h2>
          <p className="mt-3 max-w-2xl type-body text-base text-muted-foreground">
            Each year has a word list for every teaching week, from{' '}
            {Math.min(...yearsConfig.years.map((y) => y.wordsPerWeek))} to{' '}
            {Math.max(...yearsConfig.years.map((y) => y.wordsPerWeek))} words a week.
          </p>
          <div className="mt-8 grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                    className="group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border p-5 text-center transition-[filter] duration-300 hover:brightness-110"
                    style={{
                      backgroundColor: rgba(accent, bgAlpha),
                      borderColor: rgba(accent, borderAlpha),
                    }}
                    data-testid={`year-link-${year.slug}`}
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-[3px]"
                      style={{ backgroundColor: accent }}
                      aria-hidden="true"
                    />
                    <div className="type-card font-display text-xl font-bold text-foreground">
                      {year.label}
                    </div>
                    <div
                      className="mt-2 font-mono text-sm"
                      style={{ color: ink }}
                    >
                      {year.wordsPerWeek}/week · {year.wordCount} words
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {/* The visitor's series sit with the years, then one card holding any
                lessons that are in no series, then a way to add more. */}
            {homeGroups.map((group, index) => {
              // Violet marks things the visitor made, so they stand apart from
              // the built-in year cards.
              const accent = MADE_BY_YOU_ACCENT;
              const GroupIcon = group.Icon;
              return (
                <motion.div
                  key={group.key}
                  {...revealOnScroll(yearsConfig.years.length + index)}
                  whileHover={{ y: -4, transition: SPRING.settle }}
                  whileTap={{ ...PRESS, transition: SPRING.snappy }}
                >
                  <Link
                    to={group.to}
                    className="group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border p-5 text-center transition-[filter] duration-300 hover:brightness-110"
                    style={{
                      backgroundColor: rgba(accent, 0.1),
                      borderColor: rgba(accent, 0.38),
                    }}
                    data-testid={group.testId}
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-[3px]"
                      style={{ backgroundColor: accent }}
                      aria-hidden="true"
                    />
                    <span
                      className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: rgba(accent, 0.18), color: accent }}
                      aria-hidden="true"
                    >
                      <GroupIcon className="h-4 w-4" />
                    </span>
                    <div className="type-card break-words font-display text-xl font-bold text-foreground">
                      {group.name}
                    </div>
                    <div className="mt-2 font-mono text-sm text-muted-foreground">
                      {group.label} · {group.count}{' '}
                      {group.count === 1 ? 'lesson' : 'lessons'}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            <motion.div
              {...revealOnScroll(yearsConfig.years.length + homeGroups.length)}
              whileHover={{ y: -4, transition: SPRING.settle }}
              whileTap={{ ...PRESS, transition: SPRING.snappy }}
            >
              <Link
                to="/make"
                className="group flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/50 p-5 text-center transition-colors duration-300 hover:border-primary/60 hover:bg-primary/5"
                data-testid="add-custom-list-card"
              >
                <Plus className="h-9 w-9 text-primary" aria-hidden="true" />

                <div className="mt-2 font-mono text-sm text-muted-foreground">
                  Add your own lesson
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* A taster of what's included, after the year picker so the picker
          stays directly under the hero. The full list is on How it works. */}
      <KeyFeatures totalWords={totalWords} show="carousel" />

      {/* Search by spelling rule: its own section, after the features. */}
      <section
        id="spelling-rules"
        className="px-5 pb-16 sm:px-8"
        aria-labelledby="spelling-rules-heading"
        data-testid="spelling-rules-section"
      >
        <motion.div
          {...revealOnScroll(0)}
          className="holo-card relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] p-6 sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="font-mono text-xs text-primary">
                Search by spelling rule
              </div>
              <h2
                id="spelling-rules-heading"
                className="mt-3 max-w-xl type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl"
              >
                Practise one spelling rule at a time.
              </h2>
              <p className="mt-4 max-w-xl type-body text-base text-muted-foreground">
                Choose the rules a child finds hard, such as /ee/ or -le endings,
                and make a lesson from just those words. Each lesson comes with
                practice, a word search, a crossword and print sheets.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/make"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  data-testid="spelling-rules-cta"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Make a lesson
                </Link>
                <Link
                  to="/series"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                  data-testid="series-cta"
                >
                  Your series
                </Link>
              </div>
            </div>

            <div>
              <div className="font-mono text-sm text-muted-foreground">
                Try a search
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {RULE_EXAMPLES.map((example) => (
                  <li key={example}>
                    <Link
                      to={`/make?tab=rules&q=${encodeURIComponent(example)}`}
                      className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-mono text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/20"
                    >
                      {example}
                    </Link>
                  </li>
                ))}
              </ul>
              {seriesList.length > 0 && (
                <div className="mt-6" data-testid="home-series">
                  <div className="font-mono text-sm text-muted-foreground">
                    Your series
                  </div>
                  <ul className="mt-3 space-y-2">
                    {seriesList.slice(0, 4).map((series) => (
                      <li key={series.id}>
                        <Link
                          to={`/series/${series.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
                        >
                          <span className="truncate">{series.name}</span>
                          <span className="shrink-0 font-mono text-sm text-muted-foreground">
                            {series.listIds.length}{' '}
                            {series.listIds.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Where the long-form content went: one row of links, not seven sections. */}
      <section
        id="learn-more"
        className="px-5 pb-20 pt-4 sm:px-8"
        data-testid="learn-more-section"
      >
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs text-primary">
            More about Spell Stars
          </div>
          <h2 className="mt-3 max-w-2xl type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Using it at home or in class
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TeaserLink
              index={0}
              to="/how-it-works"
              icon={Sparkles}
              label="How it works"
              blurb="What a practice session looks like, step by step."
            />
            <TeaserLink
              index={1}
              to="/for-educators"
              icon={ClipboardCheck}
              label="For educators & parents"
              blurb="How the weekly lists are planned, and how to use them at home or in class."
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
