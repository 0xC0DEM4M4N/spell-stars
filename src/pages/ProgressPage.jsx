// /progress -- "My progress": the status ladder (see lib/badges.js's
// STATUS_TIERS/computeStatus) and the badge grid, for whoever is currently
// practising on this device.
//
// This page is read-only -- badges and status are only ever written at the
// moment a crossword or word search is actually completed (Crossword.jsx,
// WordSearch.jsx), or, later, by a logged offline check-in. All this page
// does is display what's already been recorded, and catch up on a status
// tier crossed since the last visit (checkStatus() is safe to call on every
// load -- it only ever stamps a "first reached" date once).
import { useEffect, useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnimalMedal } from "@/components/AnimalIcon";
import { useLearners } from "@/context/LearnerContext";
import { displayName } from "@/lib/learners";
import { BADGES, badgeProgress, checkStatus, computeStatus, loadBadges, totalCorrectCount } from "@/lib/badges";

const GROUPS = [
  { key: "crossword", label: "Crossword", badgeIds: ["crossword-10", "crossword-25", "crossword-50", "quick-solve"] },
  { key: "wordsearch", label: "Word search", badgeIds: ["wordsearch-10", "wordsearch-25", "wordsearch-50", "speedster"] },
  { key: "gold", label: "Gold stars", badgeIds: ["gold-star", "gold-streak-5", "gold-streak-20"] },
];

const formatDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Shell({ children }) {
  return (
    <div className="bg-grid-squares min-h-screen bg-background text-foreground">
      <title>{"My progress | SPELL// STARS"}</title>
      <meta name="robots" content="noindex" />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

function LearnerSwitcher({ learners, activeLearnerId, selectLearner }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Whose progress to show" data-testid="progress-learner-switcher">
      {learners.map((l) => {
        const active = l.id === activeLearnerId;
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => selectLearner(l.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-primary text-primary-foreground" : "border border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
            data-testid={"progress-learner-" + l.id}
          >
            {displayName(l)}
          </button>
        );
      })}
    </div>
  );
}

function StatusBanner({ status }) {
  const pct = Math.round(status.progress * 100);
  // Beyond the named tiers, "next" is always another Galaxy level -- show
  // the number it will be, not just "Galaxy" over and over.
  const nextLabel = status.key === "galaxy" ? "Galaxy ×" + (status.level + 1) : status.nextStatus;
  return (
    <div className="holo-card rounded-3xl p-6 sm:p-8" data-testid="status-banner">
      <div className="flex flex-wrap items-center gap-5">
        <AnimalMedal kind={status.key} title={status.animal} size="h-20 w-20" />
        <div className="min-w-[12rem] flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Current status</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-foreground" data-testid="status-label">
            {status.label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{status.points.toLocaleString()} points earned</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Next</div>
            <div className="text-sm font-semibold text-muted-foreground">{nextLabel}</div>
          </div>
          <AnimalMedal kind={status.nextKey} title={nextLabel} size="h-12 w-12" dim />
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: pct + "%" }} data-testid="status-progress-bar" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {status.pointsToNext > 0
            ? status.pointsToNext.toLocaleString() + " more point" + (status.pointsToNext === 1 ? "" : "s") + " to become a " + status.nextAnimal.toLowerCase() + "."
            : "About to become a " + status.nextAnimal.toLowerCase() + "!"}
        </p>
      </div>
    </div>
  );
}

function BadgeTile({ badge, info }) {
  const pct = info.threshold ? Math.round((info.current / info.threshold) * 100) : 0;
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${info.earned ? "border-primary/40 bg-primary/10" : "border-foreground/10 bg-foreground/[0.03]"}`}
      data-testid={"badge-" + badge.id}
    >
      <div className="font-display text-sm font-bold text-foreground">{badge.label}</div>
      <p className="mt-1 text-xs text-muted-foreground">{badge.hint}</p>
      {info.earned ? (
        <p className="mt-2 text-xs font-semibold text-primary" data-testid={"badge-earned-" + badge.id}>
          Earned {formatDate(info.date)}
        </p>
      ) : info.threshold != null ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground" data-testid={"badge-progress-" + badge.id}>
            {info.current}/{info.threshold}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-foreground/30" style={{ width: pct + "%" }} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Not earned yet</p>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { learners, activeLearnerId, activeLearner, selectLearner, hasMultipleLearners } = useLearners();

  // Catch up on a status tier crossed since the last visit (for example an
  // offline check-in logged elsewhere) so the "first reached" date is
  // stamped as soon as this page is opened, not left missing forever.
  useEffect(() => {
    checkStatus(window.localStorage, activeLearnerId);
  }, [activeLearnerId]);

  const points = useMemo(() => totalCorrectCount(window.localStorage, activeLearnerId), [activeLearnerId]);
  const status = useMemo(() => computeStatus(points), [points]);
  const badgesData = useMemo(() => loadBadges(window.localStorage, activeLearnerId), [activeLearnerId]);

  return (
    <Shell>
      <div className="border-b border-foreground/10 px-6 pb-6 pt-28 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">My progress</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground sm:text-4xl" data-testid="progress-heading">
            {displayName(activeLearner)}'s progress
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A running total of every correct answer, across every year and list this device has practised — it only ever goes up.
          </p>
          {hasMultipleLearners && (
            <LearnerSwitcher learners={learners} activeLearnerId={activeLearnerId} selectLearner={selectLearner} />
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8 sm:px-8">
        <StatusBanner status={status} />

        <div data-testid="badge-groups">
          {GROUPS.map((group) => (
            <section key={group.key} className="mt-8 first:mt-0">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{group.label}</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.badgeIds.map((id) => {
                  const badge = BADGES.find((b) => b.id === id);
                  return <BadgeTile key={id} badge={badge} info={badgeProgress(badgesData, badge)} />;
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </Shell>
  );
}
