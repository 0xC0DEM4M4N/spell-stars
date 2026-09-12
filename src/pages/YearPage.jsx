import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useYearData, useYearsConfig } from "@/lib/yearData";
import { resolveScopePool, buildWeeksForYear, SCOPES, SESSION_COUNT_OPTIONS, termForWeek } from "@/lib/scope";
import { loadProgress, saveProgress, withCurrentWeek, recordAttempt, selectSessionWords, todayISO } from "@/lib/srs";
import { isScopeExplainerDismissed, dismissScopeExplainer } from "@/lib/scopePrefs";
import { WeekCarousel } from "@/components/WeekCarousel";
import { PracticeQuiz } from "@/components/PracticeQuiz";
import { WordSearch } from "@/components/WordSearch";
import { Button } from "@/components/ui/button";
import { Star, Info, Grid2x2, Sparkles, Shuffle } from "lucide-react";
import { motion } from "framer-motion";
import { getYearAccent, rgba } from "@/lib/yearTheme";
import { SiteFooter } from "@/components/SiteFooter";
import { PrintTermListButton } from "@/components/PrintTermListButton";

const SCOPE_EXPLAINERS = {
  term: "\u201cBy term\u201d pools together every word covered so far this term, not just this week's list \u2014 spaced repetition then decides which ones to ask first, so words you're shakier on come back more often.",
  all: "\u201cBy all up to now\u201d pools together every word covered so far this year \u2014 good for a big review, but sessions can take longer than a single week's list.",
};

const DEFAULT_COUNT = 15;
const ALL_SCOPE_COUNT = 20;
const TERM_ORDER = ["autumn", "spring", "summer"];
const TERM_LABELS = { autumn: "Autumn", spring: "Spring", summer: "Summer" };

// Fisher-Yates — used to draw a fresh random sample of words for "by all
// up to now"'s word bank + Regenerate button.
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The one template page for Practice + Word Search, driven entirely by
 * whichever year's config + word list is loaded via the :yearSlug route
 * param — no per-year forks, per the routing plan.
 *
 * "By week" scope renders the swipeable week-by-week carousel (one card
 * per week, full word list, Practice/Word Search launchable per card —
 * the original app's curriculum-browser UI, now driven by any year's
 * data). "By term"/"By all" scope pull a cross-week pool through the
 * SRS-lite engine instead, so a single-week card format doesn't apply —
 * those get a simpler "start a session of N words" UI.
 *
 * Known gap (flagged, not silently skipped): capabilities.inputMode
 * always renders the typed-answer flow, even for years configured for
 * "letterTile" (Reception) or "onScreenKeyboardOptional" (Year 1). Those
 * two input surfaces aren't built yet — see the implementation plan's
 * Phase 4.
 */
export default function YearPage() {
  const { yearSlug } = useParams();
  const navigate = useNavigate();
  const configState = useYearsConfig();
  const yearState = useYearData(yearSlug);

  const [progress, setProgress] = useState(() => loadProgress(yearSlug));
  // Scope (day/term/all) is mirrored in the ?scope= query param so
  // refreshing the page — or sharing the link — comes back to the same
  // tab. Read it once on first mount; the sync effect below keeps it
  // up to date.
  const [scope, setScope] = useState(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("scope");
    return SCOPES.some((s) => s.value === fromQuery) ? fromQuery : "day";
  });
  const [count, setCount] = useState(() => {
    const fromQuery = Number(new URLSearchParams(window.location.search).get("count"));
    return SESSION_COUNT_OPTIONS.includes(fromQuery) ? fromQuery : DEFAULT_COUNT;
  });
  // Which term is selected in the "by term" carousel — mirrored in the
  // ?term= query param (alongside ?scope=term) so a shared/refreshed
  // link keeps the same term selected instead of falling back to
  // whichever term is current.
  const [term, setTerm] = useState(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("term");
    return TERM_ORDER.includes(fromQuery) ? fromQuery : null;
  });
  const [quizOpen, setQuizOpen] = useState(false);
  const [explainerDismissed, setExplainerDismissed] = useState(() => isScopeExplainerDismissed());
  // Tracks the yearSlug the reset effect below last saw — comparing
  // values (rather than a fire-once boolean) so the effect stays a
  // no-op if React double-invokes it, which React.StrictMode does for
  // every effect in development. A boolean "already ran once" flag
  // breaks under that double-invoke: the second call sees the flag
  // already flipped and wrongly resets scope/term straight back to
  // their defaults, undoing whatever was just restored from the URL.
  const prevYearSlugRef = useRef(yearSlug);

  const handleDismissExplainer = () => {
    dismissScopeExplainer();
    setExplainerDismissed(true);
  };

  // Progress is namespaced per year (spellstars.<slug>.progress) — reload
  // it whenever the route's year changes. The scope choice only resets
  // to "day" on an actual year switch, not on first mount — otherwise
  // it would stomp the scope just restored from the URL hash above.
  useEffect(() => {
    setProgress(loadProgress(yearSlug));
    setQuizOpen(false);
    if (prevYearSlugRef.current !== yearSlug) {
      setScope("day");
      setTerm(null);
    }
    prevYearSlugRef.current = yearSlug;
  }, [yearSlug]);

  // Keep ?scope=, ?term= and ?count= in sync with the current tab so a
  // refresh or shared link comes back to the same place: which term is
  // selected and which word count is chosen only matter (and are only
  // kept in the URL) while scope=term.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (params.get("scope") !== scope) {
      params.set("scope", scope);
      changed = true;
    }

    if (scope === "term") {
      if (term) {
        if (params.get("term") !== term) {
          params.set("term", term);
          changed = true;
        }
      } else if (params.has("term")) {
        params.delete("term");
        changed = true;
      }
      if (params.get("count") !== String(count)) {
        params.set("count", String(count));
        changed = true;
      }
    } else {
      if (params.has("term")) {
        params.delete("term");
        changed = true;
      }
      if (params.has("count")) {
        params.delete("count");
        changed = true;
      }
    }

    if (changed) {
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    }
  }, [scope, term, count]);

  const currentWeek = progress.currentWeek || 1;
  const setCurrentWeek = (week) => {
    setProgress((prev) => {
      const next = withCurrentWeek(prev, week);
      saveProgress(yearSlug, next);
      return next;
    });
  };

  const handleAttempt = (wordId, correct) => {
    setProgress((prev) => {
      const next = recordAttempt(prev, wordId, correct, todayISO());
      saveProgress(yearSlug, next);
      return next;
    });
  };

  if (configState.status === "loading" || yearState.status === "loading") {
    return <Centered>Loading…</Centered>;
  }
  if (configState.status === "error" || yearState.status === "error") {
    return <Centered>Couldn't load this year's content. Please refresh.</Centered>;
  }
  if (yearState.status === "not-found") {
    return (
      <Centered>
        <p>We don't have a year called "{yearSlug}" yet.</p>
        <Button onClick={() => navigate("/")} className="mt-4 rounded-full bg-cyan-400 px-6 font-semibold text-slate-950 hover:bg-cyan-300">
          Back to years
        </Button>
      </Centered>
    );
  }

  const { yearMeta, words } = yearState;
  const termStructure = yearMeta.termStructure || configState.yearsConfig.termStructure;
  const capabilities = yearMeta.capabilities || {};
  const accent = getYearAccent(yearSlug);

  const pageTitle = `${yearMeta.label} Spelling Practice | SPELL// STARS`;
  const pageDescription = `Weekly ${yearMeta.label} spelling lists, quizzes and word searches matched to the UK National Curriculum — listen, practise and test yourself for free.`;

  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      {/* React 19 hoists these into <head> for this route, and restores
          index.html's defaults again on unmount -- see YearIndex.jsx. */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={`https://spell-stars.pages.dev/${yearSlug}`} />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="font-display text-lg font-extrabold tracking-tight text-foreground">
            SPELL<span className="text-primary">//</span><span className="text-primary">ST<Star className="inline-block h-[0.85em] w-[0.85em] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" style={{ verticalAlign: "-0.12em" }} aria-hidden="true" />RS</span>
          </Link>
          <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground md:flex" aria-label="Primary">
            <Link to="/#years" className="transition-colors duration-300 hover:text-primary">Years</Link>
            <Link to="/#how-it-works" className="transition-colors duration-300 hover:text-primary">How it works</Link>
            <Link to="/#offline-routine" className="transition-colors duration-300 hover:text-primary">Offline routine</Link>
            <Link to="/#for-educators" className="transition-colors duration-300 hover:text-primary">Educators</Link>
            <Link to="/#faq" className="transition-colors duration-300 hover:text-primary">FAQs</Link>
          </nav>
        </div>
      </header>

      <div className="border-b px-6 pb-6 pt-24" style={{ borderColor: rgba(accent, 0.35), backgroundImage: `linear-gradient(180deg, ${rgba(accent, 0.08)}, transparent)` }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 12px ${rgba(accent, 0.8)}` }} aria-hidden="true" />
            <h1 className="font-display text-3xl font-extrabold text-foreground" data-testid="year-page-title">
              {yearMeta.label}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2" data-testid="scope-options">
            {SCOPES.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                onClick={() => setScope(option.value)}
                className={
                  "rounded-full border-foreground/15 px-4 text-sm " +
                  (scope === option.value ? "" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground")
                }
                style={
                  scope === option.value
                    ? { borderColor: accent, backgroundColor: rgba(accent, 0.15), color: accent }
                    : undefined
                }
                data-testid={"scope-option-" + option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {scope !== "day" && !explainerDismissed && (
        <div className="border-b border-foreground/10 bg-foreground/[0.03] px-6 py-4" data-testid="scope-explainer">
          <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-3 sm:items-center">
            <Info className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" style={{ color: accent }} aria-hidden="true" />
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{SCOPE_EXPLAINERS[scope]}</p>
            <Button
              type="button"
              size="sm"
              onClick={handleDismissExplainer}
              className="shrink-0 rounded-full bg-foreground/10 px-4 text-xs font-semibold text-foreground hover:bg-foreground/20"
              data-testid="scope-explainer-dismiss"
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8 pt-0">
        {scope === "day" ? (
          <DayScopeView
            words={words}
            totalWeeks={yearMeta.totalWeeks}
            currentWeek={currentWeek}
            onSelectWeek={setCurrentWeek}
            onAttempt={handleAttempt}
            capabilities={capabilities}
          />
        ) : (
          <PooledScopeView
            words={words}
            scope={scope}
            currentWeek={currentWeek}
            count={count}
            setCount={setCount}
            selectedTerm={term}
            setSelectedTerm={setTerm}
            termStructure={termStructure}
            capabilities={capabilities}
            progress={progress}
            yearLabel={yearMeta.label}
            quizOpen={quizOpen}
            setQuizOpen={setQuizOpen}
            onAttempt={handleAttempt}
            accent={accent}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function DayScopeView({ words, totalWeeks, currentWeek, onSelectWeek, onAttempt, capabilities }) {
  const weeks = buildWeeksForYear(words, totalWeeks);
  if (!weeks.length) {
    return (
      <div className="border border-amber-300/20 bg-amber-400/5 p-5 text-sm text-warning" data-testid="letter-only-empty-state">
        This year is about letter sounds, not full words yet — word practice and word search unlock
        once this year's words begin. (Letter-tile practice mode isn't built yet.)
      </div>
    );
  }
  return (
    <WeekCarousel
      weeks={weeks}
      currentWeek={currentWeek}
      selectedWeek={currentWeek}
      onSelectWeek={onSelectWeek}
      onAttempt={onAttempt}
      capabilities={capabilities}
    />
  );
}

function PooledScopeView({
  words,
  scope,
  currentWeek,
  count,
  setCount,
  selectedTerm,
  setSelectedTerm,
  termStructure,
  capabilities,
  progress,
  yearLabel,
  quizOpen,
  setQuizOpen,
  onAttempt,
  accent,
}) {
  const currentTerm = termForWeek(currentWeek, termStructure);
  const activeTerm = selectedTerm ?? currentTerm;

  // Regenerate choreography, shared by both pooled scopes: fade the
  // current words out, hold on a scrambling-letters "graphic" for a
  // beat, then swap in the new words and let them fade in staggered
  // across the grid. "idle" | "out" | "scramble" | "in".
  const [regenPhase, setRegenPhase] = useState("idle");
  const runRegenerate = async (applyNewWords) => {
    if (regenPhase !== "idle") return;
    setRegenPhase("out");
    await wait(260);
    setRegenPhase("scramble");
    await wait(650);
    applyNewWords();
    setRegenPhase("in");
    await wait(750);
    setRegenPhase("idle");
  };

  // "All up to now"'s pool is resolved regardless of which scope is
  // actually active, so its random 20-word sample is ready the moment
  // the user flips to that tab.
  const allPoolRaw = useMemo(
    () => resolveScopePool(words, { scope: "all", currentWeek, termStructure }),
    [words, currentWeek, termStructure],
  );
  const allPool = useMemo(() => allPoolRaw.filter((w) => w.contentType !== "letter"), [allPoolRaw]);
  const [allWords, setAllWords] = useState(() => shuffle(allPool).slice(0, ALL_SCOPE_COUNT));

  // Reset both the term picker and the random word bank when the year
  // changes (not on every currentWeek tick — the word bank should stay
  // put until the user asks to Regenerate).
  useEffect(() => {
    setSelectedTerm(null);
    setAllWords(shuffle(allPool).slice(0, ALL_SCOPE_COUNT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const regenerateAll = () => runRegenerate(() => setAllWords(shuffle(allPool).slice(0, ALL_SCOPE_COUNT)));

  // Term pool, resolved unconditionally (same reasoning as allPool above)
  // so its hooks stay unconditional too.
  const termPoolRaw = useMemo(
    () => resolveScopePool(words, { scope: "term", currentWeek, termStructure, term: activeTerm }),
    [words, currentWeek, termStructure, activeTerm],
  );
  const termPool = useMemo(() => termPoolRaw.filter((w) => w.contentType !== "letter"), [termPoolRaw]);
  const [termWords, setTermWords] = useState(() =>
    selectSessionWords(termPool, { progress, sessionCaps: capabilities.sessionCaps, requestedCount: count, todayISOStr: todayISO() }),
  );

  // Re-pick (via the SRS engine, so due reviews still surface first)
  // whenever the term, word count, or underlying pool changes.
  useEffect(() => {
    setTermWords(
      selectSessionWords(termPool, { progress, sessionCaps: capabilities.sessionCaps, requestedCount: count, todayISOStr: todayISO() }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termPool, count]);

  // Regenerate button: a plain random resample of the same size, so
  // clicking it reliably swaps in a different set of words rather than
  // the SRS engine handing back the same top-ranked ones again.
  const regenerateTerm = () => runRegenerate(() => setTermWords(shuffle(termPool).slice(0, count)));

  if (scope === "term") {
    const isLetterOnly = termPoolRaw.length > 0 && termPool.length === 0;

    return (
      <div className="space-y-6 mt-8">
        <TermCarousel
          termStructure={termStructure}
          currentTerm={currentTerm}
          selectedTerm={activeTerm}
          onSelectTerm={setSelectedTerm}
          accent={accent}
        />

        {isLetterOnly ? (
          <LetterOnlyNotice />
        ) : termWords.length === 0 ? (
          <EmptyScopeNotice />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground" data-testid="term-scope-summary">
                {termWords.length} words selected for this session
              </div>
              <div className="flex items-center gap-2" data-testid="term-count-picker">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Words</span>
                {SESSION_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCount(option)}
                    className={`h-8 w-11 rounded-md border font-mono text-sm transition-colors duration-200 ${
                      count === option
                        ? "border-emerald-300 bg-emerald-300/15 text-success"
                        : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
                    }`}
                    data-testid={`term-count-${option}`}
                  >
                    {option}
                  </button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={regenerateTerm}
                  disabled={regenPhase !== "idle"}
                  className="ml-1 h-8 rounded-full border-foreground/15 bg-foreground/5 px-3 text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="regenerate-term-words-button"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Regenerate
                </Button>
                <PrintTermListButton words={termPool} term={activeTerm} yearLabel={yearLabel} />
              </div>
            </div>

            <WordListPreview words={termWords} testIdPrefix="term-word-list" accent={accent} phase={regenPhase} />
            <ScopeActionCards
              words={termWords}
              capabilities={capabilities}
              yearLabel={yearLabel}
              accent={accent}
              onStartPractice={() => setQuizOpen(true)}
            />
            <PracticeQuiz words={termWords} onAttempt={onAttempt} ttsRate={capabilities.ttsRate} open={quizOpen} onOpenChange={setQuizOpen} />
          </>
        )}
      </div>
    );
  }

  // scope === "all"
  const isLetterOnly = allPoolRaw.length > 0 && allPool.length === 0;

  return (
    <div className="space-y-6 mt-8">
      {isLetterOnly ? (
        <LetterOnlyNotice />
      ) : allWords.length === 0 ? (
        <EmptyScopeNotice />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground" data-testid="all-scope-summary">
              {allWords.length} of {allPool.length} words covered so far
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={regenerateAll}
              disabled={regenPhase !== "idle"}
              className="rounded-full border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="regenerate-words-button"
            >
              <Shuffle className="h-4 w-4" /> Regenerate
            </Button>
          </div>

          <WordListPreview words={allWords} testIdPrefix="all-word-list" accent={accent} phase={regenPhase} />
          <ScopeActionCards
            words={allWords}
            capabilities={capabilities}
            yearLabel={yearLabel}
            accent={accent}
            onStartPractice={() => setQuizOpen(true)}
          />
          <PracticeQuiz words={allWords} onAttempt={onAttempt} ttsRate={capabilities.ttsRate} open={quizOpen} onOpenChange={setQuizOpen} />
        </>
      )}
    </div>
  );
}

// Term picker — a row of three selectable cards (Autumn/Spring/Summer),
// the actual current term marked, defaulting selection to it. Scrolls
// horizontally on narrow screens rather than an Embla carousel — three
// fixed items don't need swipe physics, just a place to land on mobile.
function TermCarousel({ termStructure, currentTerm, selectedTerm, onSelectTerm, accent }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible" data-testid="term-carousel">
      {TERM_ORDER.map((term) => {
        const range = termStructure?.[term]?.teachingWeeks;
        const active = selectedTerm === term;
        const isCurrent = term === currentTerm;
        return (
          <button
            key={term}
            type="button"
            onClick={() => onSelectTerm(term)}
            className={`min-w-[200px] flex-1 rounded-2xl border p-4 text-left transition-colors duration-200 ${active ? "" : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/20"}`}
            style={active ? { borderColor: rgba(accent, 0.6), backgroundColor: rgba(accent, 0.34) } : undefined}
            data-testid={`term-option-${term}`}
            aria-pressed={active}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold text-foreground">{TERM_LABELS[term]} term</span>
              {isCurrent && (
                <span className="shrink-0 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-success" data-testid={`term-current-pill-${term}`}>
                  Current
                </span>
              )}
            </div>
            {range && (
              <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Weeks {range[0]}–{range[1]}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Random uppercase string of a given length, used by ScrambleChip to
// cycle through nonsense letters while new words are being chosen.
function randomLetters(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// A single tile that continuously re-rolls its letters — the "funky
// randomising" graphic shown mid-regenerate, standing in for the word
// grid while the new words are picked.
function ScrambleChip({ length }) {
  const [text, setText] = useState(() => randomLetters(length));
  useEffect(() => {
    const id = window.setInterval(() => setText(randomLetters(length)), 70);
    return () => window.clearInterval(id);
  }, [length]);
  return (
    <div
      className="truncate rounded-xl border border-foreground/15 bg-foreground/[0.06] px-3 py-2.5 text-center font-display text-sm font-semibold tracking-wide text-foreground/50 shadow-sm"
      aria-hidden="true"
    >
      {text}
    </div>
  );
}

// Grid of ScrambleChips shown for the "scramble" beat of a regenerate,
// same cell count as the word grid it's standing in for.
function ScramblePlaceholder({ count, testIdPrefix }) {
  const lengths = useMemo(
    () => Array.from({ length: Math.max(count, 1) }, () => 4 + Math.floor(Math.random() * 5)),
    [count],
  );
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" data-testid={`${testIdPrefix}-scramble`}>
      {lengths.map((len, i) => (
        <ScrambleChip key={i} length={len} />
      ))}
    </div>
  );
}

// Plain grid of word chips — gives "by term"/"by all" a visible word
// bank instead of just a "start practice" button floating in empty
// space. `phase` drives the regenerate choreography: "out" fades the
// current words away, "scramble" swaps in a letter-randomising
// placeholder graphic, and "in" fades the new words back in one at a
// time at staggered points across the grid.
function WordListPreview({ words, testIdPrefix, accent, phase = "idle" }) {
  const delays = useMemo(() => words.map(() => Math.random() * 0.5), [words]);

  if (phase === "scramble") {
    return <ScramblePlaceholder count={words.length} testIdPrefix={testIdPrefix} />;
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      data-testid={testIdPrefix}
      animate={{ opacity: phase === "out" ? 0 : 1 }}
      transition={{ duration: phase === "out" ? 0.26 : 0.2 }}
    >
      {words.map((entry, i) => (
        <motion.div
          key={entry.id}
          className="truncate rounded-xl border px-3 py-2.5 text-center font-display text-sm font-semibold text-foreground shadow-sm"
          style={{ backgroundColor: rgba(accent, 0.34), borderColor: rgba(accent, 0.55) }}
          title={entry.word}
          initial={phase === "in" ? { opacity: 0, y: 10, scale: 0.9 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={phase === "in" ? { duration: 0.4, delay: delays[i] ?? 0 } : { duration: 0 }}
        >
          {entry.word}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Card-style choice between the two things you can do with a resolved
// word list: search for them in a grid, or get tested on spelling them.
function ScopeActionCards({ words, capabilities, yearLabel, accent, onStartPractice }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="scope-action-cards">
      <WordSearch
        words={words}
        gridSize={capabilities.wordSearchGrid?.size}
        gridDirections={capabilities.wordSearchGrid?.directions}
        gridLetterCase={capabilities.wordSearchGrid?.letterCase}
        title={yearLabel}
        focus={words[0]?.focus || ""}
        trigger={
          <button
            type="button"
            className="w-full rounded-3xl border p-6 text-left transition duration-200 hover:brightness-125"
            style={{ borderColor: rgba(accent, 0.3), backgroundColor: rgba(accent, 0.07) }}
            data-testid="scope-card-word-search"
          >
            <Grid2x2 className="h-6 w-6" style={{ color: accent }} />
            <div className="mt-3 font-display text-lg font-bold text-foreground">Word search</div>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
              Find all {words.length} words hidden in a grid.
            </p>
          </button>
        }
      />
      <button
        type="button"
        onClick={onStartPractice}
        className="rounded-3xl border border-emerald-300/25 bg-emerald-400/5 p-6 text-left transition-colors duration-200 hover:border-emerald-300/50 hover:bg-emerald-400/10"
        data-testid="scope-card-spelling-test"
      >
        <Sparkles className="h-6 w-6 text-success" />
        <div className="mt-3 font-display text-lg font-bold text-foreground">Spelling test</div>
        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
          Type all {words.length} words — listen aloud, or guess from the meaning.
        </p>
      </button>
    </div>
  );
}

function LetterOnlyNotice() {
  return (
    <div className="border border-amber-300/20 bg-amber-400/5 p-5 text-sm text-warning" data-testid="letter-only-empty-state">
      This year is about letter sounds, not full words yet — word practice and word search unlock
      once this year's words begin. (Letter-tile practice mode isn't built yet.)
    </div>
  );
}

function EmptyScopeNotice() {
  return (
    <div className="border border-foreground/10 bg-foreground/[0.03] p-5 text-sm text-muted-foreground" data-testid="empty-scope-state">
      No words to show for this scope yet — try an earlier week.
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
