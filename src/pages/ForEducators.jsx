import { InfoPage } from "@/components/InfoPage";
import { CardGrid, Section, StepRow } from "@/components/InfoBlocks";
import { EDUCATOR_NOTES, WEEKLY_ROUTINE } from "@/content/siteContent";

export default function ForEducators() {
  return (
    <InfoPage
      path="/for-educators"
      title="For educators and parents"
      description="How SPELL// STARS fits a school spelling programme: National Curriculum word lists, suggested weekly checks, pacing, differentiation, printable worksheets and an offline routine."
      eyebrow="For educators & parents"
      heading="Built the way you'd sequence it yourself."
      intro="Word lists follow the statutory spelling lists and phonics framework, ordered so each week builds on the one before. Here's how to use them in class or at home."
    >
      {({ totalYears }) => (
        <>
          <Section
            id="for-educators"
            testId="for-educators-section"
            eyebrow="In the classroom and at home"
            title="Curriculum-led, at your pace."
            intro={`Every one of the ${totalYears ?? "seven"} year lists follows its own statutory or phonics sequence — Letters and Sounds graphemes for Reception, then the National Curriculum's English Appendix 1 word lists from Year 1 onward — ordered so each week builds on the rule or pattern before it, term by term across the school year.`}
            className="py-10"
          >
            <CardGrid items={EDUCATOR_NOTES} cols={4} />
          </Section>

          <Section
            id="offline-routine"
            testId="offline-routine-section"
            eyebrow="Beyond the screen"
            title="Screen practice, then paper and voice."
            intro="Typing a word correctly isn't quite the same skill as writing it, and spelling tests are still mostly said aloud and written by hand. A weekly routine that moves from recognising a word, to recalling it on screen, to writing it from memory, to producing it with nothing in front of you at all, covers a lot more ground than any one of those on its own."
          >
            <StepRow items={WEEKLY_ROUTINE} />
            <p className="mt-6 max-w-2xl font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Best spread across the week, not done in one sitting — e.g. word search early on, look/cover/write/check
              mid-week, verbal test at the end — so it lines up with SRS-lite's own spacing instead of cramming.
            </p>
          </Section>
        </>
      )}
    </InfoPage>
  );
}
