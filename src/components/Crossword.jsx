// Crossword: a puzzle made from a week's words (or a custom list). Type the
// answers into the grid using the clues. Keyboard, touch and screen readers
// all work: every square is a real text box with a spoken label, and each clue
// is a button that jumps to its word.
//
// The layout and clues come from lib/crossword.js, which the print sheet
// also uses, so what's printed is the same puzzle.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, Printer, RotateCcw, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildCrossword, withClueMode } from "@/lib/crossword";
import { buildCrosswordSheet, openPrintWindow } from "@/lib/printSheets";
import { loadCrosswordClueMode, saveCrosswordClueMode } from "@/lib/crosswordPrefs";

const MIN_CELL_PX = 26;
const MAX_CELL_PX = 46;

const cellKey = (r, c) => r + "," + c;

const OTHER = { across: "down", down: "across" };

export function Crossword({ words, title = "", focus = "", trigger, meta = "" }) {
  const [open, setOpen] = useState(false);
  const [clueMode, setClueMode] = useState(loadCrosswordClueMode);
  const [puzzle, setPuzzle] = useState(null);
  const [values, setValues] = useState({});
  const [wrong, setWrong] = useState(() => new Set());
  const [active, setActive] = useState({ r: 0, c: 0, dir: "across" });
  const [gaveUp, setGaveUp] = useState(false);
  const inputs = useRef({});

  const start = useCallback(() => {
    const next = buildCrossword(words, { clueMode: loadCrosswordClueMode() });
    setPuzzle(next);
    setValues({});
    setWrong(new Set());
    setGaveUp(false);
    if (next) {
      const [a, d] = [next.across[0], next.down[0]];
      const first = !d || (a && a.number <= d.number) ? a : d;
      setActive({ r: first.row, c: first.col, dir: first.dir });
    }
  }, [words]);

  const handleOpenChange = (v) => {
    setOpen(v);
    if (v) start();
  };

  // Which words pass through each square.
  const info = useMemo(() => {
    const map = new Map();
    if (!puzzle) return map;
    for (const clue of [...puzzle.across, ...puzzle.down]) {
      for (let i = 0; i < clue.length; i++) {
        const r = clue.row + (clue.dir === "down" ? i : 0);
        const c = clue.col + (clue.dir === "across" ? i : 0);
        const k = cellKey(r, c);
        map.set(k, { ...(map.get(k) || {}), [clue.dir]: clue });
      }
    }
    return map;
  }, [puzzle]);

  const clueList = useMemo(() => (puzzle ? [...puzzle.across, ...puzzle.down] : []), [puzzle]);

  const cellsOf = (clue) =>
    Array.from({ length: clue.length }, (_, i) => [clue.row + (clue.dir === "down" ? i : 0), clue.col + (clue.dir === "across" ? i : 0)]);

  const activeInfo = info.get(cellKey(active.r, active.c)) || {};
  const activeClue = activeInfo[active.dir] || activeInfo[OTHER[active.dir]] || null;
  const activeWord = useMemo(
    () => new Set(activeClue ? cellsOf(activeClue).map(([r, c]) => cellKey(r, c)) : []),
    [activeClue], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Keep the browser's focus on the active square.
  useEffect(() => {
    if (!open || !puzzle) return;
    const el = inputs.current[cellKey(active.r, active.c)];
    if (el && document.activeElement !== el) el.focus({ preventScroll: false });
  }, [active, open, puzzle]);

  const isSolved = (clue) => cellsOf(clue).every(([r, c], i) => values[cellKey(r, c)] === clue.answer[i]);
  const complete = puzzle && clueList.length > 0 && clueList.every(isSolved);

  const select = (r, c, dir) => {
    const here = info.get(cellKey(r, c)) || {};
    const useDir = here[dir] ? dir : OTHER[dir];
    setActive({ r, c, dir: useDir });
  };

  const selectClue = (clue) => setActive({ r: clue.row, c: clue.col, dir: clue.dir });

  const setLetter = (r, c, letter) => {
    setValues((prev) => {
      const next = { ...prev };
      if (letter) next[cellKey(r, c)] = letter;
      else delete next[cellKey(r, c)];
      return next;
    });
    setWrong((prev) => {
      if (!prev.has(cellKey(r, c))) return prev;
      const next = new Set(prev);
      next.delete(cellKey(r, c));
      return next;
    });
  };

  const step = (r, c, dir, amount) => {
    const nr = r + (dir === "down" ? amount : 0);
    const nc = c + (dir === "across" ? amount : 0);
    return info.has(cellKey(nr, nc)) ? { r: nr, c: nc } : null;
  };

  const handleChange = (r, c, event) => {
    const typed = [...event.target.value].pop();
    if (!typed || !/\p{L}/u.test(typed)) return;
    setLetter(r, c, typed.toUpperCase());
    // Move on within the same word, if there is another square.
    const dir = (info.get(cellKey(r, c)) || {})[active.dir] ? active.dir : OTHER[active.dir];
    const nextCell = step(r, c, dir, 1);
    if (nextCell && (info.get(cellKey(nextCell.r, nextCell.c)) || {})[dir]) setActive({ ...nextCell, dir });
  };

  const handleKeyDown = (r, c, event) => {
    const dir = (info.get(cellKey(r, c)) || {})[active.dir] ? active.dir : OTHER[active.dir];
    const move = (dr, dc, newDir) => {
      event.preventDefault();
      const nr = r + dr;
      const nc = c + dc;
      if (info.has(cellKey(nr, nc))) select(nr, nc, newDir);
      else setActive({ r, c, dir: (info.get(cellKey(r, c)) || {})[newDir] ? newDir : dir });
    };
    switch (event.key) {
      case "ArrowRight": return move(0, 1, "across");
      case "ArrowLeft": return move(0, -1, "across");
      case "ArrowDown": return move(1, 0, "down");
      case "ArrowUp": return move(-1, 0, "down");
      case "Backspace": {
        event.preventDefault();
        if (values[cellKey(r, c)]) {
          setLetter(r, c, "");
        } else {
          const back = step(r, c, dir, -1);
          if (back && (info.get(cellKey(back.r, back.c)) || {})[dir]) {
            setLetter(back.r, back.c, "");
            setActive({ ...back, dir });
          }
        }
        return undefined;
      }
      case " ":
      case "Enter": {
        // Space swaps between across and down; Enter goes on to the next clue.
        event.preventDefault();
        if (event.key === " ") {
          const here = info.get(cellKey(r, c)) || {};
          if (here[OTHER[dir]]) setActive({ r, c, dir: OTHER[dir] });
        } else if (activeClue) {
          const i = clueList.indexOf(activeClue);
          selectClue(clueList[(i + 1) % clueList.length]);
        }
        return undefined;
      }
      default: return undefined;
    }
  };

  const check = () => {
    const bad = new Set();
    for (const [k, letter] of Object.entries(values)) {
      const [r, c] = k.split(",").map(Number);
      if (puzzle.grid[r][c] !== letter) bad.add(k);
    }
    setWrong(bad);
  };

  const revealFor = (clues) => {
    setValues((prev) => {
      const next = { ...prev };
      for (const clue of clues) cellsOf(clue).forEach(([r, c], i) => { next[cellKey(r, c)] = clue.answer[i]; });
      return next;
    });
    setWrong(new Set());
  };

  const changeClueMode = (mode) => {
    setClueMode(mode);
    saveCrosswordClueMode(mode);
    setPuzzle((p) => (p ? withClueMode(p, mode) : p));
  };

  const handlePrint = () => {
    if (!puzzle) return;
    openPrintWindow(buildCrosswordSheet({ title, topic: focus, meta, puzzle }));
  };

  const cellSize = puzzle ? Math.max(MIN_CELL_PX, Math.min(MAX_CELL_PX, Math.floor(640 / puzzle.width))) : MIN_CELL_PX;
  const large = puzzle && puzzle.width > 15;

  const renderClueList = (label, clues) => (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">{label}</h3>
      <ol className="mt-2 space-y-1">
        {clues.map((clue) => {
          const isActive = activeClue === clue;
          const solved = isSolved(clue);
          return (
            <li key={clue.dir + clue.number}>
              <button
                type="button"
                onClick={() => selectClue(clue)}
                aria-current={isActive ? "true" : undefined}
                className={`flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-sm leading-snug transition-colors ${
                  isActive ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}
                data-testid={`crossword-clue-${clue.number}-${clue.dir}`}
              >
                <span className="w-6 shrink-0 font-mono font-bold text-primary">{clue.number}</span>
                <span className="flex-1">
                  {clue.clue} <span className="whitespace-nowrap text-muted-foreground">{clue.enumeration}</span>
                  {solved && (
                    <>
                      <Check className="ml-1 inline h-3.5 w-3.5 text-success" aria-hidden="true" />
                      <span className="sr-only"> solved</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-primary"
            data-testid="crossword-button"
          >
            <Puzzle className="h-3.5 w-3.5" aria-hidden="true" /> Crossword
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] max-w-5xl overflow-y-auto border-cyan-300/20 bg-popover p-0 text-foreground"
        data-testid="crossword-dialog"
      >
        <div className="holo-card p-5 sm:p-7">
          <DialogHeader className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">Crossword // {title}</div>
            <DialogTitle className="font-display text-2xl font-extrabold text-foreground">Solve the clues.</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {focus || "Type each answer into the grid. Use the arrow keys to move, and the space bar to switch between across and down."}
            </DialogDescription>
          </DialogHeader>

          {!puzzle ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="crossword-empty">
              There aren't enough words here to make a crossword yet.
            </p>
          ) : (
            <>
              {complete && (
                <div className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-center" role="status" data-testid="crossword-complete">
                  <p className="font-display text-lg font-bold text-success">
                    {gaveUp ? "All the answers are in." : "Crossword complete — brilliant work!"}
                  </p>
                </div>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1" role="group" aria-label="Clue style">
                  {[["sentence", "Sentence clues"], ["meaning", "Meaning clues"]].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={clueMode === mode}
                      onClick={() => changeClueMode(mode)}
                      className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        clueMode === mode ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                      }`}
                      data-testid={`crossword-mode-${mode}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button onClick={check} variant="outline" size="sm" className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground" data-testid="crossword-check">
                  <Check className="h-3.5 w-3.5" /> Check
                </Button>
                <Button
                  onClick={() => activeClue && revealFor([activeClue])}
                  variant="outline" size="sm"
                  className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  data-testid="crossword-reveal-word"
                >
                  <Eye className="h-3.5 w-3.5" /> Reveal word
                </Button>
                <Button
                  onClick={() => { setGaveUp(true); revealFor(clueList); }}
                  variant="outline" size="sm"
                  className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  data-testid="crossword-reveal-all"
                >
                  <Eye className="h-3.5 w-3.5" /> Reveal all
                </Button>
                <Button onClick={start} variant="outline" size="sm" className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground" data-testid="crossword-new">
                  <RotateCcw className="h-3.5 w-3.5" /> New puzzle
                </Button>
                <Button onClick={handlePrint} variant="outline" size="sm" className="rounded-full border-foreground/20 bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground" data-testid="crossword-print">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </div>

              {/* The current clue, big, so it's easy to read on a phone. */}
              <p className="mb-3 min-h-[2.75rem] rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-foreground" aria-live="polite" data-testid="crossword-current-clue">
                {activeClue ? (
                  <>
                    <span className="mr-2 font-mono font-bold text-primary">
                      {activeClue.number} {activeClue.dir === "across" ? "Across" : "Down"}
                    </span>
                    {activeClue.clue} <span className="text-muted-foreground">{activeClue.enumeration}</span>
                  </>
                ) : (
                  "Choose a square to see its clue."
                )}
              </p>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div className="overflow-auto" data-testid="crossword-grid-wrap">
                  <div
                    role="group"
                    aria-label={`Crossword grid, ${puzzle.width} columns by ${puzzle.height} rows`}
                    className="mx-auto grid select-none"
                    style={{
                      gridTemplateColumns: `repeat(${puzzle.width}, minmax(${MIN_CELL_PX}px, 1fr))`,
                      width: "100%",
                      minWidth: puzzle.width * MIN_CELL_PX,
                      maxWidth: puzzle.width * cellSize + (puzzle.width - 1) * 2,
                      gap: 2,
                    }}
                    data-testid="crossword-grid"
                  >
                    {puzzle.grid.map((row, r) =>
                      row.map((letter, c) => {
                        if (!letter) return <div key={cellKey(r, c)} aria-hidden="true" className="aspect-square" />;
                        const k = cellKey(r, c);
                        const here = info.get(k) || {};
                        const isActiveCell = active.r === r && active.c === c;
                        const inWord = activeWord.has(k);
                        const isWrong = wrong.has(k);
                        const number = puzzle.numbers[r][c];
                        const spoken = [here.across && `${here.across.number} across`, here.down && `${here.down.number} down`].filter(Boolean).join(", ");
                        return (
                          <div
                            key={k}
                            className={`relative aspect-square rounded border ${
                              isWrong
                                ? "border-destructive bg-destructive/15"
                                : isActiveCell
                                  ? "border-primary bg-primary/35"
                                  : inWord
                                    ? "border-primary/50 bg-primary/15"
                                    : "border-foreground/40 bg-card"
                            }`}
                          >
                            {number && (
                              <span className="pointer-events-none absolute left-0.5 top-0 font-mono text-[9px] font-bold leading-none text-muted-foreground" aria-hidden="true">
                                {number}
                              </span>
                            )}
                            <input
                              ref={(el) => { inputs.current[k] = el; }}
                              value={values[k] || ""}
                              onChange={(e) => handleChange(r, c, e)}
                              onKeyDown={(e) => handleKeyDown(r, c, e)}
                              onFocus={() => { if (!isActiveCell) select(r, c, active.dir); }}
                              onClick={() => { if (isActiveCell && here.across && here.down) setActive({ r, c, dir: OTHER[active.dir] }); }}
                              aria-label={`Row ${r + 1}, column ${c + 1}, ${spoken}${isWrong ? ", incorrect" : ""}`}
                              autoComplete="off"
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck={false}
                              inputMode="text"
                              className={`h-full w-full rounded bg-transparent text-center font-mono font-bold lowercase caret-transparent outline-none ${large ? "text-sm" : "text-base sm:text-lg"} ${isWrong ? "text-destructive" : "text-foreground"}`}
                              data-testid={`crossword-cell-${r}-${c}`}
                            />
                          </div>
                        );
                      }),
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1" data-testid="crossword-clues">
                  {renderClueList("Across", puzzle.across)}
                  {renderClueList("Down", puzzle.down)}
                </div>
              </div>

              {puzzle.unplaced.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground" data-testid="crossword-unplaced">
                  Left out because they didn't fit this time: {puzzle.unplaced.map((e) => e.word).join(", ")}. Press New puzzle to try again.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
