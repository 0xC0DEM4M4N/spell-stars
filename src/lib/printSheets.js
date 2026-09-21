// Printable worksheet HTML, generated for a new browser tab and sent
// straight to window.print() — same approach as WordSearch.jsx's
// original print button, generalised to the other sheet types a
// weekly/term print menu can produce. Each sheet type is built as a
// {style, body} "section" internally so several can be combined into
// one print job (one page per section) when more than one format is
// picked at once.
//
// Visual language follows the SPELL// STARS print style guide: the dark
// rounded header card with the logo lockup and the sheet's identifier in
// cyan, set entirely in Lexend: heavy weights for headings, regular for
// body copy, small tracked uppercase for labels. Type is size-specific (tighter tracking
// and leading as text grows), and every emphasis survives black-and-white
// printing: bold + underline, never colour alone.

import { buildDirections, buildGrid } from "@/lib/wordSearchGrid";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap";

// Lucide "star", inlined so the print tab needs no icon library.
const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="star-glyph"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>`;

const BASE_STYLES = `
:root{--ink:#0b1220;--navy:#070a13;--primary:#09c4dc;--primary-deep:#067a8a;--amber:#fbbf24;--muted:#64748b;--line:#d8dee8;--dot:#9aa5b1}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:12mm 14mm 14mm}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Lexend',system-ui,-apple-system,'Segoe UI',sans-serif;background:#fff;color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.5}
.sheet-page + .sheet-page{break-before:page;page-break-before:always}

/* Header card */
.site-header{background:var(--navy);border-radius:18px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;position:relative;overflow:hidden}
.site-header::after{content:"";position:absolute;inset:0;background:radial-gradient(120px 80px at 92% 0%,rgba(9,196,220,.25),transparent 70%);pointer-events:none}
.brand-block,.sheet-badge{position:relative}
.logo{font-family:'Lexend',system-ui,sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;line-height:1;text-transform:uppercase;color:#f8fafc;display:inline-flex;align-items:center}
.logo .accent{color:var(--primary)}
.logo .star-glyph{width:.8em;height:.8em;color:var(--amber);vertical-align:-.08em;margin:0 -.02em}
.tagline{margin-top:7px;font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:500;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8}
.sheet-badge{text-align:right;flex-shrink:0}
.badge-title{font-family:'Lexend',system-ui,sans-serif;font-weight:800;font-size:20px;line-height:1.1;letter-spacing:-.015em;color:var(--primary);white-space:nowrap}
.badge-kind{margin-top:4px;font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:500;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8}

/* Title block: focus reads first, then the small facts */
.focus{margin-top:20px;font-family:'Lexend',system-ui,sans-serif;font-weight:800;font-size:21px;line-height:1.15;letter-spacing:-.02em;text-wrap:balance;border-left:3px solid var(--primary);padding-left:12px}
.meta{margin-top:8px;font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:500;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-variant-numeric:tabular-nums}
.label{font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:600;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;margin-top:24px}

/* Footer */
footer{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:22px;padding-top:10px;border-top:1px solid var(--line);font-size:9px;font-weight:500;color:var(--muted)}
footer .credit{font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:.04em}
`;

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightWord(sentence, word) {
  if (!sentence) return "";
  const escapedSentence = escapeHtml(sentence);
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escapedWord})`, "gi");
  return escapedSentence.replace(re, '<strong class="hl">$1</strong>');
}

// The sheet's identifier ("Week 04", "Autumn term") sits at the right of
// the header card in cyan, with the sheet type as a small mono caption
// beneath it; the week's focus/topic becomes the heading under the card.
export function printHeader({ eyebrow, title, topic, meta }) {
  return `
<header class="site-header">
  <div class="brand-block">
    <div class="logo">SPELL<span class="accent">//</span><span class="accent">ST</span>${STAR_SVG}<span class="accent">RS</span></div>
    <div class="tagline">Free UK primary spelling practice &middot; spell-stars.pages.dev</div>
  </div>
  <div class="sheet-badge">
    <h1 class="badge-title">${escapeHtml(title)}</h1>
    <div class="badge-kind">${escapeHtml(eyebrow)}</div>
  </div>
</header>
${topic ? `<p class="focus">${escapeHtml(topic)}</p>` : ""}
${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}`;
}

export function printFooter(text) {
  return `<footer><span>${escapeHtml(text)}</span><span class="credit">&copy; SPELL// ST&#9733;RS &mdash; free to print and share</span></footer>`;
}

export function wrapDocument(docTitle, style, body) {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><title>${escapeHtml(docTitle)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${FONTS_HREF}" rel="stylesheet"><style>${BASE_STYLES}${style}</style></head><body>${body}</body></html>`;
}

// Opens a new tab, writes the given HTML into it and triggers the print
// dialog once it's rendered. Waits for the page's web fonts so the sheet
// never prints in a fallback face; gives up after 1.5s so a slow or
// offline connection still prints (with the system-font fallbacks).
export function openPrintWindow(html) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();

  const start = () => {
    const fontsReady = win.document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 1500));
    Promise.race([fontsReady, timeout]).then(() => {
      win.focus();
      win.print();
    });
  };

  if (win.document.readyState === "complete") start();
  else win.addEventListener("load", start, { once: true });
}

// ── Section builders ────────────────────────────────────────────────────
// Each returns { style, body } for one sheet's content (no <html>
// wrapper), so buildCombinedSheet can stack several into one document.

// A simple list: each word with its meaning and example sentence
// (either can be switched off — used by the term's "full list" print,
// which offers both as options; the weekly print always includes both).
function wordsOnlySection({ eyebrow = "Spelling list", title, topic, meta, words, includeMeanings = true, includeSentences = true }) {
  const items = words
    .map((w) => `
    <li>
      <div class="w">${escapeHtml(w.word)}</div>
      ${includeMeanings && w.definition ? `<div class="meaning">${escapeHtml(w.definition)}</div>` : ""}
      ${includeSentences && w.exampleSentence ? `<div class="sentence">${highlightWord(w.exampleSentence, w.word)}</div>` : ""}
    </li>`)
    .join("");

  const style = `
.word-list{list-style:none;margin-top:14px;counter-reset:word}
.word-list li{counter-increment:word;position:relative;padding:11px 0 11px 34px;border-bottom:1px solid var(--line);break-inside:avoid}
.word-list li::before{content:counter(word,decimal-leading-zero);position:absolute;left:0;top:16px;font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:500;font-size:8.5px;letter-spacing:.1em;color:var(--muted)}
.w{font-weight:800;font-size:18px;line-height:1.2;letter-spacing:.005em}
.meaning{font-size:12.5px;color:#334155;margin-top:4px;line-height:1.5;letter-spacing:.005em}
.sentence{font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.5;letter-spacing:.005em}
.hl{font-weight:800;color:var(--primary-deep);text-decoration:underline;text-underline-offset:2px}
`;
  const body = `${printHeader({ eyebrow, title, topic, meta })}
<ol class="word-list">${items}</ol>
${printFooter(`${words.length} word${words.length === 1 ? "" : "s"}`)}`;
  return { style, body };
}

// Word in column one, two blank ruled columns for handwriting practice.
function writingPracticeSection({ title, topic, meta, words }) {
  const rows = words
    .map((w) => `
    <tr>
      <td class="word-cell">${escapeHtml(w.word)}</td>
      <td class="blank-cell"></td>
      <td class="blank-cell"></td>
    </tr>`)
    .join("");

  const style = `
table{width:100%;border-collapse:collapse;margin-top:16px;table-layout:fixed}
thead th{text-align:left;font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:600;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:0 8px 7px 0;border-bottom:2px solid var(--ink)}
thead th:first-child{width:28%}
tr{break-inside:avoid}
.word-cell{font-weight:800;font-size:17px;line-height:1.2;letter-spacing:.005em;padding:14px 14px 10px 0;border-bottom:1px solid var(--line);vertical-align:bottom}
.blank-cell{height:54px;border-bottom:1px dotted var(--dot)}
.blank-cell + .blank-cell{border-left:1px dashed var(--line)}
`;
  const body = `${printHeader({ eyebrow: "Writing practice", title, topic, meta })}
<table>
  <thead><tr><th>Word</th><th>Write it</th><th>Write it again</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
${printFooter("Practise writing each word twice.")}`;
  return { style, body };
}

// Wordsearch grid with the word bank listed alongside it, rather than
// underneath — easier to scan while hunting on paper.
function wordSearchSection({ title, topic, meta, words, gridSize, gridDirections, gridLetterCase }) {
  const size = gridSize || 10;
  const dirs = buildDirections(gridDirections);
  const wordStrings = words.map((w) => w.word);
  const { grid, placed } = buildGrid(wordStrings, size, dirs, gridLetterCase);
  const letters = grid.map((row) => row.map((cell) => cell.letter));
  const cellPx = gridLetterCase === "lowercase" ? 32 : 26;
  const cellFont = gridLetterCase === "lowercase" ? 17 : 12;
  const wordFont = gridLetterCase === "lowercase" ? 15 : 12;

  const style = `
.layout{display:flex;gap:40px;margin-top:20px;align-items:flex-start}
.grid{display:grid;grid-template-columns:repeat(${size},1fr);gap:2px;width:fit-content;flex-shrink:0}
.cell{width:${cellPx}px;height:${cellPx}px;display:flex;align-items:center;justify-content:center;font-family:'Lexend',system-ui,sans-serif;font-variant-numeric:tabular-nums;font-weight:600;font-size:${cellFont}px;border:1px solid var(--line);border-radius:4px}
.words-col{flex:1;min-width:120px}
.words-col .label{margin-top:0}
.words{list-style:none}
.words li{font-weight:600;font-size:${wordFont}px;${gridLetterCase === "lowercase" ? "" : "text-transform:uppercase;"}letter-spacing:${gridLetterCase === "lowercase" ? ".02em" : ".1em"};padding:6px 0;border-bottom:1px solid var(--line)}
`;
  const body = `${printHeader({ eyebrow: "Word search", title, topic, meta })}
<div class="layout">
  <div class="grid">${letters.flat().map((l) => `<div class="cell">${l}</div>`).join("")}</div>
  <div class="words-col">
    <p class="label">Find these words</p>
    <ul class="words">${placed.map(({ word }) => `<li>${escapeHtml(word)}</li>`).join("")}</ul>
  </div>
</div>
${printFooter("Find all the words hidden in the grid.")}`;
  return { style, body };
}

// ── Single-sheet documents ──────────────────────────────────────────────
// Each wraps one section as a standalone print job — used where only
// one format is ever printed at a time (the term's "full list" button).

export function buildWordsOnlySheet(opts) {
  const { style, body } = wordsOnlySection(opts);
  return wrapDocument(`Spelling list – ${opts.title}`, style, `<div class="sheet-page">${body}</div>`);
}

export function buildWritingPracticeSheet(opts) {
  const { style, body } = writingPracticeSection(opts);
  return wrapDocument(`Writing practice – ${opts.title}`, style, `<div class="sheet-page">${body}</div>`);
}

export function buildWordSearchSheet(opts) {
  const { style, body } = wordSearchSection(opts);
  return wrapDocument(`Word search – ${opts.title}`, style, `<div class="sheet-page">${body}</div>`);
}

// ── Combined multi-format document ──────────────────────────────────────
// `types` is an ordered array drawn from "words" | "writing" |
// "wordsearch"; each becomes its own page in one print job, so picking
// several formats produces a single print dialog rather than one per
// format.
const SECTION_BUILDERS = {
  words: wordsOnlySection,
  writing: writingPracticeSection,
  wordsearch: wordSearchSection,
};

export function buildCombinedSheet(docTitle, types, opts) {
  const sections = types.map((type) => SECTION_BUILDERS[type](opts));
  const style = sections.map((s) => s.style).join("\n");
  const body = sections.map((s) => `<div class="sheet-page">${s.body}</div>`).join("");
  return wrapDocument(docTitle, style, body);
}
