import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useScrolled } from '@/hooks/useScrolled';
import { LearnerMenu } from '@/components/LearnerMenu';
import { useAccount } from '@/lib/useAccount';

// One header for every page. Home keeps the year picker one click away;
// the long-form content lives on its own pages.
const NAV = [
  { label: 'Spelling Lists', to: '/#years' },
  { label: 'Make a lesson', to: '/make' },
  { label: 'What\'s included', to: '/how-it-works#features' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'For educators', to: '/for-educators' },
  { label: 'FAQs', to: '/faq' },
  { label: 'About', to: '/about' },
  { label: 'Feedback', to: '/feedback' },
];

// Below the large breakpoint the inline links are hidden, so phones and
// tablets get the same destinations in a menu, plus the places a family
// uses most (own lessons, progress, account).
const MENU_EXTRAS = [{ label: 'My progress', to: '/progress' }];

const MobileMenu = ({ account, pathname }) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const items = [
    ...NAV.slice(0, 2),
    ...MENU_EXTRAS,
    ...NAV.slice(2),
  ];
  const linkClass =
    'block rounded-xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-primary/10';
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-primary/50 xl:hidden"
          aria-label="Open menu"
          data-testid="mobile-menu-button"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Menu</DialogTitle>
        </DialogHeader>
        <nav aria-label="Menu" className="mt-1 max-h-[70vh] space-y-1 overflow-y-auto" data-testid="mobile-menu">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={close}
              aria-current={item.to === pathname ? 'page' : undefined}
              className={linkClass}
            >
              {item.label}
            </Link>
          ))}
          {account.enabled && account.ready && (
            <Link to="/account" onClick={close} className={linkClass}>
              {account.user ? 'Account' : 'Sign in'}
            </Link>
          )}
        </nav>
      </DialogContent>
    </Dialog>
  );
};

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
          className="shrink-0 whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-foreground"
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
        <div className="flex items-center gap-3 whitespace-nowrap">
          <nav
            className="hidden items-center gap-6 whitespace-nowrap text-sm font-light text-muted-foreground xl:flex"
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
              className="hidden rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 xl:inline-block"
              data-testid="header-account-link"
            >
              {account.user ? 'Account' : 'Sign in'}
            </Link>
          )}
          <LearnerMenu />
          <MobileMenu account={account} pathname={pathname} />
        </div>
      </div>
    </header>
  );
};
