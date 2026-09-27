// Listening settings: volume, speed and voice for every "hear it aloud"
// button (Practice's Listen mode and meaning-clue read-aloud, Find the
// letter). A small icon button rather than folded into the main
// accessibility menu, since it only matters on screens that speak, and
// sits right next to the controls it affects.
import { useState } from "react";
import { Ear, Settings2, Volume1, Volume2, VolumeX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useVoiceSettings } from "@/context/VoiceSettingsContext";

const DEFAULT_VOICE_VALUE = "default";

// Ear + a small gear badge in the corner -- there's no single lucide icon
// for "voice settings", so this composes two.
function EarCogIcon({ className = "h-5 w-5" }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      <Ear className="h-full w-full" />
      <Settings2 className="absolute -bottom-1 -right-1 h-[0.55em] w-[0.55em] rounded-full bg-popover" strokeWidth={3} />
    </span>
  );
}

const RATE_MARKS = [
  { value: 0.65, label: "Slower" },
  { value: 0.92, label: "Normal" },
  { value: 1.2, label: "Faster" },
];

export function VoiceSettingsMenu({ className = "", triggerLabel = "Listening settings" }) {
  const { volume, setVolume, rate, setRate, voiceURI, setVoiceURI, englishVoices, otherVoices, applyTo } = useVoiceSettings();
  const [open, setOpen] = useState(false);
  const effectiveRate = rate ?? 0.92;

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const preview = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("necessary");
    utterance.lang = "en-GB";
    applyTo(utterance, effectiveRate);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          className={`inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 p-1.5 text-primary transition-colors duration-200 hover:bg-cyan-300 hover:text-slate-950 ${className}`}
          data-testid="voice-settings-button"
        >
          <EarCogIcon className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Listening settings</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Volume</p>
              <VolumeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              min={0}
              max={1}
              step={0.05}
              aria-label="Volume"
              data-testid="voice-settings-volume"
            />
          </section>

          <section>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Speed</p>
            <Slider
              value={[effectiveRate]}
              onValueChange={([v]) => setRate(v)}
              min={0.5}
              max={1.5}
              step={0.01}
              aria-label="Speed"
              data-testid="voice-settings-rate"
            />
            <div className="mt-2 flex justify-between">
              {RATE_MARKS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRate(value)}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
                  data-testid={`voice-settings-rate-${label.toLowerCase()}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Voice</p>
            <Select
              value={voiceURI || DEFAULT_VOICE_VALUE}
              onValueChange={(v) => setVoiceURI(v === DEFAULT_VOICE_VALUE ? "" : v)}
            >
              <SelectTrigger data-testid="voice-settings-voice">
                <SelectValue placeholder="Default voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_VOICE_VALUE}>Default voice</SelectItem>
                {englishVoices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>{v.name}</SelectItem>
                ))}
                {otherVoices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>{`${v.name} (${v.lang})`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {englishVoices.length === 0 && otherVoices.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                No extra voices found on this device — it'll use the browser's own default.
              </p>
            )}
          </section>

          <Button type="button" variant="outline" onClick={preview} className="w-full" data-testid="voice-settings-preview">
            <Ear className="h-4 w-4" /> Hear an example
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
