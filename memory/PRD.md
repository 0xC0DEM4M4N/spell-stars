# SPELL// STARS — Year 2 Spelling Programme

## Original Problem Statement
"Weekly spelling test website with a carousel for each week, showing the current week's data assuming term week 1 starts on 7 September 2026. Show the spellings, summarize the learning point, and use nice futuristic styling."

## Architecture
- React frontend with Tailwind CSS, Framer Motion, Lenis smooth scrolling, Embla carousel, and Shadcn UI primitives.
- FastAPI backend serving the structured Year 2 spelling programme at `/api/programme`.
- Static curriculum content in `programme_data.py`; no database writes or authentication required.
- Demo date logic treats 7 September 2026 as the reference date, making Week 1 current.

## Key Files
- `/app/backend/programme_data.py` — 36-week curriculum data
- `/app/backend/server.py` — FastAPI, `/api/programme` endpoint
- `/app/frontend/src/components/Hero.jsx` — SPELL// STARS title, tagline
- `/app/frontend/src/components/Navbar.jsx` — SPELL//STARS brand
- `/app/frontend/src/components/WeekCarousel.jsx` — embla carousel, week cards, quiz/print buttons
- `/app/frontend/src/components/NotesSection.jsx` — differentiation notes panel
- `/app/frontend/src/components/PracticeQuiz.jsx` — modal quiz with speech synthesis
- `/app/frontend/src/components/PrintSheet.jsx` — print-only weekly list
- `/app/frontend/src/components/ProgressTracker.jsx` — UNLINKED, safe to delete
- `/app/frontend/src/components/Marquee.jsx` — UNLINKED, safe to delete

---

## What's Been Implemented

### Phase 1 — Core App
- React + FastAPI scaffold with 36-week curriculum data
- Hero, WeekCarousel, NotesSection, PrintSheet, Footer, Navbar
- PracticeQuiz: children type spellings, instant feedback, speech synthesis, confetti
- ProgressTracker: 36-week grid, current week, mark complete (later removed)

### Phase 2 — Simplification & Polish (Feb 2026)
- Removed Marquee strip, hero intro text, method cards, notes images
- Removed "Parent & teacher notes" eyebrow label from NotesSection
- Removed ProgressTracker component entirely from layout
- Removed 36/360/03 stats block — replaced with tagline summary
- Renamed branding: MATRIX → SPELL// STARS (Hero + Navbar + loading screen + Footer)
- Star-A: "A" in STARS replaced with filled amber star icon (Hero + Footer)
- Print button moved from carousel toolbar onto the active/selected week card header
- Challenge Round added to PracticeQuiz: bonus quiz using starred words after main quiz completes
- Tightened section spacing throughout (hero pb-8, carousel py-10, notes pt-0)

---

## Prioritised Backlog

### P1
- **Weekly Editor**: Quick adjustment of a week's words or learning notes via UI (no code edit needed)
- **Full-Year Pack**: All 36 weekly lists compiled into a single print-ready booklet

### P2
- **Challenge Round**: Bonus quiz using starred words for children who finish early
- **Family Summary**: End-of-week recap showing completed spellings and upcoming learning points
