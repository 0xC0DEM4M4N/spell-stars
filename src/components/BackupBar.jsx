// A small bar for the lesson pages. Lessons and series are kept in this
// browser only, so this says so and points at the save page, where they can
// be backed up or moved to another device.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloudUpload } from 'lucide-react';
import { loadLists } from '@/lib/customLists';
import { loadSeries } from '@/lib/series';
import { accountsConfigured } from '@/lib/supabaseClient';
import { useAccount } from '@/lib/useAccount';

const count = () => {
  try {
    return loadLists(window.localStorage).length + loadSeries(window.localStorage).length;
  } catch (err) {
    return 0;
  }
};

export function BackupBar({ className = '' }) {
  const saved = count();
  const account = useAccount();

  // Ask the browser to keep this site's data when space runs low. It is
  // allowed to say no, and nothing breaks if it does.
  useEffect(() => {
    if (!saved) return;
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (err) {
      /* ignore */
    }
  }, [saved]);

  if (!saved && !account.user) return null;
  if (account.user) {
    return (
      <div
        className={'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-foreground/15 bg-card/60 p-4 ' + className}
        data-testid="backup-bar"
      >
        <CloudUpload className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-[12rem] flex-1 type-body text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {account.sync.state === 'syncing' ? 'Syncing…' : account.sync.state === 'error' ? "Couldn't sync." : 'Saved to your account.'}
          </span>{' '}
          Your lessons follow you to your other devices.
        </p>
        <Link to="/account" className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/50">
          Account
        </Link>
      </div>
    );
  }
  return (
    <div
      className={
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-foreground/15 bg-card/60 p-4 ' +
        className
      }
      data-testid="backup-bar"
    >
      <CloudUpload className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-[12rem] flex-1 type-body text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Kept in this browser only.</span>{' '}
        {accountsConfigured()
          ? 'Want them on another device too? A free account keeps them in step.'
          : 'Back your lessons up, or move them to another device.'}
      </p>
      {accountsConfigured() && (
        <Link
          to="/account"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="backup-bar-account"
        >
          Free account
        </Link>
      )}
      <Link
        to="/sync"
        className={accountsConfigured() ? 'rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/50' : "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"}
        data-testid="backup-bar-link"
      >
        Back up or move
      </Link>
    </div>
  );
}
