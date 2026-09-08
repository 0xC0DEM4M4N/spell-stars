import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Ear, RotateCcw, Sparkles, Star, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";

const normalize = (value) => value.trim().toLowerCase().replace(/['']/g, "'");

const makeHint = (word) =>
  word
    .split("")
    .map((char, index) => (/[a-z]/i.test(char) ? (index === 0 ? char : "_") : char))
    .join(" ");

const ConfettiBurst = ({ burstKey }) => {
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

export const PracticeQuiz = ({ week, onComplete, open, onOpenChange }) => {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle");
  const [wordAttempts, setWordAttempts] = useState(0);
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [challengeMode, setChallengeMode] = useState(false);

  const challengeWords = useMemo(() => week.words.filter((w) => w.challenge), [week.words]);
  const activeWords = challengeMode ? challengeWords : week.words;
  const currentWord = activeWords[index];
  const progress = finished ? 100 : (index / activeWords.length) * 100;

  const resetAll = () => {
    setIndex(0); setAnswer(""); setStatus("idle");
    setWordAttempts(0); setFirstTryScore(0);
    setFinished(false); setBurstKey(0); setChallengeMode(false);
  };

  const startChallenge = () => {
    setIndex(0); setAnswer(""); setStatus("idle");
    setWordAttempts(0); setFirstTryScore(0);
    setFinished(false); setBurstKey(0);
    setChallengeMode(true);
  };

  const goNext = () => {
    if (index === activeWords.length - 1) {
      setFinished(true); setStatus("idle"); setAnswer("");
      if (!challengeMode) onComplete(week.week);
      return;
    }
    setIndex((v) => v + 1); setAnswer(""); setStatus("idle"); setWordAttempts(0);
  };

  const speakWord = () => {
    if (!window.speechSynthesis) { toast.error("Audio is not available in this browser"); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentWord.text);
    utterance.lang = "en-GB"; utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  };

  const checkAnswer = () => {
    if (!answer.trim() || status === "correct") return;
    const correct = normalize(answer) === normalize(currentWord.text);
    if (correct) {
      setStatus("correct"); setBurstKey(Date.now());
      if (wordAttempts === 0) setFirstTryScore((v) => v + 1);
      toast.success("Brilliant spelling!", { description: `${currentWord.text} is correct.` });
      window.setTimeout(goNext, 950);
    } else {
      setStatus("incorrect"); setWordAttempts((v) => v + 1);
      toast.error("Not quite yet", { description: "Listen again or use the letter hint, then have another go." });
    }
  };

  const isChallenge = challengeMode;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetAll(); }}>
      <DialogContent className="max-w-2xl overflow-hidden border-cyan-300/30 bg-[#08101f] p-0 text-slate-100" data-testid="practice-quiz-dialog">
        <div className="holo-card relative p-6 sm:p-8">
          {burstKey > 0 && <ConfettiBurst burstKey={burstKey} />}
          <DialogHeader>
            <div className={`font-mono text-xs uppercase tracking-[0.28em] ${isChallenge ? "text-amber-300" : "text-pink-300"}`}>
              {isChallenge ? "Challenge round" : "Practice mode"} // Week {String(week.week).padStart(2, "0")}
            </div>
            <DialogTitle className="font-display text-3xl font-extrabold text-white" data-testid="quiz-title">
              {isChallenge ? "Star word challenge." : "Type the spelling."}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {isChallenge
                ? "Only the star words now — push yourself to get them all on the first try."
                : "Hear the word, use the hint, then type it exactly. Apostrophes count."}
            </DialogDescription>
          </DialogHeader>

          {!finished ? (
            <div className="mt-8">
              <div className="mb-5 flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                <span data-testid="quiz-progress-label">Word {index + 1} / {activeWords.length}</span>
                <span data-testid="quiz-score-label">First try {firstTryScore}</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/10" data-testid="quiz-progress-bar" />

              <div className={`mt-8 rounded-3xl border p-6 text-center ${isChallenge ? "border-amber-300/20 bg-amber-400/5" : "border-white/10 bg-white/[0.04]"}`}>
                <div className={`font-mono text-2xl tracking-[0.35em] sm:text-3xl ${isChallenge ? "text-amber-200" : "text-cyan-200"}`} data-testid="quiz-word-hint">
                  {makeHint(currentWord.text)}
                </div>
                <div className="mt-3 text-sm text-slate-400">{week.focus}</div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button" variant="outline" onClick={speakWord}
                  className={isChallenge ? "border-amber-300/30 bg-amber-300/10 text-amber-200 hover:bg-amber-300 hover:text-slate-950" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300 hover:text-slate-950"}
                  data-testid="quiz-hear-button"
                >
                  <Ear className="h-4 w-4" /> Hear word
                </Button>
                <Input
                  value={answer}
                  onChange={(e) => { setAnswer(e.target.value); if (status === "incorrect") setStatus("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") checkAnswer(); }}
                  placeholder="Type the word here"
                  disabled={status === "correct"}
                  className={`h-12 flex-1 border-white/15 bg-white/5 text-lg text-white placeholder:text-slate-500 ${isChallenge ? "focus-visible:ring-amber-300" : "focus-visible:ring-cyan-300"}`}
                  data-testid="quiz-answer-input"
                  aria-label="Type the spelling word"
                />
                <Button
                  type="button" onClick={checkAnswer} disabled={status === "correct"}
                  className={`h-12 px-6 font-semibold text-slate-950 ${isChallenge ? "bg-amber-400 hover:bg-amber-300" : "bg-emerald-400 hover:bg-emerald-300"}`}
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
                      {status === "correct" ? "Correct — brilliant work!" : `Not yet. The answer starts with "${currentWord.text[0]}" and has ${currentWord.text.replace(/[^a-z']/gi, "").length} letters.`}
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
          ) : isChallenge ? (
            /* ── Challenge complete ── */
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 rounded-3xl border border-amber-300/30 bg-amber-400/10 p-8 text-center" data-testid="challenge-complete-panel">
              <Star className="mx-auto h-12 w-12 fill-amber-400 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" />
              <h3 className="mt-5 font-display text-3xl font-extrabold text-white">Challenge complete!</h3>
              <p className="mt-3 text-slate-300">
                You nailed <span className="font-bold text-amber-300">{firstTryScore} / {challengeWords.length}</span> star words first try.
              </p>
              <Button type="button" onClick={resetAll} className="mt-7 rounded-full bg-cyan-400 px-6 font-semibold text-slate-950 hover:bg-cyan-300" data-testid="challenge-restart-button">
                <RotateCcw className="h-4 w-4" /> Practise again
              </Button>
            </motion.div>
          ) : (
            /* ── Main quiz complete ── */
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-8 text-center" data-testid="quiz-complete-panel">
              <Trophy className="mx-auto h-12 w-12 text-amber-300" />
              <h3 className="mt-5 font-display text-3xl font-extrabold text-white">Quiz complete!</h3>
              <p className="mt-3 text-slate-300">
                You scored <span className="font-bold text-emerald-300">{firstTryScore} / {week.words.length}</span> on your first try.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" onClick={resetAll} variant="outline" className="rounded-full border-white/20 px-6 font-semibold text-slate-300 hover:bg-white/10" data-testid="quiz-restart-button">
                  <RotateCcw className="h-4 w-4" /> Practise again
                </Button>
                {challengeWords.length > 0 && (
                  <Button type="button" onClick={startChallenge} className="rounded-full bg-amber-400 px-6 font-semibold text-slate-950 hover:bg-amber-300" data-testid="challenge-round-button">
                    <Star className="h-4 w-4 fill-slate-950" /> Challenge round
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
