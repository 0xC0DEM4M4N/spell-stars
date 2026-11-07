import { Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { LAST_UPDATED, formatShortDate } from '@/content/whatsNew';

// Site-wide "under construction" notice, on only while
// REACT_APP_UNDER_DEVELOPMENT=true (a build-time env var — see .env or the
// hosting provider's environment settings). Off entirely for a normal
// production build, so this never ships to visitors by accident.
export const UNDER_DEVELOPMENT =
  process.env.REACT_APP_UNDER_DEVELOPMENT === 'true';

export const UnderDevelopmentBanner = () => {
  if (!UNDER_DEVELOPMENT) return null;
  const updated = LAST_UPDATED ? formatShortDate(LAST_UPDATED) : '';

  return (
    <div
      className="dev-banner fixed inset-x-0 top-0 z-[60] flex items-center justify-center px-2 sm:px-3"
      role="status"
    >
      <span className="flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-900 px-2.5 py-0.5 font-mono text-sm font-bold text-yellow-300 shadow-[0_0_0_1.5px_rgba(250,204,21,0.9)] sm:gap-2 sm:px-3 sm:py-1 sm:text-xs sm:">
        <HardHat className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
        <span className="sm:hidden">Under development{updated && ' · Updated ' + updated}</span>
        <span className="hidden sm:inline">Application still under development - new features added frequently.{updated && ' Last updated ' + updated + '.'}</span>
        <Link
          to="/whats-new"
          className="underline decoration-yellow-300/60 underline-offset-2 hover:text-white sm:ml-1"
        >
          New features
        </Link>
      </span>
    </div>
  );
};
