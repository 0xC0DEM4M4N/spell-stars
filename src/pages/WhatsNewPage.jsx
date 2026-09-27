import { Sparkles } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { WHATS_NEW } from "@/content/whatsNew";

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function WhatsNewPage() {
  return (
    <InfoPage
      path="/whats-new"
      title="What's new"
      description="Recently shipped features on SPELL// STARS."
      eyebrow="Changelog"
      heading="What's new"
      intro="Every feature added while the site is under development, newest first."
    >
      <section className="px-5 pb-16 sm:px-8" data-testid="whats-new-list">
        <div className="mx-auto max-w-3xl space-y-4">
          {WHATS_NEW.map((item) => (
            <article
              key={item.date + item.title}
              className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5"
            >
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(item.date)}
              </div>
              <h2 className="mt-2 font-display text-lg font-bold text-foreground">{item.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </InfoPage>
  );
}
