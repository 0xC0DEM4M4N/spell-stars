import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SESSION_COUNT_OPTIONS } from "@/lib/scope";

/**
 * Shared week-stepper + word-count control for Practice and Word Search —
 * mount the same instance/config in both, per the routing plan (don't let
 * them drift into two implementations).
 *
 * The scope choice itself (day/term/all) lives in the page header now, not
 * here — this just owns "which week" and "how many words for a pooled
 * session". Fully controlled: the parent (YearPage) owns scope/count/
 * currentWeek state and persists currentWeek via the SRS progress record.
 */
export const ScopeSelector = ({
  scope,
  count,
  onCountChange,
  currentWeek,
  onCurrentWeekChange,
  totalWeeks,
  accentColor = "#67e8f9",
}) => {
  const showCount = scope !== "day";

  return (
    <div className="border border-white/10 bg-white/[0.03] p-5" data-testid="scope-selector">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.24em]" style={{ color: accentColor }}>
          Current week
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onCurrentWeekChange(Math.max(1, currentWeek - 1))}
            disabled={currentWeek <= 1}
            className="h-8 w-8 border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            aria-label="Previous week"
            data-testid="scope-week-decrement"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center text-sm text-white" data-testid="scope-week-value">
            {String(currentWeek).padStart(2, "0")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onCurrentWeekChange(Math.min(totalWeeks, currentWeek + 1))}
            disabled={currentWeek >= totalWeeks}
            className="h-8 w-8 border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            aria-label="Next week"
            data-testid="scope-week-increment"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showCount && (
        <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="scope-count-picker">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">Words</span>
          {SESSION_COUNT_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              onClick={() => onCountChange(option)}
              className={
                "h-8 w-12 rounded-md border-white/15 text-sm " +
                (count === option
                  ? "border-emerald-300 bg-emerald-300/15 text-emerald-200"
                  : "bg-white/5 text-slate-300 hover:bg-white/10")
              }
              data-testid={"scope-count-" + option}
            >
              {option}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
