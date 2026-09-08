import { Printer, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = ({ activeWeek, totalWeeks, onPrint }) => (
  <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#05070d]/75 backdrop-blur-xl" data-testid="main-navbar">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
      <a href="#top" className="font-display text-lg font-extrabold tracking-tight text-white" data-testid="brand-link">
        SPELL<span className="text-cyan-300">//</span><span className="text-cyan-400">ST<Star className="inline-block h-[0.85em] w-[0.85em] fill-amber-400 text-amber-400" style={{ verticalAlign: "-0.12em" }} aria-hidden="true" />RS</span>
      </a>
      <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.22em] text-slate-400 md:flex" aria-label="Primary">
        <a href="#weekly-carousel" className="transition-colors duration-300 hover:text-cyan-300" data-testid="nav-weeks-link">Weeks</a>
        <a href="#notes" className="transition-colors duration-300 hover:text-cyan-300" data-testid="nav-notes-link">Notes</a>
      </nav>
      <div className="flex items-center gap-3">
        <div className="hidden border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-emerald-300 sm:block" data-testid="active-week-badge">
          Week {String(activeWeek.week).padStart(2, "0")} / {totalWeeks}
        </div>
        <Button size="sm" onClick={onPrint} className="rounded-full bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300" data-testid="nav-print-button">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>
    </div>
  </header>
);
