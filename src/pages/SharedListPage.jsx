// /shared#<packed list> — the page a shared link opens. Shows the words in
// the challenge and lets the receiver add them to their own custom lists.
// Nothing is saved until they press the button.
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getYearsConfig, getYearWords } from "@/lib/yearData";
import { MAX_NAME_LENGTH, addBuiltInMeanings, createList, loadLists, upsertList } from "@/lib/customLists";
import { decodeShare } from "@/lib/shareList";

function Shell({ children }) {
  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      <title>Spelling challenge | SPELL// STARS</title>
      {/* A shared list is personal: keep the link out of search. */}
      <meta name="robots" content="noindex" />
      <SiteHeader />
      <main className="px-5 pb-16 pt-32 sm:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

export default function SharedListPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const shared = useMemo(() => decodeShare(hash), [hash]);
  const [name, setName] = useState(shared ? shared.name : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!shared) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl text-center" data-testid="shared-invalid">
          <h1 className="type-section font-display text-3xl font-extrabold text-foreground">That link isn't working</h1>
          <p className="mt-4 type-body text-sm text-muted-foreground">
            It may have been cut short when it was sent. Ask for it to be sent again, or make a list of your own.
          </p>
          <Link to="/custom" className="mt-6 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Make a list
          </Link>
        </div>
      </Shell>
    );
  }

  const add = async () => {
    setSaving(true);
    setError("");
    try {
      const existing = loadLists(window.localStorage);
      // Fill in meanings for any words we already know, as when making a list.
      const { words } = await addBuiltInMeanings(shared.words, { getYearsConfig, getYearWords });
      const list = createList({ name, words, existingIds: existing.map((l) => l.id) });
      const result = upsertList(window.localStorage, list);
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      navigate("/custom/" + list.id, { replace: true });
    } catch (err) {
      setError("Something went wrong saving the list. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl" data-testid="shared-page">
        <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">A spelling challenge</div>
        <h1 className="mt-3 type-section font-display text-4xl font-extrabold text-foreground">
          Someone has challenged you!
        </h1>
        <p className="mt-4 type-body text-base text-muted-foreground">
          {shared.words.length} {shared.words.length === 1 ? "word" : "words"} to learn. Add them to your own lists to
          practise, play a word search and print them. Nothing is saved until you add them.
        </p>

        <ul className="mt-8 flex flex-wrap gap-2" data-testid="shared-words">
          {shared.words.map((w) => (
            <li key={w.word} className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 font-display text-sm font-semibold text-foreground">
              {w.word}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <label htmlFor="shared-list-name" className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            List name
          </label>
          <input
            id="shared-list-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-foreground/15 bg-foreground/5 px-3 py-2.5 text-sm text-foreground"
            data-testid="shared-list-name"
          />
        </div>

        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={add}
            disabled={saving}
            className="press-soft inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            data-testid="shared-add"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" /> {saving ? "Adding…" : "Accept the challenge"}
          </button>
          <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-primary">
            No thanks
          </Link>
        </div>
      </div>
    </Shell>
  );
}
