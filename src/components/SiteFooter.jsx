import { reopenConsent } from '@/lib/consent';
import { accountsConfigured } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { BookOpenCheck, Download, ExternalLink, ListPlus, Save, Search, Star, Wand2 } from 'lucide-react';
import { useInstallApp } from '@/lib/installApp';

/**
 * Shared site footer — brand block, link columns, copyright bar. Used on
 * the homepage and every year page so navigation/credits/tools are
 * available no matter where someone lands.
 */
// Shown only where the browser offers to install the site as an app.
function InstallAppItem() {
  const { canInstall, install } = useInstallApp();
  if (!canInstall) return null;
  return (
    <li>
      <button
        type="button"
        onClick={install}
        className="group inline-flex items-start gap-1.5 text-left transition-colors duration-300 hover:text-primary"
        data-testid="footer-install-app"
      >
        <Download className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Install as an app</span>
      </button>
    </li>
  );
}

export const SiteFooter = ({ totalWords, teachingWeeks }) => (
  <footer
    className="border-t-2 border-foreground/20 bg-card/60 px-5 pt-14 sm:px-8"
    data-testid="site-footer"
  >
    <div className="mx-auto max-w-7xl">
      <div className="pb-10">
        <div className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          SPELL<span className="text-primary">//</span>
          <span className="text-primary">
            ST
            <Star
              className="inline-block h-[0.72em] w-[0.72em] text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.75)]"
              style={{ verticalAlign: '-0.1em' }}
              aria-hidden="true"
            />
            RS
          </span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Reception to Year 6
          {totalWords != null && teachingWeeks != null
            ? ` · ${totalWords.toLocaleString()} words · ${teachingWeeks} teaching weeks a year.`
            : '.'}{' '}
          Progressive spelling practice for keen beans.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <div className="border-b border-foreground/15 pb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Explore
          </div>
          <ul className="mt-4 space-y-3 text-sm text-foreground/80">
            <li>
              <Link
                to="/#years"
                className="transition-colors duration-300 hover:text-primary"
              >
                Choose a spelling list
              </Link>
            </li>
            <li>
              <Link
                to="/how-it-works"
                className="transition-colors duration-300 hover:text-primary"
              >
                How it works
              </Link>
            </li>
            <li>
              <Link
                to="/digital-journey"
                className="transition-colors duration-300 hover:text-primary"
              >
                The digital journey
              </Link>
            </li>
            <li>
              <Link
                to="/offline-journey"
                className="transition-colors duration-300 hover:text-primary"
              >
                The offline journey
              </Link>
            </li>
            <li>
              <Link
                to="/for-educators"
                className="transition-colors duration-300 hover:text-primary"
              >
                For educators &amp; parents
              </Link>
            </li>
            <li>
              <Link
                to="/faq"
                className="transition-colors duration-300 hover:text-primary"
              >
                FAQs
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="transition-colors duration-300 hover:text-primary"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                to="/whats-new"
                className="transition-colors duration-300 hover:text-primary"
                data-testid="footer-whats-new-link"
              >
                What&apos;s new
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="border-b border-foreground/15 pb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Tools
          </div>
          <ul className="mt-4 space-y-3 text-sm text-foreground/80">
            <li>
              <a
                href="https://word-search-generator.pages.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-start gap-1.5 transition-colors duration-300 hover:text-primary"
                data-testid="footer-word-search-generator-link"
              >
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Build your own word search
                  <ExternalLink className="ml-1 inline-block h-3 w-3 -translate-y-px opacity-60 transition-opacity group-hover:opacity-100" />
                </span>
              </a>
            </li>
            <li>
              <Link
                to="/rules"
                className="group inline-flex items-start gap-1.5 transition-colors duration-300 hover:text-primary"
                data-testid="footer-build-link"
              >
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Search by spelling rule</span>
              </Link>
            </li>
            <li>
              <Link
                to="/rules"
                className="group inline-flex items-start gap-1.5 transition-colors duration-300 hover:text-primary"
                data-testid="footer-lessons-link"
              >
                <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Create your own lessons</span>
              </Link>
            </li>
            <li>
              <Link
                to="/custom"
                className="group inline-flex items-start gap-1.5 transition-colors duration-300 hover:text-primary"
                data-testid="footer-custom-link"
              >
                <ListPlus
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Paste your own words</span>
              </Link>
            </li>
            <InstallAppItem />
            {accountsConfigured() && (
              <li>
                <Link
                  to="/account"
                  className="group inline-flex items-start gap-1.5 transition-colors duration-300 hover:text-primary"
                  data-testid="footer-account-link"
                >
                  <Save className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Use on more than one device</span>
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/sync"
                className="group inline-flex items-start gap-1.5 transition-colors duration-300 hover:text-primary"
                data-testid="footer-sync-link"
              >
                <Save
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>Save or move progress</span>
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="border-b border-foreground/15 pb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Curriculum
          </div>
          <ul className="mt-4 space-y-3 text-sm text-foreground/80">
            <li>
              <a
                href="https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-start gap-1 transition-colors duration-300 hover:text-primary"
              >
                <span>
                  DfE English Appendix 1 (spelling)
                  <ExternalLink className="ml-1 inline-block h-3 w-3 -translate-y-px opacity-60 transition-opacity group-hover:opacity-100" />
                </span>
              </a>
            </li>
            <li className="text-muted-foreground">
              Crown copyright, Open Government Licence
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-3 border-t border-foreground/20 py-6 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} SPELL// STARS. All rights reserved.
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            to="/privacy"
            className="underline underline-offset-2 transition-colors hover:text-primary"
            data-testid="footer-privacy-link"
          >
            Privacy
          </Link>
          <button
            type="button"
            onClick={reopenConsent}
            className="underline underline-offset-2 transition-colors hover:text-primary"
            data-testid="footer-cookie-settings"
          >
            Cookie settings
          </button>
          <span>Made for keen spellers, one week at a time.</span>
        </div>
      </div>
    </div>
  </footer>
);
