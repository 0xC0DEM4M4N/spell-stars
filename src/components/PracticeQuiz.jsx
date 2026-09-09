import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Ear, Puzzle, RotateCcw, Shuffle, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { ConfettiBurst } from "@/components/ConfettiBurst";

const normalize = (value) => value.trim().toLowerCase().replace(/['']/g, "'");

const makeHint = (word) =>
  word
    .split("")
    .map((char, index) => (/[a-z]/i.test(char) ? (index === 0 ? char : "_") : char))
    .join(" ");

// Meaning mode reveals no letters at all — just the shape of the word,
// like a crossword grid with no checkers filled in yet.
const makeBlank = (word) =>
  word
    .split("")
    .map((char) => (/[a-z]/i.test(char) ? "_" : char))
    .join(" ");

// Hides the spelling word inside its example sentence so meaning mode
// doesn't give the answer away — "The ___ sailed into the harbour."
const blankSentence = (sentence, word) => {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  return sentence.replace(re, (match) => "_".repeat(match.length));
};

// Fisher-Yates — so a session's word order isn't just the page order.
const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// capabilities.ttsRate -> SpeechSynthesisUtterance.rate
const TTS_RATE = { slow: 0.65, standard: 0.92 };

const MODES = {
  listen: {
    title: "Type the spelling.",
    description: "Listen carefully, then type it exactly. Apostrophes count.",
  },
  meaning: {
    title: "Guess from the clue.",
    description: "Read the meaning, then spell the word — no audio this time.",
  },
};

/**
 * Typed spelling practice, driven by a resolved session word list (from
 * ScopeSelector + srs.selectSessionWords) rather than a single week —
 * a session can span multiple weeks once scope is "term" or "all".
 *
 * `words` entries use the wordlist-spec schema (id, word, focus, ...),
 * not the old programme.json {text, challenge} shape. Only
 * contentType: "word" entries should be passed in — Reception's
 * "letter" items need the separate letter-tile flow (not built yet).
 *
 * Every time the dialog opens it (a) shuffles the word order, so a
 * session isn't just the page's listing order, and (b) starts on a mode
 * picker: "Listen & spell" (word is read aloud, auto-played ~1s after
 * each word opens) or "Guess from the meaning" (a definition/example
 * sentence clue instead of audio, crossword-style — no letters given
 * away). Calls onAttempt(wordId, correct) after every check, so the
 * caller can feed it into the SRS engine (src/lib/srs.js).
 */
export const PracticeQuiz = ({ words, onAttempt, onSessionComplete, ttsRate = "standard", open, onOpenChange }) => {
  const [sessionWords, setSessionWords] = useState(() => shuffle(words));
  const [mode, setMode] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle");
  const [wordAttempts, setWordAttempts] = useState(0);
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  const currentWord = sessionWords[index];
  const progress = finished ? 100 : (index / sessionWords.length) * 100;

  const resetAll = () => {
    setSessionWords(shuffle(words));
    setMode(null);
    setIndex(0); setAnswer(""); setStatus("idle");
    setWordAttempts(0); setFirstTryScore(0);
    setFinished(false); setBurstKey(0);
  };

  const goNext = () => {
    if (index === sessionWords.length - 1) {
      setFinished(true); setStatus("idle"); setAnswer("");
      onSessionComplete?.({ firstTryScore, total: sessionWords.length });
      return;
    }
    setIndex((v) => v + 1); setAnswer(""); setStatus("idle"); setWordAttempts(0);
  };

  const speakWord = () => {
    if (!window.speechSynthesis) { toast.error("Audio is not available in this browser"); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.lang = "en-GB";
    utterance.rate = TTS_RATE[ttsRate] ?? TTS_RATE.standard;
    window.speechSynthesis.speak(utterance);
  };

  // Listen mode: read the word aloud automatically, ~1s after each new
  // word is shown (as well as being replayable via the "Hear word"
  // button). Cleared on unmount/word-change so a quick skip can't queue
  // up a stale utterance.
  useEffect(() => {
    if (mode !== "listen" || !open || finished || !currentWord) return;
    const timer = window.setTimeout(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang = "en-GB";
      utterance.rate = TTS_RATE[ttsRate] ?? TTS_RATE.standard;
      window.speechSynthesis.speak(utterance);
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, finished, currentWord?.id]);

  const checkAnswer = () => {
    if (!answer.trim() || status === "correct") return;
    const correct = normalize(answer) === normalize(currentWord.word);
    onAttempt?.(currentWord.id, correct);
    if (correct) {
      setStatus("correct"); setBurstKey(Date.now());
      if (wordAttempts === 0) setFirstTryScore((v) => v + 1);
      toast.success("Brilliant spelling!", { description: `${currentWord.word} is correct.` });
      window.setTimeout(goNext, 950);
    } else {
      setStatus("incorrect"); setWordAttempts((v) => v + 1);
      toast.error("Not quite yet", { description: mode === "meaning" ? "Re-read the clue, then have another go." : "Listen again, then have another go." });
    }
  };

  if (!currentWord) return null;

  const copy = mode ? MODES[mode] : { title: "Choose how to practise.", description: "Pick a mode to start this session — words are shuffled fresh each time." };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetAll(); }}>
      <DialogContent className="max-w-2xl overflow-hidden border-cyan-300/30 bg-[#08101f] p-0 text-slate-100" data-testid="practice-quiz-dialog">
        <div className="holo-card relative p-6 sm:p-8">
          {burstKey > 0 && <ConfettiBurst burstKey={burstKey} />}
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="font-mono text-xs uppercase tracking-[0.28em] text-pink-300">
                Practice mode
              </div>
              {mode && !finished && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-cyan-300"
                  data-testid="quiz-change-mode-button"
                >
                  Change mode
                </button>
              )}
            </div>
            <DialogTitle className="font-display text-3xl font-extrabold text-white" data-testid="quiz-title">
              {copy.title}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          {!mode ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="quiz-mode-picker">
              <button
                type="button"
                onClick={() => setMode("listen")}
                className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/5"
                data-testid="quiz-mode-listen"
              >
                <Ear className="h-6 w-6 text-cyan-300" />
                <div className="mt-3 font-display text-lg font-bold text-white">Listen &amp; spell</div>
                <p className="mt-1.5 text-sm leading-snug text-slate-400">
                  Hear each word read aloud, then type it. A letter hint gets you started.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("meaning")}
                className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition-colors duration-200 hover:border-pink-300/50 hover:bg-pink-300/5"
                data-testid="quiz-mode-meaning"
              >
                <Puzzle className="h-6 w-6 text-pink-300" />
                <div className="mt-3 font-display text-lg font-bold text-white">Guess from the meaning</div>
                <p className="mt-1.5 text-sm leading-snug text-slate-400">
                  No audio — read the definition (a bit like a crossword clue) and spell it.
                </p>
              </button>
            </div>
          ) : !finished ? (
            <div className="mt-8">
              <div className="mb-5 flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                <span data-testid="quiz-progress-label">Word {index + 1} / {sessionWords.length}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1 normal-case tracking-normal text-slate-500">
                    <Shuffle className="h-3 w-3" /> shuffled
                  </span>
                  <span data-testid="quiz-score-label">First try {firstTryScore}</span>
                </span>
              </div>
              <Progress value={progress} className="h-2 bg-white/10" data-testid="quiz-progress-bar" />

              {mode === "listen" ? (
                <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
                  <div className="font-mono text-2xl tracking-[0.35em] text-cyan-200 sm:text-3xl" data-testid="quiz-word-hint">
                    {makeHint(currentWord.word)}
                  </div>
                  <div className="mt-3 text-sm text-slate-400">{currentWord.focus}</div>
                </div>
              ) : (
                <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6" data-testid="quiz-meaning-clue">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-pink-300">
                    <Puzzle className="h-3.5 w-3.5" /> Meaning clue
                  </div>
                  {currentWord.definition ? (
                    <p className="text-lg font-semibold leading-snug text-white">{currentWord.definition}</p>
                  ) : (
                    <p className="text-sm italic text-slate-500">No written clue for this word yet — here's the length instead.</p>
                  )}
                  {currentWord.exampleSentence && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      <span className="mr-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">in a sentence</span>
                      {blankSentence(currentWord.exampleSentence, currentWord.word)}
                    </p>
                  )}
                  <div className="mt-4 text-center font-mono text-xl tracking-[0.4em] text-cyan-200/80">
                    {makeBlank(currentWord.word)}
                  </div>
                  {!currentWord.definition && !currentWord.exampleSentence && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        type="button" variant="outline" onClick={speakWord}
                        className="border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-slate-950"
                        data-testid="quiz-hear-fallback-button"
                      >
                        <Ear className="h-4 w-4" /> Hear it instead
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {mode === "listen" && (
                  <Button
                    type="button" variant="outline" onClick={speakWord}
                    className="border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-slate-950"
                    data-testid="quiz-hear-button"
                  >
                    <Ear className="h-4 w-4" /> Hear word
                  </Button>
                )}
                <Input
                  value={answer}
                  onChange={(e) => { setAnswer(e.target.value); if (status === "incorrect") setStatus("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") checkAnswer(); }}
                  placeholder="Type the word here"
                  disabled={status === "correct"}
                  className="h-12 flex-1 border-white/15 bg-white/5 text-lg text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
                  data-testid="quiz-answer-input"
                  aria-label="Type the spelling word"
                />
                <Button
                  type="button" onClick={checkAnswer} disabled={status === "correct"}
                  className="h-12 bg-emerald-400 px-6 font-semibold text-slate-950 hover:bg-emerald-300"
                  data-testid="quiz-check-button"
                >
                  Check
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {status !== "idle" && (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className={`mt-5 flex items-center gap-3 rounded-2xl border p-4 ${status === "correct" ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200" : "border-pink-400/40 bg-pink-500/10 text-pink-200"}`}
                    data-testid={status === "correct" ? "quiz-correct-feedback" : "quiz-incorrect-feedback"}
                    aria-live="polite"
                  >
                    {status === "correct" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    <span className="text-sm font-medium">
                      {status === "correct" ? "Correct — brilliant work!" : `Not yet. The answer starts with "${currentWord.word[0]}" and has ${currentWord.word.replace(/[^a-z']/gi, "").length} letters.`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {status === "incorrect" && (
                <Button type="button" variant="ghost" onClick={goNext} className="mt-4 text-slate-400 hover:text-white" data-testid="quiz-skip-button">
                  Skip to next word
                </Button>
              )}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-8 text-center" data-testid="quiz-complete-panel">
              <Trophy className="mx-auto h-12 w-12 text-amber-300" />
              <h3 className="mt-5 font-display text-3xl font-extrabold text-white">Session complete!</h3>
              <p className="mt-3 text-slate-300">
                You scored <span className="font-bold text-emerald-300">{firstTryScore} / {sessionWords.length}</span> on your first try.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" onClick={resetAll} variant="outline" className="rounded-full border-white/20 px-6 font-semibold text-slate-300 hover:bg-white/10" data-testid="quiz-restart-button">
                  <RotateCcw className="h-4 w-4" /> Practise again
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
