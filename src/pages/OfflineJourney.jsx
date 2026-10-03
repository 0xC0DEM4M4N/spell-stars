import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { JourneyTimeline } from "@/components/JourneyTimeline";
import { GetStarted } from "@/components/GetStarted";
import { HANDOFF_COPY } from "@/content/journeys";

export default function OfflineJourney() {
  return (
    <InfoPage
      path="/offline-journey"
      title="The offline journey"
      description="A five-step weekly routine that takes a SPELL// STARS spelling list off the screen: word search, practice game, printed sheet, look-cover-write-check and a verbal test."
      eyebrow="Journey 02 · Off screen"
      heading="The offline journey."
      intro={HANDOFF_COPY}
    >
      <section className="px-5 pb-6 sm:px-8" data-testid="offline-journey-section">
        <div className="mx-auto max-w-7xl">
          <JourneyTimeline journey="offline" />

          <div
            className="holo-card mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
            data-testid="offline-journey-checklist-pointer"
          >
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <p className="max-w-[60ch] type-body text-sm text-muted-foreground">
                Done one of these on paper? Every week's card has an{" "}
                <span className="font-semibold text-foreground">Offline routine</span> checklist —
                tick a step off there and it counts for real: the words move on properly, and it feeds
                the same badges and status points a digital win would.
              </p>
            </div>
            <Link
              to="/#years"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/20"
              data-testid="offline-journey-checklist-link"
            >
              Open a year
            </Link>
          </div>
        </div>
      </section>
      <GetStarted
        steps={[
          { to: "/digital-journey", label: "The digital journey", blurb: "Four daily ways to practise on screen." },
          { to: "/for-educators", label: "For educators & parents", blurb: "Pacing, differentiation and printable sheets." },
          { to: "/faq", label: "FAQs", blurb: "Year groups, practice time, progress and more." },
        ]}
      />
    </InfoPage>
  );
}
