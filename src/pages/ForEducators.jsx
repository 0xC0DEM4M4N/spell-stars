import { InfoPage, TeaserLink } from "@/components/InfoPage";
import { CardGrid, Section } from "@/components/InfoBlocks";
import { EDUCATOR_NOTES } from "@/content/siteContent";
import { HANDOFF_TITLE, HANDOFF_COPY } from "@/content/journeys";

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
            title={HANDOFF_TITLE}
            intro={HANDOFF_COPY}
          >
            <div className="mt-8 max-w-md">
              <TeaserLink to="/offline-journey" label="The offline journey" blurb="Five steps, spread across the week: word search, practice game, printed sheet, look-cover-write-check and a verbal test." />
            </div>
          </Section>
        </>
      )}
    </InfoPage>
  );
}
