import { Link, useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useScrolled } from '@/hooks/useScrolled';
import { LearnerMenu } from '@/components/LearnerMenu';
import { useAccount } from '@/lib/useAccount';

// One header for every page. Home keeps the year picker one click away;
// the long-form content lives on its own pages.
const NAV = [
  { label: 'Spelling Lists', to: '/#years' },
  { label: 'Spelling rules', to: '/rules' },
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
  const account = useAccount();

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
            className="hidden items-center gap-7 text-sm font-light text-muted-foreground lg:flex"
            aria-label="Primary"
          >
            {NAV.map((item) => {
              const current = item.to === pathname;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  className={`relative py-1 transition-colors duration-300 hover:text-foreground ${current ? 'font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {/* "My progress" now lives inside the learner switcher below --
              there isn't room for its own pill at every header width, and
              it belongs next to "who's practising" anyway. */}
          {account.enabled && account.ready && (
            <Link
              to="/account"
              className="hidden rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 lg:inline-block"
              data-testid="header-account-link"
            >
              {account.user ? 'Account' : 'Sign in'}
            </Link>
          )}
          <LearnerMenu />
        </div>
      </div>
    </header>
  );
};
