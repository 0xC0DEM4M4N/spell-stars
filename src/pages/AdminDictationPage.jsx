import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

// Password-gated report on dictation's "Write with AI": how much of the free
// daily AI allowance has been used, and the sets of sentences saved so far
// (any of which can be deleted). Uses the same password as /admin/feedback,
// kept the same way, in sessionStorage for the tab's lifetime only. The data
// comes from the GET and DELETE handlers in functions/api/dictation.js.
// No link anywhere on the public site points here.

const STORAGE_KEY = "spell-stars-admin-password";

const num = (n) => Number(n || 0).toLocaleString("en-GB", { maximumFractionDigits: 1 });
const friendlyKey = (key) => {
  const [year, week, language] = key.replace(/^dict:/, "").split("|");
  return `${year} · week ${String(week || "").replace("w", "")} · ${language}`;
};

export default function AdminDictationPage() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (pw) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dictation", { headers: { Authorization: `Bearer ${pw}` } });
      if (res.status === 401) {
        setError("Wrong password.");
        setReport(null);
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      setReport(await res.json());
      sessionStorage.setItem(STORAGE_KEY, pw);
    } catch {
      setError("Couldn't load the report. Try again.");
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

  const handleDelete = async (key) => {
    try {
      const res = await fetch(`/api/dictation?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) throw new Error("Request failed");
      setReport((prev) => ({
        ...prev,
        lessonCount: prev.lessonCount - 1,
        lessons: prev.lessons.filter((l) => l.key !== key),
      }));
      toast.success("Deleted. The next person to ask will get a new set written.");
    } catch {
      toast.error("Couldn't delete that.");
    }
  };

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <form onSubmit={handleUnlock} className="w-full max-w-sm space-y-4">
          <h1 className="font-display text-xl font-bold">Admin: Dictation AI</h1>
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

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = report.days.find((d) => d.day === today);
  const usedToday = todayRow ? todayRow.neurons : 0;
  const percent = Math.min(100, (usedToday / report.allowance) * 100);
  const anyEstimated = report.days.some((d) => d.estimated);

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Dictation AI</h1>
          <div className="flex items-center gap-3">
            <Link to="/admin/feedback" className="text-sm text-muted-foreground underline hover:text-primary">
              Feedback
            </Link>
            <Button variant="outline" size="sm" onClick={() => load(password)} data-testid="admin-refresh">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        <section className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4" data-testid="dictation-today">
          <h2 className="text-sm font-semibold">Today (UTC) against the free daily allowance</h2>
          <p className="mt-2 text-2xl font-bold">
            {num(usedToday)} <span className="text-base font-normal text-muted-foreground">of {num(report.allowance)} Neurons</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Share of today's free Neurons used">
            <div className={`h-full ${percent > 80 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Resets at 00:00 UTC. Neurons are worked out from the token counts the AI reports, using Cloudflare's published
            price for the model{anyEstimated ? ", and some days are estimated because no counts were reported" : ""}. Check
            one day against the Workers AI page in Cloudflare to be sure.
          </p>
        </section>

        <section className="mt-6" data-testid="dictation-days">
          <h2 className="mb-2 text-sm font-semibold">Last 14 days with activity</h2>
          {report.days.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new sets have been written yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-foreground/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/[0.04] text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Day</th>
                    <th className="px-3 py-2 font-medium">Sets written</th>
                    <th className="px-3 py-2 font-medium">Failed</th>
                    <th className="px-3 py-2 font-medium">Tokens in / out</th>
                    <th className="px-3 py-2 font-medium">Neurons</th>
                  </tr>
                </thead>
                <tbody>
                  {[...report.days].reverse().map((d) => (
                    <tr key={d.day} className="border-t border-foreground/10">
                      <td className="px-3 py-2">{d.day}</td>
                      <td className="px-3 py-2">{num(d.written)}</td>
                      <td className="px-3 py-2">{num(d.failed)}</td>
                      <td className="px-3 py-2">
                        {num(d.inputTokens)} / {num(d.outputTokens)}
                      </td>
                      <td className="px-3 py-2">
                        {num(d.neurons)}
                        {d.estimated ? " (est.)" : ""}
                        {d.written > 0 && <span className="ml-1 text-xs text-muted-foreground">({num(d.neurons / d.written)} each)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8" data-testid="dictation-saved">
          <h2 className="mb-2 text-sm font-semibold">
            Saved sets ({num(report.lessonCount)} {report.lessonCount === 1 ? "week" : "weeks"})
          </h2>
          {report.lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
          ) : (
            <ul className="space-y-2">
              {report.lessons.map((lesson) => (
                <li key={lesson.key} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                      <span>
                        <span className="font-medium">{friendlyKey(lesson.key)}</span>{" "}
                        <span className="text-muted-foreground">
                          · {lesson.sets.length} {lesson.sets.length === 1 ? "set" : "sets"}
                        </span>
                      </span>
                    </summary>
                    <ol className="mt-3 space-y-3 text-sm">
                      {lesson.sets.map((set, i) => (
                        <li key={i}>
                          <p className="text-xs font-semibold text-muted-foreground">Set {i + 1}</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {set.map((line, j) => (
                              <li key={j}>{line.text}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      onClick={() => handleDelete(lesson.key)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                      data-testid={`dictation-delete-${lesson.key}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete all sets for this week
                    </button>
                  </details>
                </li>
              ))}
            </ul>
          )}
          {report.lessonCount > report.lessons.length && (
            <p className="mt-3 text-xs text-muted-foreground">Showing the first {report.lessons.length} weeks.</p>
          )}
        </section>
      </div>
    </div>
  );
}
