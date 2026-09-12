import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Ear, Grid2x2, RotateCcw, Sparkles, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildRound, buildLetterRound, isSingleLetterPrompt, PHONICS_SOUND_TEXT } from "@/lib/letterObjects";
import { toast } from "@/components/ui/sonner";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { OnScreenKeyboard } from "@/components/OnScreenKeyboard";
import { SpeakButton } from "@/components/SpeakButton";

// capabilities.ttsRate -> SpeechSynthesisUtterance.rate (mirrors PracticeQuiz.jsx's TTS_RATE).
const TTS_RATE = { slow: 0.65, standard: 0.92 };

// How long a touch has to be held before it counts as "preview this
// word" rather than "select this tile" -- see the hover-to-hear toggle
// below. Long enough that a normal quick tap never triggers it.
const LONG_PRESS_MS = 450;

const MODE_OPTIONS = [
  {
    value: "picture",
    label: "Pictures",
    icon: Grid2x2,
    title: "Match the pictures",
    description: "Tap every picture that makes today's sound.",
  },
  {
    value: "letter",
    label: "Letters",
    icon: Sparkles,
    title: "Spot the letter",
    description: "Tap every one of today's letters, hiding among a few look-alikes.",
  },
  {
    value: "listen",
    label: "Listen",
    icon: Ear,
    title: "Listen & press",
    description: "Hear the sound, then find and press it on the keyboard.",
  },
];

/**
 * Reception's "letter of the day" activity — the word-search equivalent
 * for the first 7 weeks, which are letter/grapheme recognition, not
 * whole words yet (see data/reception/words.json, weeks 1-7,
 * contentType: "letter"). Opens on a "what would you like to
 * practise?" card picker with three ways to practise today's sound
 * (skipped straight to Pictures for a digraph prompt like "ch", which
 * has no single glyph/key for the other two modes to work with):
 *
 * - "picture": tap every picture that matches today's sound, with a
 *   few distractor pictures from other letters mixed in.
 * - "letter": tap every occurrence of today's letter in a grid that
 *   also deliberately mixes in its classic look-alike (b/d, p/q, t/f,
 *   v/w) when it has one.
 * - "listen": hear the letter's phonics sound spoken aloud, then find
 *   and press it on an on-screen QWERTY keyboard (always shown — it's
 *   the only option on a touch device) or the physical keyboard (an
 *   equally valid, optional shortcut on desktop; both listen for the
 *   same key).
 *
 * "Makes this sound" rather than "starts with" in the copy, since a few
 * of the 35 graphemes (ck, ff, ll, ss, zz, ng) are end/mid-word sounds,
 * not word-initial — see letterObjects.js.
 */
export const FindTheLetter = ({ prompt, entryId, onAttempt, ttsRate }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // null (choosing) | "picture" | "letter" | "listen"
  const [round, setRound] = useState([]);
  const [found, setFound] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);
  const [listenSolved, setListenSolved] = useState(false);
  const [wrongKeyFlash, setWrongKeyFlash] = useState(null);
  const [listenRoundKey, setListenRoundKey] = useState(0);
  const [previewOnHover, setPreviewOnHover] = useState(false);

  const pressTimerRef = useRef(null);
  const suppressClickRef = useRef(false);

  const letterModeAvailable = isSingleLetterPrompt(prompt);

  const targetCount = useMemo(() => round.filter((t) => t.correct).length, [round]);
  const allFound = targetCount > 0 && found.size >= targetCount;
  const roundComplete = mode === "listen" ? listenSolved : allFound;

  const startRound = (nextMode) => {
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

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    startRound(nextMode);
  };

  const backToChooser = () => setMode(null);

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

  // Picture mode's hover-to-hear toggle: on desktop a real mouse hover
  // speaks the word immediately; on touch there's no hover, so a
  // held-down press (long enough that it can't be a normal tap) speaks
  // it instead and suppresses the click that follows, so previewing a
  // word never accidentally registers as picking it.
  const speakWord = (word) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = TTS_RATE[ttsRate] ?? TTS_RATE.standard;
    window.speechSynthesis.speak(utterance);
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleTileMouseEnter = (tile) => {
    if (previewOnHover) speakWord(tile.word);
  };

  const handleTilePointerDown = (e, tile) => {
    if (!previewOnHover || e.pointerType !== "touch") return;
    suppressClickRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      speakWord(tile.word);
      suppressClickRef.current = true;
    }, LONG_PRESS_MS);
  };

  const handleTileClick = (tile, index) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    handleTap(tile, index);
  };

  const speakPrompt = () => {
    if (!window.speechSynthesis) { toast.error("Audio is not available in this browser"); return; }
    window.speechSynthesis.cancel();
    // Speak the actual phonics sound ("sss", "tuh"), not the letter's
    // name ("ess", "tee") -- see PHONICS_SOUND_TEXT's comment for why
    // this is a text hack rather than real phoneme audio.
    const utterance = new SpeechSynthesisUtterance(PHONICS_SOUND_TEXT[prompt] || prompt);
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
  // opened (and again each time "Practise again" replays it) — same
  // timing PracticeQuiz uses for its own listen mode. Cleared on
  // unmount/mode change so switching away mid-delay can't leave a
  // stale utterance queued up.
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

  const handleOpenChange = (v) => {
    setOpen(v);
    if (!v) return;
    if (letterModeAvailable) {
      setMode(null); // show the "what would you like to practise?" picker
    } else {
      chooseMode("picture"); // only one option -- skip straight to it
    }
  };

  const instructionText =
    mode === "letter"
      ? `Tap every letter "${prompt}" in the grid.`
      : mode === "listen"
      ? `Listen carefully, then find and press "${prompt}" on the keyboard.`
      : `Tap every picture that makes the "${prompt}" sound.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-primary"
          data-testid="find-the-letter-button"
        >
          <Sparkles className="h-3.5 w-3.5" /> Find the letter
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-xl overflow-hidden border-cyan-300/20 bg-popover p-0 text-foreground" data-testid="find-the-letter-dialog">
        <div className="holo-card p-6 sm:p-8">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">Find the letter</div>
              {mode && letterModeAvailable && (
                <button
                  type="button"
                  onClick={backToChooser}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
                  data-testid="find-the-letter-change-mode"
                >
                  Change practice
                </button>
              )}
            </div>
            <DialogTitle className="font-display text-3xl font-extrabold text-foreground">
              Today's sound is "{prompt}".
            </DialogTitle>
            {mode === null ? (
              <div className="flex items-center gap-2">
                <p className="text-base text-muted-foreground">What would you like to practise?</p>
                <SpeakButton
                  text={`Today's sound is ${prompt}. What would you like to practise?`}
                  ttsRate={ttsRate}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-base text-muted-foreground">{instructionText}</p>
                <SpeakButton
                  text={`Today's sound is ${prompt}. ${instructionText}`}
                  ttsRate={ttsRate}
                />
              </div>
            )}
          </DialogHeader>

          {mode === null ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="find-the-letter-mode-picker">
              {MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseMode(option.value)}
                    className="group rounded-3xl border border-foreground/10 bg-foreground/[0.04] p-5 text-left transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/5"
                    data-testid={`find-the-letter-mode-${option.value}`}
                  >
                    <Icon className="h-6 w-6 text-primary" />
                    <div className="mt-3 font-display text-base font-bold text-foreground">{option.title}</div>
                    <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {roundComplete && (
                <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-4" data-testid="find-the-letter-complete">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                  <p className="font-semibold text-success">
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
                      className="rounded-full border-cyan-300/40 bg-cyan-300/10 text-primary hover:bg-cyan-300 hover:text-slate-950"
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
                                ? "border-emerald-300/60 bg-emerald-400/20 text-success"
                                : isKeyWrongFlash
                                ? "border-rose-400/50 bg-rose-400/10 text-error"
                                : "border-foreground/15 bg-foreground/[0.05] text-foreground hover:border-cyan-300/40 hover:bg-cyan-300/10"
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
                <>
                  {mode === "picture" && (
                    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-2.5">
                      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        <Volume2 className="h-3.5 w-3.5" /> Say the word on hover
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={previewOnHover}
                        onClick={() => setPreviewOnHover((v) => !v)}
                        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
                          previewOnHover ? "justify-end bg-cyan-400" : "justify-start bg-foreground/15"
                        }`}
                        data-testid="find-the-letter-hover-toggle"
                      >
                        <span className="h-5 w-5 rounded-full bg-white" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4" data-testid="find-the-letter-grid">
                    {round.map((tile, index) => {
                      const isFound = tile.correct && found.has(index);
                      const isWrongFlash = wrongFlash === index;
                      return (
                        <motion.button
                          key={index}
                          type="button"
                          onClick={() => handleTileClick(tile, index)}
                          onMouseEnter={mode === "picture" ? () => handleTileMouseEnter(tile) : undefined}
                          onPointerDown={mode === "picture" ? (e) => handleTilePointerDown(e, tile) : undefined}
                          onPointerUp={mode === "picture" ? clearPressTimer : undefined}
                          onPointerLeave={mode === "picture" ? clearPressTimer : undefined}
                          onPointerCancel={mode === "picture" ? clearPressTimer : undefined}
                          animate={isWrongFlash ? { x: [0, -6, 6, -6, 0] } : {}}
                          transition={{ duration: 0.35 }}
                          className={`relative flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors duration-200 ${
                            isFound
                              ? "border-emerald-300/60 bg-emerald-400/15"
                              : isWrongFlash
                              ? "border-rose-400/50 bg-rose-400/10"
                              : "border-foreground/10 bg-foreground/[0.04] hover:border-cyan-300/40 hover:bg-cyan-300/10"
                          }`}
                          data-testid={`find-the-letter-tile-${index}`}
                        >
                          {isFound && <ConfettiBurst burstKey={index} />}
                          {isFound && (
                            <CheckCircle2
                              className="absolute right-2 top-2 h-5 w-5 text-success"
                              aria-hidden="true"
                            />
                          )}
                          {isWrongFlash && (
                            <XCircle
                              className="absolute right-2 top-2 h-5 w-5 text-error"
                              aria-hidden="true"
                            />
                          )}
                          {mode === "letter" ? (
                            <span className="font-display text-6xl font-extrabold lowercase text-foreground sm:text-7xl">
                              {tile.letter}
                            </span>
                          ) : (
                            <>
                              <span className="text-6xl sm:text-7xl" aria-hidden="true">{tile.emoji}</span>
                              <span className="font-mono text-base tracking-[0.1em] text-muted-foreground">{tile.word}</span>
                            </>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => startRound(mode)}
                  variant="outline"
                  className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  data-testid="find-the-letter-practice-again"
                >
                  <RotateCcw className="h-4 w-4" /> Practise again
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
