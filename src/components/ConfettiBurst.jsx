import { useMemo } from "react";
import { motion } from "framer-motion";

// Small celebratory particle burst, fired from the center of whatever
// positioned (relative) ancestor it's dropped into — used to mark "you
// got that right" moments across the app (the spelling quiz's correct
// answers, Reception's Find the letter game). Re-keying `burstKey`
// (e.g. to a tile's index, or Date.now()) gives it a fresh, differently
// laid-out set of particles each time it's mounted; it plays once on
// mount and settles at fully faded, so it's safe to just conditionally
// render it rather than manage any stop/reset logic.
export const ConfettiBurst = ({ burstKey }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        id: `${burstKey}-${index}`,
        x: (index % 2 === 0 ? 1 : -1) * (42 + ((index * 19) % 150)),
        y: -42 - ((index * 23) % 150),
        rotate: (index * 41) % 220,
        color: ["#67e8f9", "#34d399", "#fbbf24", "#f472b6"][index % 4],
      })),
    [burstKey],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: particle.color }}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, scale: 1, x: particle.x, y: particle.y, rotate: particle.rotate }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};
