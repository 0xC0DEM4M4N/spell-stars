import { Repeat2 } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { CardGrid, Section, StepRow } from "@/components/InfoBlocks";
import { FEATURES, SESSION_STEPS, VOCAB_CARDS } from "@/content/siteContent";

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
      <Section id="how-it-works" testId="how-it-works-section" eyebrow="What you get" title="Four ways to practise." className="py-10">
        <CardGrid items={FEATURES} cols={4} />
        <div className="mt-6 flex items-center gap-3 border border-amber-300/20 bg-amber-400/5 p-4 text-sm text-warning">
          <Repeat2 className="h-4 w-4 shrink-0" />
          Practice adapts to each year automatically — input style, reading speed, word-search
          difficulty and daily pacing all follow the year you're in, from one shared template.
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
