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
