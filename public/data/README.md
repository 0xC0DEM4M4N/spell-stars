# SPELL// STARS — Generated Word List Data

Generated against the rules agreed in planning: 38 teaching weeks/year
(Autumn 1–14, Spring 15–26, Summer 27–38, matching a 7-week summer holiday,
2-week Christmas, 2-week Easter, and a 1-week half-term in each term),
wordsPerWeek Reception 5 / Year 1 10 / Year 2 12 / Year 3+ 15, letter→word
progression for Reception, and the `capabilities` block (input mode, TTS
rate, session caps, word search grid, definition style) from the previous
planning doc.

## Files

```
years.config.json      -- year list, term structure, per-year capabilities
reception/words.json   -- 190 entries (35 letters, 155 words)
year1/words.json       -- 380 entries
year2/words.json       -- 456 entries
year3/words.json       -- 570 entries
year4/words.json       -- 570 entries
year5/words.json       -- 570 entries
year6/words.json       -- 570 entries
```

## Sourcing

- **Reception**: built from the general Letters and Sounds Phase 2–4 GPC
  progression (public DfE-origin framework, not a specific commercial
  scheme's exact wording). `scheme: "letters-and-sounds"` is a placeholder —
  swap in your actual phonics provider's own sequence if it differs.
- **Years 1–6**: sourced directly from the DfE's **English Appendix 1:
  Spelling** (National Curriculum in England), which is Crown copyright,
  reusable under the Open Government Licence. Years 3/4 and 5/6 use the
  official statutory 100-word lists (split across the two years in each
  pair); all years also draw on the document's non-statutory rule/example
  words.

## What's fully content-complete vs. what needs a review pass

| Year | Words | Definitions/examples |
|---|---|---|
| Reception | 190 | ✅ Fully written, original |
| Year 1 | 380 | ✅ Fully written, original |
| Year 2 | 456 | ⚠️ `null`, `needsContentReview: true` |
| Year 3 | 570 | ⚠️ `null`, `needsContentReview: true` |
| Year 4 | 570 | ⚠️ `null`, `needsContentReview: true` |
| Year 5 | 570 | ⚠️ `null`, `needsContentReview: true` |
| Year 6 | 570 | ⚠️ `null`, `needsContentReview: true` |

Reception and Year 1 were prioritised as the foundational years and the ones
most affected by the input-mode/content-type changes, so they got a full
hand-written definition/example pass. Years 2–6 have accurate, correctly
tagged, correctly distributed curriculum words (real statutory and
non-statutory NC content, not placeholders) — but writing ~1,600 more
original one-line definitions and example sentences is a distinct content
task worth doing (or generating and then reviewing) deliberately, not folded
into a structural data build. Any UI reading this data should treat
`needsContentReview: true` as "don't ship this word's definition/example to
a user yet."

## Revision cycling

Each year's real curriculum vocabulary (the "pool") is smaller than
`totalWeeks × wordsPerWeek`, which is expected — schools don't introduce
100% novel words every single week for 38 weeks. The generator cycles
through each year's pool in curriculum order; every entry beyond the first
pass is tagged `"revision": true`. Pool sizes per year:

| Year | Unique pool | Total slots | First-pass coverage |
|---|---|---|---|
| Reception | 190 (35 letters + 155 words) | 190 | 100% (no cycling needed) |
| Year 1 | 272 | 380 | 72% |
| Year 2 | 222 | 456 | 49% |
| Year 3 | 130 | 570 | 23% |
| Year 4 | 157 | 570 | 28% |
| Year 5 | 105 | 570 | 18% |
| Year 6 | 125 | 570 | 22% |

The Year 3–6 revision ratios are high because the curated non-statutory
"rule-example" pool was deliberately trimmed to a representative subset
rather than exhaustively including every example word in the NC appendix
(which itself explicitly invites teachers to add further words of their
choosing). **This is the main thing worth expanding before relying on this
data for real teaching**: add more real words per rule to each Year 3–6
pool to reduce how often the same word repeats across a school year.

## Schema note

Two fields were added during this build that weren't in the original spec
doc — update `spell-stars-wordlist-spec.md` to match:

- `revision: boolean` — true if this occurrence is a repeat of an earlier
  appearance of the same word within the same year (see above).
- `needsContentReview: boolean` — present (and `true`) only when
  `definition`/`exampleSentence` are `null` and still need writing.
