// /custom — make a spelling list from any words: this week's school list,
// a child's own tricky words, a topic. Paste them in and get practice, a word
// search and print sheets for exactly those words.
//
// There is no account and nothing is uploaded: lists are kept in this browser
// (see lib/customLists.js) and travel with everything else on /sync.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Pencil, Trash2, X } from 'lucide-react';
import { InfoPage } from '@/components/InfoPage';
import { BackupBar } from '@/components/BackupBar';
import {
  CUSTOM_LESSONS_NAME,
  MAX_SERIES,
  MAX_SERIES_NAME,
  addListToSeries,
  createSeries,
  loadSeries,
  orphanLessons,
  removeListFromSeries,
  seriesForList,
  seriesLessons,
  upsertSeries,
} from '@/lib/series';
import { getYearsConfig, getYearWords, useYearsConfig } from '@/lib/yearData';
import { normaliseWord } from '@/lib/wordKey';
import {
  MAX_LISTS,
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_WORDS,
  addBuiltInMeanings,
  createList,
  deleteList,
  loadLists,
  parseWordList,
  upsertList,
  wordsToText,
} from '@/lib/customLists';

const buttonPrimary =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet =
  'inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const card = 'holo-card relative rounded-2xl p-5 sm:p-6 mt-6';
const field =
  'mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const DEFAULT_NAME = 'My lesson';
const NEW_SERIES = '__new__';

const readSeries = () => {
  try {
    return loadSeries(window.localStorage);
  } catch (err) {
    return [];
  }
};

const readLists = () => {
  try {
    return loadLists(window.localStorage);
  } catch (err) {
    return [];
  }
};

// ── The form ───────────────────────────────────────────────────────────

/** Re-mounted (via `key`) whenever the list being edited changes. */
function ListEditor({ editing, lists, allSeries, initialSeries, years, onSaved }) {
  const [text, setText] = useState(() =>
    editing ? wordsToText(editing.words) : '',
  );
  const [name, setName] = useState(() => (editing ? editing.name : ''));
  const [yearHint, setYearHint] = useState(
    () => (editing && editing.yearHint) || '',
  );
  const [seriesChoice, setSeriesChoice] = useState(() => {
    if (editing) {
      const current = seriesForList(allSeries, editing.id)[0];
      return current ? current.id : '';
    }
    return allSeries.some((s) => s.id === initialSeries) ? initialSeries : '';
  });
  const [newSeriesName, setNewSeriesName] = useState('');
  const [removed, setRemoved] = useState(() => new Set()); // word keys taken out with the chips
  const [fillMeanings, setFillMeanings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(
    () => parseWordList(text, { max: MAX_TEXT_LENGTH }),
    [text],
  );
  const kept = useMemo(
    () => parsed.words.filter((w) => !removed.has(normaliseWord(w.word))),
    [parsed, removed],
  );
  const words = kept.slice(0, MAX_WORDS);
  const overCap = kept.length - words.length;
  const removedWords = parsed.words.filter((w) =>
    removed.has(normaliseWord(w.word)),
  );
  const listFull = !editing && lists.length >= MAX_LISTS;
  const seriesFull =
    seriesChoice === NEW_SERIES && allSeries.length >= MAX_SERIES;

  const removeWord = (word) =>
    setRemoved((prev) => new Set(prev).add(normaliseWord(word)));
  const putBack = (word) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      next.delete(normaliseWord(word));
      return next;
    });

  async function save() {
    if (!words.length || listFull || seriesFull || saving) return;
    setSaving(true);
    setError('');

    // Keep a word's meaning when its list is edited, unless new text replaces it.
    const before = new Map(
      editing ? editing.words.map((w) => [normaliseWord(w.word), w]) : [],
    );
    let finalWords = words.map((w) => {
      const old = before.get(normaliseWord(w.word));
      const out = { word: w.word };
      const sentence = w.exampleSentence || (old && old.exampleSentence);
      if (sentence) out.exampleSentence = sentence;
      if (old && old.definition) out.definition = old.definition;
      return out;
    });
    if (fillMeanings) {
      const filled = await addBuiltInMeanings(finalWords, {
        getYearsConfig,
        getYearWords,
      });
      finalWords = filled.words;
    }

    const now = new Date();
    const cleanName = (name.trim() || DEFAULT_NAME).slice(0, MAX_NAME_LENGTH);
    const list = editing
      ? {
          ...editing,
          name: cleanName,
          yearHint: yearHint || null,
          words: finalWords,
          updatedAt: now.toISOString(),
        }
      : createList({
          name: cleanName,
          yearHint: yearHint || null,
          words: finalWords,
          existingIds: lists.map((l) => l.id),
          now,
        });

    const result = upsertList(window.localStorage, list);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    // File the lesson in the chosen series (or none), taking it out of any
    // series it was in before.
    const storage = window.localStorage;
    const previousSeries = seriesForList(allSeries, list.id).map((s) => s.id);
    previousSeries
      .filter((id) => id !== seriesChoice)
      .forEach((id) => removeListFromSeries(storage, id, list.id));
    let filed = { ok: true };
    if (seriesChoice === NEW_SERIES) {
      filed = upsertSeries(
        storage,
        createSeries({
          name: newSeriesName,
          listIds: [list.id],
          existingIds: allSeries.map((s) => s.id),
        }),
      );
    } else if (seriesChoice && !previousSeries.includes(seriesChoice)) {
      filed = addListToSeries(storage, seriesChoice, list.id);
    }
    if (!filed.ok) {
      setError(
        'Your lesson is saved, but we could not add it to the series. ' +
          (filed.error || ''),
      );
      setSaving(false);
      return;
    }
    onSaved(list);
  }

  return (
    <div className={card} data-testid="custom-editor">
      <h2 className="type-card font-display text-xl font-bold text-foreground">
        {editing ? 'Edit “' + editing.name + '”' : 'Make a lesson'}
      </h2>

      <label
        htmlFor="custom-words"
        className="mt-5 block text-sm font-semibold text-foreground"
      >
        Paste your words
      </label>
      <textarea
        id="custom-words"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        maxLength={MAX_TEXT_LENGTH}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={'because\nfriend\nbeautiful\nnecessary'}
        className={field + ' font-mono leading-relaxed'}
        aria-describedby="custom-words-help"
        data-testid="custom-words-input"
      />
      <p
        id="custom-words-help"
        className="mt-2 type-body text-xs text-muted-foreground"
      >
        One word per line, or separated by commas. Numbers and bullets are
        dropped, and copying from WhatsApp, Notes or a spreadsheet works. Add a
        sentence after a bar to use it in practice:{' '}
        <span className="font-mono">
          because | I stayed in because it rained
        </span>
        .
      </p>

      <div
        className="mt-5"
        aria-live="polite"
        data-testid="custom-parse-summary"
      >
        {words.length > 0 ? (
          <>
            <div className="text-sm font-semibold text-foreground">
              {plural(words.length, 'word', 'words')}
              <span className="ml-2 font-normal text-muted-foreground">
                Tap a word to take it out.
              </span>
            </div>
            <ul
              className="mt-3 flex flex-wrap gap-2"
              data-testid="custom-chips"
            >
              {words.map((w) => (
                <li key={normaliseWord(w.word)}>
                  <button
                    type="button"
                    onClick={() => removeWord(w.word)}
                    aria-label={'Remove ' + w.word}
                    title={w.exampleSentence || undefined}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {w.word}
                    <X className="h-3 w-3 opacity-60" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {text.trim()
              ? 'No words found yet.'
              : 'Your words will appear here, one tile each, so you can check them.'}
          </p>
        )}

        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {parsed.duplicates > 0 && (
            <li>
              Left out{' '}
              {plural(parsed.duplicates, 'repeated word', 'repeated words')}.
            </li>
          )}
          {overCap > 0 && (
            <li className="text-warning" data-testid="custom-over-cap">
              A lesson holds up to {MAX_WORDS} words, so the last{' '}
              {plural(overCap, 'word was', 'words were')} left off. Make a
              second lesson for them.
            </li>
          )}
          {parsed.ignored.length > 0 && (
            <li data-testid="custom-ignored">
              Skipped, because{' '}
              {parsed.ignored.length === 1
                ? "it doesn't look"
                : "they don't look"}{' '}
              like a word: {parsed.ignored.map((s) => '“' + s + '”').join(', ')}
              .
            </li>
          )}
          {removedWords.length > 0 && (
            <li>
              Taken out:{' '}
              {removedWords.map((w, i) => (
                <span key={normaliseWord(w.word)}>
                  {i > 0 && ', '}
                  {w.word}{' '}
                  <button
                    type="button"
                    onClick={() => putBack(w.word)}
                    className="underline underline-offset-2 hover:text-primary"
                    aria-label={'Put back ' + w.word}
                  >
                    put back
                  </button>
                </span>
              ))}
            </li>
          )}
        </ul>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="custom-name"
            className="block text-sm font-semibold text-foreground"
          >
            Lesson name
          </label>
          <input
            id="custom-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder={DEFAULT_NAME}
            className={field}
            data-testid="custom-name-input"
          />
        </div>
        <div>
          <label
            htmlFor="custom-year"
            className="block text-sm font-semibold text-foreground"
          >
            Word search style
          </label>
          <select
            id="custom-year"
            value={yearHint}
            onChange={(e) => setYearHint(e.target.value)}
            className={field}
            aria-describedby="custom-year-help"
            data-testid="custom-year-select"
          >
            <option value="">Standard (10 by 10, across and down)</option>
            {years.map((y) => (
              <option key={y.slug} value={y.slug}>
                Like {y.label}
              </option>
            ))}
          </select>
          <p
            id="custom-year-help"
            className="mt-2 text-xs text-muted-foreground"
          >
            Sets the grid size and whether words can run diagonally or
            backwards, as in that year's own word searches.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="custom-series"
            className="block text-sm font-semibold text-foreground"
          >
            Put it in a series
          </label>
          <select
            id="custom-series"
            value={seriesChoice}
            onChange={(e) => setSeriesChoice(e.target.value)}
            className={field}
            aria-describedby="custom-series-help"
            data-testid="custom-series-select"
          >
            <option value="">{CUSTOM_LESSONS_NAME} (no series)</option>
            {allSeries.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={NEW_SERIES}>New series…</option>
          </select>
          <p
            id="custom-series-help"
            className="mt-2 text-xs text-muted-foreground"
          >
            A series keeps lessons together, like “Child 1, Year 1”.
          </p>
        </div>
        {seriesChoice === NEW_SERIES && (
          <div>
            <label
              htmlFor="custom-new-series"
              className="block text-sm font-semibold text-foreground"
            >
              Series name
            </label>
            <input
              id="custom-new-series"
              type="text"
              value={newSeriesName}
              maxLength={MAX_SERIES_NAME}
              onChange={(e) => setNewSeriesName(e.target.value)}
              placeholder="Child 1, Year 1"
              className={field}
              data-testid="custom-new-series"
            />
          </div>
        )}
      </div>

      <label className="mt-5 flex items-start gap-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={fillMeanings}
          onChange={(e) => setFillMeanings(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
          data-testid="custom-fill-meanings"
        />
        <span>
          Add meanings and sentences where we have them
          <span className="block text-xs text-muted-foreground">
            For words that are in our year lists. This switches on "Guess from
            the meaning" and fills the printed sheets.
          </span>
        </span>
      </label>

      {listFull && (
        <p className="mt-5 text-sm text-warning" role="status">
          You have {MAX_LISTS} lists already, which is the most this browser
          keeps. Delete one below to make room.
        </p>
      )}
      {seriesFull && (
        <p className="mt-5 text-sm text-warning" role="status">
          You have {MAX_SERIES} series already. Pick one of them, or delete one
          first.
        </p>
      )}
      {error && (
        <p
          className="mt-5 text-sm text-destructive"
          role="alert"
          data-testid="custom-save-error"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!words.length || listFull || seriesFull || saving}
          className={buttonPrimary}
          data-testid="custom-save"
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Save and open lesson'}
        </button>
        {editing && (
          <Link
            to={'/custom/' + editing.id}
            className={buttonQuiet}
            data-testid="custom-cancel-edit"
          >
            Cancel
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Saved lists ────────────────────────────────────────────────────────

function SavedLists({ lists, allSeries, onDelete }) {
  const [confirming, setConfirming] = useState(null);

  if (!lists.length) return null;

  // Series first, then the lessons that are in no series.
  const groups = [
    ...allSeries
      .map((series) => ({
        key: series.id,
        title: series.name,
        to: '/series/' + series.id,
        isSeries: true,
        items: seriesLessons(series, lists),
      }))
      .filter((g) => g.items.length > 0),
    {
      key: 'custom',
      title: CUSTOM_LESSONS_NAME,
      to: '/series/custom',
      isSeries: false,
      items: orphanLessons(allSeries, lists),
    },
  ].filter((g) => g.items.length > 0);

  const row = (list) => (
    <li
      key={list.id}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
      data-testid={'custom-saved-' + list.id}
    >
      <Link
        to={'/custom/' + list.id}
        className="group flex min-w-[10rem] flex-1 items-center gap-2 text-foreground"
      >
        <span>
          <span className="block font-semibold group-hover:text-primary">
            {list.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {plural(list.words.length, 'word', 'words')}
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </Link>
      {confirming === list.id ? (
        <span
          className="flex flex-wrap items-center gap-2 text-sm"
          role="alertdialog"
          aria-label={'Delete ' + list.name}
        >
          <span className="text-muted-foreground">
            Delete it and its progress?
          </span>
          <button
            type="button"
            onClick={() => {
              setConfirming(null);
              onDelete(list);
            }}
            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
            data-testid={'custom-confirm-delete-' + list.id}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className={buttonQuiet}
          >
            Keep
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Link
            to={'/custom?edit=' + list.id}
            className={buttonQuiet}
            aria-label={'Edit ' + list.name}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(list.id)}
            className={buttonQuiet}
            aria-label={'Delete ' + list.name}
            data-testid={'custom-delete-' + list.id}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
          </button>
        </span>
      )}
    </li>
  );

  return (
    <div className={card} data-testid="custom-saved-lists">
      <h2 className="type-card font-display text-xl font-bold text-foreground">
        Your lessons
      </h2>
      <p className="mt-1 type-body text-xs text-muted-foreground">
        Kept in this browser, grouped by series. Back them up with your
        progress on the save page.
      </p>
      {groups.map((group) => (
        <section key={group.key} className="mt-5" data-testid={'custom-group-' + group.key}>
          <h3 className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <Link to={group.to} className="hover:text-primary">
              {group.isSeries ? 'Series · ' : ''}
              {group.title}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{plural(group.items.length, 'lesson', 'lessons')}</span>
          </h3>
          <ul className="mt-1 divide-y divide-foreground/10">
            {group.items.map(row)}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function CustomListsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { yearsConfig } = useYearsConfig();
  const [lists, setLists] = useState(readLists);
  const [allSeries] = useState(readSeries);

  const editId = params.get('edit');
  const editing = editId ? lists.find((l) => l.id === editId) || null : null;

  const handleDelete = (list) => {
    deleteList(window.localStorage, list.id);
    setLists(readLists());
    if (editId === list.id) navigate('/custom', { replace: true });
  };

  return (
    <InfoPage
      path="/custom"
      title="Make your own lesson"
      description="Paste this week's spellings and get a practice quiz, a word search and print sheets for exactly those words. Free, no sign-up, and nothing leaves your device."
      eyebrow="Your words, your lesson"
      heading="Make your own lesson"
      intro="Paste this week's spellings from school, a child's tricky words or a topic. You get a practice quiz, a word search and print sheets for exactly those words. No sign-up, and the list stays on this device."
    >
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <BackupBar />
          <p className="type-body text-sm text-muted-foreground" data-testid="custom-build-hint">
            Want words for a spelling rule instead, like /ee/ or -le endings?{' '}
            <Link to="/rules" className="underline underline-offset-2 hover:text-primary">
              Search by spelling rule
            </Link>
          </p>
          {editId && !editing && (
            <p
              className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-muted-foreground"
              role="status"
              data-testid="custom-edit-missing"
            >
              We couldn't find that lesson on this device, so you can start a new
              one here.
            </p>
          )}
          <ListEditor
            key={editing ? editing.id : 'new'}
            editing={editing}
            lists={lists}
            allSeries={allSeries}
            initialSeries={params.get('series')}
            years={yearsConfig ? yearsConfig.years : []}
            onSaved={(list) => navigate('/custom/' + list.id)}
          />
          <SavedLists lists={lists} allSeries={allSeries} onDelete={handleDelete} />
          <p className="type-body text-xs text-muted-foreground">
            Good to know: lessons are stored in this browser, and browsers can
            clear stored data. The save page includes your lessons in a backup
            file, link or QR code, so you can keep a copy or open them on
            another device.{' '}
            <Link
              to="/sync"
              className="underline underline-offset-2 hover:text-primary"
            >
              Save or move progress
            </Link>
          </p>
        </div>
      </section>
    </InfoPage>
  );
}
