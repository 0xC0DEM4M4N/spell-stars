import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProgressTracker = ({ weeks, currentWeek, selectedWeek, completedWeeks, onSelectWeek, onMarkComplete }) => {
  const completed = new Set(completedWeeks);
  const nextWeek = weeks.find((week) => !completed.has(week.week))?.week;
  const percent = Math.round((completed.size / weeks.length) * 100);
  const selectedComplete = completed.has(selectedWeek);

  return (
    <div className="mt-6 border border-white/10 bg-white/[0.03] p-5" data-testid="progress-tracker">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-300" data-testid="progress-tracker-label">Progress tracker</div>
          <p className="mt-2 text-sm text-slate-300" data-testid="progress-tracker-summary">
            {completed.size} complete · {nextWeek ? `Week ${nextWeek} next` : "All weeks complete"} · {weeks.length - completed.size} to go
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onMarkComplete}
          disabled={selectedComplete}
          className="border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-300 hover:text-slate-950"
          data-testid="mark-week-complete-button"
        >
          <Check className="h-4 w-4" /> {selectedComplete ? "Week complete" : "Mark week complete"}
        </Button>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" data-testid="progress-bar">
        <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" data-testid="progress-week-grid" aria-label="Weekly progress">
        {weeks.map((week) => {
          const isComplete = completed.has(week.week);
          const isCurrent = week.week === currentWeek;
          const isSelected = week.week === selectedWeek;
          return (
            <button
              key={week.week}
              type="button"
              onClick={() => onSelectWeek(week.week)}
              className={`grid h-8 w-8 place-items-center rounded-md border font-mono text-[10px] transition-colors duration-300 ${isComplete ? "border-emerald-300/50 bg-emerald-400/20 text-emerald-200" : isCurrent ? "border-cyan-300 bg-cyan-300/20 text-cyan-200" : "border-white/10 bg-white/5 text-slate-500 hover:border-cyan-300/40 hover:text-cyan-200"} ${isSelected ? "ring-1 ring-cyan-300" : ""}`}
              title={`Week ${week.week}: ${week.focus}`}
              aria-label={`Go to week ${week.week}${isComplete ? ", complete" : ""}`}
              data-testid={`progress-week-${week.week}`}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : String(week.week).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
};
