// Persistent, always-reachable settings icon for the three global display
// preferences (theme, text scale, reduced motion) plus the dyslexia
// theme's font choice. Deliberately its own floating button rather than
// tucked into a menu -- see theme-accessibility-spec.md §2: for a tool
// used by children with reading/attention differences, the accessibility
// controls should be as easy to find as the practice button itself.
import { useState } from "react";
import { Accessibility, Check, Contrast, Moon, SpellCheck2, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTheme } from "@/context/ThemeContext";

const THEME_OPTIONS = [
  { value: "light", label: "Light", description: "Bright background, dark text.", icon: Sun },
  { value: "dark", label: "Dark", description: "The default SPELL// ST★RS look.", icon: Moon },
  { value: "dyslexia", label: "Dyslexia-friendly", description: "Cream background, soft grey text, extra spacing.", icon: SpellCheck2 },
  { value: "highContrast", label: "High contrast", description: "Maximum contrast, thicker focus rings.", icon: Contrast },
];

const TEXT_SCALE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
  { value: "extraLarge", label: "Extra large" },
];

const DYSLEXIA_FONT_OPTIONS = [
  { value: "lexend", label: "Lexend" },
  { value: "opendyslexic", label: "OpenDyslexic" },
];

function OptionCard({ active, onClick, testId, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      data-testid={testId}
      className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors duration-150 ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <Check className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden="true" />
      )}
    </button>
  );
}

export function AccessibilityMenu() {
  const {
    theme,
    setTheme,
    textScale,
    setTextScale,
    reducedMotion,
    setReducedMotion,
    dyslexiaFont,
    setDyslexiaFont,
  } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-popover text-primary shadow-lg shadow-black/20 transition-colors duration-200 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Display and accessibility settings"
          data-testid="accessibility-menu-button"
        >
          <Accessibility className="h-6 w-6" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Display &amp; accessibility</DialogTitle>
        </DialogHeader>

        <div className="mt-2 max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          <section>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Theme
            </p>
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
              {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                <OptionCard
                  key={value}
                  active={theme === value}
                  onClick={() => setTheme(value)}
                  testId={`accessibility-theme-${value}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs opacity-80">{description}</span>
                </OptionCard>
              ))}
            </div>
          </section>

          {theme === "dyslexia" && (
            <section>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Dyslexia-friendly font
              </p>
              <div role="radiogroup" aria-label="Dyslexia-friendly font" className="flex gap-2">
                {DYSLEXIA_FONT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={dyslexiaFont === value}
                    onClick={() => setDyslexiaFont(value)}
                    data-testid={`accessibility-dyslexia-font-${value}`}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                      dyslexiaFont === value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Text size
            </p>
            <div role="radiogroup" aria-label="Text size" className="flex gap-2">
              {TEXT_SCALE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={textScale === value}
                  onClick={() => setTextScale(value)}
                  data-testid={`accessibility-text-scale-${value}`}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                    textScale === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Reduce motion</p>
              <p className="text-xs text-muted-foreground">Turns off animations and screen-shake effects.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={() => setReducedMotion((v) => !v)}
              data-testid="accessibility-reduced-motion-toggle"
              className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
                reducedMotion ? "justify-end bg-primary" : "justify-start bg-muted-foreground/30"
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow" aria-hidden="true" />
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
