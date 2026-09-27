import { useEffect, useState } from "react";
import { Trash2, RefreshCw, Lightbulb, Bug, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

// Password-gated view of everything submitted through /feedback. The
// password itself lives server-side only (the ADMIN_PASSWORD env var on
// the Cloudflare Pages Function at functions/api/feedback.js) — this page
// just holds it in sessionStorage for the tab's lifetime once entered, so
// it isn't asked for on every reload but also isn't kept long-term.
// No link anywhere on the site points here.

const STORAGE_KEY = "spell-stars-admin-password";

const CATEGORY_META = {
  feature: { label: "Feature request", icon: Lightbulb },
  bug: { label: "Bug report", icon: Bug },
  feedback: { label: "Feedback", icon: MessageSquare },
};

export default function AdminFeedbackPage() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (pw) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", { headers: { Authorization: `Bearer ${pw}` } });
      if (res.status === 401) {
        setError("Wrong password.");
        setEntries(null);
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setEntries(data.entries);
      sessionStorage.setItem(STORAGE_KEY, pw);
    } catch {
      setError("Couldn't load feedback. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (password) load(password);
    // Only ever auto-run once, on mount, with whatever password sessionStorage had.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = (event) => {
    event.preventDefault();
    if (password) load(password);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/feedback?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) throw new Error("Request failed");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Deleted.");
    } catch {
      toast.error("Couldn't delete that entry.");
    }
  };

  if (!entries) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
          <h1 className="font-display text-xl font-bold">Admin — Feedback</h1>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            data-testid="admin-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !password} data-testid="admin-unlock">
            {loading ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Feedback ({entries.length})</h1>
          <Button variant="outline" size="sm" onClick={() => load(password)} data-testid="admin-refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => {
              const meta = CATEGORY_META[entry.category] || CATEGORY_META.feedback;
              const Icon = meta.icon;
              return (
                <li key={entry.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] text-primary">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {meta.label}
                    </span>
                    <span className="flex items-center gap-3">
                      {new Date(entry.createdAt).toLocaleString("en-GB")}
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete entry"
                        data-testid={`admin-delete-${entry.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{entry.message}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
