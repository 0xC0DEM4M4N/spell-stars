import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildWordsOnlySheet, openPrintWindow } from "@/lib/printSheets";

const TERM_LABELS = { autumn: "Autumn", spring: "Spring", summer: "Summer" };

function Toggle({ checked, onChange, label, testId }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? "justify-end bg-cyan-400" : "justify-start bg-white/15"
        }`}
        data-testid={testId}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Print button for the term view — prints the *full* word pool for the
 * selected term (not just the session-sized sample shown on screen),
 * with meanings and example sentences each optional via a toggle.
 */
export const PrintTermListButton = ({ words, term, yearLabel }) => {
  const [open, setOpen] = useState(false);
  const [includeMeanings, setIncludeMeanings] = useState(true);
  const [includeSentences, setIncludeSentences] = useState(true);

  const termLabel = TERM_LABELS[term] || term;
  const title = `${termLabel} term`;

  const handlePrint = () => {
    openPrintWindow(
      buildWordsOnlySheet({
        eyebrow: "Full word list",
        title,
        topic: yearLabel,
        meta: `${words.length} words`,
        words,
        includeMeanings,
        includeSentences,
      }),
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-full border-white/15 bg-white/5 px-3 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          data-testid="print-term-words-button"
        >
          <Printer className="h-3.5 w-3.5" /> Print list
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-md overflow-hidden border-cyan-300/20 bg-[#08101f] p-0 text-slate-100"
        data-testid="print-term-dialog"
      >
        <div className="holo-card p-6 sm:p-7">
          <DialogHeader>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300">
              Print // {title}
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold text-white">
              Print the full word list.
            </DialogTitle>
            <p className="text-sm text-slate-400">All {words.length} words covered so far this term.</p>
          </DialogHeader>

          <div className="mt-6 flex flex-col gap-3">
            <Toggle checked={includeMeanings} onChange={setIncludeMeanings} label="Include meanings" testId="print-term-toggle-meanings" />
            <Toggle checked={includeSentences} onChange={setIncludeSentences} label="Include example sentences" testId="print-term-toggle-sentences" />
          </div>

          <Button
            type="button"
            onClick={handlePrint}
            className="mt-6 w-full rounded-full bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300"
            data-testid="print-term-confirm"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
