import { Link } from 'react-router-dom';
import { HardHat } from 'lucide-react';

// Site-wide "under construction" notice, on only while
// REACT_APP_UNDER_DEVELOPMENT=true (a build-time env var — see .env or the
// hosting provider's environment settings). Off entirely for a normal
// production build, so this never ships to visitors by accident.
export const UNDER_DEVELOPMENT =
  process.env.REACT_APP_UNDER_DEVELOPMENT === 'true';

export const UnderDevelopmentBanner = () => {
  if (!UNDER_DEVELOPMENT) return null;

  return (
    <div
      className="dev-banner fixed inset-x-0 top-0 z-[60] flex items-center justify-center px-3"
      role="status"
    >
      <span className="flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-300 shadow-[0_0_0_1.5px_rgba(250,204,21,0.9)] sm:text-xs">
        <HardHat className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Application still under development - new features added frequently.
        <Link
          to="/whats-new"
          className="ml-1 underline decoration-yellow-300/60 underline-offset-2 hover:text-white"
        >
          New features
        </Link>
        <Link
          to="/whats-new"
          className="ml-1 underline decoration-yellow-300/60 underline-offset-2 hover:text-white"
        >
          Give Feedback
        </Link>
      </span>
    </div>
  );
};
