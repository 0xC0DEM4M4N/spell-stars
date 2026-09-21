import { useState } from "react";
import { Link } from "react-router-dom";
import { Save } from "lucide-react";
import { shouldShowNudge, quietNudge } from "@/lib/syncNudge";

/**
 * A small, dismissible prompt to save a backup. It appears only once a fair
 * amount of practice is saved and then stays quiet for a month.
 */
export function BackupReminder() {
  const [visible, setVisible] = useState(() => {
    try {
      return shouldShowNudge(window.localStorage);
    } catch (err) {
      return false;
    }
  });
  if (!visible) return null;

  const hide = () => {
    try {
      quietNudge(window.localStorage);
    } catch (err) {
      // ignore
    }
    setVisible(false);
  };

  return (
    <aside className="px-5 pb-8 sm:px-8 print:hidden" aria-label="Save a backup" data-testid="backup-reminder">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
        <Save className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="type-body min-w-[14rem] flex-1 text-sm text-muted-foreground">
          Progress is saved on this device only. Save a backup so it isn't lost, or so you can carry on somewhere else.
        </p>
        <Link
          to="/sync"
          onClick={hide}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="backup-reminder-save"
        >
          Save a backup
        </Link>
        <button
          type="button"
          onClick={hide}
          className="rounded-full bg-foreground/10 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="backup-reminder-dismiss"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
