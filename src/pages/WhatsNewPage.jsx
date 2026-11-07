import { Sparkles } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { LAST_UPDATED, WHATS_NEW, formatShortDate } from "@/content/whatsNew";

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function WhatsNewPage() {
  return (
    <InfoPage
      path="/whats-new"
      title="What's new"
      description="Recently shipped features on SPELL// STARS."
      eyebrow="Changelog"
      heading="What's new"
      intro="SPELL// STARS is constantly being improved and updated. Here is everything that has been added so far, newest first."
    >
      <section className="px-5 pb-16 sm:px-8" data-testid="whats-new-list">
        <div className="mx-auto max-w-3xl">
          {LAST_UPDATED && (
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground" data-testid="whats-new-last-updated">
              Last updated {formatShortDate(LAST_UPDATED)}
            </p>
          )}
          <div className="space-y-5">
            {WHATS_NEW.map((item) => (
              <article
                key={item.date + item.title}
                className="rounded-2xl border border-foreground/20 border-l-[3px] border-l-primary bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(item.date)}
                </div>
                <h2 className="mt-2 font-display text-lg font-bold text-foreground">{item.title}</h2>
                <p className="mt-1.5 text-sm text-foreground/75">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </InfoPage>
  );
}
