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
