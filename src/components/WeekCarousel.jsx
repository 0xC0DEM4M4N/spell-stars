import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Info, Printer, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const WordChip = ({ word, index, week, active, isPreviewed, onPreview, onClearPreview }) => {
  const interactive = active;
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onMouseEnter={interactive ? () => onPreview(word) : undefined}
      onMouseLeave={interactive ? onClearPreview : undefined}
      onFocus={interactive ? () => onPreview(word) : undefined}
      onBlur={interactive ? onClearPreview : undefined}
      onClick={interactive ? (e) => { e.stopPropagation(); onPreview(word); } : undefined}
      className={`group flex w-full items-center justify-between border px-4 py-3 text-left transition-colors duration-300 ${
        isPreviewed
          ? "border-cyan-300/60 bg-cyan-300/10"
          : "border-white/10 bg-white/[0.04] hover:border-cyan-300/40 hover:bg-cyan-300/10"
      }`}
      data-testid={`word-chip-week-${week}-${index + 1}`}
    >
      <span className="font-display text-lg font-bold tracking-wide text-slate-100">{word.text}</span>
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {String(index + 1).padStart(2, "0")}
        {word.challenge && <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-label="Challenge word" />}
        {(word.sentence || word.meaning) && (
          <Info className={`h-3.5 w-3.5 transition-colors duration-300 ${isPreviewed ? "text-cyan-300" : "text-slate-500"}`} aria-hidden="true" />
        )}
      </span>
    </Wrapper>
  );
};

const WeekCard = ({ week, active, current, onPrint, isDragging, onClick }) => {
  const [previewedWord, setPreviewedWord] = useState(null);

  useEffect(() => {
    setPreviewedWord(null);
  }, [week.week, active]);

  return (
    <motion.article
      onClick={onClick}
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
      data-testid={`week-card-${week.week}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">{week.term}</div>
          <h3 className="mt-3 font-display text-4xl font-extrabold text-white">Week {String(week.week).padStart(2, "0")}</h3>
        </div>
        <div className="flex items-center gap-2">
          {current && (
            <div className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300" data-testid="current-week-pill">
              Current
            </div>
          )}
          {active && (
            <button onClick={(e) => { e.stopPropagation(); onPrint(); }} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-300 hover:border-emerald-300/50 hover:bg-emerald-400/10 hover:text-emerald-300" data-testid="print-week-button" aria-label="Print this week">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          )}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
        <CalendarDays className="h-4 w-4 text-cyan-300" /> {week.dateLabel}
      </div>
      <div className="mt-7 min-h-[6.5rem] border-l-2 border-cyan-300 pl-5">
        <AnimatePresence mode="wait">
          {previewedWord ? (
            <motion.div
              key={`word-${previewedWord.text}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              data-testid={`word-preview-week-${week.week}`}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                <Target className="h-4 w-4" /> {previewedWord.text}
                <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 text-[9px] tracking-[0.2em] text-cyan-200">Pinned</span>
              </div>
              {previewedWord.sentence && (
                <p className="mt-3 flex gap-2 text-base leading-snug text-slate-100">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">Eg</span>
                  <span>{previewedWord.sentence}</span>
                </p>
              )}
              {previewedWord.meaning && (
                <p className="mt-2 flex gap-2 text-sm leading-snug text-slate-400">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Means</span>
                  <span>{previewedWord.meaning}</span>
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="learning-point"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                <Target className="h-4 w-4" /> Learning point
              </div>
              <p className="mt-3 text-lg font-semibold leading-snug text-slate-100" data-testid={`learning-point-week-${week.week}`}>{week.learningPoint}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid={`word-list-week-${week.week}`}>
        {week.words.map((word, index) => (
          <WordChip
            key={word.text}
            word={word}
            index={index}
            week={week.week}
            active={active}
            isPreviewed={previewedWord?.text === word.text}
            onPreview={setPreviewedWord}
            onClearPreview={() => setPreviewedWord(null)}
          />
        ))}
      </div>
    </motion.article>
  );
};

export const WeekCarousel = ({ weeks, currentWeek, selectedWeek, onSelectWeek, onPrint }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "center" });
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
    const onSelect = () => onSelectWeek(emblaApi.selectedScrollSnap() + 1);
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi, onSelectWeek]);

  useEffect(() => {
    if (!emblaApi) return;
    const targetIndex = selectedWeek - 1;
    if (emblaApi.selectedScrollSnap() !== targetIndex) emblaApi.scrollTo(targetIndex);
  }, [emblaApi, selectedWeek]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const activeWeek = weeks[selectedWeek - 1];

  return (
    <section id="weekly-carousel" className="relative px-5 py-10 sm:px-8 lg:py-16" data-testid="weekly-carousel-section">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full border-white/15 bg-white/5 text-white hover:bg-cyan-300 hover:text-slate-950" data-testid="carousel-prev-button" aria-label="Previous week">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full border-white/15 bg-white/5 text-white hover:bg-cyan-300 hover:text-slate-950" data-testid="carousel-next-button" aria-label="Next week">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className={`overflow-hidden pt-6 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} ref={emblaRef} data-testid="week-carousel-viewport">
          <div className="-ml-4 flex">
            {weeks.map((week) => (
              <div className="min-w-0 flex-[0_0_92%] pl-4 sm:flex-[0_0_68%] lg:flex-[0_0_52%] xl:flex-[0_0_46%]" key={week.week}>
                <WeekCard week={week} active={week.week === selectedWeek} current={week.week === currentWeek} onPrint={onPrint} isDragging={isDragging} onClick={() => onSelectWeek(week.week)} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex gap-2 overflow-x-auto pb-3" data-testid="week-jump-strip" aria-label="Jump to week">
          {weeks.map((week) => (
            <button
              key={week.week}
              onClick={() => onSelectWeek(week.week)}
              className={`min-w-11 rounded-full border px-3 py-2 font-mono text-xs transition-colors duration-300 ${week.week === selectedWeek ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/50 hover:text-cyan-200"}`}
              data-testid={`week-jump-${week.week}`}
            >
              {String(week.week).padStart(2, "0")}
            </button>
          ))}
        </div>

        <div className="mt-6 border border-white/10 bg-white/[0.03] p-5 font-mono text-xs uppercase tracking-[0.2em] text-slate-400" data-testid="active-week-summary">
          Active selection: <span className="text-cyan-200">Week {String(activeWeek.week).padStart(2, "0")}</span> // {activeWeek.focus}
        </div>
      </div>
    </section>
  );
};
