import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WordSearch } from "./WordSearch";
import { Crossword } from "./Crossword";
import { PracticeQuiz } from "./PracticeQuiz";
import { FindTheLetter } from "./FindTheLetter";
import { PrintWeekMenu } from "./PrintWeekMenu";
import { formatWeekCommencing } from "@/lib/weekDates";
import { SPRING } from "@/lib/motion";
import { progressKey } from "@/lib/wordKey";
import { useTheme } from "@/context/ThemeContext";

// Renders sentence text with the spelling word highlighted in bold cyan
function HighlightWord({ text, word }) {
  if (!text || !word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase()
      ? <strong key={i} className="rounded bg-primary/15 px-1 font-extrabold text-foreground underline decoration-primary decoration-2 underline-offset-4">{part}</strong>
      : part
  );
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// The card at rest opens up into a wide, two-column layout, but only once
// it has been still for this long: flicking through the weeks never
// triggers (or interrupts) the animation.
const WIDE_DELAY_MS = 500;
// Card sizes in px. Every card is at most NARROW_CARD_PX wide; the open one
// may grow to the page's content column (max-w-7xl minus its px-6 = 77rem).
const NARROW_CARD_PX = 576;
const WIDE_CARD_PX = 1232;
const SLIDE_GUTTER_PX = 16; // the pl-4 between slides
const PAGE_MARGIN_PX = 48; // room left for the neighbouring cards to peek in
const CARD_PADDING_PX = 32; // sm:p-8
// Below this card width there isn't room for two columns; stay stacked.
const MIN_WIDE_CARD_PX = 880;

const WordChip = ({ entry, index, week, active, pinned, wide, onHover, onLeave, onSelect }) => (
  <div
    className={`flex cursor-pointer items-center justify-between border px-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
      wide ? "px-5 py-4" : "py-3"
    } ${
      pinned
        ? "border-cyan-300/60 bg-cyan-300/15"
        : active
        ? "border-cyan-300/40 bg-cyan-300/8"
        : "border-foreground/10 bg-foreground/[0.04] hover:border-cyan-300/30 hover:bg-cyan-300/5"
    }`}
    tabIndex={0}
    role="button"
    aria-pressed={pinned}
    aria-label={entry.word}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    onFocus={onHover}
    onBlur={onLeave}
    onClick={onSelect}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(e); } }}
    data-testid={`word-chip-week-${week}-${index + 1}`}
  >
    <span className={`font-display font-bold tracking-wide text-foreground ${wide ? "text-2xl" : "text-lg"}`}>{entry.word}</span>
    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {String(index + 1).padStart(2, "0")}
      {(entry.exampleSentence || entry.definition) && (
        <Info className={`h-3 w-3 transition-colors ${pinned ? "text-primary" : active ? "text-muted-foreground" : "text-slate-600"}`} aria-hidden="true" />
      )}
    </span>
  </div>
);

// Shared card chrome for both card kinds: the glow, hover lift and fade for
// inactive cards. `overflow-hidden` + a fixed-width inner wrapper let the
// card's frame widen and narrow like a window opening on content that has
// already been laid out at its final size, so nothing reflows mid-animation.
const cardShadow = (active, hover, light) => {
  if (light) {
    // Tight, soft shadows so nothing is clipped by the carousel viewport.
    if (hover) return active
      ? "0 0 0 2px rgba(8,145,178,0.9), 0 0 0 6px rgba(8,145,178,0.18), 0 8px 26px rgba(8,145,178,0.22), 0 8px 24px rgba(15,23,42,0.12)"
      : "0 0 0 1px rgba(100,116,139,0.3), 0 8px 26px rgba(15,23,42,0.14)";
    return active
      ? "0 0 0 2px rgba(8,145,178,0.85), 0 0 0 6px rgba(8,145,178,0.14), 0 6px 24px rgba(8,145,178,0.16), 0 6px 20px rgba(15,23,42,0.10)"
      : "0 0 0 1px rgba(100,116,139,0.22), 0 6px 20px rgba(15,23,42,0.08)";
  }
  if (hover) {
    return active
      ? "0 0 0 2px rgba(34,211,238,0.95), 0 0 0 8px rgba(34,211,238,0.25), 0 14px 60px rgba(34,211,238,0.32), 0 24px 80px rgba(0,0,0,0.5)"
      : "0 0 0 1px rgba(148,163,184,0.14), 0 0 0 1px rgba(148,163,184,0.08), 0 12px 40px rgba(148,163,184,0.13), 0 24px 80px rgba(0,0,0,0.45)";
  }
  return active
    ? "0 0 0 2px rgba(34,211,238,0.85), 0 0 0 8px rgba(34,211,238,0.18), 0 10px 50px rgba(34,211,238,0.22), 0 24px 80px rgba(0,0,0,0.4)"
    : "0 0 0 1px rgba(148,163,184,0.1), 0 0 0 1px rgba(148,163,184,0.05), 0 12px 40px rgba(148,163,184,0.08), 0 24px 80px rgba(0,0,0,0.35)";
};

// Reports a card's natural content height (what it needs at its current
// layout, padding included) up to the carousel, which sizes the track to fit
// the resting card. Measured on an un-stretched wrapper so it is the height
// the content wants, not the height it has been given.
function useReportHeight(ref, onMeasure, week, wide) {
  const wideRef = useRef(wide);
  wideRef.current = wide;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !onMeasure) return undefined;
    const report = () => onMeasure(week, node.offsetHeight + CARD_PADDING_PX * 2, wideRef.current);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, onMeasure, week, wide]);
}

const WeekCard = memo(function WeekCard({ weekData, active, current, wide, innerWidth, isDragging, onSelectWeek, onAttempt, onMeasure, capabilities }) {
  const measureRef = useRef(null);
  useReportHeight(measureRef, onMeasure, weekData.week, wide);
  const [pinnedWord, setPinnedWord] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const activeWordInfo = hoveredWord ?? pinnedWord;
  const caps = capabilities || {};

  const handleSelect = (entry, e) => {
    e.stopPropagation();
    setPinnedWord((prev) => (prev?.id === entry.id ? null : entry));
  };

  const handleCardClick = () => {
    setPinnedWord(null);
    onSelectWeek && onSelectWeek(weekData.week);
  };

  const { theme } = useTheme();
  const light = theme !== "dark" && theme !== "highContrast";
  return (
    <motion.article
      onClick={handleCardClick}
      whileHover={isDragging ? {} : { y: -6, boxShadow: cardShadow(active, true, light) }}
      style={{ boxShadow: cardShadow(active, false, light) }}
      transition={SPRING.settle}
      className={`holo-card h-full overflow-hidden rounded-[1.75rem] p-6 transition-opacity duration-300 ease-fluid sm:p-8 ${active ? "opacity-100" : "opacity-55 cursor-pointer"}`}
      data-testid={`week-card-${weekData.week}`}
      data-wide={wide ? "true" : "false"}
    >
      <div style={innerWidth ? { width: innerWidth } : undefined}>
        <div ref={measureRef} className={wide ? "grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10" : ""}>
          <div className="flex min-w-0 flex-col">
            <div className={wide ? "flex flex-col items-start gap-5" : "flex flex-wrap items-start justify-between gap-4"}>
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">{capitalize(weekData.term)} term</div>
                <h3 className="type-section mt-3 font-display text-4xl font-extrabold text-foreground">Week {String(weekData.week).padStart(2, "0")}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {current && (
                  <div className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-success" data-testid="current-week-pill">
                    Current
                  </div>
                )}
                <WordSearch
                  words={weekData.words}
                  gridSize={caps.wordSearchGrid?.size}
                  gridDirections={caps.wordSearchGrid?.directions}
                  gridLetterCase={caps.wordSearchGrid?.letterCase}
                  title={`Week ${String(weekData.week).padStart(2, "0")}`}
                  focus={weekData.focus}
                />
                <Crossword
                  words={weekData.words}
                  title={`Week ${String(weekData.week).padStart(2, "0")}`}
                  focus={weekData.focus}
                />
                <button
                  onClick={e => { e.stopPropagation(); setQuizOpen(true); }}
                  className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-pink-300/50 hover:bg-pink-300/10 hover:text-accent2"
                  data-testid="practice-button"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Practice
                </button>
                <PrintWeekMenu weekData={weekData} capabilities={capabilities} />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Week {weekData.weekOfTerm} of term
            </div>

            {/* Fixed-height info panel — prevents card from jumping */}
            <div className={`mt-7 overflow-hidden border-l-2 border-cyan-300 pl-5 ${wide ? "h-[12rem]" : "h-[9rem]"}`}>
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
                <Target className="h-4 w-4" />
                {activeWordInfo ? (
                  <span className="font-display text-2xl font-extrabold normal-case tracking-normal text-foreground">{activeWordInfo.word}</span>
                ) : (
                  "Learning point"
                )}
                {pinnedWord && !hoveredWord && <span className="ml-1 rounded-full bg-cyan-300/20 px-2 py-0.5 text-[9px] text-primary">pinned</span>}
              </div>
              <AnimatePresence mode="wait">
                {activeWordInfo ? (
                  <motion.div
                    key={activeWordInfo.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                  >
                    {activeWordInfo.exampleSentence && (
                      <p className="text-base leading-snug text-foreground">
                        <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">eg</span>
                        <HighlightWord text={activeWordInfo.exampleSentence} word={activeWordInfo.word} />
                      </p>
                    )}
                    {activeWordInfo.definition && (
                      <p className="mt-1.5 text-base leading-snug text-muted-foreground">
                        <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">means</span>
                        {activeWordInfo.definition}
                      </p>
                    )}
                    {!activeWordInfo.exampleSentence && !activeWordInfo.definition && (
                      <p className="text-sm italic text-muted-foreground">Definition coming soon.</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.p
                    key="lp"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className={`font-semibold leading-snug text-foreground ${wide ? "text-lg" : "text-base"}`}
                    data-testid={`learning-point-week-${weekData.week}`}
                  >
                    {weekData.focus}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div
            className={`grid min-w-0 grid-cols-1 content-start gap-3 sm:grid-cols-2 ${wide ? "" : "mt-8"}`}
            data-testid={`word-list-week-${weekData.week}`}
          >
            {weekData.words.map((entry, index) => (
              <WordChip
                key={entry.id}
                entry={entry}
                index={index}
                week={weekData.week}
                wide={wide}
                active={activeWordInfo?.id === entry.id}
                pinned={pinnedWord?.id === entry.id}
                onHover={() => setHoveredWord(entry)}
                onLeave={() => setHoveredWord(null)}
                onSelect={(e) => handleSelect(entry, e)}
              />
            ))}
          </div>
        </div>
      </div>
      <PracticeQuiz words={weekData.words} onAttempt={onAttempt} ttsRate={caps.ttsRate} open={quizOpen} onOpenChange={setQuizOpen} />
    </motion.article>
  );
});

const LetterWeekCard = memo(function LetterWeekCard({ weekData, active, current, wide, innerWidth, isDragging, onSelectWeek, onAttempt, onMeasure, capabilities }) {
  const measureRef = useRef(null);
  useReportHeight(measureRef, onMeasure, weekData.week, wide);
  const [activeDay, setActiveDay] = useState(0);
  const dayEntry = weekData.letters[Math.min(activeDay, weekData.letters.length - 1)];

  const handleCardClick = () => {
    onSelectWeek && onSelectWeek(weekData.week);
  };

  const { theme } = useTheme();
  const light = theme !== "dark" && theme !== "highContrast";
  return (
    <motion.article
      onClick={handleCardClick}
      whileHover={isDragging ? {} : { y: -6, boxShadow: cardShadow(active, true, light) }}
      style={{ boxShadow: cardShadow(active, false, light) }}
      transition={SPRING.settle}
      className={`holo-card h-full overflow-hidden rounded-[1.75rem] p-6 transition-opacity duration-300 ease-fluid sm:p-8 ${active ? "opacity-100" : "opacity-55 cursor-pointer"}`}
      data-testid={`week-card-${weekData.week}`}
      data-wide={wide ? "true" : "false"}
    >
      <div style={innerWidth ? { width: innerWidth } : undefined}>
        <div ref={measureRef} className={wide ? "grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10" : ""}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">{capitalize(weekData.term)} term</div>
                <h3 className="type-section mt-3 font-display text-4xl font-extrabold text-foreground">Week {String(weekData.week).padStart(2, "0")}</h3>
              </div>
              {current && (
                <div className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-success" data-testid="current-week-pill">
                  Current
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Letter of the day — one new sound each school day
            </div>

            <div className="mt-7 flex flex-wrap gap-2" data-testid="letter-day-pills">
              {weekData.letters.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveDay(index); }}
                  className={`rounded-full border px-3 py-2 font-mono text-xs tracking-[0.14em] transition-colors duration-200 ${
                    index === activeDay
                      ? "border-cyan-300 bg-cyan-300/15 text-primary"
                      : "border-foreground/10 bg-foreground/5 text-muted-foreground hover:border-cyan-300/40 hover:text-primary"
                  }`}
                  data-testid={`letter-day-${index}`}
                >
                  <span className="uppercase">Day {index + 1}</span> · {entry.prompt}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex min-w-0 flex-col items-center justify-center gap-4 rounded-3xl border border-foreground/10 bg-foreground/[0.04] p-8 text-center ${wide ? "" : "mt-6"}`}>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{dayEntry.focus}</div>
            <div className="font-display text-7xl font-extrabold text-primary" data-testid="letter-of-the-day">
              {dayEntry.prompt}
            </div>
            <FindTheLetter prompt={dayEntry.prompt} entryId={progressKey(dayEntry)} onAttempt={onAttempt} ttsRate={capabilities?.ttsRate} />
          </div>
        </div>
      </div>
    </motion.article>
  );
});

/**
 * Swipeable, week-by-week curriculum browser — one card per week (from
 * scope.buildWeeksForYear), each showing that week's focus and full word
 * list, with Practice/Word Search launchable right from the card.
 *
 * "Current week" (the manually-set week from spell-stars-wordlist-spec.md
 * §1) and the carousel's browsing position are the same value here —
 * swiping to a week sets it as current, since there's no calendar-driven
 * "true" current week to keep separate from it.
 */
export const WeekCarousel = ({ weeks, currentWeek, selectedWeek, onSelectWeek, onAttempt, capabilities }) => {
  // The card track runs the full width of the page, while the week strip,
  // summary banner and arrows stay in the centred content column. The
  // column wrapper is measured so the active card always rests exactly on
  // the column's left edge (aligned with the rest of the page), with the
  // neighbouring cards bleeding off toward the screen edges.
  const columnRef = useRef(null);
  const viewportRef = useRef(null);

  const emblaOptions = useMemo(
    () => ({
      // Distance from the viewport's left edge to where the active card
      // (its content, past the slide's own gutter) should rest.
      align: () => {
        const column = columnRef.current;
        const viewport = viewportRef.current;
        if (!column || !viewport) return 0;
        const gutter = parseFloat(getComputedStyle(column).paddingLeft) || 0;
        return column.getBoundingClientRect().left + gutter - viewport.getBoundingClientRect().left;
      },
      containScroll: false, // the first/last card can rest on the column edge too
      dragFree: false, // always settle exactly on a card...
      skipSnaps: false, // ...and never fly past more than one per drag
      duration: 20, // a decisive settle rather than a long glide
      watchDrag: true,
    }),
    [],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const setViewport = useCallback(
    (node) => {
      viewportRef.current = node;
      emblaRef(node);
    },
    [emblaRef],
  );
  const [isDragging, setIsDragging] = useState(false);

  // Snap-to-card on release. Embla settles on the nearest card, which
  // makes a short, deliberate drag fall back to where it started. A drag
  // of more than DRAG_COMMIT_PX in either direction commits to the next
  // (or previous) card instead, so swiping always lands on a card and
  // never rests between two.
  useEffect(() => {
    if (!emblaApi) return;
    const DRAG_COMMIT_PX = 70;
    let startLocation = 0;
    let startIndex = 0;
    // Embla doesn't hand its pointer events to listeners, so read how far
    // the track has actually travelled from its own position instead.
    const trackPosition = () => emblaApi.internalEngine().location.get();
    const onDown = () => {
      setIsDragging(true);
      startLocation = trackPosition();
      startIndex = emblaApi.selectedScrollSnap();
    };
    const onUp = () => {
      setIsDragging(false);
      const dx = trackPosition() - startLocation;
      if (Math.abs(dx) < DRAG_COMMIT_PX) return;
      const target = Math.max(0, Math.min(emblaApi.scrollSnapList().length - 1, startIndex + (dx < 0 ? 1 : -1)));
      emblaApi.scrollTo(target);
    };
    emblaApi.on("pointerDown", onDown);
    emblaApi.on("pointerUp", onUp);
    return () => { emblaApi.off("pointerDown", onDown); emblaApi.off("pointerUp", onUp); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const snap = emblaApi.selectedScrollSnap();
      const weekData = weeks[snap];
      if (weekData) onSelectWeek(weekData.week);
    };
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi, onSelectWeek, weeks]);

  useEffect(() => {
    if (!emblaApi) return;
    const targetIndex = weeks.findIndex((w) => w.week === selectedWeek);
    if (targetIndex >= 0 && emblaApi.selectedScrollSnap() !== targetIndex) emblaApi.scrollTo(targetIndex);
  }, [emblaApi, selectedWeek, weeks]);

  // ── Wide "open" card ────────────────────────────────────────────────────
  const [viewportWidth, setViewportWidth] = useState(0);
  const hasWeeks = weeks.length > 0;
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    const update = () => setViewportWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasWeeks]);

  const narrowCardPx = viewportWidth ? Math.min(viewportWidth - PAGE_MARGIN_PX, NARROW_CARD_PX) : 0;
  const wideCardPx = viewportWidth ? Math.min(viewportWidth - PAGE_MARGIN_PX, WIDE_CARD_PX) : 0;
  const canWide = wideCardPx >= MIN_WIDE_CARD_PX;

  // Natural content heights reported by the cards, per layout. The track is
  // sized to the tallest narrow card normally, and to the open card's own
  // (shorter) height while one is open, so no dead space is left beneath it.
  const measuresRef = useRef(new Map());
  const [, setMeasureVersion] = useState(0);
  const handleMeasure = useCallback((week, height, isWide) => {
    const entry = measuresRef.current.get(week) || {};
    const key = isWide ? "wide" : "narrow";
    if (entry[key] === height) return;
    measuresRef.current.set(week, { ...entry, [key]: height });
    setMeasureVersion((v) => v + 1);
  }, []);

  // Which week's card is currently open. It only ever changes once the
  // carousel has been still for WIDE_DELAY_MS: any drag or scroll cancels
  // the pending change, so paging through the weeks just moves the (narrow)
  // cards and the open card catches up when you stop.
  const [wideWeek, setWideWeek] = useState(null);
  const weeksRef = useRef(weeks);
  weeksRef.current = weeks;
  useEffect(() => {
    if (!emblaApi) return undefined;
    if (!canWide) {
      setWideWeek(null);
      return undefined;
    }
    let timer = null;
    const cancel = () => window.clearTimeout(timer);
    const arm = () => {
      cancel();
      timer = window.setTimeout(() => {
        const week = weeksRef.current[emblaApi.selectedScrollSnap()]?.week;
        if (week != null) setWideWeek(week);
      }, WIDE_DELAY_MS);
    };
    emblaApi.on("pointerDown", cancel).on("scroll", cancel).on("pointerUp", arm).on("settle", arm);
    arm();
    return () => {
      cancel();
      emblaApi.off("pointerDown", cancel).off("scroll", cancel).off("pointerUp", arm).off("settle", arm);
    };
  }, [emblaApi, canWide]);

  let narrowMax = 0;
  measuresRef.current.forEach((entry) => { if (entry.narrow > narrowMax) narrowMax = entry.narrow; });
  // Follow the *selected* card, not the open one: while paging through the
  // weeks the open card may be several cards back, and the cards in view
  // must not be cut short by its (shorter) height.
  const selectedIsOpen = canWide && selectedWeek === wideWeek;
  const openHeight = selectedIsOpen ? measuresRef.current.get(wideWeek)?.wide : undefined;
  const fitHeight = canWide ? openHeight || narrowMax || 0 : 0;

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const activeWeek = weeks.find((w) => w.week === selectedWeek) || weeks[0];

  if (!weeks.length) return null;

  return (
    <section id="weekly-carousel" className="relative pb-6" data-testid="weekly-carousel-section">
      <div ref={columnRef} className="mx-auto max-w-7xl px-6">
        <div className="slim-scrollbar mt-5 flex gap-2 overflow-x-auto overflow-y-visible pb-3 pt-8" data-testid="week-jump-strip" aria-label="Jump to week">
          {weeks.map((weekData) => (
            <button
              key={weekData.week}
              onClick={() => onSelectWeek(weekData.week)}
              className={`hit-slop group relative min-w-11 rounded-full border px-3 py-2 font-mono text-xs transition-colors duration-300 ${weekData.week === selectedWeek ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-foreground/10 bg-foreground/5 text-muted-foreground hover:border-cyan-300/50 hover:text-primary"}`}
              data-testid={`week-jump-${weekData.week}`}
            >
              {String(weekData.week).padStart(2, "0")}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-foreground/10 bg-popover px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {formatWeekCommencing(weekData.week)}
              </span>
            </button>
          ))}
        </div>
        {activeWeek && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-l-4 border-cyan-400 bg-foreground/[0.04] p-5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground" data-testid="active-week-summary">
            <span>Active selection:</span>
            <span className="rounded-full bg-cyan-400 px-2.5 py-1 font-bold text-slate-950">Week {String(activeWeek.week).padStart(2, "0")}</span>
            <span>// {activeWeek.focus}</span>
          </div>
        )}
      </div>

      {/* Full-bleed track: spans the whole page width, edge to edge. */}
      <div
        className={`week-viewport -mb-10 overflow-hidden pb-10 pt-6 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={fitHeight ? { height: fitHeight + 64 } : undefined}
        ref={setViewport}
        data-testid="week-carousel-viewport"
      >
        <div className="-ml-4 flex h-full">
          {weeks.map((weekData) => {
            const wide = canWide && weekData.week === wideWeek;
            const cardPx = wide ? wideCardPx : narrowCardPx;
            const cardProps = {
              weekData,
              active: weekData.week === selectedWeek,
              current: weekData.week === currentWeek,
              wide,
              // Content is laid out at the size the card is heading for, so
              // the frame reveals it instead of squeezing it mid-animation.
              innerWidth: canWide ? cardPx - CARD_PADDING_PX * 2 : undefined,
              isDragging,
              onSelectWeek,
              onAttempt,
              onMeasure: handleMeasure,
              capabilities,
            };
            return (
              <div
                className={`min-w-0 flex-[0_0_min(calc(100%_-_3rem),37rem)] pl-4 ${viewportWidth ? "week-slot" : ""}`}
                style={viewportWidth ? { flexBasis: cardPx + SLIDE_GUTTER_PX } : undefined}
                key={weekData.week}
              >
                {weekData.kind === "letters" ? <LetterWeekCard {...cardProps} /> : <WeekCard {...cardProps} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full border-foreground/15 bg-foreground/5 text-foreground hover:bg-cyan-300 hover:text-slate-950" data-testid="carousel-prev-button" aria-label="Previous week">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full border-foreground/15 bg-foreground/5 text-foreground hover:bg-cyan-300 hover:text-slate-950" data-testid="carousel-next-button" aria-label="Next week">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
