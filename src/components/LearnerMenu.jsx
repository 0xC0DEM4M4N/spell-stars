// "Who's practising?" -- lets more than one child share this device, each
// with their own saved progress (see lib/learners.js). A header button next
// to the nav, always visible (including on mobile, unlike the collapsed nav
// links) since switching who's practising is a routine, one-tap action.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Pencil, Plus, Trash2, Trophy, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAIN_LEARNER_ID, useLearners } from "@/context/LearnerContext";
import { displayName } from "@/lib/learners";

function LearnerRow({ learner, active, onSelect, onRename, onRemove, onClearProgress }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(learner.name);
  const [error, setError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const startEditing = (e) => {
    e.stopPropagation();
    setDraft(learner.name);
    setError("");
    setEditing(true);
  };

  const submitRename = (e) => {
    e.preventDefault();
    const result = onRename(learner.id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        onSubmit={submitRename}
        className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 p-3"
        data-testid={"learner-row-editing-" + learner.id}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="First name or nickname"
          maxLength={24}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid={"learner-rename-input-" + learner.id}
        />
        <button type="submit" className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:opacity-90" aria-label="Save name" data-testid={"learner-rename-save-" + learner.id}>
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border p-1.5 text-foreground hover:border-primary/50" aria-label="Cancel">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        {error && <p className="w-full text-xs text-destructive" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border p-3 transition-colors duration-150 ${
        active ? "border-primary bg-primary/10" : "border-border bg-muted/40 hover:border-primary/50"
      }`}
      data-testid={"learner-row-" + learner.id}
    >
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onSelect(learner.id)}
        className="flex flex-1 items-center gap-2.5 text-left"
        data-testid={"learner-select-" + learner.id}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            active ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground"
          }`}
          aria-hidden="true"
        >
          {displayName(learner).slice(0, 1).toUpperCase()}
        </span>
        <span className="text-sm font-semibold text-foreground">{displayName(learner)}</span>
        {active && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
      </button>
      <button type="button" onClick={startEditing} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" aria-label={"Rename " + displayName(learner)} data-testid={"learner-edit-" + learner.id}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {learner.id === MAIN_LEARNER_ID ? (
        confirmingClear ? (
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => { onClearProgress(learner.id); setConfirmingClear(false); }} className="rounded-lg bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90" data-testid={"learner-confirm-clear-" + learner.id}>
              Clear
            </button>
            <button type="button" onClick={() => setConfirmingClear(false)} className="rounded-lg border border-border px-2 py-1 text-xs text-foreground">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmingClear(true)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label={"Clear " + displayName(learner) + "'s progress"} data-testid={"learner-clear-" + learner.id}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )
      ) : confirmingClear ? (
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => { onRemove(learner.id); setConfirmingClear(false); }} className="rounded-lg bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90" data-testid={"learner-confirm-remove-" + learner.id}>
            Remove
          </button>
          <button type="button" onClick={() => setConfirmingClear(false)} className="rounded-lg border border-border px-2 py-1 text-xs text-foreground">
            Keep
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmingClear(true)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label={"Remove " + displayName(learner)} data-testid={"learner-remove-" + learner.id}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function AddLearnerForm({ onAdd }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const result = onAdd(name, { select: true });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setError("");
  };

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name or nickname"
          maxLength={24}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="learner-add-input"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          data-testid="learner-add-submit"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add
        </button>
      </div>
      {error && <p className="text-xs text-destructive" role="alert" data-testid="learner-add-error">{error}</p>}
    </form>
  );
}

export function LearnerMenu() {
  const [open, setOpen] = useState(false);
  const { learners, activeLearnerId, activeLearner, selectLearner, addLearner, renameLearner, removeLearner, clearLearnerProgress } = useLearners();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary"
        aria-label="Who's practising"
        data-testid="learner-menu-button"
      >
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-[6rem] truncate normal-case tracking-normal">{displayName(activeLearner)}</span>
      </button>
      <DialogContent className="max-w-md border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Who's practising?</DialogTitle>
        </DialogHeader>

        <Link
          to="/progress"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-primary/10"
          data-testid="progress-link"
        >
          <Trophy className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          My progress
          <span className="ml-1 text-xs font-normal text-muted-foreground">Badges &amp; status</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>

        <div className="mt-3 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div role="radiogroup" aria-label="Learners" className="space-y-2" data-testid="learner-list">
            {learners.map((learner) => (
              <LearnerRow
                key={learner.id}
                learner={learner}
                active={learner.id === activeLearnerId}
                onSelect={selectLearner}
                onRename={renameLearner}
                onRemove={removeLearner}
                onClearProgress={clearLearnerProgress}
              />
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Add a learner</p>
            <AddLearnerForm onAdd={addLearner} />
          </div>

          <p className="text-xs text-muted-foreground">
            Use a first name or nickname &mdash; names are saved on this device, and are included in backups, links and QR codes if this
            person makes one.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
