import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Grid2x2, Printer, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SIZE = 12;
const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COLORS = [
  "bg-cyan-400/40 text-white border-cyan-400",
  "bg-emerald-400/40 text-white border-emerald-400",
  "bg-pink-400/40 text-white border-pink-400",
  "bg-amber-400/40 text-white border-amber-400",
  "bg-violet-400/40 text-white border-violet-400",
  "bg-sky-400/40 text-white border-sky-400",
  "bg-rose-400/40 text-white border-rose-400",
  "bg-teal-400/40 text-white border-teal-400",
  "bg-orange-400/40 text-white border-orange-400",
  "bg-lime-400/40 text-white border-lime-400",
];
const DEFAULT_SECS = 180;

function buildGrid(words) {
  const clean = words.map(w => w.toUpperCase().replace(/['']/g, ""));
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ letter: "", wis: [] }))
  );
  const placed = [];
  for (let wi = 0; wi < clean.length; wi++) {
    const up = clean[wi];
    let ok = false;
    for (let t = 0; t < 400 && !ok; t++) {
      const [dr, dc] = DIRS[Math.floor(Math.random() * 8)];
      const rMin = dr > 0 ? 0 : dr < 0 ? up.length - 1 : 0;
      const rMax = dr > 0 ? SIZE - up.length : dr < 0 ? SIZE - 1 : SIZE - 1;
      const cMin = dc > 0 ? 0 : dc < 0 ? up.length - 1 : 0;
      const cMax = dc > 0 ? SIZE - up.length : dc < 0 ? SIZE - 1 : SIZE - 1;
      if (rMin > rMax || cMin > cMax) continue;
      const r0 = rMin + Math.floor(Math.random() * (rMax - rMin + 1));
      const c0 = cMin + Math.floor(Math.random() * (cMax - cMin + 1));
      let valid = true;
      for (let i = 0; i < up.length && valid; i++) {
        const ex = grid[r0 + i * dr][c0 + i * dc].letter;
        if (ex && ex !== up[i]) valid = false;
      }
      if (valid) {
        for (let i = 0; i < up.length; i++) {
          grid[r0 + i * dr][c0 + i * dc].letter = up[i];
          grid[r0 + i * dr][c0 + i * dc].wis.push(wi);
        }
        placed.push({ word: words[wi], up, wi });
        ok = true;
      }
    }
    if (!ok) placed.push({ word: words[wi], up, wi, failed: true });
  }
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c].letter)
        grid[r][c].letter = ALPHA[Math.floor(Math.random() * 26)];
  return { grid, placed };
}

// true when b is directly adjacent (8-directional) to a
function adjacent(a, b) {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

function cellKey(c) { return `${c.row},${c.col}`; }
function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const WordSearch = ({ week }) => {
  const words = useMemo(
    () => week.words.filter(w => !w.challenge).map(w => w.text),
    [week]
  );

  const [open, setOpen] = useState(false);
  const [game, setGame] = useState(null);
  const [found, setFound] = useState(new Set());

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

  const pressing = useRef(false);
  const hasDragged = useRef(false); // true once mouse/touch moves after press

  const allDone = game
    ? found.size >= game.placed.filter(p => !p.failed).length && game.placed.length > 0
    : false;

  const startGame = useCallback(() => {
    clearInterval(timerRef.current);
    const g = buildGrid(words);
    setGame(g);
    setFound(new Set());
    foundRef.current = new Set();
    setRevealed(false);
    setSelCells([]);
    setTimeLeft(DEFAULT_SECS);
    setTimeUp(false);
  }, [words]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerOn || !game || timeUp) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setTimeUp(true); setRevealed(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerOn, game, timeUp]);

  useEffect(() => { if (allDone) clearInterval(timerRef.current); }, [allDone]);

  const toggleTimer = useCallback(() => {
    setTimerOn(prev => {
      if (prev) { clearInterval(timerRef.current); }
      else { setTimeLeft(DEFAULT_SECS); setTimeUp(false); }
      return !prev;
    });
  }, []);

  // ── Auto word-match ───────────────────────────────────────────────────────
  // Fires after every selCells change.  Uses foundRef so `found` is NOT a dep
  // (avoids the effect re-running on every found update and causing a loop).
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
      if (last.row === cell.row && last.col === cell.col) return prev; // same cell
      // Adjacent and not already in path → extend
      if (adjacent(last, cell) && !prev.some(p => p.row === cell.row && p.col === cell.col))
        return [...prev, cell];
      // Not adjacent → restart with just this cell
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

  // On release:
  //   drag → clear the selection (word check already handled by the effect above)
  //   click → keep selection sticky so the user can continue clicking letter-by-letter
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
    // Active selection — vivid so it's unmissable
    if (inSel(r, c)) return "bg-cyan-300/50 text-white border-cyan-300 ring-1 ring-inset ring-cyan-200/60 scale-105";
    if (revealed && wis.length > 0) return "bg-white/12 text-slate-300 border-white/25";
    return "bg-white/[0.04] text-slate-400 border-white/10 hover:bg-cyan-300/10 hover:text-white hover:border-cyan-300/30";
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!game) return;
    const letters = game.grid.map(row => row.map(cell => cell.letter));

    // Build a lookup from word text → full word object (for sentences)
    const wordObjMap = Object.fromEntries(
      week.words
        .filter(w => !w.challenge)
        .map(w => [w.text.toLowerCase(), w])
    );

    const sentenceRows = game.placed
      .filter(({ word }) => wordObjMap[word.toLowerCase()]?.sentence)
      .map(({ word }) => {
        const obj = wordObjMap[word.toLowerCase()];
        // Highlight every occurrence of the spelling word (case-insensitive)
        const re = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        const highlighted = obj.sentence.replace(
          re,
          '<strong class="hl">$1</strong>'
        );
        return `<tr>
          <td class="w-cell">${word}</td>
          <td class="s-cell">${highlighted}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head>
<title>Word Search – Week ${String(week.week).padStart(2, "0")}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier New',monospace;padding:36px 40px;background:#fff;color:#111}
.eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#666;margin-bottom:4px}
h1{font-size:26px;font-weight:900;letter-spacing:-.02em}
.lp{font-size:12px;color:#444;margin-top:10px;border-left:3px solid #0ea5e9;padding-left:10px;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(${SIZE},1fr);gap:2px;margin:22px 0;width:fit-content}
.cell{width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:1px solid #ccc}
.label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#777;margin-bottom:8px;margin-top:20px}
.words{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.word{border:1px solid #aaa;padding:3px 11px;border-radius:20px;font-size:11px;text-transform:uppercase;letter-spacing:.1em}
table{width:100%;border-collapse:collapse;margin-top:4px}
.w-cell{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:5px 10px 5px 0;vertical-align:top;white-space:nowrap;color:#333;width:100px;border-bottom:1px solid #eee}
.s-cell{font-size:12px;color:#444;line-height:1.6;padding:5px 0;border-bottom:1px solid #eee}
.hl{font-weight:900;color:#0284c7;text-decoration:underline}
footer{margin-top:24px;font-size:10px;color:#bbb}
</style></head><body>
<p class="eyebrow">SPELL// ST&#9733;RS &mdash; Word Search</p>
<h1>Week ${String(week.week).padStart(2, "0")}</h1>
<p class="lp">${week.learningPoint}</p>
<div class="grid">${letters.flat().map(l => `<div class="cell">${l}</div>`).join("")}</div>
<p class="label">Find these words</p>
<div class="words">${game.placed.map(({ word }) => `<div class="word">${word}</div>`).join("")}</div>
${sentenceRows ? `<p class="label">Words in sentences</p><table>${sentenceRows}</table>` : ""}
<footer>Find all the words hidden in the grid above.</footer>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) startGame(); else clearInterval(timerRef.current); }}>
      <DialogTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"
          data-testid="word-search-button"
        >
          <Grid2x2 className="h-3.5 w-3.5" /> Word search
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl overflow-hidden border-cyan-300/20 bg-[#08101f] p-0 text-slate-100"
        data-testid="word-search-dialog"
      >
        <div className="holo-card p-5 sm:p-7">
          <DialogHeader className="mb-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300">
                Word Search // Week {String(week.week).padStart(2, "0")}
              </div>
              {timerOn && game && (
                <div
                  className={`font-mono text-xl font-bold tabular-nums transition-colors ${
                    !timeUp && timeLeft <= 30 ? "animate-pulse text-rose-400" : "text-cyan-300"
                  }`}
                  data-testid="timer-display"
                >
                  {fmtTime(timeLeft)}
                </div>
              )}
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold text-white">
              Find all the words.
            </DialogTitle>
            <p className="text-sm text-slate-400">{week.learningPoint}</p>
          </DialogHeader>

          {timeUp && (
            <div className="mb-5 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-3 text-center" data-testid="time-up-banner">
              <p className="font-display text-lg font-bold text-rose-300">Time's up! Here are the hidden words.</p>
            </div>
          )}
          {allDone && !timeUp && (
            <div className="mb-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-center" data-testid="all-done-banner">
              <p className="font-display text-lg font-bold text-emerald-300">All words found — brilliant work!</p>
            </div>
          )}

          {/* Grid */}
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
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: SIZE }, (_, r) =>
                  Array.from({ length: SIZE }, (_, c) => (
                    <div
                      key={`${r}-${c}`}
                      data-rc={`${r},${c}`}
                      className={`flex aspect-square items-center justify-center rounded border font-mono text-[11px] font-bold transition-all duration-75 sm:text-xs ${cellClass(r, c)}`}
                    >
                      {game.grid[r][c].letter}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Word chips */}
          {game && (
            <div className="mt-5 flex flex-wrap gap-2">
              {game.placed.map(({ word, wi }) => (
                <span
                  key={word}
                  className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-all duration-300 ${
                    found.has(wi)
                      ? `line-through opacity-40 ${COLORS[wi % COLORS.length]}`
                      : "border-white/15 bg-white/5 text-slate-400"
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={startGame}
              variant="outline" size="sm"
              className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
              data-testid="new-game-button"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New game
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline" size="sm"
                  className={`rounded-full transition-colors ${revealed ? "border-pink-300/40 bg-pink-400/10 text-pink-200 hover:bg-pink-400/20" : "border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                  data-testid="reveal-button"
                >
                  <Eye className="h-3.5 w-3.5" /> {revealed ? "Hide" : "Reveal"}
                </Button>
              </AlertDialogTrigger>
              {!revealed ? (
                <AlertDialogContent className="border-white/15 bg-[#08101f] text-slate-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-white">Reveal the words?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This will highlight all the hidden words in the grid. Are you sure you want to give up?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10">Keep trying</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setRevealed(true)} className="rounded-full bg-pink-500 text-white hover:bg-pink-600" data-testid="reveal-confirm">
                      Yes, reveal
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              ) : (
                <AlertDialogContent className="border-white/15 bg-[#08101f] text-slate-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-white">Hide the words?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This will hide the highlighted positions. Give it another go?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10">Cancel</AlertDialogCancel>
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
              className={`rounded-full transition-colors ${timerOn ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20" : "border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              data-testid="timer-toggle"
            >
              <Timer className="h-3.5 w-3.5" /> Timer
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline" size="sm"
              className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
              data-testid="print-word-search"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
