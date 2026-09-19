// Shared motion vocabulary — Apple's "damping + response" spring model
// mapped onto Framer Motion's `bounce` + `duration`.
//
//   damping 1.0  ->  bounce 0     critically damped: smooth settle, no overshoot
//   damping ~0.8 ->  bounce 0.2   a little overshoot
//
// House rule: everything is critically damped (bounce 0) by default.
// Overshoot is reserved for motion that started from a gesture with
// momentum (a flick or throw), where it reads as physical rather than
// decorative. Springs animate from the *current* value and carry
// velocity through a re-target, so anything using these can be grabbed
// or reversed mid-flight without a jump.

export const SPRING = {
  // Default UI spring: hover lifts, chips, cards.
  settle: { type: "spring", bounce: 0, duration: 0.4 },
  // Press feedback and small controls: response 0.3.
  snappy: { type: "spring", bounce: 0, duration: 0.3 },
  // Entrances that move further (hero lines, scroll reveals).
  reveal: { type: "spring", bounce: 0, duration: 0.6 },
  // Only for things released with momentum.
  momentum: { type: "spring", bounce: 0.2, duration: 0.4 },
};

// Press: respond on pointer-down (Framer's whileTap fires on pointerdown
// and cancels if the pointer slides off, matching native tap behaviour).
// Large surfaces scale less than small controls.
export const PRESS = { scale: 0.97 };
export const PRESS_SOFT = { scale: 0.985 };

// Scroll-reveal props for a staggered list. The stagger is capped so a
// long list never makes the last item wait noticeably.
export const revealOnScroll = (index = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { ...SPRING.reveal, delay: Math.min(index, 6) * 0.04 },
});
