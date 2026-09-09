// Printable worksheet HTML, generated for a new browser tab and sent
// straight to window.print() — same approach as WordSearch.jsx's
// original print button, generalised to the other sheet types a
// weekly/term print menu can produce. Each sheet type is built as a
// {style, body} "section" internally so several can be combined into
// one print job (one page per section) when more than one format is
// picked at once.

import { buildDirections, buildGrid } from "@/lib/wordSearchGrid";

const BASE_STYLES = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier New',monospace;background:#fff;color:#111}
.sheet-page{padding:36px 40px}
.sheet-page + .sheet-page{break-before:page;page-break-before:always}
.eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#666;margin-bottom:4px}
h1{font-size:26px;font-weight:900;letter-spacing:-.02em}
.topic{font-size:13px;color:#333;margin-top:10px;border-left:3px solid #0ea5e9;padding-left:10px;line-height:1.5;font-weight:700}
.meta{font-size:11px;color:#777;margin-top:6px;letter-spacing:.05em;text-transform:uppercase}
.label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#777;margin-bottom:8px;margin-top:24px}
footer{margin-top:28px;font-size:10px;color:#bbb}
`;

function escapeHtml(value) {
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

function printHeader({ eyebrow, title, topic, meta }) {
  return `
<p class="eyebrow">SPELL// ST&#9733;RS &mdash; ${escapeHtml(eyebrow)}</p>
<h1>${escapeHtml(title)}</h1>
${topic ? `<p class="topic">${escapeHtml(topic)}</p>` : ""}
${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}`;
}

function wrapDocument(docTitle, style, body) {
  return `<!DOCTYPE html><html><head><title>${escapeHtml(docTitle)}</title><style>${BASE_STYLES}${style}</style></head><body>${body}</body></html>`;
}

// Opens a new tab, writes the given HTML into it and triggers the print
// dialog once it's rendered.
export function openPrintWindow(html) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 300);
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
.word-list{list-style:none;margin-top:20px}
.word-list li{padding:12px 0;border-bottom:1px solid #eee}
.w{font-size:18px;font-weight:900;letter-spacing:.02em}
.meaning{font-size:13px;color:#444;margin-top:4px}
.sentence{font-size:13px;color:#555;margin-top:3px;line-height:1.5}
.hl{font-weight:900;color:#0284c7;text-decoration:underline}
`;
  const body = `${printHeader({ eyebrow, title, topic, meta })}
<ol class="word-list">${items}</ol>
<footer>${words.length} word${words.length === 1 ? "" : "s"}</footer>`;
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
table{width:100%;border-collapse:collapse;margin-top:20px}
thead th{text-align:left;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#888;padding-bottom:8px;border-bottom:2px solid #111}
.word-cell{font-size:17px;font-weight:900;padding:16px 14px 16px 0;width:28%;border-bottom:1px solid #ddd;vertical-align:bottom}
.blank-cell{border-bottom:1.5px solid #111;height:54px}
.blank-cell + .blank-cell{border-left:1px dashed #ccc}
`;
  const body = `${printHeader({ eyebrow: "Writing practice", title, topic, meta })}
<table>
  <thead><tr><th>Word</th><th>Write it</th><th>Write it again</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<footer>Practise writing each word twice.</footer>`;
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
.layout{display:flex;gap:40px;margin-top:22px;align-items:flex-start}
.grid{display:grid;grid-template-columns:repeat(${size},1fr);gap:2px;width:fit-content;flex-shrink:0}
.cell{width:${cellPx}px;height:${cellPx}px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${cellFont}px;border:1px solid #ccc}
.words-col{flex:1;min-width:120px}
.words-col .label{margin-top:0}
.words{list-style:none}
.words li{font-size:${wordFont}px;${gridLetterCase === "lowercase" ? "" : "text-transform:uppercase;"}letter-spacing:.1em;padding:6px 0;border-bottom:1px solid #eee}
`;
  const body = `${printHeader({ eyebrow: "Word search", title, topic, meta })}
<div class="layout">
  <div class="grid">${letters.flat().map((l) => `<div class="cell">${l}</div>`).join("")}</div>
  <div class="words-col">
    <p class="label">Find these words</p>
    <ul class="words">${placed.map(({ word }) => `<li>${escapeHtml(word)}</li>`).join("")}</ul>
  </div>
</div>
<footer>Find all the words hidden in the grid.</footer>`;
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
