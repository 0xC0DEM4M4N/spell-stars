// A one-time "who's practising?" prompt for a shared device with more than
// one named learner (see lib/learners.js). Shown on a year or custom-list
// page -- the moment progress is about to be read or saved -- rather than
// site-wide, so it never interrupts browsing the home page. It only asks
// once per browser tab (LearnerContext's chosenThisSession): after that, the
// device just remembers who practised last, same as before learners existed.
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { useLearners } from "@/context/LearnerContext";
import { displayName } from "@/lib/learners";
import { AddLearnerForm } from "@/components/LearnerMenu";

export function LearnerGate() {
  const { learners, hasMultipleLearners, chosenThisSession, selectLearner, addLearner } = useLearners();
  const [adding, setAdding] = useState(false);

  if (!hasMultipleLearners || chosenThisSession) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-5 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Who's practising?"
      data-testid="learner-gate"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-xl">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">Who's practising?</h2>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">So the right person's progress gets saved.</p>

        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Learners">
          {learners.map((learner) => (
            <button
              key={learner.id}
              type="button"
              onClick={() => selectLearner(learner.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left transition-colors duration-150 hover:border-primary/50 hover:bg-primary/10"
              data-testid={"learner-gate-select-" + learner.id}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-bold text-foreground"
                aria-hidden="true"
              >
                {displayName(learner).slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-foreground">{displayName(learner)}</span>
            </button>
          ))}
        </div>

        {adding ? (
          <div className="mt-4 border-t border-border pt-4">
            <AddLearnerForm onAdd={addLearner} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="learner-gate-add"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Someone else
          </button>
        )}
      </div>
    </div>
  );
}
