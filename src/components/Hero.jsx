import { motion } from "framer-motion";
import { ArrowDown, Sparkles, Star } from "lucide-react";
import { PracticeQuiz } from "@/components/PracticeQuiz";

export const Hero = ({ programme, activeWeek }) => (
  <section id="top" className="hero-grid relative overflow-hidden px-5 pb-8 pt-28 sm:px-8 lg:pt-32" data-testid="hero-section">
    <div className="mx-auto max-w-7xl">
      <div className="max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mb-8 inline-flex items-center gap-3 border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-cyan-200" data-testid="hero-eyebrow">
          <Sparkles className="h-4 w-4" /> Year 2 // Autumn 2026
        </motion.div>
        <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.88] tracking-tighter text-white sm:text-7xl lg:text-8xl" data-testid="hero-title">
          <span className="hero-mask-line">
            <motion.span className="block" initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0, ease: [0.22, 1, 0.36, 1] }}>
              SPELL//
            </motion.span>
          </span>
          <span className="hero-mask-line">
            <motion.span className="block text-cyan-400" initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
              ST<Star className="inline-block h-[0.72em] w-[0.72em] fill-amber-400 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.85)]" style={{ verticalAlign: "-0.1em" }} aria-hidden="true" />RS
            </motion.span>
          </span>
        </h1>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }} className="mt-6 flex flex-wrap items-center gap-4">
          <a href="#weekly-carousel" className="group inline-flex items-center gap-3 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition-transform duration-300 hover:-translate-y-1 hover:bg-cyan-300" data-testid="hero-start-button">
            Open the carousel <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-1" />
          </a>
          {activeWeek && <PracticeQuiz week={activeWeek} onComplete={() => {}} />}
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }} className="mt-5 border-l border-cyan-300/30 pl-5 font-mono text-sm text-slate-400" data-testid="hero-summary">
          a year's worth of progressive spellings for keen beans
        </motion.p>
      </div>
    </div>
  </section>
);
