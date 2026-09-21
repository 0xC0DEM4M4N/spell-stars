import { ChevronRight } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQS } from "@/content/siteContent";

export default function Faq() {
  return (
    <InfoPage
      path="/faq"
      title="Spelling practice FAQs"
      description="Answers about SPELL// STARS: what's included, year groups covered, dyslexia-friendly and accessibility options, read-aloud, custom lists, curriculum alignment, spaced repetition, where progress is saved and how to move it to another device."
      eyebrow="FAQs"
      heading="Good to know."
      intro="Quick answers about what's included, accessibility, year groups, practice time, the curriculum, and how progress is saved, backed up and moved between devices."
    >
      <section id="faq" className="px-5 py-10 sm:px-8" data-testid="faq-section">
        <div className="mx-auto max-w-4xl">
          <Accordion type="single" collapsible className="border-t border-foreground/10">
            {FAQS.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-foreground/10">
                <AccordionTrigger className="press-soft group py-5 text-left font-display text-base font-bold text-foreground hover:no-underline [&>svg]:hidden">
                  <span className="flex items-center gap-3">
                    <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 ease-fluid group-data-[state=open]:rotate-90" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-7 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </InfoPage>
  );
}
