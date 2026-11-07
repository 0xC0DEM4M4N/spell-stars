import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSENT_OPEN_EVENT, readConsent, saveConsent } from '@/lib/consent';

// Asks once whether we may count visits with Google Analytics. Both buttons
// are the same size and weight, and the site works the same either way.
export function CookieBanner() {
  const [open, setOpen] = useState(() => readConsent() === null);
  const [current, setCurrent] = useState(() => readConsent());

  useEffect(() => {
    const reopen = () => {
      setCurrent(readConsent());
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (value) => {
    saveConsent(value);
    setCurrent(value);
    setOpen(false);
  };

  const button =
    'rounded-xl border-2 border-primary px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <div
      role="region"
      aria-label="Cookies and analytics"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl rounded-2xl border-2 border-foreground/25 bg-card p-4 shadow-xl sm:p-5"
      data-testid="cookie-banner"
    >
      <p className="font-display text-base font-bold text-foreground">Can we count visits?</p>
      <p className="mt-1.5 type-body text-sm leading-relaxed text-muted-foreground">
        We'd like to use Google Analytics, which sets cookies, to see which pages get used so we can improve the site.
        It's your choice and the site works the same either way. Practice and lessons are never sent to Google.{' '}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-primary">
          More in our privacy page
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => choose('granted')}
          className={button + ' bg-primary text-primary-foreground hover:opacity-90'}
          data-testid="cookie-accept"
        >
          Yes, count my visits
        </button>
        <button
          type="button"
          onClick={() => choose('denied')}
          className={button + ' bg-background text-foreground hover:bg-primary/10'}
          data-testid="cookie-decline"
        >
          No thanks
        </button>
        {current !== null && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-primary"
          >
            Keep it as it is
          </button>
        )}
      </div>
    </div>
  );
}
