# Word content plan — definitions, examples, origins

What this is: a working plan (and two scripts) for filling in the
missing `definition` / `exampleSentence` fields, and a new `origin`
field, across the word data — organised the way the app itself is:
Year → Term → Day (week).

## The audit

| Year | Word slots | Unique words | Status |
|---|---|---|---|
| Reception | 155 (+35 letters) | 155 | ✅ done |
| Year 1 | 390 | 281 | ✅ done |
| Year 2 | 468 | 234 | ⚠️ 222 unique words outstanding |
| Year 3 | 585 | 145 | ⚠️ 130 unique words outstanding |
| Year 4 | 585 | 166 | ⚠️ 151 unique words outstanding |
| Year 5 | 585 | 117 | ⚠️ 102 unique words outstanding |
| Year 6 | 585 | 138 | ⚠️ 123 unique words outstanding |

**728 unique words** need a definition and example sentence, across
Years 2–6. `origin` doesn't exist as a field yet anywhere — it's a new
addition (see below).

Every one of those is already flagged in the data itself:
`needsContentReview: true` on an entry means its definition/example are
still `null`. `PracticeQuiz`'s "spell from the meaning" mode and the
word-search cards both depend on this content, so this is the thing
standing between Years 2–6 and being genuinely usable, not just
structurally complete.

## Why "unique words", not one row per slot

Each year cycles through a smaller pool of real curriculum words across
all its teaching weeks (see `public/data/README.md`'s "Revision
cycling" section) — an entry tagged `revision: true` is a *repeat* of an
earlier appearance, not a new word to define. Writing a definition once
per unique word and then propagating it to every slot (that's what
`scripts/apply_word_content.py` does) turns ~2,700 raw missing slots
into **728 actual writing tasks** — about 4x less work than it looks
like from the raw counts.

One consequence worth knowing going in: because each year's unique pool
is smaller than a full year of teaching weeks, most years exhaust their
*entire* pool within the autumn term (Year 3: all 130 in autumn; Year 4:
all 151; Year 5: all 102; Year 6: all 123). Year 2 spreads a bit further
(168 in autumn, 54 in spring). So "by term" mostly isn't a meaningful
phase boundary for Years 3–6 — "by week" (day) within autumn is where
the real week-to-week structure is.

## The two files this produced

- **`content-plan/word-content-tracker.csv`** — 728 rows, one per
  unique word still needing content. Columns: `year`, `term`,
  `week_of_year`, `week_of_term`, `word`, `category`, `statutory`,
  `origin_candidate`, `origin_hint`, `status`, and three blank columns
  to fill in: `definition`, `example_sentence`, `origin`. Sorted in
  curriculum order (year → term → the week each word is first taught →
  word) — i.e. the exact order a child meets each word, and the order
  the app's own Year/Term/Day navigation uses.
- **`scripts/apply_word_content.py`** — reads the tracker CSV back and
  writes every filled-in row into the matching year's `words.json`,
  updating *every* occurrence of that word (including its revision
  repeats later in the year) and clearing `needsContentReview`. Run it
  with no arguments first (dry run, reports what it would do), then
  `--write` once you're happy. Safe to run repeatedly as you fill in
  more rows over time — already-applied rows are simply skipped.
- `scripts/generate_word_content_tracker.py` regenerates the tracker
  from scratch if `words.json` changes underneath it (e.g. new words
  added later) — re-running it won't lose anything already filled in
  *within a session*, but note it currently regenerates the CSV fresh
  each time, so if you've already partially filled in the checked-out
  tracker, apply it (`apply_word_content.py --write`) before
  regenerating, rather than after.

## Working order

1. **By year, ascending (2 → 6).** Year 2 unlocks soonest for the
   youngest kids using the pooled "by term"/"by all" views, and its
   pool (222 words) is the single biggest chunk — tackling it first
   also means checking the propagation script against real content
   early.
2. **Within a year, by `category`: `statutory-word-list` before
   `rule-example` before `review`.** The statutory words are the DfE's
   actual 100-word lists — literally what schools test — so they matter
   most if you had to stop partway through a year. Note the CSV is
   currently sorted by term/week for that "meet it in curriculum order"
   ordering; if you want strict statutory-first, sort the sheet by the
   `category` column instead before starting a session, then back to
   `priority` to resume the normal order later.
3. **Within a category, top-to-bottom in the CSV** — that's already
   term → week → word.

Work it in batches (20–30 rows is a comfortable single sitting), save,
and periodically run `apply_word_content.py --write` to fold finished
batches into the real data — don't wait until a whole year is 100% done
before applying anything.

## Style guide (matching Reception/Year 1, which are already done)

Pull up a few for the exact bar to hit —
`public/data/year1/words.json`:

> **cat** — "A small furry pet animal that says miaow." /
> "Our cat likes to sleep on the warm windowsill."
>
> **sit** — "To rest your bottom down on a chair or the floor." /
> "Please sit down and listen carefully."

- **Definition**: one plain sentence, no jargon, no circular definitions
  (don't define "large" as "big"). Assume the reader is the child using
  the app, not a teacher or parent.
- **Example sentence**: a sentence a child would actually say or hear —
  home, school, friends, animals, play — not a dictionary-style example.
  Keep it short. For homophones/tricky words, let the sentence's context
  make the meaning unambiguous (e.g. distinguish "which"/"witch").
- **Length**: roughly matches the samples above — a short sentence each,
  not a paragraph. Older years (5–6) can run slightly longer/more
  precise since the words themselves are more abstract, but the same
  plain, unpatronising tone throughout — Year 6 kids don't want to be
  talked down to either.

## Origins — "where relevant"

`origin` is a genuinely new field (nothing currently reads or writes
it) — it exists because the landing page already promises it:

> "For the older years, words come with a short note on where they
> come from — the Latin, Greek or Old English root behind them..."
> — `src/pages/YearIndex.jsx`, VOCAB_CARDS

That copy sets the default eligibility floor: **Year 3 and up** (the
tracker's `origin_candidate` column is pre-marked `yes` for Years 3–6,
blank for Year 2 — Year 2 words skew too simple/common for this to add
much). But "candidate" isn't "required" — this is a judgment call per
word, not a field to fill in for all 506 Year 3–6 words:

- Good candidates: genuine loanwords with a story (French "chef",
  Greek "photograph", Latin "circus"), words whose spelling *is* the
  rule being taught because of where it came from (the `ch` → /k/ or
  /ʃ/ spellings are literally taught as "Greek origin" / "French
  origin" in Year 4's own `focus` field — 54 of those words already
  have a hint pre-filled in the tracker's `origin_hint` column, e.g.
  "Greek origin", as a starting point, not a finished note).
- Skip it for: everyday Old English words with nothing distinctive to
  say (short common words like "said", "come", "any") — leave `origin`
  blank rather than writing something generic just to fill the cell.
- Keep the note itself just as short as the definition — one clause,
  not an etymology lecture: e.g. *origin* for "circus" → "From the
  Latin word for a circle or ring."

## Schema change needed

`origin` doesn't exist in the word objects yet. Once real content
starts landing via `apply_word_content.py`, add `origin: string | null`
next to `definition`/`exampleSentence` in whatever spec doc/type
tracks the schema (the in-repo note is `public/data/README.md`'s
"Schema note" section — worth a line there too), and decide where the
UI actually surfaces it — right now nothing in `YearPage.jsx` /
`WordSearch.jsx` / `PracticeQuiz.jsx` reads `origin` at all, so it'll
sit unused in the data until a small follow-up UI task displays it
(e.g. a line under the definition in the word-search/quiz views, shown
only when present).

## QA pass before calling a year "done"

- Run `npm run build` after applying a batch — the propagation script
  only touches JSON data, but worth confirming nothing else broke.
- Spot-check a handful of entries in the actual running app (word
  search cards + the "spell from meaning" quiz mode) rather than just
  reading the CSV — a definition that reads fine in a spreadsheet can
  still make a bad crossword-style clue if it accidentally contains the
  word itself, which `PracticeQuiz`'s `blankSentence` doesn't currently
  guard against.
- Once every row for a year shows `needsContentReview: false`, that
  year's "by term"/"by all" scopes and its word-search/quiz cards are
  fully content-complete.

## What I did *not* do here

I haven't written any of the 728 definitions/examples, or picked which
words get an origin note — that's real content-authoring work for
primary-school children and deserves a proper pass (by you, or by me in
an explicit follow-up batch you can review), not silent placeholder
text generated as a side effect of building the plan. Happy to start
drafting real content in batches next — say the word (Year 2 autumn
statutory words first would be my suggested starting batch) and I'll
fill in a first pass of the tracker for you to review before anything
gets applied.
