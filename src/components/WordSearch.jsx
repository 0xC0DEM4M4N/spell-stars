import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Grid2x2, Printer, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { loadTimerPrefs, saveTimerPrefs } from "@/lib/timerPrefs";
import { loadLetterCasePref, saveLetterCasePref } from "@/lib/letterCasePrefs";
import { buildDirections, buildGrid } from "@/lib/wordSearchGrid";
import { escapeHtml, openPrintWindow, printFooter, printHeader, wrapDocument } from "@/lib/printSheets";

const COLORS = [
  "ws-found ws-h0 bg-cyan-400/40 text-white border-cyan-400",
  "ws-found ws-h1 bg-emerald-400/40 text-white border-emerald-400",
  "ws-found ws-h2 bg-pink-400/40 text-white border-pink-400",
  "ws-found ws-h3 bg-amber-400/40 text-white border-amber-400",
  "ws-found ws-h4 bg-violet-400/40 text-white border-violet-400",
  "ws-found ws-h5 bg-sky-400/40 text-white border-sky-400",
  "ws-found ws-h6 bg-rose-400/40 text-white border-rose-400",
  "ws-found ws-h7 bg-teal-400/40 text-white border-teal-400",
  "ws-found ws-h8 bg-orange-400/40 text-white border-orange-400",
  "ws-found ws-h9 bg-lime-400/40 text-white border-lime-400",
];
const DEFAULT_SECS = 180;
const DEFAULT_SIZE = 10;

// Bigger grid text for the smaller grids Reception/Year 1 use (6x6/8x8) —
// young children need larger, easier-to-read/tap letters and words than
// the denser 10x10/12x12 grids Year 2+ use.
function cellTextSizeClass(size) {
  if (size <= 6) return "text-2xl sm:text-3xl";
  if (size <= 8) return "text-xl sm:text-2xl";
  if (size <= 10) return "text-sm sm:text-base";
  return "text-[11px] sm:text-xs";
}

function chipTextSizeClass(size) {
  if (size <= 8) return "text-sm";
  return "text-[10px]";
}

// true when b is directly adjacent (8-directional) to a
function adjacent(a, b) {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

function cellKey(c) { return `${c.row},${c.col}`; }
function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Word search driven by a resolved session word list (ScopeSelector +
 * srs.selectSessionWords, same as PracticeQuiz) and a year's
 * capabilities.wordSearchGrid ({ size, directions }) — grid size and
 * allowed placement directions now come from the year's capabilities
 * instead of being hardcoded, per next-steps-year-capabilities.md §4.
 *
 * `words` entries use the wordlist-spec schema — only contentType:
 * "word" entries should be passed in.
 */
export const WordSearch = ({ words: wordEntries, gridSize = DEFAULT_SIZE, gridDirections, gridLetterCase = "uppercase", title = "Word Search", focus = "", trigger }) => {
  const size = gridSize || DEFAULT_SIZE;
  const dirs = useMemo(() => buildDirections(gridDirections), [gridDirections]);
  const words = useMemo(() => wordEntries.map(w => w.word), [wordEntries]);

  const [open, setOpen] = useState(false);
  const [game, setGame] = useState(null);
  const [found, setFound] = useState(new Set());

  // Upper/lowercase for both the grid letters and the word list --
  // defaults to the year's own capability (e.g. Reception starts
  // lowercase) but remembers whatever the user picks from then on.
  const [letterCase, setLetterCase] = useState(() => loadLetterCasePref() || gridLetterCase);

  // Keep a ref so the word-match effect can read latest found without it being a dep
  const foundRef = useRef(new Set());
  useEffect(() => { foundRef.current = found; }, [found]);

  const [revealed, setRevealed] = useState(false);

  // Path-based selection — each cell must be adjacent to the previous
  const [selCells, setSelCells] = useState([]);
  const selSet = useMemo(() => new Set(selCells.map(cellKey)), [selCells]);
  const inSel = (r, c) => selSet.has(`${r},${c}`);

  // Timer
  const [timerOn, setTimerOn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SECS);
  const [timeUp, setTimeUp] = useState(false);
  const timerRef = useRef(null);

  // Timer style — countdown (auto-reveals at 0) or a normal count-up
  // stopwatch. Asked via a small dialog the first time the timer is
  // started each session; the countdown length is remembered as the
  // default for next time (starts at 3 minutes).
  const [timerMode, setTimerMode] = useState(() => loadTimerPrefs().mode);
  const [countdownSeconds, setCountdownSeconds] = useState(() => loadTimerPrefs().countdownSeconds);
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false);
  const [draftMode, setDraftMode] = useState(timerMode);
  const [draftMinutes, setDraftMinutes] = useState(() => Math.max(1, Math.round(countdownSeconds / 60)));

  const pressing = useRef(false);
  const hasDragged = useRef(false); // true once mouse/touch moves after press

  const allDone = game
    ? found.size >= game.placed.filter(p => !p.failed).length && game.placed.length > 0
    : false;

  const startGame = useCallback((caseOverride) => {
    clearInterval(timerRef.current);
    const g = buildGrid(words, size, dirs, caseOverride || letterCase);
    setGame(g);
    setFound(new Set());
    foundRef.current = new Set();
    setRevealed(false);
    setSelCells([]);
    setTimerOn(false);
    setTimeLeft(timerMode === "countdown" ? countdownSeconds : 0);
    setTimeUp(false);
  }, [words, size, dirs, letterCase, timerMode, countdownSeconds]);

  const changeLetterCase = useCallback((next) => {
    if (next === letterCase) return;
    setLetterCase(next);
    saveLetterCasePref(next);
    startGame(next);
  }, [letterCase, startGame]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerOn || !game || (timerMode === "countdown" && timeUp)) return;
    timerRef.current = setInterval(() => {
      if (timerMode === "countup") {
        setTimeLeft(prev => prev + 1);
        return;
      }
      setTimeLeft(prev => {
        if (prev <= 1) { setTimeUp(true); setRevealed(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerOn, game, timeUp, timerMode]);

  useEffect(() => { if (allDone) clearInterval(timerRef.current); }, [allDone]);

  const toggleTimer = useCallback(() => {
    if (timerOn) {
      clearInterval(timerRef.current);
      setTimerOn(false);
      return;
    }
    setDraftMode(timerMode);
    setDraftMinutes(Math.max(1, Math.round(countdownSeconds / 60)));
    setTimerSettingsOpen(true);
  }, [timerOn, timerMode, countdownSeconds]);

  const confirmTimerSettings = useCallback(() => {
    const seconds = draftMode === "countdown" ? Math.max(30, draftMinutes * 60) : countdownSeconds;
    setTimerMode(draftMode);
    if (draftMode === "countdown") setCountdownSeconds(seconds);
    saveTimerPrefs({ mode: draftMode, countdownSeconds: draftMode === "countdown" ? seconds : countdownSeconds });
    setTimerSettingsOpen(false);
    setTimeUp(false);
    setTimeLeft(draftMode === "countdown" ? seconds : 0);
    setTimerOn(true);
  }, [draftMode, draftMinutes, countdownSeconds]);

  // ── Auto word-match ───────────────────────────────────────────────────────
  useEffect(() => {
    if (selCells.length < 2 || !game) return;
    const fwd = selCells.map(p => game.grid[p.row][p.col].letter).join("");
    const rev = [...fwd].reverse().join("");
    for (const { up, wi } of game.placed) {
      if (!foundRef.current.has(wi) && (up === fwd || up === rev)) {
        foundRef.current = new Set([...foundRef.current, wi]);
        setFound(prev => new Set([...prev, wi]));
        setSelCells([]);
        break;
      }
    }
  }, [selCells, game]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection handlers ────────────────────────────────────────────────────
  const pressStart = useCallback((cell) => {
    if (!cell) return;
    pressing.current = true;
    hasDragged.current = false;
    setSelCells(prev => {
      if (!prev.length) return [cell];
      const last = prev[prev.length - 1];
      if (last.row === cell.row && last.col === cell.col) return prev;
      if (adjacent(last, cell) && !prev.some(p => p.row === cell.row && p.col === cell.col))
        return [...prev, cell];
      return [cell];
    });
  }, []);

  const pressMove = useCallback((cell) => {
    if (!pressing.current || !cell) return;
    hasDragged.current = true;
    setSelCells(prev => {
      if (!prev.length) return [cell];
      const last = prev[prev.length - 1];
      if (last.row === cell.row && last.col === cell.col) return prev;
      if (adjacent(last, cell) && !prev.some(p => p.row === cell.row && p.col === cell.col))
        return [...prev, cell];
      return [cell];
    });
  }, []);

  const confirmSel = useCallback(() => {
    pressing.current = false;
    if (hasDragged.current) setSelCells([]);
  }, []);

  const cellFromEl = el => {
    const rc = el?.closest("[data-rc]")?.dataset?.rc;
    if (!rc) return null;
    const [r, c] = rc.split(",").map(Number);
    return { row: r, col: c };
  };
  const cellFromPoint = (x, y) => cellFromEl(document.elementFromPoint(x, y));

  const cellClass = (r, c) => {
    if (!game) return "";
    const { wis } = game.grid[r][c];
    const foundWi = wis.find(wi => found.has(wi));
    if (foundWi !== undefined) return COLORS[foundWi % COLORS.length];
    if (inSel(r, c)) return "ws-sel bg-cyan-300/50 text-white border-cyan-300 ring-1 ring-inset ring-cyan-200/60 scale-105";
    if (revealed && wis.length > 0) return "ws-revealed bg-foreground/12 text-muted-foreground border-foreground/25";
    return "bg-foreground/[0.04] text-muted-foreground border-foreground/10 hover:bg-cyan-300/10 hover:text-foreground hover:border-cyan-300/30";
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!game) return;
    const letters = game.grid.map(row => row.map(cell => cell.letter));

    const wordObjMap = Object.fromEntries(
      wordEntries.map(w => [w.word.toLowerCase(), w])
    );

    const meaningRows = game.placed
      .filter(({ word }) => wordObjMap[word.toLowerCase()]?.definition)
      .map(({ word }) => {
        const obj = wordObjMap[word.toLowerCase()];
        return `<tr>
          <td class="w-cell">${escapeHtml(word)}</td>
          <td class="s-cell">${escapeHtml(obj.definition)}</td>
        </tr>`;
      })
      .join("");

    const lower = letterCase === "lowercase";
    const cellPx = lower ? 34 : 28;
    const style = `
.grid{display:grid;grid-template-columns:repeat(${size},1fr);gap:2px;margin:22px 0 0;width:fit-content}
.cell{width:${cellPx}px;height:${cellPx}px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:${lower ? 18 : 13}px;font-variant-numeric:tabular-nums;border:1px solid var(--line);border-radius:4px}
.words{display:flex;flex-wrap:wrap;gap:6px}
.word{border:1px solid var(--dot);padding:3px 11px;border-radius:20px;font-weight:600;font-size:${lower ? 14 : 11}px;${lower ? "" : "text-transform:uppercase;"}letter-spacing:${lower ? ".02em" : ".1em"}}
table{width:100%;border-collapse:collapse}
.w-cell{font-size:${lower ? 14 : 11}px;font-weight:700;${lower ? "" : "text-transform:uppercase;"}letter-spacing:${lower ? ".02em" : ".08em"};padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;width:110px;border-bottom:1px solid var(--line)}
.s-cell{font-size:12px;color:#334155;line-height:1.5;padding:6px 0;border-bottom:1px solid var(--line)}
tr{break-inside:avoid}
`;
    const body = `${printHeader({ eyebrow: "Word search", title, topic: focus })}
<div class="grid">${letters.flat().map(l => `<div class="cell">${l}</div>`).join("")}</div>
<p class="label">Find these words</p>
<div class="words">${game.placed.map(({ word }) => `<div class="word">${escapeHtml(word)}</div>`).join("")}</div>
${meaningRows ? `<p class="label">What they mean</p><table>${meaningRows}</table>` : ""}
${printFooter("Find all the words hidden in the grid above.")}`;
    openPrintWindow(wrapDocument(`Word search – ${title}`, style, body));
  };

  return (
    <>
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) startGame(); else clearInterval(timerRef.current); }}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-primary"
            data-testid="word-search-button"
          >
            <Grid2x2 className="h-3.5 w-3.5" /> Word search
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl overflow-hidden border-cyan-300/20 bg-popover p-0 text-foreground"
        data-testid="word-search-dialog"
      >
        <div className="holo-card p-5 sm:p-7">
          <DialogHeader className="mb-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
                Word Search // {title}
              </div>
              {timerOn && game && (
                <div
                  className={`font-mono text-xl font-bold tabular-nums transition-colors ${
                    timerMode === "countdown" && !timeUp && timeLeft <= 30 ? "animate-pulse text-error" : "text-primary"
                  }`}
                  data-testid="timer-display"
                >
                  {fmtTime(timeLeft)}
                </div>
              )}
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold text-foreground">
              Find all the words.
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{focus}</p>
          </DialogHeader>

          {timeUp && (
            <div className="mb-5 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-3 text-center" data-testid="time-up-banner">
              <p className="font-display text-lg font-bold text-error">Time's up! Here are the hidden words.</p>
            </div>
          )}
          {allDone && !timeUp && (
            <div className="mb-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-center" data-testid="all-done-banner">
              <p className="font-display text-lg font-bold text-success">All words found — brilliant work!</p>
            </div>
          )}

          {game && (
            <div
              className="select-none cursor-crosshair touch-none"
              onMouseDown={e => pressStart(cellFromEl(e.target))}
              onMouseMove={e => pressMove(cellFromEl(e.target))}
              onMouseUp={confirmSel}
              onMouseLeave={() => { if (pressing.current) confirmSel(); }}
              onTouchStart={e => { const t = e.touches[0]; pressStart(cellFromPoint(t.clientX, t.clientY)); }}
              onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; pressMove(cellFromPoint(t.clientX, t.clientY)); }}
              onTouchEnd={confirmSel}
            >
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: "var(--wordsearch-gap, 2px)" }}
              >
                {Array.from({ length: size }, (_, r) =>
                  Array.from({ length: size }, (_, c) => (
                    <div
                      key={`${r}-${c}`}
                      data-rc={`${r},${c}`}
                      className={`flex aspect-square items-center justify-center rounded border font-mono font-bold transition-all duration-75 ${cellTextSizeClass(size)} ${cellClass(r, c)}`}
                    >
                      {game.grid[r][c].letter}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {game && (
            <div className="mt-5 flex flex-wrap gap-2">
              {game.placed.map(({ word, wi }) => (
                <span
                  key={word}
                  className={`rounded-full border px-3 py-1 font-mono tracking-[0.15em] transition-all duration-300 ${chipTextSizeClass(size)} ${
                    letterCase === "lowercase" ? "" : "uppercase"
                  } ${
                    found.has(wi)
                      ? `line-through opacity-40 ${COLORS[wi % COLORS.length]}`
                      : "border-foreground/15 bg-foreground/5 text-muted-foreground"
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-full border border-foreground/20" role="group" aria-label="Letter case" data-testid="letter-case-toggle">
              <button
                type="button"
                onClick={() => changeLetterCase("uppercase")}
                className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                  letterCase === "uppercase" ? "bg-cyan-400 text-slate-950" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                }`}
                aria-pressed={letterCase === "uppercase"}
                data-testid="letter-case-uppercase"
              >
                ABC
              </button>
              <button
                type="button"
                onClick={() => changeLetterCase("lowercase")}
                className={`border-l border-foreground/20 px-3 py-1.5 font-mono text-xs tracking-[0.1em] transition-colors ${
                  letterCase === "lowercase" ? "bg-cyan-400 text-slate-950" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                }`}
                aria-pressed={letterCase === "lowercase"}
                data-testid="letter-case-lowercase"
              >
                abc
              </button>
            </div>

            <Button
              onClick={() => startGame()}
              variant="outline" size="sm"
              className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              data-testid="new-game-button"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New game
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline" size="sm"
                  className={`rounded-full transition-colors ${revealed ? "border-pink-300/40 bg-pink-400/10 text-accent2 hover:bg-pink-400/20 hover:text-foreground" : "border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`}
                  data-testid="reveal-button"
                >
                  <Eye className="h-3.5 w-3.5" /> {revealed ? "Hide" : "Reveal"}
                </Button>
              </AlertDialogTrigger>
              {!revealed ? (
                <AlertDialogContent className="border-foreground/15 bg-popover text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-foreground">Reveal the words?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This will highlight all the hidden words in the grid. Are you sure you want to give up?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground">Keep trying</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setRevealed(true)} className="rounded-full bg-pink-500 text-white hover:bg-pink-600" data-testid="reveal-confirm">
                      Yes, reveal
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              ) : (
                <AlertDialogContent className="border-foreground/15 bg-popover text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-foreground">Hide the words?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This will hide the highlighted positions. Give it another go?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setRevealed(false)} className="rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" data-testid="hide-confirm">
                      Yes, hide
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              )}
            </AlertDialog>

            <Button
              onClick={toggleTimer}
              variant="outline" size="sm"
              className={`rounded-full transition-colors ${timerOn ? "border-cyan-300/40 bg-cyan-400/10 text-primary hover:bg-cyan-400/20 hover:text-foreground" : "border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`}
              data-testid="timer-toggle"
            >
              <Timer className="h-3.5 w-3.5" /> Timer
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline" size="sm"
              className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              data-testid="print-word-search"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={timerSettingsOpen} onOpenChange={setTimerSettingsOpen}>
      <DialogContent className="max-w-sm border-cyan-300/20 bg-popover text-foreground" data-testid="timer-settings-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold text-foreground">Timer</DialogTitle>
        </DialogHeader>

        <div className="mt-3 flex flex-col gap-5">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraftMode("countdown")}
              className={`flex-1 rounded-full ${draftMode === "countdown" ? "border-cyan-300 bg-cyan-300/15 text-primary hover:bg-cyan-300/15 hover:text-primary" : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`}
              data-testid="timer-mode-countdown"
            >
              Countdown
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraftMode("countup")}
              className={`flex-1 rounded-full ${draftMode === "countup" ? "border-cyan-300 bg-cyan-300/15 text-primary hover:bg-cyan-300/15 hover:text-primary" : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`}
              data-testid="timer-mode-countup"
            >
              Normal (count up)
            </Button>
          </div>

          {draftMode === "countdown" && (
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Minutes</div>
              <div className="mt-2 flex items-center gap-3">
                <Button
                  type="button" variant="outline" size="icon"
                  onClick={() => setDraftMinutes(m => Math.max(1, m - 1))}
                  className="h-9 w-9 rounded-full border-foreground/15 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
                  aria-label="Fewer minutes"
                  data-testid="timer-minutes-decrement"
                >
                  −
                </Button>
                <span className="w-10 text-center text-lg font-bold text-foreground" data-testid="timer-minutes-value">{draftMinutes}</span>
                <Button
                  type="button" variant="outline" size="icon"
                  onClick={() => setDraftMinutes(m => Math.min(30, m + 1))}
                  className="h-9 w-9 rounded-full border-foreground/15 bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
                  aria-label="More minutes"
                  data-testid="timer-minutes-increment"
                >
                  +
                </Button>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={confirmTimerSettings}
            className="rounded-full bg-emerald-400 px-6 font-semibold text-slate-950 hover:bg-emerald-300"
            data-testid="timer-settings-start"
          >
            Start timer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
