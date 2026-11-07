// /rules — every spelling rule in one place. Filter them, pick the ones you
// want, build a lesson from them, and (optionally) file it in a series.
//
// A lesson is an ordinary custom list, so it gets practice, word search,
// crossword and print sheets. A series (lib/series.js) groups lessons, e.g.
// "Child 1, Year 1". The matching and mixing live in lib/ruleSearch.js.
//
//   /rules?q=-le       opens with a filter typed in
//   /rules?series=ID   the lesson will be filed in that series
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Plus, Search, Shuffle, X } from 'lucide-react';
import { InfoPage } from '@/components/InfoPage';
import { BackupBar } from '@/components/BackupBar';
import { getYearsConfig, getYearWords } from '@/lib/yearData';
import { MAX_LISTS, MAX_NAME_LENGTH, MAX_TEXT_LENGTH, MAX_WORDS, createList, loadLists, parseWordList, upsertList } from '@/lib/customLists';
import { normaliseWord } from '@/lib/wordKey';
import {
  MAX_SERIES,
  MAX_SERIES_NAME,
  addListToSeries,
  createSeries,
  loadSeries,
  upsertSeries,
} from '@/lib/series';
import {
  describeRule,
  flattenYears,
  focusFits,
  listLearningPoints,
  mixRules,
  parseRuleQuery,
  ruleKey,
  ruleLabel,
  searchRules,
  suggestName,
  toListWords,
  wordsForRule,
} from '@/lib/ruleSearch';

const buttonPrimary =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet =
  'inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const card = 'holo-card relative rounded-2xl p-5 sm:p-6';
const field =
  'mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const COUNTS = [5, 10, 15, 20, 30, 50];
const EXAMPLES = ['/ee/', '-le ending', 'kn-', '-ous', 'wr at the start', 'suffix'];
const NO_ENTRIES = [];
const NEW_SERIES = '__new__';

const weeksText = (weeks) => (!weeks.length ? '' : (weeks.length === 1 ? 'Week ' : 'Weeks ') + weeks.join(', '));

function chip(on) {
  return (
    'rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
    (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted/30 text-foreground hover:border-primary/50')
  );
}

/** Words as tiles you can tap to pick for the lesson. */
function PickChips({ words, picked, onToggle, yearLabel, testId }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2" data-testid={testId}>
      {words.map((w) => {
        const on = picked.has(w.key);
        return (
          <li key={w.key}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(w)}
              title={w.years.map((s) => yearLabel[s] || s).join(', ')}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                (on ? 'border-primary bg-primary/20 text-foreground' : 'border-primary/30 bg-background text-foreground hover:border-primary hover:bg-primary/10')
              }
            >
              {on && <Check className="h-3 w-3 text-primary" aria-hidden="true" />}
              {w.word}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The words of one learning point, shown when its row is opened. */
function PointWords({ rule, entries, years, picked, onToggle, yearLabel }) {
  const words = useMemo(() => wordsForRule(rule, entries, { years }), [rule, entries, years]);
  return <PickChips words={words} picked={picked} onToggle={onToggle} yearLabel={yearLabel} testId="rule-point-words" />;
}

const safe = (read) => {
  try {
    return read(window.localStorage);
  } catch (err) {
    return [];
  }
};

export default function RulesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lessonRef = useRef(null);

  const [data, setData] = useState({ status: 'loading' });
  const [query, setQuery] = useState(() => params.get('q') || '');
  const [years, setYears] = useState([]); // empty = every year
  const [rules, setRules] = useState([]);
  const [total, setTotal] = useState(10);
  const [mustFitAll, setMustFitAll] = useState(false);
  const [seed, setSeed] = useState(1);
  const [removed, setRemoved] = useState(() => new Set());
  const [picked, setPicked] = useState([]); // words chosen one by one
  const [showAllWords, setShowAllWords] = useState(false);
  const [ownText, setOwnText] = useState(''); // words typed or pasted in
  const [ownRemoved, setOwnRemoved] = useState(() => new Set());
  const [name, setName] = useState('');
  const [allSeries] = useState(() => safe(loadSeries));
  const [seriesChoice, setSeriesChoice] = useState(() => {
    const wanted = params.get('series');
    return allSeries.some((s) => s.id === wanted) ? wanted : '';
  });
  const [newSeriesName, setNewSeriesName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getYearsConfig()
      .then(async (config) => {
        const lists = await Promise.all(config.years.map((y) => getYearWords(y.slug, y.wordListPath)));
        const byYear = Object.fromEntries(config.years.map((y, i) => [y.slug, lists[i]]));
        if (!cancelled) setData({ status: 'ready', config, entries: flattenYears(byYear, config.years.map((y) => y.slug)) });
      })
      .catch(() => !cancelled && setData({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = data.entries || NO_ENTRIES;
  const yearLabel = useMemo(
    () => Object.fromEntries(((data.config && data.config.years) || []).map((y) => [y.slug, y.label])),
    [data.config],
  );
  const yearOrder = useMemo(() => ((data.config && data.config.years) || []).map((y) => y.slug), [data.config]);
  const toggleYear = (slug) => setYears((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  // ── What the filter shows ────────────────────────────────────────────
  const pool = useMemo(() => (years.length ? entries.filter((e) => years.includes(e.yearSlug)) : entries), [entries, years]);
  const allPoints = useMemo(() => listLearningPoints(pool), [pool]);
  const parsed = useMemo(() => parseRuleQuery(query), [query]);
  const found = useMemo(() => (parsed ? searchRules(parsed, entries, { years }) : null), [parsed, entries, years]);
  const visiblePoints = useMemo(
    () => (parsed ? allPoints.filter((p) => focusFits(parsed, p.focus)) : allPoints),
    [parsed, allPoints],
  );
  const grouped = useMemo(
    () =>
      yearOrder
        .map((slug) => ({ slug, points: visiblePoints.filter((p) => p.year === slug) }))
        .filter((g) => g.points.length),
    [yearOrder, visiblePoints],
  );

  const hasRule = (rule) => rules.some((r) => ruleKey(r) === ruleKey(rule));
  const addRule = (rule) => {
    if (!rule || hasRule(rule)) return;
    setRules((prev) => [...prev, rule]);
    setRemoved(new Set());
  };
  const removeRule = (rule) => {
    setRules((prev) => prev.filter((r) => ruleKey(r) !== ruleKey(rule)));
    setRemoved(new Set());
  };

  // ── The lesson ───────────────────────────────────────────────────────
  // Words picked by hand always come first; the rules fill the rest of the count.
  // Words typed in by hand come first. A word that is in our year lists gets
  // its meaning and sentence from there, unless a sentence was typed.
  const known = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const key = normaliseWord(e.word);
      const have = map.get(key);
      if (!have) map.set(key, { definition: e.definition || '', exampleSentence: e.exampleSentence || '' });
      else {
        if (!have.definition && e.definition) have.definition = e.definition;
        if (!have.exampleSentence && e.exampleSentence) have.exampleSentence = e.exampleSentence;
      }
    }
    return map;
  }, [entries]);
  const ownParsed = useMemo(() => parseWordList(ownText, { max: MAX_TEXT_LENGTH }), [ownText]);
  const ownWords = useMemo(
    () =>
      ownParsed.words
        .map((w) => {
          const key = normaliseWord(w.word);
          const hit = known.get(key);
          return {
            word: w.word,
            key,
            years: [],
            definition: (hit && hit.definition) || '',
            exampleSentence: w.exampleSentence || (hit && hit.exampleSentence) || '',
            rules: ['typed'],
            byHand: true,
            own: true,
          };
        })
        .filter((w) => !ownRemoved.has(w.key)),
    [ownParsed, known, ownRemoved],
  );
  const ownKeys = useMemo(() => new Set(ownWords.map((w) => w.key)), [ownWords]);
  const handPicked = useMemo(() => picked.filter((w) => !ownKeys.has(w.key)), [picked, ownKeys]);

  // Words picked by hand always come first; the rules fill the rest of the count.
  const pickedKeys = useMemo(() => new Set(picked.map((w) => w.key)), [picked]);
  const togglePick = (w) => {
    setError('');
    if (pickedKeys.has(w.key)) return setPicked((prev) => prev.filter((x) => x.key !== w.key));
    if (picked.length + ownWords.length >= MAX_WORDS) return setError('A lesson holds up to ' + MAX_WORDS + ' words.');
    setPicked((prev) => [...prev, w]);
  };
  const byHandCount = ownWords.length + handPicked.length;
  const fill = Math.max(0, Math.min(total, MAX_WORDS) - byHandCount);
  const mix = useMemo(
    () => mixRules(rules, entries, { total: fill, years, seed, mustFitAll, exclude: [...pickedKeys, ...ownKeys] }),
    [rules, entries, fill, years, seed, mustFitAll, pickedKeys, ownKeys],
  );
  const words = [
    ...ownWords,
    ...handPicked.map((w) => ({ ...w, rules: ['picked'], byHand: true })),
    ...mix.words.filter((w) => !removed.has(w.key)),
  ].slice(0, MAX_WORDS);
  const hasLesson = rules.length > 0 || picked.length > 0 || ownWords.length > 0;
  const listFull = safe(loadLists).length >= MAX_LISTS;
  const seriesFull = seriesChoice === NEW_SERIES && allSeries.length >= MAX_SERIES;

  function save() {
    if (!words.length || listFull || seriesFull) return;
    const lists = safe(loadLists);
    const list = createList({
      name: (name.trim() || (rules.length ? suggestName(rules) : 'My chosen words')).slice(0, MAX_NAME_LENGTH),
      yearHint: years.length === 1 ? years[0] : null,
      words: toListWords(words),
      existingIds: lists.map((l) => l.id),
    });
    const out = upsertList(window.localStorage, list);
    if (!out.ok) return setError(out.error);

    if (seriesChoice === NEW_SERIES) {
      const series = createSeries({ name: newSeriesName, listIds: [list.id], existingIds: allSeries.map((s) => s.id) });
      const made = upsertSeries(window.localStorage, series);
      if (!made.ok) return setError(made.error);
    } else if (seriesChoice) {
      const added = addListToSeries(window.localStorage, seriesChoice, list.id);
      if (!added.ok) return setError(added.error);
    }
    navigate('/custom/' + list.id);
  }

  const showLesson = () => lessonRef.current && lessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const filtering = !!parsed;

  return (
    <InfoPage
      path="/rules"
      title="Search by spelling rule"
      description="Every spelling rule from Reception to Year 6 in one place. Filter them, build a lesson from the rules you choose, and group lessons into a series."
      eyebrow="Spelling rules"
      heading="Search by spelling rule"
      intro="Every spelling rule across the year groups, in one list. Filter by pattern, like /ee/ or -le ending, or by topic. Pick the rules you want, build a lesson, and keep your lessons together in a series."
    >
      <section className={'px-5 sm:px-8 ' + (hasLesson ? 'pb-28' : 'pb-10')}>
        <div className="mx-auto max-w-3xl space-y-6">
          <BackupBar />
          {/* ── The lesson being built ─────────────────────────── */}
          <div ref={lessonRef} className={card + ' scroll-mt-24'} data-testid="rule-session">
            <h2 className="type-card font-display text-xl font-bold text-foreground">Your lesson</h2>

            {!hasLesson ? (
              <p className="mt-2 type-body text-sm text-muted-foreground">
                Add one or more rules from the list below, tap individual words to choose them, or type your own words in the box under the filter. Rules are mixed into one set of words, taking turns so each rule gets a share.
              </p>
            ) : (
              <>
                {rules.length > 0 && <ul className="mt-4 space-y-2" data-testid="rule-chips">
                  {rules.map((rule) => {
                    const info = mix.perRule.find((p) => ruleKey(p.rule) === ruleKey(rule));
                    return (
                      <li key={ruleKey(rule)} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                        <span className="font-mono text-sm font-semibold text-primary">{ruleLabel(rule)}</span>
                        <span className="flex-1 text-xs text-muted-foreground">
                          {rule.kind === 'point' ? (yearLabel[rule.year] || rule.year) + ' · ' : ''}
                          {info ? info.taken + ' of ' + info.available + ' words used' : ''}
                        </span>
                        <button type="button" onClick={() => removeRule(rule)} aria-label={'Remove ' + ruleLabel(rule)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>}

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {rules.length > 0 && <div>
                    <label htmlFor="rule-total" className="block text-sm font-semibold text-foreground">How many words</label>
                    <select id="rule-total" value={total} onChange={(e) => setTotal(Number(e.target.value))} className={field} data-testid="rule-total">
                      {COUNTS.filter((n) => n <= MAX_WORDS).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>}
                  <div>
                    <label htmlFor="rule-name" className="block text-sm font-semibold text-foreground">Lesson name</label>
                    <input id="rule-name" type="text" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => setName(e.target.value)} placeholder={rules.length ? suggestName(rules) : 'My chosen words'} className={field} data-testid="rule-name" />
                  </div>
                </div>

                {rules.length > 1 && (
                  <label className="mt-4 flex items-start gap-2.5 text-sm text-foreground">
                    <input type="checkbox" checked={mustFitAll} onChange={(e) => setMustFitAll(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" data-testid="rule-all" />
                    <span>
                      Words must fit every rule
                      <span className="block text-xs text-muted-foreground">Instead of mixing, keep only words that fit all of them, like -le words with a double letter.</span>
                    </span>
                  </label>
                )}

                <div className="mt-5" aria-live="polite">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm font-semibold text-foreground">
                      {plural(words.length, 'word', 'words')}
                      <span className="ml-2 font-normal text-muted-foreground">Tap a word to take it out.</span>
                    </div>
                    {rules.length > 0 && (
                      <button type="button" onClick={() => { setSeed((s) => s + 1); setRemoved(new Set()); }} className={buttonQuiet} data-testid="rule-shuffle">
                        <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Pick different words
                      </button>
                    )}
                    {picked.length > 0 && (
                      <button type="button" onClick={() => setPicked([])} className={buttonQuiet} data-testid="rule-clear-picked">
                        Clear my {plural(picked.length, 'chosen word', 'chosen words')}
                      </button>
                    )}
                  </div>
                  {words.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2" data-testid="rule-session-words">
                      {words.map((w) => (
                        <li key={w.key}>
                          <button type="button" onClick={() => (w.own ? setOwnRemoved((prev) => new Set(prev).add(w.key)) : w.byHand ? togglePick(w) : setRemoved((prev) => new Set(prev).add(w.key)))} aria-label={'Remove ' + w.word} title={w.own ? 'Typed by you' : w.byHand ? 'Chosen by you' : w.rules.join(', ')} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {w.word}
                            <X className="h-3 w-3 opacity-60" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No words fit all of these rules in the chosen years. Try fewer rules or more years, or tap words to choose them.</p>
                  )}
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="rule-series" className="block text-sm font-semibold text-foreground">Put it in a series</label>
                    <select id="rule-series" value={seriesChoice} onChange={(e) => setSeriesChoice(e.target.value)} className={field} data-testid="rule-series">
                      <option value="">Custom lessons (no series)</option>
                      {allSeries.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value={NEW_SERIES}>New series…</option>
                    </select>
                  </div>
                  {seriesChoice === NEW_SERIES && (
                    <div>
                      <label htmlFor="rule-new-series" className="block text-sm font-semibold text-foreground">Series name</label>
                      <input id="rule-new-series" type="text" value={newSeriesName} maxLength={MAX_SERIES_NAME} onChange={(e) => setNewSeriesName(e.target.value)} placeholder="Child 1, Year 1" className={field} data-testid="rule-new-series" />
                    </div>
                  )}
                </div>

                {listFull && <p className="mt-4 text-sm text-warning" role="status">You have {MAX_LISTS} lessons already. Delete one on the lessons page to make room.</p>}
                {seriesFull && <p className="mt-4 text-sm text-warning" role="status">You have {MAX_SERIES} series already. Pick one of them, or delete one first.</p>}
                {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={save} disabled={!words.length || listFull || seriesFull} className={buttonPrimary} data-testid="rule-save">
                    Create lesson
                  </button>
                  <span className="text-xs text-muted-foreground">Opens practice, word search, crossword and print.</span>
                </div>
              </>
            )}
          </div>

          {/* ── Filter + all the rules ─────────────────────────── */}
          <div className={card} data-testid="rule-search-card">
            <label htmlFor="rule-query" className="block text-sm font-semibold text-foreground">
              Filter the rules
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-[1.4rem] h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="rule-query"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="/ee/   -le ending   kn-   suffix"
                className={field + ' pl-9 font-mono'}
                aria-describedby="rule-query-help"
                data-testid="rule-query"
              />
            </div>
            <p id="rule-query-help" className="mt-2 text-xs text-muted-foreground">
              <span className="font-mono">/ee/</span> finds words with ee anywhere, <span className="font-mono">-le</span> words that end in
              le, <span className="font-mono">kn-</span> words that start with kn. Other words filter the rules by topic.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setQuery(ex)} className="rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">
                  {ex}
                </button>
              ))}
              {filtering && (
                <button type="button" onClick={() => setQuery('')} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">
                  Clear filter
                </button>
              )}
            </div>

            {data.status === 'ready' && (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-foreground">Years</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="group">
                  <button type="button" aria-pressed={!years.length} onClick={() => setYears([])} className={chip(!years.length)}>
                    All years
                  </button>
                  {data.config.years.map((y) => (
                    <button key={y.slug} type="button" aria-pressed={years.includes(y.slug)} onClick={() => toggleYear(y.slug)} className={chip(years.includes(y.slug))}>
                      {y.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-6" aria-live="polite" data-testid="rule-results">
              {data.status === 'loading' && <p className="text-sm text-muted-foreground">Loading the rules…</p>}
              {data.status === 'error' && <p className="text-sm text-destructive" role="alert">The word lists didn't load. Check your connection and refresh.</p>}

              {/* A pattern: the words that fit, and a rule to add. */}
              {found && found.rule && found.rule.kind !== 'text' && found.words.length > 0 && (
                <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="rule-pattern">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {plural(found.words.length, 'word', 'words')} fit <span className="font-mono text-primary">{ruleLabel(found.rule)}</span>
                    </h3>
                    <button type="button" onClick={() => addRule(found.rule)} disabled={hasRule(found.rule)} className={buttonQuiet} data-testid="add-pattern-rule">
                      {hasRule(found.rule) ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                      {hasRule(found.rule) ? 'Added' : 'Add ' + ruleLabel(found.rule) + ' to my lesson'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Tap words to add them to your lesson.</p>
                  <PickChips words={showAllWords ? found.words : found.words.slice(0, 60)} picked={pickedKeys} onToggle={togglePick} yearLabel={yearLabel} testId="rule-word-chips" />
                  {found.words.length > 60 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Showing {showAllWords ? found.words.length : 60} of {found.words.length}.{' '}
                      <button type="button" onClick={() => setShowAllWords((v) => !v)} className="underline underline-offset-2 hover:text-primary" data-testid="rule-show-all">
                        {showAllWords ? 'Show fewer' : 'Show all ' + found.words.length}
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Own words sit here, shown once a rule has been searched for. */}
              {filtering && (
                <div className="mb-6 rounded-xl border border-foreground/20 bg-card p-4" data-testid="rule-own-panel">
                <label htmlFor="rule-own-words" className="block text-sm font-semibold text-foreground">
                  Add your own words <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="rule-own-words"
                  value={ownText}
                  onChange={(e) => { setOwnText(e.target.value); setOwnRemoved(new Set()); }}
                  rows={3}
                  maxLength={MAX_TEXT_LENGTH}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={'because, friend, thought'}
                  className={field + ' font-mono leading-relaxed'}
                  aria-describedby="rule-own-words-help"
                  data-testid="rule-own-words"
                />
                <p id="rule-own-words-help" className="mt-2 text-xs text-muted-foreground">
                  Type or paste words, one per line or separated by commas. They always go in the lesson, and any rules you add fill the rest of the count.
                  {ownParsed.duplicates > 0 && ' Left out ' + plural(ownParsed.duplicates, 'repeated word', 'repeated words') + '.'}
                  {ownParsed.ignored.length > 0 && ' Skipped: ' + ownParsed.ignored.map((x) => '\u201c' + x + '\u201d').join(', ') + '.'}
                </p>
                  {ownWords.length > 0 && (
                    <p className="mt-2 text-xs font-semibold text-primary" data-testid="rule-own-count">
                      {plural(ownWords.length, 'word', 'words')} added to your lesson.
                    </p>
                  )}
                </div>
              )}

              {data.status === 'ready' && (
                <>
                  <h3 className="text-sm font-semibold text-foreground" data-testid="rule-count">
                    {filtering ? plural(visiblePoints.length, 'rule', 'rules') + ' about ' + describeRuleShort(parsed) : plural(visiblePoints.length, 'rule', 'rules') + ' in ' + (years.length ? plural(years.length, 'year group', 'year groups') : 'every year group')}
                  </h3>
                  {!visiblePoints.length && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No weekly rule matches{found && found.words.length ? ', but the words above fit the pattern' : ''}. Try another spelling, or all years.
                    </p>
                  )}
                  <div className="mt-3 space-y-6" data-testid="rule-points">
                    {grouped.map((g) => (
                      <section key={g.slug} aria-labelledby={'rules-' + g.slug}>
                        <h4 id={'rules-' + g.slug} className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                          {yearLabel[g.slug] || g.slug} · {plural(g.points.length, 'rule', 'rules')}
                        </h4>
                        <ul className="mt-1 divide-y divide-foreground/10">
                          {g.points.map((p) => (
                            <li key={p.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                              <div className="min-w-[10rem] flex-1">
                                <div className="font-semibold text-foreground">{p.focus}</div>
                                <div className="text-xs text-muted-foreground">
                                  {weeksText(p.weeks) ? weeksText(p.weeks) + ' · ' : ''}
                                  {plural(p.words.length, 'word', 'words')}: {p.words.slice(0, 5).join(', ')}
                                  {p.words.length > 5 ? '…' : ''}
                                </div>
                              </div>
                              <button type="button" onClick={() => (hasRule(p.rule) ? removeRule(p.rule) : addRule(p.rule))} aria-pressed={hasRule(p.rule)} className={buttonQuiet}>
                                {hasRule(p.rule) ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                                {hasRule(p.rule) ? 'Added' : 'Add'}
                              </button>
                              <details className="basis-full">
                                <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline">Choose words</summary>
                                <PointWords rule={p.rule} entries={entries} years={years} picked={pickedKeys} onToggle={togglePick} yearLabel={yearLabel} />
                              </details>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="type-body text-xs text-muted-foreground">
            Lessons you make are kept in this browser with your other lists.{' '}
            <Link to="/series" className="underline underline-offset-2 hover:text-primary">View your series</Link>
          </p>
        </div>
      </section>

      {/* Stays in view while you scroll the rules, so a pick is never out of sight. */}
      {hasLesson && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/90 px-5 py-3 backdrop-blur" data-testid="rule-tray">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-sm text-foreground">
              <strong>{plural(rules.length, 'rule', 'rules')}</strong>{byHandCount > 0 && ' + ' + plural(byHandCount, 'word of your own', 'words of your own')} · {plural(words.length, 'word', 'words')}
            </span>
            <button type="button" onClick={showLesson} className={buttonPrimary}>
              Review lesson <ChevronRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </InfoPage>
  );
}

function describeRuleShort(rule) {
  const d = describeRule(rule);
  return rule.kind === 'text' ? '“' + rule.value + '”' : ruleLabel(rule) + (d ? '' : '');
}
