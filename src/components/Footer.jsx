import { Printer, Star } from "lucide-react";

export const Footer = ({ onPrint }) => (
  <footer className="border-t border-white/10 px-5 py-14 sm:px-8" data-testid="site-footer">
    <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-8">
      <div>
        <div className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          SPELL<span className="text-cyan-300">//</span><span className="text-cyan-400">ST<Star className="inline-block h-[0.72em] w-[0.72em] fill-amber-400 text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.75)]" style={{ verticalAlign: "-0.1em" }} aria-hidden="true" />RS</span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">Year 2 Weekly Spelling Programme · 36 weeks · September 2026.</p>
      </div>
      <button onClick={onPrint} className="inline-flex items-center gap-3 rounded-full border border-cyan-300/40 px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-cyan-200 transition-colors duration-300 hover:bg-cyan-300 hover:text-slate-950" data-testid="footer-print-button">
        <Printer className="h-4 w-4" /> Print active week
      </button>
    </div>
  </footer>
);
