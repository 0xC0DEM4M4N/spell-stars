import { motion } from "framer-motion";

export const NotesSection = ({ notes }) => (
  <section id="notes" className="relative px-5 pb-10 pt-0 sm:px-8" data-testid="notes-section">
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="holo-card rounded-[1.5rem] p-7 sm:p-9" data-testid="differentiation-panel">
        <div className="font-mono text-xs uppercase tracking-[0.28em] text-warning">Differentiation notes</div>
        <ul className="mt-7 space-y-5">
          {notes.differentiation.map((note, index) => (
            <li key={note} className="flex gap-4" data-testid={`differentiation-note-${index + 1}`}>
              <span className="mt-1 font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{note}</p>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  </section>
);
