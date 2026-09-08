# SPELL// STARS

A Year 2 (UK, ages 6–7) weekly spelling programme site, styled with a dark,
futuristic look. It presents a full school year of spelling lists as an
interactive carousel: pick a week to see that week's words, the phonics or
spelling rule it covers, a practice quiz, and a printable A4 spelling sheet.

**Live example of what it covers:** 36 weeks of curriculum aligned to the UK
National Curriculum's Year 2 spelling appendix, ordered so each week's rule
builds on the last (consonant blends → suffixes → apostrophes/homophones →
common exception words), with 1–2 "challenge" words per week for early
finishers. Week 1 is treated as starting 7 September 2026.

## Features

- **Week carousel** — browse all 36 weeks, jump to any week, see its focus
  and word list at a glance.
- **Practice quiz** — children type each week's spellings, get instant
  feedback, and hear words read aloud via the browser's speech synthesis.
  A bonus "Challenge Round" quizzes the starred/extension words once the
  main list is complete.
- **Print sheet** — a clean, print-only A4 layout of the current week's list
  for handing out or sending home.
- **Parent/teacher notes** — a panel explaining how the sequence was built,
  the suggested weekly test format, pacing, and differentiation ideas.

## How it works / tech stack

This is a **fully static site** — there is no backend or database.

- **Frontend:** React 19 (Create React App via [craco](https://craco.js.org/)),
  Tailwind CSS, Radix UI / shadcn-style primitives, Framer Motion,
  [Lenis](https://lenis.darkroom.engineering/) for smooth scrolling, and
  Embla Carousel.
- **Content:** all 36 weeks of words, sentences, focus areas, and notes live
  in `src/data/programme.json`, which is imported directly by
  `src/App.js` and bundled into the app at build time. There's no API call
  and nothing to fetch at runtime.
- **Editable source:** the JSON is generated from a more readable Python
  file, `scripts/programme_data.py` (word lists, focus notes, term start
  date). If you want to change the curriculum content, edit that file and
  regenerate the JSON — see below.

## Running it locally

Requires [Node.js](https://nodejs.org/) (18+) and [Yarn](https://yarnpkg.com/)
(the project uses `yarn.lock`; `npm install` can also work but yarn is
recommended since that's what the lockfile matches).

```bash
git clone <this-repo-url>
cd spell-stars
yarn install
yarn start
```

This starts the CRA dev server at [http://localhost:3000](http://localhost:3000)
with hot reload. No environment variables or backend setup are needed.

### Building for production

```bash
yarn build
```

This produces a static, ready-to-deploy site in the `build/` folder — plain
HTML/CSS/JS, no server required. You can preview it locally with:

```bash
npx serve -s build
```

### Deploying

Since it's fully static, it can be hosted anywhere that serves static files
— Cloudflare Pages, Netlify, Vercel, GitHub Pages, S3, etc. On Cloudflare
Pages specifically: connect the repo, set the build command to `yarn build`
and the output directory to `build`.

## Editing the spelling programme content

1. Edit `scripts/programme_data.py` — this holds the week-by-week word
   lists (`WEEK_ROWS`), per-word sentences/meanings (`WORD_DATA`), and the
   notes shown in the "how this was built" panel.
2. Regenerate the JSON the app actually reads:
   ```bash
   python3 scripts/regen_programme_json.py
   ```
   This overwrites `src/data/programme.json` from the Python source.
3. Rebuild (`yarn build`) or just restart the dev server to see the changes.

## Project structure

```
src/
  App.js                 Main app shell, routing, loads programme.json
  data/programme.json    All curriculum content (generated, see below)
  components/            Hero, Navbar, WeekCarousel, PracticeQuiz,
                          NotesSection, PrintSheet, Footer, ui/ primitives
scripts/
  programme_data.py          Editable source data (words, notes, dates)
  regen_programme_json.py    Regenerates src/data/programme.json
public/                  Static assets, index.html
```

---

### About the build tooling

This project was originally bootstrapped with
[Create React App](https://github.com/facebook/create-react-app) (via craco
for config overrides). Standard CRA scripts apply: `yarn start` (dev server),
`yarn build` (production build), `yarn test` (test runner). See the
[CRA documentation](https://facebook.github.io/create-react-app/docs/getting-started)
for more on the underlying tooling.
