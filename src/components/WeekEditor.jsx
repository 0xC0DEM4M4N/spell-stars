import { useState } from "react";
import axios from "axios";
import { Pencil, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const WeekEditor = ({ week, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [learningPoint, setLearningPoint] = useState("");
  const [words, setWords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const handleOpenChange = (v) => {
    if (v) {
      setLearningPoint(week.learningPoint);
      setWords(week.words.map(w => ({ text: w.text, challenge: w.challenge })));
    }
    setOpen(v);
  };

  const updateWord = (i, field, value) =>
    setWords(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w));

  const removeWord = (i) => setWords(prev => prev.filter((_, idx) => idx !== i));

  const addWord = () => setWords(prev => [...prev, { text: "", challenge: false }]);

  const handleSave = async () => {
    const validWords = words.filter(w => w.text.trim());
    if (!validWords.length) {
      toast.error("At least one word is required.");
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`${API}/programme/${week.week}`, {
        learning_point: learningPoint.trim(),
        words: validWords,
      });
      toast.success(`Week ${week.week} saved`, { description: "Changes will appear straight away." });
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Could not save changes — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await axios.delete(`${API}/programme/${week.week}/reset`);
      toast.success(`Week ${week.week} reset`, { description: "Restored to original programme data." });
      setResetOpen(false);
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Could not reset — please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200 hover:border-amber-300/50 hover:bg-amber-300/10 hover:text-amber-200"
          data-testid="edit-week-button"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[88vh] max-w-lg overflow-y-auto border-amber-300/20 bg-[#08101f] p-0 text-slate-100"
        data-testid="week-editor-dialog"
      >
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-300">
              Edit // Week {String(week.week).padStart(2, "0")}
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold text-white">
              Weekly Editor
            </DialogTitle>
            <p className="text-sm text-slate-400">
              Changes are saved to the server and persist across sessions.
            </p>
          </DialogHeader>

          {/* Learning point */}
          <div className="mb-7">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Learning Point
            </label>
            <textarea
              value={learningPoint}
              onChange={e => setLearningPoint(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder-slate-600 outline-none transition-colors focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/25"
              placeholder="e.g. /dʒ/ spelled dge/ge at end of words"
              data-testid="edit-learning-point"
            />
          </div>

          {/* Word list */}
          <div>
            <label className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Words
              <span className="ml-2 text-slate-600">— ★ marks challenge words</span>
            </label>

            <div className="space-y-2">
              {words.map((word, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={word.text}
                    onChange={e => updateWord(i, "text", e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-display text-base font-bold text-slate-100 outline-none transition-colors placeholder-slate-600 focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/25"
                    placeholder="Word…"
                    data-testid={`edit-word-${i}`}
                  />
                  <button
                    onClick={() => updateWord(i, "challenge", !word.challenge)}
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                      word.challenge
                        ? "border-amber-300/60 bg-amber-300/15 text-amber-300"
                        : "border-white/10 bg-white/5 text-slate-600 hover:border-amber-300/40 hover:text-amber-200"
                    }`}
                    title="Toggle challenge word"
                    data-testid={`toggle-challenge-${i}`}
                  >
                    <Star className="h-3.5 w-3.5" fill={word.challenge ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => removeWord(i)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-600 transition-colors hover:border-rose-300/50 hover:bg-rose-400/10 hover:text-rose-300"
                    title="Remove word"
                    data-testid={`remove-word-${i}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addWord}
              className="mt-3 flex items-center gap-2 rounded-full border border-dashed border-white/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-amber-300/40 hover:text-amber-300/70"
              data-testid="add-word-button"
            >
              <Plus className="h-3.5 w-3.5" /> Add word
            </button>
          </div>

          {/* Footer actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            {/* Reset to defaults */}
            <button
              onClick={e => { e.stopPropagation(); setResetOpen(true); }}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-rose-300/40 hover:text-rose-300"
              data-testid="reset-week-button"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </button>

            <div className="ml-auto flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-amber-400 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                data-testid="save-week-button"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="border-white/15 bg-[#08101f] text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-white">Reset Week {week.week}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will discard all your edits and restore the original words and learning point for this week.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-white/20 bg-white/5 text-slate-300 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              data-testid="confirm-reset"
            >
              Yes, reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
