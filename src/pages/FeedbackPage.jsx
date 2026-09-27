import { useState } from 'react';
import { Lightbulb, Bug, MessageSquare, Loader2, Check } from 'lucide-react';
import { InfoPage } from '@/components/InfoPage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

const CATEGORIES = [
  {
    value: 'feature',
    label: 'Request a feature',
    description: 'Something you wish this site could do.',
    icon: Lightbulb,
  },
  {
    value: 'bug',
    label: 'Report an error',
    description: "Something that isn't working as it should.",
    icon: Bug,
  },
  {
    value: 'feedback',
    label: 'General feedback',
    description: 'Anything else — praise, confusion, a thought.',
    icon: MessageSquare,
  },
];

export default function FeedbackPage() {
  const [category, setCategory] = useState('feedback');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || status === 'sending') return;

    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      if (!res.ok) throw new Error('Request failed');
      setMessage('');
      setStatus('sent');
      toast.success("Thanks — that's been sent through.");
    } catch {
      setStatus('idle');
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
      <section
        className="px-5 pb-16 sm:px-8"
        data-testid="feedback-form-section"
      >
        <div className="mx-auto max-w-2xl mt-6">
          <form
            onSubmit={handleSubmit}
            className="holo-card relative space-y-6 rounded-2xl p-5 sm:p-6"
          >
            <div>
              <span
                className="mb-3 block text-sm font-semibold text-foreground"
                id="feedback-category-label"
              >
                What's this about?
              </span>
              <RadioGroup
                value={category}
                onValueChange={setCategory}
                className="grid gap-3 sm:grid-cols-3"
                aria-labelledby="feedback-category-label"
                data-testid="feedback-category"
              >
                {CATEGORIES.map(({ value, label, description, icon: Icon }) => {
                  const selected = category === value;
                  return (
                    <Label
                      key={value}
                      htmlFor={`feedback-${value}`}
                      className={`relative flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
                        selected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-foreground/20 text-foreground/90 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <RadioGroupItem
                        value={value}
                        id={`feedback-${value}`}
                        className="sr-only"
                      />
                      <Icon
                        className="h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="text-xs leading-snug text-muted-foreground">
                        {description}
                      </span>
                      {selected && (
                        <Check
                          className="absolute right-3 top-3 h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            <div>
              <Label
                htmlFor="feedback-message"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                Your message
              </Label>
              <p className="mb-3 text-sm text-foreground/80">
                This is sent anonymously — nothing identifies you or your
                device. If you'd like a reply, leave an email or other way to
                reach you in the message itself.
              </p>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="The more detail the better — what happened, what you'd expect, or what you'd like to see. Want a reply? Leave your email here too."
                rows={6}
                maxLength={4000}
                required
                data-testid="feedback-message"
              />
            </div>

            <Button
              type="submit"
              disabled={status === 'sending' || !message.trim()}
              data-testid="feedback-submit"
            >
              {status === 'sending' && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Send feedback
            </Button>
          </form>
        </div>
      </section>
    </InfoPage>
  );
}
