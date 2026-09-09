# SPELL// STARS — Implementation Plan

Built from the three planning docs (`spell-stars-action-plan.md`, `spell-stars-wordlist-spec.md`,
`next-steps-year-capabilities.md`) **and** a direct look at the actual repo
(`~/Documents/Code/Projects/personal/spell-stars`) on 2026-09-08/09. Where the repo already
disagrees with or has overtaken the docs, that's called out explicitly — this plan reflects
what's actually there, not just what the docs assumed.

Two decisions were confirmed with you before locking this in:
- **Canonical app copy: the root-level one** (`App.js`, `src/`) — not `frontend/`.
- **Backend: drop it, go fully static** — no FastAPI server in the shipped app.

---

## 0. Repo reality check (read this before starting)

A few things the planning docs didn't know about because they predate this exploration pass:

**Word list data already exists.** `data/years.config.json` and `data/{reception,year1..year6}/words.json`
are already sitting in the repo root, matching the spec almost exactly (38 weeks, per-year
`wordsPerWeek`, the full `capabilities` block, `revision`/`needsContentReview` fields). This is
further along than the action plan's "outstanding tasks" list suggests — **the word-list content
build (action plan §7, checklist items 1–9 in the word-list spec) is functionally done.** They're
untracked in git (`git status` shows them all as `??`) — first real step is committing them, not
generating them.

**But the data isn't wired up to be servable.** `wordListPath` values are absolute site-root paths
like `/data/year2/words.json`, which only resolve at runtime if the files live under `public/`
(Create React App convention — anything outside `public/` isn't served as a static asset). Right
now `data/` is a sibling of `public/`, not inside it. This is a real gap, not a nitpick — routing
work in Phase 2 will silently 404 on every year fetch until this is fixed.

**Two parallel copies of the app exist: root and `frontend/`.** Confirmed with you — root is
canonical. `frontend/` (`frontend/App.js`, `frontend/src/…`) came from a single "initial commit
from emergant" and is missing `WordSearch.jsx` and `WeekEditor.jsx`, which only exist in the root
copy. It's stale. Recommend deleting it once you've double-checked nothing in Cloudflare Pages'
build config points at it (see Phase 0 tasks).

**There's a FastAPI backend that contradicts the "static site" design.** `backend/server.py` +
`WeekEditor.jsx` (which calls `${REACT_APP_BACKEND_URL}/api` via axios) let someone edit week
content through a running server. This is the *old* single-year (`programme.json`) editing flow.
Confirmed with you: drop it. `WeekEditor.jsx` and `backend/` should not be part of the shipped
static app — if you still want a content-editing tool, it becomes a local/offline script that
edits the JSON files directly, not a deployed API.

**`design_guidelines.json` already exists at repo root** — a fairly detailed design system doc
(typography, color archetype, forbidden colors/fonts, etc.), dated with a 2026-09-07 term-start
anchor. This may already satisfy outstanding task 1 ("pull real style tokens from the live SPA"),
*or* it may be aspirational/AI-generated rather than actually reverse-engineered from the deployed
site — it names the product "SPELL // MATRIX 2026," not the "SPELL//" slash-branding the action
plan describes, which suggests it's from an earlier naming pass and needs re-validation against
what's actually live at spell-stars.pages.dev rather than trusted as-is.

**The current app is a single Year 2 site, not year-generic.** `App.js` renders one route (`/`)
built from `src/data/programme.json` (36 weeks, Year 2 only, generated from
`scripts/programme_data.py`). None of the routing refactor, `ScopeSelector`, or capabilities
wiring exists yet — Phases 2–5 below are greenfield. `WordSearch.jsx` does already exist as a
component (12×12 grid, 8 directions, both hardcoded) — a real head start for Phase 4, since it's
refactoring existing working code rather than building from nothing.

**No landing-page project exists anywhere.** `star-spell.pages.dev` (Phase 6) is a new site/repo,
not a folder in this one.

---

## Phase 0 — Housekeeping (do first, low effort, unblocks everything else)

1. [ ] Confirm what Cloudflare Pages' build settings actually point at (root vs `frontend/`) —
   should match the "root is canonical" decision; fix the Pages config if it doesn't.
2. [ ] Delete (or archive to a branch) the `frontend/` duplicate once confirmed unused.
3. [ ] `git add data/` and commit — the generated word-list data is currently unversioned and one
   `git clean` away from being lost.
4. [ ] Decide fate of `backend/`, `scripts/regen_programme_json.py`, `scripts/programme_data.py`,
   `src/data/programme.json`, and `WeekEditor.jsx` — per the "go fully static" decision, these are
   all part of the old single-year/backend-editing model being retired. Remove `backend/` and
   `WeekEditor.jsx` from the shipped app; keep `gen_word_data.py` (the generator that produced
   `data/*/words.json`) since that's the tool for the still-needed content work in Phase 7.
5. [ ] Spot-check `memory/test_credentials.md` isn't sensitive-and-committed; if it is, scrub git
   history or confirm it's already excluded — it wasn't reachable to verify in this pass because
   the device link dropped mid-exploration.
6. [ ] Fix the README — it currently claims "fully static, no backend," which will finally become
   true after step 4, but also describes the old single-Year-2 model; it needs a rewrite once
   Phase 2 lands, not before.

---

## Phase 1 — Data foundation: make `data/` actually servable

1. [ ] Move (or `craco`-configure a copy step for) `data/` into `public/data/`, so
   `fetch(wordListPath)` resolves against the built site the way the spec assumes. Simplest path:
   physically relocate `data/` under `public/`, update any script that regenerates it
   (`gen_word_data.py`) to write there directly.
2. [ ] Verify all seven `wordListPath` values in `years.config.json` still resolve correctly
   post-move (they're already written as absolute `/data/...` paths, so this should be a non-issue
   once the directory is in the right place — just confirm, don't assume).
3. [ ] Add a small loader utility (`src/lib/loadYearData.js` or similar): resolves a slug against
   `years.config.json`, `fetch`es the year's `words.json`, caches it in memory for the session
   (per word-list spec §2.4 — Practice and Word Search shouldn't both re-fetch on switch), and
   exposes a loading state.
4. [ ] `years.config.json` itself loads eagerly (bundled or fetched once at app start) since the
   year-picker UI needs it regardless of which year is open — per spec, this is fine, it's small.
5. [ ] Confirm `curriculum-map.json` (word-list spec §5) either already exists somewhere in the
   `gen_word_data.py` output or gets added — it wasn't seen in `data/` during exploration, so
   either it wasn't generated or lives elsewhere; check before assuming it's done. It's a
   build-time artefact only, never fetched by the running app.

---

## Phase 2 — Routing refactor

1. [ ] Replace the single `<Route path="/" element={<Home />} />` in `App.js` with a dynamic
   `<Route path="/:yearSlug" element={<YearPage />} />` (plus a `/` redirect to a sensible default,
   e.g. the lowest configured year or a year picker).
2. [ ] `YearPage` resolves `yearSlug` against `years.config.json`, triggers the Phase 1 loader for
   that year's `words.json`, and renders the existing week/practice/word-search UI driven by
   whatever year is loaded — no more hardcoded Year 2 assumptions anywhere in the render tree.
3. [ ] Namespace all progress/SRS localStorage (or wherever it's currently stored) per year, e.g.
   `spellstars.year2.progress` — audit `ProgressTracker.jsx` and any SRS-related state for
   currently-unnamespaced keys before this ships, since switching years must never clobber another
   year's saved progress.
4. [ ] Retire `src/data/programme.json` and the old `Home` component's direct import of it once
   `YearPage` fully replaces it — don't leave two parallel data models live.
5. [ ] One Practice template and one Word Search template, both driven purely by the loaded year's
   config + word list — no per-year forks in component code (this is mostly a consequence of
   Phases 3–4 done right, not a separate build step).

---

## Phase 3 — Shared `ScopeSelector`

1. [ ] Build `ScopeSelector` as a standalone component: **By day** (fixed list = current week,
   sized to that year's `wordsPerWeek`), **By term** (pool = `term == currentTerm && weekOfYear <=
   currentWeek`), **By all up to now** (pool = `weekOfYear <= currentWeek`, any term).
2. [ ] Word-count picker (10/15/20) shown only for Term/All scopes, per spec.
3. [ ] "Current week" is a manually-set value (a simple control, per word-list spec §1 decision B)
   — not calendar-derived. Store it alongside the per-year progress state from Phase 2.
4. [ ] Selection within an oversized pool: reuse whatever prioritisation the SRS/practice engine
   already does (weakest/most-overdue first) → fall back to `difficultyRank` ascending → random
   tie-break, per word-list spec §3. This means auditing the existing SRS logic (wherever
   `ProgressTracker.jsx` or similar tracks review-due state) before wiring `ScopeSelector` output
   into it.
5. [ ] Mount the same `ScopeSelector` instance/config in both Practice and Word Search — don't let
   them drift into two implementations.

---

## Phase 4 — Capabilities wiring

Everything here reads `capabilities` off the current year's `years.config.json` entry, already
loaded in Phase 1 (no extra fetch).

1. [ ] **Input mode.** Build three swappable input components behind one interface —
   `letterTile`, `onScreenKeyboardOptional`, `typeRequired` — selected via
   `capabilities.inputMode`, so Practice doesn't need to know which one it's rendering. Audit the
   existing `PracticeQuiz.jsx` first (not yet inspected in this pass) to see how much of
   `typeRequired` is already implemented there vs. needs building from scratch.
2. [ ] **TTS rate.** Wire `capabilities.ttsRate` (`slow` | `standard`) into whatever speech-synthesis
   call already exists (the README mentions browser speech synthesis in the practice quiz) —
   should be a small, localized change once located.
3. [ ] **Word search grid.** Parameterise the existing `WordSearch.jsx` on
   `capabilities.wordSearchGrid.size` and `.directions` instead of the current hardcoded `SIZE = 12`
   and 8-direction array. This is refactoring real working code, not greenfield — keep the existing
   placement algorithm, just drive its constants from props.
4. [ ] **Session caps.** Wire `capabilities.sessionCaps.{newItemsPerDay,reviewsPerDay}` into the
   SRS/session engine's daily limits. Treat the numbers in the config as placeholders per the docs
   — flag for later tuning against real session-length testing, don't treat as final.
5. [ ] **Definition style.** No runtime branch needed — `definitionStyle` (`concrete` |
   `etymological`) is a content-authoring brief for Phase 7, not app logic.
6. [ ] QA once built: Reception's letter-tile flow never accepts free typed input; Year 2+'s typed
   flow never shows a tile/keyboard scaffold; word search grids only get diagonal/backwards
   placements for Year 3+.

---

## Phase 5 — Reception `contentType` branch

1. [ ] Confirm Reception's `words.json` already carries the `contentType: "letter" | "word"`
   discriminator (per capabilities doc §2) — it should, since the data build already ran; verify
   rather than assume, since the doc's example schema was written before the data existed.
2. [ ] Build the Practice component's `contentType`-aware render branch: `"letter"` shows the
   letter-tile picker + "which letter makes this sound?"; `"word"` is the existing spell-the-word
   flow (shared with every other year).
3. [ ] Word Search pulls only `contentType: "word"` entries. Reception's earliest weeks will have
   none — build the "come back once you're ready for words!" empty state explicitly, don't let it
   render a blank/broken grid.

---

## Phase 6 — Landing page (`star-spell.pages.dev`)

A new project, not a folder in this repo.

1. [ ] Once Phase 0's `design_guidelines.json` question is resolved (validated against the live
   site, not just trusted), use those as the real token source — dark navy `#08101f` family,
   `SPELL//` slash branding — rather than re-guessing from screenshots.
2. [ ] Structure: hero → stats → features → how it works → curriculum grid → FAQ (shape only,
   copy written fresh).
3. [ ] Copy: UK audience, Reception–Year 6, Autumn/Spring/Summer terms, National Curriculum +
   phonics framing, British spelling throughout.
4. [ ] Curriculum grid links each year card to `/{yearSlug}` on the spell-stars domain — these
   routes only exist after Phase 2 ships, so this page can be built in parallel but shouldn't go
   live pointing at broken links before then.
5. [ ] Not a redirect target for `spell-star.pages.dev` (the unrelated iOS product) — no shared
   identity, just parallel copy/CTAs into the same app domain.

---

## Phase 7 — Content workstream (can run in parallel with Phases 2–6)

1. [ ] Write/review ~1,600 flagged `needsContentReview: true` definitions + example sentences
   across Years 2–6, following the `concrete`/`etymological` (Year 5+) style split. Any UI
   surfacing word data must keep treating `needsContentReview: true` as "don't show this
   definition/example yet" until this pass clears it — that flag already exists in the shipped
   data, so it's a real runtime gate, not just a to-do marker.
2. [ ] Expand the Year 3–6 non-statutory rule-example word pools — current first-pass coverage is
   18–28% for those years (vs. 72%/49% for Years 1–2), meaning the same words repeat often across
   a school year via the `revision: true` cycling. Add more real per-rule example words to each
   pool and regenerate.
3. [ ] Re-run `gen_word_data.py` (or whatever it becomes after edits) after both of the above, and
   redo the QA pass from the word-list spec (§4.6: word-count sanity, no duplicate ids/words,
   statutory-word coverage check, contiguous `weekOfYear`, `difficultyRank` trending upward).

---

## Phase 8 — Docs sync

1. [ ] Update `spell-stars-wordlist-spec.md` to document the `revision` and `needsContentReview`
   fields (already shipped in the real data, not yet in the spec doc) and the per-year
   `wordsPerWeek` values (5/10/12/15) replacing the doc's original fixed `10`.
2. [ ] Rewrite `README.md` once Phase 2 ships — it currently documents the old single-Year-2,
   `programme.json`-bundled, backend-optional model, none of which will be true anymore.
3. [ ] Retire or clearly mark `test_result.md` if it's leftover scaffolding from a previous
   agent-based build process rather than a live testing protocol you're using going forward.

---

## Suggested sequencing

Phase 0 and Phase 1 are hard blockers for everything else — nothing in Phase 2 onward works if the
data isn't committed and servable. Phases 2 → 3 → 4 → 5 are naturally sequential (routing before
scope selection before capability branching before Reception's special case), since each layers on
the last. Phase 6 (landing page) and Phase 7 (content writing) can both start any time after Phase
0, in parallel with the app work, since neither depends on the routing refactor being finished —
Phase 6 just shouldn't go *live* with working links until Phase 2 ships. Phase 8 trails everything
else, once the shape of the real implementation is settled enough to document accurately.

## Open items needing a decision, not just a build step

- Whether `design_guidelines.json` is genuinely sourced from the live site or needs redoing
  (Phase 0/6).
- Whether `curriculum-map.json` exists anywhere or still needs generating (Phase 1).
- Whether `memory/test_credentials.md` is safe to have in git history (Phase 0).
- Confirm what Cloudflare Pages actually builds from before deleting `frontend/` (Phase 0).
