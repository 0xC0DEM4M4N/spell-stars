import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { JourneyTimeline } from "@/components/JourneyTimeline";
import { GetStarted } from "@/components/GetStarted";
import { JOURNEY_LEDE } from "@/content/journeys";

export default function DigitalJourney() {
  return (
    <InfoPage
      path="/digital-journey"
      title="The digital journey"
      description="Four daily ways to practise spelling on screen with SPELL// STARS: typed practice with spaced repetition, year-scaled word searches, letter of the day and a pace the family sets."
      eyebrow="Journey 01 · On screen"
      heading="The digital journey."
      intro={JOURNEY_LEDE}
    >
      <section className="px-5 pb-6 sm:px-8" data-testid="digital-journey-section">
        <div className="mx-auto max-w-7xl">
          <JourneyTimeline journey="digital" />

          <div
            className="holo-card mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
            data-testid="digital-journey-progress-pointer"
          >
            <div className="flex items-start gap-3">
              <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <p className="max-w-[60ch] type-body text-sm text-muted-foreground">
                Every correct answer here builds towards a status level and a trail of badges — crosswords
                and word searches add milestone, gold-star and speed badges of their own. See where a learner's
                up to on <span className="font-semibold text-foreground">My progress</span>, in the learner menu
                next to the site name.
              </p>
            </div>
            <Link
              to="/progress"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/20"
              data-testid="digital-journey-progress-link"
            >
              My progress
            </Link>
          </div>
        </div>
      </section>
      <GetStarted
        steps={[
          { to: "/offline-journey", label: "Next: the offline journey", blurb: "Take the list onto paper and out loud." },
          { to: "/how-it-works", label: "See a session in full", blurb: "Five steps, aligned to what school is teaching." },
          { to: "/for-educators", label: "For educators & parents", blurb: "Pacing, differentiation and an offline routine." },
        ]}
      />
    </InfoPage>
  );
}
