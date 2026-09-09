import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildRound, buildLetterRound, isSingleLetterPrompt } from "@/lib/letterObjects";
import { toast } from "@/components/ui/sonner";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { OnScreenKeyboard } from "@/components/OnScreenKeyboard";

// capabilities.ttsRate -> SpeechSynthesisUtterance.rate (mirrors PracticeQuiz.jsx's TTS_RATE).
const TTS_RATE = { slow: 0.65, standard: 0.92 };

/**
 * Reception's "letter of the day" activity — the word-search equivalent
 * for the first 7 weeks, which are letter/grapheme recognition, not
 * whole words yet (see data/reception/words.json, weeks 1-7,
 * contentType: "letter"). Three ways to practise today's sound, all
 * gated to single-letter prompts except the picture match (a digraph
 * like "ch" has no single glyph/key to visually or physically confuse):
 *
 * - "picture": tap every picture that matches today's sound, with a
 *   few distractor pictures from other letters mixed in.
 * - "letter": tap every occurrence of today's letter in a grid that
 *   also deliberately mixes in its classic look-alike (b/d, p/q, t/f,
 *   v/w) when it has one.
 * - "listen": hear the letter spoken aloud, then find and press it on
 *   an on-screen QWERTY keyboard (always shown — it's the only option
 *   on a touch device) or the physical keyboard (an equally valid,
 *   optional shortcut on desktop; both listen for the same key).
 *
 * "Makes this sound" rather than "starts with" in the copy, since a few
 * of the 35 graphemes (ck, ff, ll, ss, zz, ng) are end/mid-word sounds,
 * not word-initial — see letterObjects.js.
 */
export const FindTheLetter = ({ prompt, entryId, onAttempt, ttsRate }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("picture"); // "picture" | "letter" | "listen"
  const [round, setRound] = useState([]);
  const [found, setFound] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);
  const [listenSolved, setListenSolved] = useState(false);
  const [wrongKeyFlash, setWrongKeyFlash] = useState(null);
  const [listenRoundKey, setListenRoundKey] = useState(0);

  const letterModeAvailable = isSingleLetterPrompt(prompt);

  const targetCount = useMemo(() => round.filter((t) => t.correct).length, [round]);
  const allFound = targetCount > 0 && found.size >= targetCount;
  const roundComplete = mode === "listen" ? listenSolved : allFound;

  const startRound = (nextMode = mode) => {
    if (nextMode === "listen") {
      setListenSolved(false);
      setWrongKeyFlash(null);
      setListenRoundKey((k) => k + 1);
    } else {
      setRound(nextMode === "letter" ? buildLetterRound(prompt) : buildRound(prompt));
    }
    setFound(new Set());
    setWrongFlash(null);
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    startRound(nextMode);
  };

  const handleTap = (tile, index) => {
    if (tile.correct) {
      if (found.has(index)) return;
      setFound((prev) => new Set([...prev, index]));
      onAttempt?.(entryId, true);
      if (found.size + 1 >= targetCount) {
        toast.success("Brilliant! You found them all.");
      }
    } else {
      setWrongFlash(index);
      onAttempt?.(entryId, false);
      window.setTimeout(() => setWrongFlash((current) => (current === index ? null : current)), 500);
    }
  };

  const speakPrompt = () => {
    if (!window.speechSynthesis) { toast.error("Audio is not available in this browser"); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prompt);
    utterance.lang = "en-GB";
    utterance.rate = TTS_RATE[ttsRate] ?? TTS_RATE.standard;
    window.speechSynthesis.speak(utterance);
  };

  const handleKeyPress = (letter) => {
    if (listenSolved) return;
    if (letter === prompt) {
      setListenSolved(true);
      onAttempt?.(entryId, true);
      toast.success("Correct — brilliant listening!");
    } else {
      setWrongKeyFlash(letter);
      onAttempt?.(entryId, false);
      window.setTimeout(() => setWrongKeyFlash((current) => (current === letter ? null : current)), 500);
    }
  };

  // Listen mode: read the letter aloud automatically, ~1s after it's
  // opened (and again each time "New round" replays it) — same timing
  // PracticeQuiz uses for its own listen mode. Cleared on unmount/mode
  // change so switching away mid-delay can't leave a stale utterance
  // queued up.
  useEffect(() => {
    if (mode !== "listen" || !open) return;
    const timer = window.setTimeout(speakPrompt, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, listenRoundKey]);

  // Physical keyboard is an optional shortcut alongside the on-screen
  // one — genuinely necessary on a touch device (no physical keyboard
  // to use), but there's no harm leaving the listener attached on
  // desktop too; a laptop with no keyboard input just never fires it.
  useEffect(() => {
    if (mode !== "listen" || !open) return;
    const handleKeydown = (e) => {
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= "a" && key <= "z") handleKeyPress(key);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, listenSolved, prompt]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) startRound(); }}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"
          data-testid="find-the-letter-button"
        >
          <Sparkles className="h-3.5 w-3.5" /> Find the letter
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-xl overflow-hidden border-cyan-300/20 bg-[#08101f] p-0 text-slate-100" data-testid="find-the-letter-dialog">
        <div className="holo-card p-6 sm:p-8">
          <DialogHeader>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300">Find the letter</div>
            <DialogTitle className="font-display text-3xl font-extrabold text-white">
              Today's sound is "{prompt}".
            </DialogTitle>
            <p className="text-base text-slate-300">
              {mode === "letter"
                ? `Tap every letter "${prompt}" in the grid.`
                : mode === "listen"
                ? `Listen carefully, then find and press "${prompt}" on the keyboard.`
                : `Tap every picture that makes the "${prompt}" sound.`}
            </p>
          </DialogHeader>

          {letterModeAvailable && (
            <div className="mt-4 flex flex-wrap gap-2" data-testid="find-the-letter-mode-toggle">
              {[
                { value: "picture", label: "Pictures" },
                { value: "letter", label: "Letters" },
                { value: "listen", label: "Listen" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleModeChange(option.value)}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                    mode === option.value
                      ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-200"
                      : "border-white/15 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                  data-testid={`find-the-letter-mode-${option.value}`}
                  aria-pressed={mode === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {roundComplete && (
            <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-4" data-testid="find-the-letter-complete">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-300" />
              <p className="font-semibold text-emerald-200">
                {mode === "letter"
                  ? "All found — sharp eyes!"
                  : mode === "listen"
                  ? "Correct — brilliant listening!"
                  : "All found — brilliant listening!"}
              </p>
            </div>
          )}

          {mode === "listen" ? (
            <>
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  onClick={speakPrompt}
                  variant="outline"
                  className="rounded-full border-cyan-300/40 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-slate-950"
                  data-testid="find-the-letter-hear-again"
                >
                  <Volume2 className="h-4 w-4" /> Hear it again
                </Button>
              </div>

              <div className="mt-6 overflow-x-auto pb-1">
                <OnScreenKeyboard
                  renderKey={(letter) => {
                    const isCorrectKey = letter === prompt;
                    const isKeyFound = isCorrectKey && listenSolved;
                    const isKeyWrongFlash = wrongKeyFlash === letter;
                    return (
                      <motion.button
                        type="button"
                        onClick={() => handleKeyPress(letter)}
                        disabled={listenSolved}
                        animate={isKeyWrongFlash ? { x: [0, -5, 5, -5, 0] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`relative flex h-11 w-8 items-center justify-center rounded-lg border font-display text-lg font-bold lowercase transition-colors duration-200 sm:h-14 sm:w-11 sm:text-2xl ${
                          isKeyFound
                            ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-200"
                            : isKeyWrongFlash
                            ? "border-rose-400/50 bg-rose-400/10 text-rose-200"
                            : "border-white/15 bg-white/[0.05] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-300/10"
                        }`}
                        data-testid={`keyboard-key-${letter}`}
                      >
                        {isKeyFound && <ConfettiBurst burstKey={`${listenRoundKey}-${letter}`} />}
                        {letter}
                      </motion.button>
                    );
                  }}
                />
              </div>
            </>
          ) : (
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4" data-testid="find-the-letter-grid">
              {round.map((tile, index) => {
                const isFound = tile.correct && found.has(index);
                const isWrongFlash = wrongFlash === index;
                return (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => handleTap(tile, index)}
                    animate={isWrongFlash ? { x: [0, -6, 6, -6, 0] } : {}}
                    transition={{ duration: 0.35 }}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors duration-200 ${
                      isFound
                        ? "border-emerald-300/60 bg-emerald-400/15"
                        : isWrongFlash
                        ? "border-rose-400/50 bg-rose-400/10"
                        : "border-white/10 bg-white/[0.04] hover:border-cyan-300/40 hover:bg-cyan-300/10"
                    }`}
                    data-testid={`find-the-letter-tile-${index}`}
                  >
                    {isFound && <ConfettiBurst burstKey={index} />}
                    {mode === "letter" ? (
                      <span className="font-display text-6xl font-extrabold lowercase text-white sm:text-7xl">
                        {tile.letter}
                      </span>
                    ) : (
                      <>
                        <span className="text-6xl sm:text-7xl" aria-hidden="true">{tile.emoji}</span>
                        <span className="font-mono text-base tracking-[0.1em] text-slate-300">{tile.word}</span>
                      </>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => startRound()}
              variant="outline"
              className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
              data-testid="find-the-letter-new-round"
            >
              <RotateCcw className="h-4 w-4" /> New round
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
