// /word-origins — a hidden reference page (not in the menu, footer or
// sitemap, and marked noindex). Lists every word in every year in one place,
// with the origin filled in where the definition explains where the word
// comes from, so the origins can be checked against a dictionary. Ticks are
// kept in this browser only.
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getYearsConfig, getYearWords } from "@/lib/yearData";
import { collectOrigins } from "@/lib/wordOrigins";

const CHECKED_KEY = "spellstars.originsChecked";

const readChecked = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHECKED_KEY));
    return Array.isArray(raw) ? new Set(raw) : new Set();
  } catch (err) {
    return new Set();
  }
};

const yearLabel = (slug) => (slug === "reception" ? "Reception" : slug.replace(/^year/, "Year "));

const FIELD =
  "rounded-xl border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm text-foreground";

export default function WordOriginsPage() {
  const [rows, setRows] = useState(null); // null while loading
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [year, setYear] = useState("all");
  const [show, setShow] = useState("all"); // all | with | without
  const [hideChecked, setHideChecked] = useState(false);
  const [checked, setChecked] = useState(readChecked);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await getYearsConfig();
        const lists = await Promise.all(
          config.years.map((y) => getYearWords(y.slug, y.wordListPath).then((entries) => [y.slug, entries])),
        );
        if (!cancelled) setRows(collectOrigins(Object.fromEntries(lists)));
      } catch (err) {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (word) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const key = word.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(CHECKED_KEY, JSON.stringify([...next]));
      } catch (err) {
        // Ticks just won't be remembered.
      }
      return next;
    });
  };

  const languages = useMemo(() => {
    const counts = new Map();
    (rows || []).forEach((r) => r.language && counts.set(r.language, (counts.get(r.language) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const years = useMemo(() => [...new Set((rows || []).flatMap((r) => r.years))], [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (show === "with" && !r.language) return false;
      if (show === "without" && r.language) return false;
      if (language !== "all" && r.language !== language) return false;
      if (year !== "all" && !r.years.includes(year)) return false;
      if (hideChecked && checked.has(r.word.toLowerCase())) return false;
      if (!q) return true;
      return (r.word + " " + r.origin + " " + r.meaning).toLowerCase().includes(q);
    });
  }, [rows, query, language, year, show, hideChecked, checked]);
  const withOrigin = useMemo(() => (rows || []).filter((r) => r.language).length, [rows]);

  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      <title>Word origins | SPELL// STARS</title>
      <meta name="robots" content="noindex" />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-28 sm:px-8">
        <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Reference</div>
        <h1 className="mt-3 type-section font-display text-3xl font-extrabold sm:text-4xl">Word origins</h1>
        <p className="mt-3 max-w-3xl type-body text-sm text-muted-foreground">
          Every word in every year, one row per word. Where a definition explains the word's origin, it is filled in
          here; the other rows are left blank for now. The origins were written from general knowledge and have not yet
          been checked against a dictionary, so tick each row as you confirm it. Ticks are saved in this browser only.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Search
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Word, root or meaning"
              className={FIELD + " w-64"}
              data-testid="origins-search"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={FIELD} data-testid="origins-language">
              <option value="all">All languages</option>
              {languages.map(([name, n]) => (
                <option key={name} value={name}>{name} ({n})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Show
            <select value={show} onChange={(e) => setShow(e.target.value)} className={FIELD} data-testid="origins-show">
              <option value="all">All words</option>
              <option value="with">With an origin</option>
              <option value="without">Without an origin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Year
            <select value={year} onChange={(e) => setYear(e.target.value)} className={FIELD}>
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>{yearLabel(y)}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <input type="checkbox" checked={hideChecked} onChange={(e) => setHideChecked(e.target.checked)} />
            Hide ticked
          </label>
        </div>

        <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground" role="status" data-testid="origins-count">
          {rows
            ? shown.length + " of " + rows.length + " words · " + withOrigin + " with an origin · " + checked.size + " checked"
            : failed
              ? ""
              : "Loading…"}
        </p>
        {failed && <p className="mt-4 text-sm text-destructive" role="alert">Couldn't load the word lists.</p>}

        {rows && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-foreground/10">
            <table className="w-full min-w-[46rem] border-collapse text-left text-sm" data-testid="origins-table">
              <caption className="sr-only">Words and where they come from</caption>
              <thead className="bg-foreground/5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">Checked</span></th>
                  <th scope="col" className="px-3 py-3">Word</th>
                  <th scope="col" className="px-3 py-3">Language</th>
                  <th scope="col" className="px-3 py-3">Origin</th>
                  <th scope="col" className="px-3 py-3">Meaning today</th>
                  <th scope="col" className="px-3 py-3">Years</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const done = checked.has(r.word.toLowerCase());
                  return (
                    <tr key={r.word} className={"border-t border-foreground/10 align-top " + (done ? "bg-success/10" : "")}>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={"Checked: " + r.word}
                          onClick={() => toggle(r.word)}
                          className={
                            "flex h-6 w-6 items-center justify-center rounded-md border " +
                            (done ? "border-success bg-success text-background" : "border-foreground/30")
                          }
                        >
                          {done && <Check className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </td>
                      <th scope="row" className="px-3 py-3 font-display text-base font-bold text-foreground">{r.word}</th>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{r.language}</td>
                      <td className="px-3 py-3 text-foreground">{r.origin}</td>
                      <td className="px-3 py-3 text-muted-foreground">{r.meaning}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{r.years.map(yearLabel).join(", ")}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No words match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
