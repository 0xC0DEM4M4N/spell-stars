import { Link, useLocation } from 'react-router-dom';
import { Star, Trophy } from 'lucide-react';
import { useScrolled } from '@/hooks/useScrolled';
import { LearnerMenu } from '@/components/LearnerMenu';

// One header for every page. Home keeps the year picker one click away;
// the long-form content lives on its own pages.
const NAV = [
  { label: 'Spelling Lists', to: '/#years' },
  { label: 'Features', to: '/#features' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'For educators', to: '/for-educators' },
  { label: 'FAQs', to: '/faq' },
  { label: 'About', to: '/about' },
  { label: 'Feedback', to: '/feedback' },
];

export const SiteHeader = () => {
  const scrolled = useScrolled();
  const { pathname } = useLocation();

  return (
    <header
      className="material-bar fixed inset-x-0 top-0 z-50"
      data-scrolled={scrolled}
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          to="/"
          className="font-display text-lg font-extrabold tracking-tight text-foreground"
          aria-label="SPELL// STARS home"
        >
          SPELL<span className="text-primary">//</span>
          <span className="text-primary">
            ST
            <Star
              className="inline-block h-[0.85em] w-[0.85em] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"
              style={{ verticalAlign: '-0.12em' }}
              aria-hidden="true"
            />
            RS
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <nav
            className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground md:flex"
            aria-label="Primary"
          >
            {NAV.map((item) => {
              const current = item.to === pathname;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  className={`transition-colors duration-300 hover:text-primary ${current ? 'text-primary' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {/* Visible on every screen size, unlike the nav above -- switching
              who's practising is a routine action, not a secondary link. */}
          <Link
            to="/progress"
            aria-current={pathname === '/progress' ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.16em] transition-colors duration-200 hover:border-primary/50 hover:text-primary ${
              pathname === '/progress' ? 'text-primary' : 'text-muted-foreground'
            }`}
            data-testid="progress-link"
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">My progress</span>
          </Link>
          <LearnerMenu />
        </div>
      </div>
    </header>
  );
};
