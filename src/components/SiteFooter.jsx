import { ExternalLink, Star, Wand2 } from "lucide-react";

/**
 * Shared site footer — brand block, link columns, copyright bar. Used on
 * the homepage and every year page so navigation/credits/tools are
 * available no matter where someone lands.
 */
export const SiteFooter = ({ totalWords, teachingWeeks }) => (
  <footer className="border-t border-foreground/10 px-5 pt-14 sm:px-8" data-testid="site-footer">
    <div className="mx-auto max-w-7xl">
      <div>
        <div className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          SPELL<span className="text-primary">//</span><span className="text-primary">ST<Star className="inline-block h-[0.72em] w-[0.72em] text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.75)]" style={{ verticalAlign: "-0.1em" }} aria-hidden="true" />RS</span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Reception to Year 6
          {totalWords != null && teachingWeeks != null ? ` · ${totalWords.toLocaleString()} words · ${teachingWeeks} teaching weeks a year.` : "."} Progressive
          spelling practice for keen beans.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Explore</div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li><a href="/#years" className="transition-colors duration-300 hover:text-primary">Choose a year</a></li>
            <li><a href="/#how-it-works" className="transition-colors duration-300 hover:text-primary">How it works</a></li>
            <li><a href="/#for-educators" className="transition-colors duration-300 hover:text-primary">For educators &amp; parents</a></li>
            <li><a href="/#faq" className="transition-colors duration-300 hover:text-primary">FAQs</a></li>
          </ul>
        </div>

        <div>
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Tools</div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
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
          </ul>
        </div>

        <div>
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Curriculum</div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
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
            <li className="text-muted-foreground">Crown copyright, Open Government Licence</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-3 border-t border-foreground/10 py-6 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} SPELL// STARS. All rights reserved.</div>
        <div>Made for keen spellers, one week at a time.</div>
      </div>
    </div>
  </footer>
);
