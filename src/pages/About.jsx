import { motion } from "framer-motion";
import { InfoPage, TeaserLink } from "@/components/InfoPage";
import { CardGrid, Section } from "@/components/InfoBlocks";
import { ABOUT_PILLARS } from "@/content/siteContent";
import { SPRING } from "@/lib/motion";

export default function About() {
  return (
    <InfoPage
      path="/about"
      title="About SPELL// STARS"
      description="Why SPELL// STARS exists: made by a mother of two and former early years teacher turned software developer, who believes spelling, word origins and meanings still matter in a digital world. Free, accessible, and works on paper as well as on screen."
      eyebrow="About"
      heading="In a digital world, it's still important to spell."
      intro="SPELL// STARS is made by a mother of two unicorns who trained as an early years teacher before moving into software development and web applications."
    >
      <section id="story" className="px-5 py-10 sm:px-8" data-testid="about-story-section">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={SPRING.reveal}
          className="mx-auto max-w-2xl space-y-5 type-body text-base text-muted-foreground"
        >
          <p>
            It's still important to spell. It's still important to know where words come from and what they mean,
            and this site aims to encourage and nurture those parts of learning.
          </p>
          <p>
            All too often, learning is moving online. Sometimes that's appropriate, but there is still a place for
            paper and pen. This site can be used offline as well as online, and it's accessible to all.
          </p>
          <p>
            You can share your progress or make your own spelling lists. But most of all, it's about enjoying words,
            challenging yourself and unlocking the world of words, at whatever your level.
          </p>
          <p className="font-display text-lg font-bold text-foreground">Enjoy your journey.</p>
        </motion.div>
      </section>

      <Section
        id="what-we-believe"
        testId="about-beliefs-section"
        eyebrow="What it stands for"
        title="Words, on screen and on paper, for everyone."
      >
        <CardGrid items={ABOUT_PILLARS} cols={3} />
      </Section>

      <Section
        id="get-started"
        testId="about-start-section"
        eyebrow="Ready?"
        title="Pick a year and start."
        className="py-10"
      >
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TeaserLink to="/#years" label="Choose a spelling list" blurb="Reception to Year 6, one week at a time." index={0} />
          <TeaserLink to="/custom" label="Make your own spellings" blurb="Build a list of any words and practise it the same way." index={1} />
        </div>
      </Section>
    </InfoPage>
  );
}
