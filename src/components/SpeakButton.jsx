import { Volume2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

// capabilities.ttsRate -> SpeechSynthesisUtterance.rate (mirrors PracticeQuiz.jsx's TTS_RATE).
const TTS_RATE = { slow: 0.65, standard: 0.92 };

/**
 * Small speaker-icon button that reads `text` aloud on click — for
 * instructional copy a pre-reader can't get from the words on screen
 * alone. On-demand only (no auto-play): browsers generally block
 * audio that isn't triggered by a real user gesture anyway, and it
 * keeps this from talking over itself if several instructions are on
 * screen at once.
 *
 * Started on Reception's Find the letter screens, where the audience
 * is guaranteed to include non-readers; a natural next candidate is
 * anywhere else in the app aimed at pre-readers, but that's a
 * deliberate separate rollout, not assumed here.
 */
export const SpeakButton = ({ text, ttsRate, label = "Read this aloud", className = "" }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!window.speechSynthesis) { toast.error("Audio is not available in this browser"); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = TTS_RATE[ttsRate] ?? TTS_RATE.standard;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 p-1.5 text-cyan-200 transition-colors duration-200 hover:bg-cyan-300 hover:text-slate-950 ${className}`}
      data-testid="speak-button"
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  );
};
