import { useState } from "react";
import { BookOpenText, Check, Grid2x2, PenLine, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatWeekCommencing } from "@/lib/weekDates";
import { buildCombinedSheet, openPrintWindow } from "@/lib/printSheets";

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const PRINT_OPTIONS = [
  {
    value: "words",
    label: "Words only",
    icon: BookOpenText,
    description: "A list of the words with their meaning and an example sentence.",
  },
  {
    value: "writing",
    label: "Writing practice",
    icon: PenLine,
    description: "Each word, with two blank lines alongside it for handwriting practice.",
  },
  {
    value: "wordsearch",
    label: "Wordsearch",
    icon: Grid2x2,
    description: "A wordsearch grid with the words listed at the side.",
  },
];

/**
 * "Print" trigger for a weekly card — opens a small modal offering the
 * three printable formats as a multi-select (pick one or more, then
 * Continue). Everything picked is combined into a single print job, one
 * format per page, rather than a separate print dialog per format.
 */
export const PrintWeekMenu = ({ weekData, capabilities }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const caps = capabilities || {};

  const title = `Week ${String(weekData.week).padStart(2, "0")}`;
  const topic = weekData.focus;
  const meta = `${capitalize(weekData.term)} term · ${formatWeekCommencing(weekData.week)}`;

  const toggleOption = (value) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleOpenChange = (v) => {
    setOpen(v);
    if (v) setSelected([]);
  };

  const handleContinue = () => {
    if (!selected.length) return;
    // Keep a stable page order regardless of click order.
    const orderedTypes = PRINT_OPTIONS.map((o) => o.value).filter((v) => selected.includes(v));
    openPrintWindow(
      buildCombinedSheet(`${title} – SPELL// ST★RS`, orderedTypes, {
        title,
        topic,
        meta,
        words: weekData.words,
        gridSize: caps.wordSearchGrid?.size,
        gridDirections: caps.wordSearchGrid?.directions,
        gridLetterCase: caps.wordSearchGrid?.letterCase,
      }),
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-primary"
          data-testid="print-week-button"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-w-lg overflow-hidden border-cyan-300/20 bg-popover p-0 text-foreground"
        data-testid="print-week-dialog"
      >
        <div className="holo-card p-6 sm:p-7">
          <DialogHeader>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              Print // {title}
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold text-foreground">
              What would you like to print?
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Pick one or more — they'll print together.</p>
          </DialogHeader>

          <div className="mt-6 flex flex-col gap-3" data-testid="print-week-options">
            {PRINT_OPTIONS.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleOption(option.value)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-200 ${
                    checked
                      ? "border-cyan-300/60 bg-cyan-300/10"
                      : "border-foreground/10 bg-foreground/[0.04] hover:border-cyan-300/40 hover:bg-cyan-300/5"
                  }`}
                  data-testid={`print-option-${option.value}`}
                >
                  <option.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="font-display text-base font-bold text-foreground">{option.label}</div>
                    <p className="mt-1 text-sm leading-snug text-muted-foreground">{option.description}</p>
                  </div>
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${
                      checked ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-foreground/25 bg-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selected.length}
            className="mt-6 w-full rounded-full bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-400"
            data-testid="print-week-continue"
          >
            <Printer className="h-4 w-4" /> Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
