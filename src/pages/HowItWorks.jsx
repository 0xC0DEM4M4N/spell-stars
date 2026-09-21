import { InfoPage, TeaserLink } from "@/components/InfoPage";
import { CardGrid, Section, StepRow } from "@/components/InfoBlocks";
import { SESSION_STEPS, VOCAB_CARDS } from "@/content/siteContent";
import { JOURNEY_LEDE } from "@/content/journeys";

export default function HowItWorks() {
  return (
    <InfoPage
      path="/how-it-works"
      title="How SPELL// STARS works"
      description="How a SPELL// STARS spelling session works: typed practice with audio, spaced repetition, year-scaled word searches, definitions and example sentences, matched to the UK National Curriculum."
      eyebrow="How it works"
      heading="One app, every year, no forks."
      intro="Practise a week's words, hear them read aloud, and let spaced repetition bring back the ones that are still shaky. Everything follows the year group you pick."
    >
      <Section
        id="how-it-works"
        testId="how-it-works-section"
        eyebrow="Two journeys"
        title="Practise on screen, then off it."
        intro={JOURNEY_LEDE}
        className="py-10"
      >
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TeaserLink to="/digital-journey" label="The digital journey" blurb="Four daily ways to practise on screen." index={0} />
          <TeaserLink to="/offline-journey" label="The offline journey" blurb="Five steps, spread across the week, on paper and out loud." index={1} />
        </div>
      </Section>

      <Section
        id="how-a-session-works"
        testId="how-a-session-works-section"
        eyebrow="How a session works"
        title="Five steps, aligned to what school is already teaching."
      >
        <StepRow items={SESSION_STEPS} />
      </Section>

      <Section
        id="beyond-spelling"
        testId="beyond-spelling-section"
        eyebrow="More than spelling"
        title="Understand the word, not just its letters."
        intro="Spelling a word correctly is only half the job — every word in SPELL// STARS is built to broaden vocabulary too."
      >
        <CardGrid items={VOCAB_CARDS} cols={3} />
      </Section>
    </InfoPage>
  );
}
