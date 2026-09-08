const marqueeItems = [
  "WEEK 01 INITIATION",
  "CONSONANT BLENDS",
  "DGE AFTER SHORT VOWELS",
  "SILENT KN // GN",
  "SUFFIX SHIFT Y→I",
  "HOMOPHONE PROTOCOL",
  "36-WEEK ORTHOGRAPHY ENGINE",
];

export const Marquee = () => (
  <section className="overflow-hidden border-y border-cyan-300/20 bg-cyan-300/5 py-5" aria-label="Spelling programme highlights" data-testid="editorial-marquee">
    <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-mono text-sm uppercase tracking-[0.3em] text-cyan-200/80">
      {[...marqueeItems, ...marqueeItems].map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center gap-10">
          {item} <span className="text-emerald-300">//</span>
        </span>
      ))}
    </div>
  </section>
);
