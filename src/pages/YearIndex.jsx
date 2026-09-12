import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDown, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, Grid2x2, Landmark, MessageCircleQuestion, NotebookText, Printer, Repeat2, ScrollText, Sparkles, SlidersHorizontal, Star } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { useYearsConfig } from "@/lib/yearData";
import { useTheme } from "@/context/ThemeContext";
import { getYearAccent, getYearDepth, getYearInk, rgba } from "@/lib/yearTheme";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Practice",
    body: "Type each spelling, hear it read aloud, get instant feedback — with a spaced-repetition engine underneath, so words you got wrong come back sooner than ones you've nailed.",
  },
  {
    icon: Grid2x2,
    title: "Word search",
    body: "A wordsearch scaled to the year — small grids with no diagonals for the youngest years, bigger grids with backwards and diagonal placements once reading fluency catches up.",
  },
  {
    icon: BookOpen,
    title: "Letter of the day",
    body: "Reception starts before whole words: one grapheme a day, with a picture-matching game to find everything that makes that sound, before moving on to spelling words.",
  },
  {
    icon: CalendarDays,
    title: "Your pace, your call",
    body: "Practice this week's list, everything covered this term, or the whole year so far — the current week is something you set, not something the calendar guesses at.",
  },
];

const SESSION_STEPS = [
  {
    step: "01",
    title: "Pick a year and a week",
    body: "Reception through Year 6, each mapped to the National Curriculum's programmes of study — DfE English Appendix 1 statutory word lists for Years 1–6, and the Letters and Sounds phonics framework for Reception. Weeks follow the school's autumn, spring and summer terms.",
  },
  {
    step: "02",
    title: "Practice the words",
    body: "Type each word, hear it read aloud at a year-appropriate pace, and get instant feedback. Underneath, a lightweight spaced-repetition engine (SRS-lite) tracks every word through six boxes — get one wrong and it comes back around sooner; get it right a few times and it drops away.",
  },
  {
    step: "03",
    title: "Meet the word properly",
    body: "Every word comes with a definition and an example sentence, so children see it used in context — not just memorising letters, but building real vocabulary alongside the spelling.",
  },
  {
    step: "04",
    title: "Reinforce with a word search",
    body: "A wordsearch grid scaled to the year group — small and upright for the youngest years, bigger with backwards and diagonal words once reading fluency catches up. Print it, or play it on screen against the clock.",
  },
  {
    step: "05",
    title: "Review on your terms",
    body: "Come back to this week's list, everything covered so far this term, or the whole year to date. Progress is saved as you go, so due words resurface automatically next time.",
  },
];

// A recommended offline routine that sits alongside the on-screen session
// above -- SRS-lite covers spaced repetition and recall on a screen, but
// spelling is ultimately tested (and mostly used) with a pencil, so the
// site also points people at the classic look/cover/write/check sequence,
// bookended by tools this app already has (word search, print sheet,
// audio pronunciation).
const WEEKLY_ROUTINE = [
  {
    step: "01",
    icon: Grid2x2,
    title: "Word search first",
    body: "Start with this week's word search, on screen or printed. It only asks a child to recognise a word, not produce it from memory, so it's a low-pressure way to get the shapes of the words familiar before anything harder.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Play the practice game",
    body: "Type each word, hear it read aloud, get instant feedback. This is the first proper recall step — SRS-lite quietly tracks which words are shaky, so those are the ones that resurface soonest.",
  },
  {
    step: "03",
    icon: Printer,
    title: "Print the practice sheet",
    body: "Take the list off the screen. Handwriting engages a different kind of memory to typing, and it's how spelling actually gets tested at school — a purely on-screen routine skips that rehearsal.",
  },
  {
    step: "04",
    icon: NotebookText,
    title: "Look, cover, write, check",
    body: "For each word: look at it, say it out loud, cover it up, write it from memory, then uncover and check. Get it wrong? Just repeat the word, not the whole list — that's the bit that's easy to skip but does most of the work.",
  },
  {
    step: "05",
    icon: MessageCircleQuestion,
    title: "Finish with a verbal test",
    body: "No page in sight — say the word (use the app's listen button if you're not sure how it's pronounced) and have them spell it back or write it down cold. It's the closest thing to how it'll actually be tested, and the real check on whether it's stuck.",
  },
];

const VOCAB_CARDS = [
  {
    icon: NotebookText,
    title: "Definitions",
    body: "Every word is paired with a clear, age-appropriate definition — so children learn what a word means, not only how it's spelled.",
  },
  {
    icon: ScrollText,
    title: "Example sentences",
    body: "Each word appears in context, in a sentence a child would actually recognise — the fastest way to make a new word stick.",
  },
  {
    icon: Landmark,
    title: "Word origins",
    body: "For the older years, words come with a short note on where they come from — the Latin, Greek or Old English root behind them — so children understand a word's true meaning, not just its letters.",
  },
];

const FAQS = [
  {
    q: "What year groups does SPELL// STARS cover?",
    a: "Every year of primary school — Reception through to Year 6 — each with its own word list, difficulty and pacing.",
  },
  {
    q: "How much practice does my child actually need?",
    a: "Little and often works best — around 10 minutes a day is enough to work through a week's words and keep due reviews ticking over, rather than one long session.",
  },
  {
    q: "Is it aligned to what school is teaching?",
    a: "Yes. Word lists follow the DfE National Curriculum's English Appendix 1 statutory spelling lists for Years 1–6, and the Letters and Sounds phonics framework for Reception, structured across the same autumn, spring and summer terms as the school year.",
  },
  {
    q: "What is the spaced-repetition system (SRS-lite)?",
    a: "A simple six-box Leitner system. Every word starts in box one; get it right and it moves up a box with a longer gap before it's due again; get it wrong and it drops back down. Over time, practice naturally focuses on the words that still need it.",
  },
  {
    q: "Where is my child's progress saved?",
    a: "Locally, in the browser on the device they're practising on — so progress carries over every time they come back on that device, though it doesn't yet sync across different devices.",
  },
  {
    q: "Do the words come with definitions and example sentences for every year?",
    a: "That's the goal for every year group — Reception and Year 1 are fully there today, with the rest of the word lists being filled in.",
  },
];

const EDUCATOR_NOTES = [
  {
    icon: ClipboardCheck,
    title: "Suggested weekly check",
    body: "Read the word, use it in a sentence, ask the child to write it down — testing a word in context catches children who can pattern-match a list without being able to use the word correctly.",
  },
  {
    icon: CalendarDays,
    title: "Pacing",
    body: "Each year's weeks are spread across autumn, spring and summer with room for INSET days and assessment weeks. A child who's ahead can move into the term or whole-year scope rather than waiting for the calendar — the pace is set by you, not a fixed date.",
  },
  {
    icon: SlidersHorizontal,
    title: "Differentiation",
    body: "Drop back to a single week and repeat it until the SRS-lite boxes show it's sticking, or jump ahead to the term/whole-year scope for confident spellers. Try asking \"what's the rule?\" before naming it — showing a week's list and letting a child spot the shared pattern suits those ready to reason about spelling, not just memorise it.",
  },
  {
    icon: Printer,
    title: "Worksheets, on demand",
    body: "Every word search has a print button for an offline worksheet, and the practice timer can switch to countdown mode for a bit of gentle pressure once a list is well known.",
  },
];

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

export default function YearIndex() {
  const { status, yearsConfig, error } = useYearsConfig();
  const { theme } = useTheme();

  if (status === "loading") {
    return <Centered>Loading…</Centered>;
  }
  if (status === "error") {
    return <Centered>Couldn't load years.config.json: {String(error?.message || error)}</Centered>;
  }

  const totalWords = yearsConfig.years.reduce((sum, y) => sum + (y.wordCount || 0), 0);
  const totalYears = yearsConfig.years.length;
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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#top" className="font-display text-lg font-extrabold tracking-tight text-foreground">
            SPELL<span className="text-primary">//</span><span className="text-primary">ST<Star className="inline-block h-[0.85em] w-[0.85em] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" style={{ verticalAlign: "-0.12em" }} aria-hidden="true" />RS</span>
          </a>
          <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground md:flex" aria-label="Primary">
            <a href="#years" className="transition-colors duration-300 hover:text-primary">Years</a>
            <a href="#how-it-works" className="transition-colors duration-300 hover:text-primary">How it works</a>
            <a href="#offline-routine" className="transition-colors duration-300 hover:text-primary">Offline routine</a>
            <a href="#for-educators" className="transition-colors duration-300 hover:text-primary">Educators</a>
            <a href="#faq" className="transition-colors duration-300 hover:text-primary">FAQs</a>
          </nav>
        </div>
      </header>

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
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mb-8 inline-flex items-center gap-3 border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-[#09c4dc]">
              <Sparkles className="h-4 w-4" /> Reception – Year 6 // National Curriculum aligned
            </motion.div>
            <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.88] tracking-tighter text-slate-50 sm:text-7xl lg:text-8xl">
              <span className="block overflow-hidden">
                <motion.span className="block" initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                  SPELL
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span className="block pb-4 text-[#09c4dc]" initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
                  ST<Star className="inline-block h-[0.72em] w-[0.72em] text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]" style={{ verticalAlign: "-0.1em" }} aria-hidden="true" />RS
                </motion.span>
              </span>
            </h1>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }} className="mt-6 flex flex-wrap items-center gap-4">
              <a href="#years" className="group inline-flex items-center gap-3 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition-transform duration-300 hover:-translate-y-1 hover:bg-cyan-300">
                Jump to your year <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
              </a>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }} className="mt-5 max-w-2xl border-l border-cyan-300/30 pl-5 font-mono text-sm text-slate-400">
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

      {/* Year grid */}
      <section id="years" className="px-5 py-16 sm:px-8" data-testid="year-grid-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Choose a year</div>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">Pick up where you are.</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {yearsConfig.years.map((year, index) => {
              const accent = getYearAccent(year.slug);
              const ink = getYearInk(year.slug, theme);
              const depth = getYearDepth(year.slug);
              const bgAlpha = 0.1 + depth * 0.035;
              const borderAlpha = 0.38 + depth * 0.03;
              return (
                <motion.div key={year.slug} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.04 }}>
                  <Link
                    to={`/${year.slug}`}
                    className="group relative block h-full overflow-hidden rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:brightness-110"
                    style={{ backgroundColor: rgba(accent, bgAlpha), borderColor: rgba(accent, borderAlpha) }}
                    data-testid={`year-link-${year.slug}`}
                  >
                    <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} aria-hidden="true" />
                    <div className="font-display text-xl font-bold text-foreground">{year.label}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: ink }}>
                      {year.wordsPerWeek}/week · {year.wordCount} words
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-5 py-16 sm:px-8" data-testid="how-it-works-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">How it works</div>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">One app, every year, no forks.</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="holo-card rounded-2xl p-6"
              >
                <feature.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 border border-amber-300/20 bg-amber-400/5 p-4 text-sm text-warning">
            <Repeat2 className="h-4 w-4 shrink-0" />
            Practice adapts to each year automatically — input style, reading speed, word-search
            difficulty and daily pacing all follow the year you're in, from one shared template.
          </div>
        </div>
      </section>

      {/* How a session works */}
      <section id="how-a-session-works" className="px-5 py-16 sm:px-8" data-testid="how-a-session-works-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">How a session works</div>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Five steps, aligned to what school is already teaching.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-foreground/10 bg-foreground/10 sm:grid-cols-5">
            {SESSION_STEPS.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-background p-6"
              >
                <div className="font-mono text-xs text-primary">{item.step}</div>
                <h3 className="mt-3 font-display text-base font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Take it offline */}
      <section id="offline-routine" className="px-5 py-16 sm:px-8" data-testid="offline-routine-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Beyond the screen</div>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Screen practice, then paper and voice.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Typing a word correctly isn't quite the same skill as writing it, and spelling tests are
            still mostly said aloud and written by hand. A weekly routine that moves from recognising
            a word, to recalling it on screen, to writing it from memory, to producing it with nothing
            in front of you at all, covers a lot more ground than any one of those on its own.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-foreground/10 bg-foreground/10 sm:grid-cols-5">
            {WEEKLY_ROUTINE.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-background p-6"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-mono text-xs text-primary">{item.step}</div>
                <h3 className="mt-2 font-display text-base font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Best spread across the week, not done in one sitting — e.g. word search early on, look/cover/write/check
            mid-week, verbal test at the end — so it lines up with SRS-lite's own spacing instead of cramming.
          </p>
        </div>
      </section>

      {/* Beyond spelling: vocabulary */}
      <section id="beyond-spelling" className="px-5 py-16 sm:px-8" data-testid="beyond-spelling-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">More than spelling</div>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Understand the word, not just its letters.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Spelling a word correctly is only half the job — every word in SPELL// STARS is built to
            broaden vocabulary too.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {VOCAB_CARDS.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="holo-card rounded-2xl p-6"
              >
                <card.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For educators & parents */}
      <section id="for-educators" className="px-5 py-16 sm:px-8" data-testid="for-educators-section">
        <div className="mx-auto max-w-7xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">For educators &amp; parents</div>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Built the way you'd sequence it yourself.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every one of the {totalYears} year lists follows its own statutory or phonics sequence —
            Letters and Sounds graphemes for Reception, then the National Curriculum's English
            Appendix 1 word lists from Year 1 onward — ordered so each week builds on the rule or
            pattern before it, term by term across the school year.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EDUCATOR_NOTES.map((note, index) => (
              <motion.div
                key={note.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="holo-card rounded-2xl p-6"
              >
                <note.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{note.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{note.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-16 sm:px-8" data-testid="faq-section">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.28em] text-primary">
            <MessageCircleQuestion className="h-4 w-4" /> FAQs
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">Good to know.</h2>
          <Accordion type="single" collapsible className="mt-8 border-t border-foreground/10">
            {FAQS.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-foreground/10">
                <AccordionTrigger className="group py-5 text-left font-display text-base font-bold text-foreground hover:no-underline [&>svg]:hidden">
                  <span className="flex items-center gap-3">
                    <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-7 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
