import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WordSearch } from "./WordSearch";
import { PracticeQuiz } from "./PracticeQuiz";
import { FindTheLetter } from "./FindTheLetter";
import { PrintWeekMenu } from "./PrintWeekMenu";
import { formatWeekCommencing } from "@/lib/weekDates";

// Renders sentence text with the spelling word highlighted in bold cyan
function HighlightWord({ text, word }) {
  if (!text || !word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase()
      ? <strong key={i} className="font-bold text-cyan-300 underline decoration-cyan-300">{part}</strong>
      : part
  );
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const WordChip = ({ entry, index, week, active, pinned, onHover, onLeave, onSelect }) => (
  <div
    className={`flex cursor-pointer items-center justify-between border px-4 py-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
      pinned
        ? "border-cyan-300/60 bg-cyan-300/15"
        : active
        ? "border-cyan-300/40 bg-cyan-300/8"
        : "border-white/10 bg-white/[0.04] hover:border-cyan-300/30 hover:bg-cyan-300/5"
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
    <span className="font-display text-lg font-bold tracking-wide text-slate-100">{entry.word}</span>
    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
      {String(index + 1).padStart(2, "0")}
      {(entry.exampleSentence || entry.definition) && (
        <Info className={`h-3 w-3 transition-colors ${pinned ? "text-cyan-300" : active ? "text-slate-400" : "text-slate-600"}`} aria-hidden="true" />
      )}
    </span>
  </div>
);

function WeekCard({ weekData, active, current, isDragging, onClick, onAttempt, capabilities }) {
  const [pinnedWord, setPinnedWord] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const activeWordInfo = hoveredWord ?? pinnedWord;
  const caps = capabilities || {};

  const handleSelect = (entry, e) => {
    e.stopPropagation();
    setPinnedWord((prev) => (prev?.id === entry.id ? null : entry));
  };

  const handleCardClick = (e) => {
    setPinnedWord(null);
    onClick && onClick(e);
  };

  return (
    <motion.article
      onClick={handleCardClick}
      whileHover={isDragging ? {} : {
        y: -6,
        boxShadow: active
          ? "0 0 0 1px rgba(103,232,249,0.22), 0 12px 56px rgba(103,232,249,0.26), 0 24px 80px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(148,163,184,0.14), 0 12px 40px rgba(148,163,184,0.13), 0 24px 80px rgba(0,0,0,0.45)",
      }}
      style={active ? {
        boxShadow: "0 0 0 1px rgba(103,232,249,0.18), 0 8px 48px rgba(103,232,249,0.2), 0 24px 80px rgba(0,0,0,0.4)",
      } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`holo-card h-full rounded-[1.75rem] p-6 sm:p-8 ${active ? "opacity-100" : "opacity-55 cursor-pointer"}`}
      data-testid={`week-card-${weekData.week}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">{capitalize(weekData.term)} term</div>
          <h3 className="mt-3 font-display text-4xl font-extrabold text-white">Week {String(weekData.week).padStart(2, "0")}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {current && (
            <div className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300" data-testid="current-week-pill">
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
          <button
            onClick={e => { e.stopPropagation(); setQuizOpen(true); }}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200 hover:border-pink-300/50 hover:bg-pink-300/10 hover:text-pink-200"
            data-testid="practice-button"
          >
            <Sparkles className="h-3.5 w-3.5" /> Practice
          </button>
          <PrintWeekMenu weekData={weekData} capabilities={capabilities} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
        Week {weekData.weekOfTerm} of term
      </div>

      {/* Fixed-height info panel — prevents card from jumping */}
      <div className="mt-7 h-[6.25rem] overflow-hidden border-l-2 border-cyan-300 pl-5">
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200">
          <Target className="h-4 w-4" />
          {activeWordInfo ? activeWordInfo.word : "Learning point"}
          {pinnedWord && !hoveredWord && <span className="ml-1 rounded-full bg-cyan-300/20 px-2 py-0.5 text-[9px] text-cyan-300">pinned</span>}
        </div>
        <AnimatePresence mode="wait">
          {activeWordInfo ? (
            <motion.div
              key={activeWordInfo.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              {activeWordInfo.exampleSentence && (
                <p className="text-sm leading-snug text-slate-200">
                  <span className="mr-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400">eg</span>
                  <HighlightWord text={activeWordInfo.exampleSentence} word={activeWordInfo.word} />
                </p>
              )}
              {activeWordInfo.definition && (
                <p className="mt-1 text-sm leading-snug text-slate-400">
                  <span className="mr-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">means</span>
                  {activeWordInfo.definition}
                </p>
              )}
              {!activeWordInfo.exampleSentence && !activeWordInfo.definition && (
                <p className="text-sm italic text-slate-500">Definition coming soon.</p>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="lp"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="text-base font-semibold leading-snug text-slate-100"
              data-testid={`learning-point-week-${weekData.week}`}
            >
              {weekData.focus}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid={`word-list-week-${weekData.week}`}>
        {weekData.words.map((entry, index) => (
          <WordChip
            key={entry.id}
            entry={entry}
            index={index}
            week={weekData.week}
            active={activeWordInfo?.id === entry.id}
            pinned={pinnedWord?.id === entry.id}
            onHover={() => setHoveredWord(entry)}
            onLeave={() => setHoveredWord(null)}
            onSelect={(e) => handleSelect(entry, e)}
          />
        ))}
      </div>
      <PracticeQuiz words={weekData.words} onAttempt={onAttempt} ttsRate={caps.ttsRate} open={quizOpen} onOpenChange={setQuizOpen} />
    </motion.article>
  );
}

function LetterWeekCard({ weekData, active, current, isDragging, onClick, onAttempt, capabilities }) {
  const [activeDay, setActiveDay] = useState(0);
  const dayEntry = weekData.letters[Math.min(activeDay, weekData.letters.length - 1)];

  const handleCardClick = (e) => {
    onClick && onClick(e);
  };

  return (
    <motion.article
      onClick={handleCardClick}
      whileHover={isDragging ? {} : {
        y: -6,
        boxShadow: active
          ? "0 0 0 1px rgba(103,232,249,0.22), 0 12px 56px rgba(103,232,249,0.26), 0 24px 80px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(148,163,184,0.14), 0 12px 40px rgba(148,163,184,0.13), 0 24px 80px rgba(0,0,0,0.45)",
      }}
      style={active ? {
        boxShadow: "0 0 0 1px rgba(103,232,249,0.18), 0 8px 48px rgba(103,232,249,0.2), 0 24px 80px rgba(0,0,0,0.4)",
      } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`holo-card h-full rounded-[1.75rem] p-6 sm:p-8 ${active ? "opacity-100" : "opacity-55 cursor-pointer"}`}
      data-testid={`week-card-${weekData.week}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">{capitalize(weekData.term)} term</div>
          <h3 className="mt-3 font-display text-4xl font-extrabold text-white">Week {String(weekData.week).padStart(2, "0")}</h3>
        </div>
        {current && (
          <div className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300" data-testid="current-week-pill">
            Current
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
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
                ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
                : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/40 hover:text-cyan-200"
            }`}
            data-testid={`letter-day-${index}`}
          >
            <span className="uppercase">Day {index + 1}</span> · {entry.prompt}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">{dayEntry.focus}</div>
        <div className="font-display text-7xl font-extrabold text-cyan-200" data-testid="letter-of-the-day">
          {dayEntry.prompt}
        </div>
        <FindTheLetter prompt={dayEntry.prompt} entryId={dayEntry.id} onAttempt={onAttempt} ttsRate={capabilities?.ttsRate} />
      </div>
    </motion.article>
  );
}

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "center", watchDrag: true, dragFree: false });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onDown = () => setIsDragging(true);
    const onUp = () => setIsDragging(false);
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

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const activeWeek = weeks.find((w) => w.week === selectedWeek) || weeks[0];

  if (!weeks.length) return null;

  return (
    <section id="weekly-carousel" className="relative pb-6" data-testid="weekly-carousel-section">
       <div className="slim-scrollbar mt-5 flex gap-2 overflow-x-auto overflow-y-visible pb-3 pt-8" data-testid="week-jump-strip" aria-label="Jump to week">
          {weeks.map((weekData) => (
            <button
              key={weekData.week}
              onClick={() => onSelectWeek(weekData.week)}
              className={`group relative min-w-11 rounded-full border px-3 py-2 font-mono text-xs transition-colors duration-300 ${weekData.week === selectedWeek ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/50 hover:text-cyan-200"}`}
              data-testid={`week-jump-${weekData.week}`}
            >
              {String(weekData.week).padStart(2, "0")}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0b0f1a] px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-slate-300 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {formatWeekCommencing(weekData.week)}
              </span>
            </button>
          ))}
        </div>
        <div className="mx-auto max-w-7xl">
         {activeWeek && (
          <div className="mt-6 border border-white/10 bg-white/[0.03] p-5 font-mono text-xs uppercase tracking-[0.2em] text-slate-400" data-testid="active-week-summary">
            Active selection: <span className="text-cyan-200">Week {String(activeWeek.week).padStart(2, "0")}</span> // {activeWeek.focus}
          </div>
        )}
        <div className={`overflow-hidden pt-6 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} ref={emblaRef} data-testid="week-carousel-viewport">
          <div className="-ml-4 flex">
            {weeks.map((weekData) => (
              <div className="min-w-0 flex-[0_0_92%] pl-4 sm:flex-[0_0_68%] lg:flex-[0_0_52%] xl:flex-[0_0_46%]" key={weekData.week}>
                {weekData.kind === "letters" ? (
                  <LetterWeekCard
                    weekData={weekData}
                    active={weekData.week === selectedWeek}
                    current={weekData.week === currentWeek}
                    isDragging={isDragging}
                    onClick={() => onSelectWeek(weekData.week)}
                    onAttempt={onAttempt}
                    capabilities={capabilities}
                  />
                ) : (
                  <WeekCard
                    weekData={weekData}
                    active={weekData.week === selectedWeek}
                    current={weekData.week === currentWeek}
                    isDragging={isDragging}
                    onClick={() => onSelectWeek(weekData.week)}
                    onAttempt={onAttempt}
                    capabilities={capabilities}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full border-white/15 bg-white/5 text-white hover:bg-cyan-300 hover:text-slate-950" data-testid="carousel-prev-button" aria-label="Previous week">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full border-white/15 bg-white/5 text-white hover:bg-cyan-300 hover:text-slate-950" data-testid="carousel-next-button" aria-label="Next week">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

       
      </div>
    </section>
  );
};
