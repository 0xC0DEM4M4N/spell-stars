// /series and /series/:seriesId — named groups of lessons, such as
// "Child 1, Year 1". A lesson is a custom list (lib/customLists.js); a series
// only remembers which lessons belong together and in what order. Deleting a
// series never deletes its lessons.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { InfoPage } from '@/components/InfoPage';
import { BackupBar } from '@/components/BackupBar';
import { loadLists } from '@/lib/customLists';
import {
  MAX_SERIES,
  MAX_SERIES_LESSONS,
  MAX_SERIES_NAME,
  SERIES_ID_RE,
  CUSTOM_LESSONS_NAME,
  CUSTOM_LESSONS_PATH,
  addListToSeries,
  createSeries,
  deleteSeries,
  getSeries,
  loadSeries,
  moveLesson,
  orphanLessons,
  removeListFromSeries,
  seriesLessons,
  upsertSeries,
} from '@/lib/series';

const buttonPrimary =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet =
  'inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40';
const card = 'holo-card relative rounded-2xl p-5 sm:p-6';
const field =
  'mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const readLists = () => {
  try {
    return loadLists(window.localStorage);
  } catch (err) {
    return [];
  }
};
const readAllSeries = () => {
  try {
    return loadSeries(window.localStorage);
  } catch (err) {
    return [];
  }
};

// ── /series ────────────────────────────────────────────────────────────

export function SeriesIndexPage() {
  const navigate = useNavigate();
  const [all, setAll] = useState(readAllSeries);
  const [lists] = useState(readLists);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const full = all.length >= MAX_SERIES;
  const orphans = orphanLessons(all, lists);

  function create(e) {
    e.preventDefault();
    if (!name.trim() || full) return;
    const series = createSeries({ name, existingIds: all.map((s) => s.id) });
    const out = upsertSeries(window.localStorage, series);
    if (!out.ok) return setError(out.error);
    navigate('/series/' + series.id);
  }

  return (
    <InfoPage
      path="/series"
      title="Your series"
      description="Keep spelling lessons together in a named series, such as one for each child and year."
      eyebrow="Your lessons"
      heading="Your series"
      intro="A series keeps lessons together, for example one per child and year group. Make a lesson from spelling rules, then file it in a series."
    >
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <BackupBar />
          {(all.length > 0 || orphans.length > 0) && (
            <div className={card} data-testid="series-list">
              <ul className="divide-y divide-foreground/10">
                {all.map((s) => {
                  const count = seriesLessons(s, lists).length;
                  return (
                    <li key={s.id}>
                      <Link to={'/series/' + s.id} className="group flex items-center gap-3 py-3 text-foreground" data-testid={'series-link-' + s.id}>
                        <span className="flex-1">
                          <span className="block font-semibold group-hover:text-primary">{s.name}</span>
                          <span className="block text-xs text-muted-foreground">{plural(count, 'lesson', 'lessons')}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
                {orphans.length > 0 && (
                  <li>
                    <Link to={CUSTOM_LESSONS_PATH} className="group flex items-center gap-3 py-3 text-foreground" data-testid="series-link-custom">
                      <span className="flex-1">
                        <span className="block font-semibold group-hover:text-primary">{CUSTOM_LESSONS_NAME}</span>
                        <span className="block text-xs text-muted-foreground">{plural(orphans.length, 'lesson', 'lessons')} not in a series</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          <form onSubmit={create} className={card} data-testid="series-create">
            <h2 className="type-card font-display text-xl font-bold text-foreground">Start a series</h2>
            <label htmlFor="series-name" className="mt-4 block text-sm font-semibold text-foreground">Series name</label>
            <input id="series-name" type="text" value={name} maxLength={MAX_SERIES_NAME} onChange={(e) => setName(e.target.value)} placeholder="Child 1, Year 1" className={field} data-testid="series-name" />
            {full && <p className="mt-3 text-sm text-warning" role="status">You have {MAX_SERIES} series, the most this browser keeps. Delete one to make room.</p>}
            {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!name.trim() || full} className={buttonPrimary}>Create series</button>
              <Link to="/make" className={buttonQuiet}>Make a lesson from spelling rules</Link>
            </div>
          </form>

          <p className="type-body text-xs text-muted-foreground">
            Series are kept in this browser and included in a backup on the{' '}
            <Link to="/sync" className="underline underline-offset-2 hover:text-primary">save page</Link>.
          </p>
        </div>
      </section>
    </InfoPage>
  );
}

// ── /series/:seriesId ──────────────────────────────────────────────────

function SeriesDetail({ seriesId }) {
  const navigate = useNavigate();
  const [series, setSeries] = useState(() => {
    if (!SERIES_ID_RE.test(seriesId || '')) return null;
    try {
      return getSeries(window.localStorage, seriesId);
    } catch (err) {
      return null;
    }
  });
  const [lists] = useState(readLists);
  const [renaming, setRenaming] = useState(series ? series.name : '');
  const [pick, setPick] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  if (!series) {
    return (
      <InfoPage
        path="/series"
        title="Series not found"
        description="This series isn't on this device."
        eyebrow="Your lessons"
        heading="We can't find that series"
        intro="Series are kept in the browser they were made in. If you made it on another device, restore a backup here, or start a new one."
      >
        <section className="px-5 pb-10 sm:px-8">
          <div className="mx-auto flex max-w-3xl flex-wrap gap-3">
            <Link to="/series" className={buttonPrimary}>Your series</Link>
            <Link to="/sync" className={buttonQuiet}>Restore a backup</Link>
          </div>
        </section>
      </InfoPage>
    );
  }

  const lessons = seriesLessons(series, lists);
  const inSeries = new Set(series.listIds);
  const available = lists.filter((l) => !inSeries.has(l.id));
  const full = lessons.length >= MAX_SERIES_LESSONS;

  const refresh = () => setSeries(getSeries(window.localStorage, series.id));
  const apply = (out) => {
    if (!out.ok) return setError(out.error);
    setError('');
    refresh();
  };
  // Saving also drops ids of lessons that are gone.
  const save = (next) => apply(upsertSeries(window.localStorage, { ...next, listIds: next.listIds.filter((id) => lists.some((l) => l.id === id)), updatedAt: new Date().toISOString() }));

  const rename = (e) => {
    e.preventDefault();
    if (!renaming.trim()) return;
    save({ ...series, name: renaming.trim().slice(0, MAX_SERIES_NAME) });
  };

  return (
    <InfoPage
      path="/series"
      title={series.name}
      description="A series of spelling lessons."
      eyebrow="Series"
      heading={series.name}
      intro={plural(lessons.length, 'lesson', 'lessons') + ' in this series. Open one to practise, play or print it.'}
    >
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <BackupBar />
          <div className={card} data-testid="series-lessons">
            <h2 className="type-card font-display text-xl font-bold text-foreground">Lessons</h2>
            {lessons.length === 0 ? (
              <p className="mt-2 type-body text-sm text-muted-foreground">No lessons yet. Make one from spelling rules, or add one you already have.</p>
            ) : (
              <ol className="mt-3 divide-y divide-foreground/10">
                {lessons.map((l, i) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <span className="w-6 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                    <Link to={'/custom/' + l.id} className="group min-w-[8rem] flex-1 text-foreground">
                      <span className="block font-semibold group-hover:text-primary">{l.name}</span>
                      <span className="block text-xs text-muted-foreground">{plural(l.words.length, 'word', 'words')}</span>
                    </Link>
                    <span className="flex items-center gap-1.5">
                      <button type="button" className={buttonQuiet} disabled={i === 0} onClick={() => save(moveLesson({ ...series, listIds: lessons.map((x) => x.id) }, l.id, -1))} aria-label={'Move ' + l.name + ' up'}>
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" className={buttonQuiet} disabled={i === lessons.length - 1} onClick={() => save(moveLesson({ ...series, listIds: lessons.map((x) => x.id) }, l.id, 1))} aria-label={'Move ' + l.name + ' down'}>
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" className={buttonQuiet} onClick={() => apply(removeListFromSeries(window.localStorage, series.id, l.id))} aria-label={'Take ' + l.name + ' out of the series'}>
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <Link to={'/make?series=' + series.id} className={buttonPrimary} data-testid="series-new-lesson">
                <Plus className="mr-1 inline h-4 w-4" aria-hidden="true" /> New lesson from spelling rules
              </Link>
            </div>

            {available.length > 0 && !full && (
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor="series-add" className="block text-sm font-semibold text-foreground">Add a lesson you already have</label>
                  <select id="series-add" value={pick} onChange={(e) => setPick(e.target.value)} className={field} data-testid="series-add">
                    <option value="">Choose a lesson…</option>
                    {available.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <button type="button" disabled={!pick} className={buttonQuiet} onClick={() => { apply(addListToSeries(window.localStorage, series.id, pick)); setPick(''); }}>
                  Add
                </button>
              </div>
            )}
            {full && <p className="mt-4 text-sm text-warning" role="status">A series holds up to {MAX_SERIES_LESSONS} lessons.</p>}
            {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
          </div>

          <form onSubmit={rename} className={card}>
            <label htmlFor="series-rename" className="block text-sm font-semibold text-foreground">Series name</label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <input id="series-rename" type="text" value={renaming} maxLength={MAX_SERIES_NAME} onChange={(e) => setRenaming(e.target.value)} className={field + ' flex-1'} data-testid="series-rename" />
              <button type="submit" disabled={!renaming.trim() || renaming.trim() === series.name} className={buttonQuiet + ' mt-2'}>Rename</button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/series" className={buttonQuiet}>All series</Link>
            {confirming ? (
              <span className="flex flex-wrap items-center gap-2 text-sm" role="alertdialog" aria-label={'Delete ' + series.name}>
                <span className="text-muted-foreground">Delete this series? The lessons are kept.</span>
                <button type="button" className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90" onClick={() => { deleteSeries(window.localStorage, series.id); navigate('/series'); }} data-testid="series-confirm-delete">
                  Delete series
                </button>
                <button type="button" className={buttonQuiet} onClick={() => setConfirming(false)}>Keep</button>
              </span>
            ) : (
              <button type="button" className={buttonQuiet} onClick={() => setConfirming(true)} data-testid="series-delete">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete series
              </button>
            )}
          </div>
        </div>
      </section>
    </InfoPage>
  );
}

// /series/custom — every lesson that is in no series.
function CustomLessons() {
  const [all, setAll] = useState(readAllSeries);
  const [lists] = useState(readLists);
  const [error, setError] = useState('');
  const orphans = orphanLessons(all, lists);

  const file = (listId, seriesId) => {
    if (!seriesId) return;
    const out = addListToSeries(window.localStorage, seriesId, listId);
    if (!out.ok) return setError(out.error);
    setError('');
    setAll(readAllSeries());
  };

  return (
    <InfoPage
      path="/series"
      title={CUSTOM_LESSONS_NAME}
      description="Spelling lessons that are not in a series."
      eyebrow="Your lessons"
      heading={CUSTOM_LESSONS_NAME}
      intro={'Lessons that are not in a series live here. ' + plural(orphans.length, 'lesson', 'lessons') + '. File one in a series to keep it with the others.'}
    >
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <BackupBar />
          <div className={card} data-testid="custom-lessons">
            {orphans.length === 0 ? (
              <p className="type-body text-sm text-muted-foreground">Every lesson is in a series. New lessons that you don't file will appear here.</p>
            ) : (
              <ul className="divide-y divide-foreground/10">
                {orphans.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <Link to={'/custom/' + l.id} className="group min-w-[8rem] flex-1 text-foreground">
                      <span className="block font-semibold group-hover:text-primary">{l.name}</span>
                      <span className="block text-xs text-muted-foreground">{plural(l.words.length, 'word', 'words')}</span>
                    </Link>
                    {all.length > 0 && (
                      <span>
                        <label htmlFor={'file-' + l.id} className="sr-only">Put {l.name} in a series</label>
                        <select id={'file-' + l.id} value="" onChange={(e) => file(l.id, e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="">Put in a series…</option>
                          {all.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/make" className={buttonPrimary}>
                <Plus className="mr-1 inline h-4 w-4" aria-hidden="true" /> New lesson from spelling rules
              </Link>
              <Link to="/series" className={buttonQuiet}>All series</Link>
            </div>
          </div>
        </div>
      </section>
    </InfoPage>
  );
}

export function SeriesPage() {
  const { seriesId } = useParams();
  return seriesId === 'custom' ? <CustomLessons /> : <SeriesDetail seriesId={seriesId} key={seriesId} />;
}

export default SeriesPage;
