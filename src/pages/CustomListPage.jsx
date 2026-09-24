// /custom/:listId — one custom list: practise it, play a word search, print it.
//
// A custom list is turned into entries shaped like a year's words.json (see
// lib/customLists.listToEntries), so this page reuses the same practice quiz,
// word search and print sheets as the year pages. Practice is recorded exactly
// as it is for a year, under the list's own id, so it travels in a backup.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Grid2x2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PracticeQuiz } from "@/components/PracticeQuiz";
import { WordSearch } from "@/components/WordSearch";
import { PrintWeekMenu } from "@/components/PrintWeekMenu";
import { BackupReminder } from "@/components/BackupReminder";
import { ShareListDialog } from "@/components/ShareListDialog";
import { useYearsConfig } from "@/lib/yearData";
import { CUSTOM_ID_RE, deleteList, getList, gridSettingsFor, listToEntries } from "@/lib/customLists";
import { PROGRESS_VERSION, loadProgress, recordAttempt, saveProgress, todayISO } from "@/lib/srs";
import { progressKey } from "@/lib/wordKey";
import { getYearAccent, rgba } from "@/lib/yearTheme";
import { SPRING } from "@/lib/motion";

const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
const DEFAULT_ACCENT = "#22d3ee";

const readList = (id) => {
  if (!CUSTOM_ID_RE.test(id || "")) return null;
  try {
    return getList(window.localStorage, id);
  } catch (err) {
    return null;
  }
};

function Shell({ title, children }) {
  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      <title>{title + " | SPELL// STARS"}</title>
      {/* A list belongs to one person's browser, so keep it out of search. */}
      <meta name="robots" content="noindex" />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export default function CustomListPage() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { yearsConfig } = useYearsConfig();

  const [list, setList] = useState(() => readList(listId));
  const [progress, setProgress] = useState(() => loadProgress(listId));
  const [quizOpen, setQuizOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setList(readList(listId));
    setProgress(loadProgress(listId));
    setQuizOpen(false);
    setConfirmingDelete(false);
  }, [listId]);

  const entries = useMemo(() => (list ? listToEntries(list) : []), [list]);
  const year = list && yearsConfig ? yearsConfig.years.find((y) => y.slug === list.yearHint) : null;
  const capabilities = year && year.capabilities ? year.capabilities : undefined;
  const grid = useMemo(() => (list ? gridSettingsFor(list, capabilities) : null), [list, capabilities]);
  const searchable = useMemo(
    () => (list && grid ? entries.filter((e) => !grid.tooLong.includes(e.word)) : []),
    [list, grid, entries],
  );

  if (!list) {
    return (
      <Shell title="List not found">
        <main className="px-5 pb-16 pt-32 sm:px-8">
          <div className="mx-auto max-w-2xl text-center" data-testid="custom-list-missing">
            <h1 className="type-section font-display text-3xl font-extrabold text-foreground">We can't find that list</h1>
            <p className="mt-4 type-body text-sm text-muted-foreground">
              Lists are kept in the browser they were made in. If you made it on another device, open the save page there and bring it over,
              or make it again here.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/custom" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Make a list
              </Link>
              <Link to="/sync" className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/50">
                Restore a backup
              </Link>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  const accent = list.yearHint ? getYearAccent(list.yearHint) : DEFAULT_ACCENT;
  const practised = entries.filter((e) => {
    const state = progress.words[progressKey(e)];
    return state && state.attempts > 0;
  }).length;

  // Same recording as a year page: progress under the list's own id.
  const handleAttempt = (wordKey, correct) => {
    setProgress((prev) => {
      const next = { ...recordAttempt(prev, wordKey, correct, todayISO()), v: PROGRESS_VERSION };
      saveProgress(listId, next);
      return next;
    });
  };

  const handleDelete = () => {
    deleteList(window.localStorage, list.id);
    navigate("/custom", { replace: true });
  };

  const sheet = {
    title: list.name,
    topic: "",
    meta: plural(list.words.length, "word", "words"),
    words: entries,
  };

  return (
    <Shell title={list.name}>
      <div className="border-b px-6 pb-6 pt-24" style={{ borderColor: rgba(accent, 0.35), backgroundImage: `linear-gradient(180deg, ${rgba(accent, 0.08)}, transparent)` }}>
        <div className="mx-auto max-w-7xl">
          <Link to="/custom" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors duration-300 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Your lists
          </Link>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 12px ${rgba(accent, 0.8)}` }} aria-hidden="true" />
              <h1 className="type-section font-display text-3xl font-extrabold text-foreground" data-testid="custom-list-title">
                {list.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PrintWeekMenu
                sheet={sheet}
                gridSettings={grid}
                triggerLabel="Print"
                triggerClassName="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
              />
              <ShareListDialog
                list={list}
                triggerClassName="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
              />
              <Link
                to={"/custom?edit=" + list.id}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                data-testid="custom-edit-link"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Link>
            </div>
          </div>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground" data-testid="custom-list-summary">
            {plural(list.words.length, "word", "words")}
            {practised > 0 && " · " + practised + " practised"}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" data-testid="custom-word-grid">
          {entries.map((entry, i) => (
            <motion.li
              key={entry.id}
              className="truncate rounded-xl border px-3 py-2.5 text-center font-display text-sm font-semibold text-foreground shadow-sm"
              style={{ backgroundColor: rgba(accent, 0.34), borderColor: rgba(accent, 0.55) }}
              title={entry.word}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.settle, delay: Math.min(i, 20) * 0.02 }}
            >
              {entry.word}
            </motion.li>
          ))}
        </ul>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="custom-action-cards">
          {searchable.length > 0 ? (
            <WordSearch
              words={searchable}
              gridSize={grid.size}
              gridDirections={grid.directions}
              gridLetterCase={grid.letterCase}
              title={list.name}
              focus=""
              trigger={
                <button
                  type="button"
                  className="press-soft h-full w-full rounded-3xl border p-6 text-left transition duration-200 hover:brightness-125"
                  style={{ borderColor: rgba(accent, 0.3), backgroundColor: rgba(accent, 0.07) }}
                  data-testid="custom-card-word-search"
                >
                  <Grid2x2 className="h-6 w-6" style={{ color: accent }} aria-hidden="true" />
                  <div className="mt-3 type-card font-display text-lg font-bold text-foreground">Word search</div>
                  <p className="mt-1.5 text-sm leading-snug text-muted-foreground">Find all {searchable.length} words hidden in a grid.</p>
                </button>
              }
            />
          ) : (
            <div className="rounded-3xl border border-foreground/10 p-6 text-sm text-muted-foreground">No words fit in a word search grid.</div>
          )}
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="press-soft rounded-3xl border border-emerald-300/25 bg-emerald-400/5 p-6 text-left transition-colors duration-200 hover:border-emerald-300/50 hover:bg-emerald-400/10"
            data-testid="custom-card-spelling-test"
          >
            <Sparkles className="h-6 w-6 text-success" aria-hidden="true" />
            <div className="mt-3 type-card font-display text-lg font-bold text-foreground">Spelling test</div>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
              Type all {list.words.length} words — listen aloud
              {entries.some((e) => e.definition || e.exampleSentence) ? ", or guess from the meaning." : "."}
            </p>
          </button>
        </div>

        {grid.tooLong.length > 0 && (
          <p className="text-xs text-warning" role="status" data-testid="custom-too-long">
            Left out of the word search because they are too long for the grid: {grid.tooLong.join(", ")}.
          </p>
        )}

        <PracticeQuiz
          words={entries}
          onAttempt={handleAttempt}
          ttsRate={capabilities ? capabilities.ttsRate : undefined}
          open={quizOpen}
          onOpenChange={setQuizOpen}
        />

        <div className="border-t border-foreground/10 pt-6">
          {confirmingDelete ? (
            <span className="flex flex-wrap items-center gap-3 text-sm" role="alertdialog" aria-label={"Delete " + list.name}>
              <span className="text-muted-foreground">Delete this list and its progress? This can't be undone.</span>
              <button type="button" onClick={handleDelete} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90" data-testid="custom-confirm-delete">
                Delete list
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/50">
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive" data-testid="custom-delete">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete this list
            </button>
          )}
        </div>
      </main>

      <BackupReminder />
    </Shell>
  );
}
