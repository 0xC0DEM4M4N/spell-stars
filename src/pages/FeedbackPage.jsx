import { useState } from "react";
import { Lightbulb, Bug, MessageSquare, Loader2 } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

const CATEGORIES = [
  { value: "feature", label: "Request a feature", icon: Lightbulb },
  { value: "bug", label: "Report an error", icon: Bug },
  { value: "feedback", label: "General feedback", icon: MessageSquare },
];

export default function FeedbackPage() {
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || status === "sending") return;

    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      if (!res.ok) throw new Error("Request failed");
      setMessage("");
      setStatus("sent");
      toast.success("Thanks — that's been sent through.");
    } catch {
      setStatus("idle");
      toast.error("Couldn't send that. Please try again in a moment.");
    }
  };

  return (
    <InfoPage
      path="/feedback"
      title="Give feedback"
      description="Request a feature, report an error, or share general feedback about SPELL// STARS."
      eyebrow="Feedback"
      heading="Give feedback"
      intro="Spotted a bug, want a feature, or just have a thought? This goes straight into our list — no account or email needed."
    >
      <section className="px-5 pb-16 sm:px-8" data-testid="feedback-form-section">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6">
            <div>
              <span className="mb-3 block font-mono text-xs uppercase tracking-[0.2em] text-primary">What's this about?</span>
              <RadioGroup value={category} onValueChange={setCategory} className="grid gap-3 sm:grid-cols-3" data-testid="feedback-category">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <Label
                    key={value}
                    htmlFor={`feedback-${value}`}
                    className={`flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-3 text-sm transition-colors ${
                      category === value ? "border-primary bg-primary/10 text-foreground" : "border-foreground/15 text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      <RadioGroupItem value={value} id={`feedback-${value}`} />
                    </span>
                    {label}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="feedback-message" className="mb-2 block font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Your message
              </Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="The more detail the better — what happened, what you'd expect, or what you'd like to see."
                rows={6}
                maxLength={4000}
                required
                data-testid="feedback-message"
              />
            </div>

            <Button type="submit" disabled={status === "sending" || !message.trim()} data-testid="feedback-submit">
              {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Send feedback
            </Button>
          </form>
        </div>
      </section>
    </InfoPage>
  );
}
