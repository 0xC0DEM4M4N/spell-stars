import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { TeaserLink } from "@/components/InfoPage";

/**
 * "Get started" panel that ends a journey page: one clear button into the
 * year list, then a few next steps as links.
 */
export function GetStarted({ steps }) {
  return (
    <section className="px-5 pb-16 pt-10 sm:px-8" aria-labelledby="get-started-heading" data-testid="get-started">
      <div className="mx-auto max-w-7xl">
        <div className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Next steps</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h2 id="get-started-heading" className="type-section font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Get started.
          </h2>
          <Link
            to="/#years"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            data-testid="get-started-button"
          >
            Choose a year <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <TeaserLink key={step.to} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
