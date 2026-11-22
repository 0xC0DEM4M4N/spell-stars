// Dictation: the site reads a few sentences aloud and the child writes them
// down. Each sentence starts as a covered block; it is only shown once it has
// been spoken, so the child can check what they wrote. Sentences are made from
// the lesson's own words (see lib/dictation.js).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Eye, EyeOff, RefreshCw, Volume2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useVoiceSettings } from "@/context/VoiceSettingsContext";
import { accountsConfigured, getSupabase } from "@/lib/supabaseClient";
import {
  LANGUAGES,
  SPEEDS,
  buildDictation,
  findLanguage,
  getNextAiSet,
  loadDictationPrefs,
  saveDictationPrefs,
} from "@/lib/dictation";

// The AI button only appears once the site has been set up for it (see
// functions/api/dictation.js). Anyone can be shown sentences that have already
// been written; asking for a new set needs a signed-in person.
const aiConfigured = () => process.env.REACT_APP_DICTATION_AI === "true";

// "year3" -> "Year 3" when the page didn't pass a label.
const labelFromSlug = (slug) => (slug === "reception" ? "Reception" : /^year(\d+)$/.test(slug || "") ? "Year " + slug.slice(4) : "");

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The sentence with the lesson's words in bold.
function Highlighted({ text, words }) {
  const parts = useMemo(() => {
    if (!words || words.length === 0) return [text];
    const pattern = new RegExp("(" + words.map(escapeRegExp).join("|") + ")", "giu");
    return text.split(pattern);
  }, [text, words]);
  const lower = (words || []).map((w) => w.toLowerCase());
  return parts.map((part, i) =>
    lower.includes(part.toLowerCase()) ? (
      <strong key={i} className="font-bold text-primary">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// A voice for the chosen language: the person's own pick if it already speaks
// that language, otherwise the first installed voice that does.
function chooseVoice(voices, voiceURI, lang) {
  const norm = (v) => String(v || "").replace("_", "-").toLowerCase();
  const want = norm(lang);
  const base = want.split("-")[0];
  const picked = voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : null;
  if (picked && norm(picked.lang).startsWith(base)) return picked;
  return (
    voices.find((v) => norm(v.lang) === want) ||
    voices.find((v) => norm(v.lang).startsWith(base)) ||
    null
  );
}

// `shared` ({ yearSlug, week }) is set for a built-in week only, so its AI
// sentences are kept for everyone; anything else is kept on this device.
export function Dictation({ words, title = "", focus = "", yearSlug, yearLabel = "", shared = null, coveredWeek = null, trigger }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(loadDictationPrefs);
  const [lines, setLines] = useState([]);
  const [revealed, setRevealed] = useState(() => new Set());
  const [speakingId, setSpeakingId] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const speakToken = useRef(0);
  const { volume, voiceURI, englishVoices, otherVoices } = useVoiceSettings();

  const speechAvailable = typeof window !== "undefined" && Boolean(window.speechSynthesis);
  const language = findLanguage(prefs.language);
  const speed = SPEEDS.find((s) => s.id === prefs.speed) || SPEEDS[1];
  // Built-in weeks are English, so there is nothing for the AI to write in another language.
  const aiAvailable = aiConfigured() && !(shared && !language.id.startsWith("en-"));

  const stopSpeaking = useCallback(() => {
    speakToken.current += 1;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const generate = useCallback(() => {
    stopSpeaking();
    setLines(buildDictation(words, { yearSlug, language: prefs.language }).lines);
    setRevealed(new Set());
    setUsedAi(false);
  }, [words, yearSlug, prefs.language, stopSpeaking]);

  const handleOpenChange = (v) => {
    setOpen(v);
    if (v) generate();
    else stopSpeaking();
  };

  // Nothing keeps talking if the page goes away.
  useEffect(() => () => window.speechSynthesis && window.speechSynthesis.cancel(), []);

  const updatePrefs = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveDictationPrefs(next);
    return next;
  };

  // A different language means different sentences.
  const changeLanguage = (id) => {
    stopSpeaking();
    const next = updatePrefs({ language: id });
    setLines(buildDictation(words, { yearSlug, language: next.language }).lines);
    setRevealed(new Set());
    setUsedAi(false);
  };

  const speak = (line) => {
    if (!speechAvailable) {
      toast.error("Audio is not available in this browser");
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const token = ++speakToken.current;
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.lang = language.id;
    utterance.rate = speed.rate;
    utterance.volume = volume;
    const voice = chooseVoice([...englishVoices, ...otherVoices], voiceURI, language.id);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (token !== speakToken.current) return; // a newer sentence has started
      setSpeakingId(null);
      setRevealed((prev) => new Set(prev).add(line.id));
    };
    utterance.onerror = () => {
      if (token === speakToken.current) setSpeakingId(null);
    };
    setSpeakingId(line.id);
    synth.speak(utterance);
  };

  const writeWithAi = async () => {
    stopSpeaking();
    setAiBusy(true);
    let token = null;
    try {
      const client = accountsConfigured() ? getSupabase() : null;
      const session = client ? await client.auth.getSession() : null;
      token = session?.data?.session?.access_token || null;
    } catch (err) {
      token = null;
    }
    const result = await getNextAiSet({
      shared,
      entries: words,
      yearSlug,
      yearLabel: yearLabel || labelFromSlug(yearSlug),
      coveredWeek,
      language: language.id,
      token,
    });
    setAiBusy(false);
    if (result.error === "signin") {
      toast.error("Sign in to ask for new sentences. Sentences that have already been written are free for everyone.");
      return;
    }
    if (result.error === "limit") {
      toast.error("That's enough new sentences for today. Try again tomorrow.");
      return;
    }
    if (result.error) {
      toast.error("Couldn't get new sentences just now. The usual ones are still here.");
      return;
    }
    setLines(result.lines);
    setRevealed(new Set());
    setUsedAi(true);
  };

  const toggleAll = () => {
    stopSpeaking();
    setRevealed((prev) => (prev.size === lines.length ? new Set() : new Set(lines.map((l) => l.id))));
  };

  const allShown = lines.length > 0 && revealed.size === lines.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 font-mono text-sm text-muted-foreground transition-colors duration-200 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-primary"
            data-testid="dictation-button"
          >
            <AudioLines className="h-3.5 w-3.5" aria-hidden="true" /> Dictation
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] max-w-2xl overflow-y-auto border-cyan-300/20 bg-popover p-0 text-foreground"
        data-testid="dictation-dialog"
      >
        <div className="holo-card p-5 sm:p-7">
          <DialogHeader className="mb-4">
            <div className="font-mono text-sm text-primary">Dictation: {title}</div>
            <DialogTitle className="font-display text-2xl font-extrabold text-foreground">Listen, then write it down.</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Press Listen on each block and write what you hear. The sentence appears once it has been read, so you can check it.
            </DialogDescription>
          </DialogHeader>

          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="dictation-empty">
              There are no spelling words here to make a dictation from.
            </p>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                <div>
                  <p className="mb-1.5 font-mono text-sm text-muted-foreground" id="dictation-speed-label">
                    Speed
                  </p>
                  <div className="flex gap-1.5" role="radiogroup" aria-labelledby="dictation-speed-label">
                    {SPEEDS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={speed.id === s.id}
                        onClick={() => updatePrefs({ speed: s.id })}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                          speed.id === s.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-foreground/15 bg-foreground/5 text-foreground hover:border-cyan-300/50"
                        }`}
                        data-testid={`dictation-speed-${s.id}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-sm text-muted-foreground" id="dictation-language-label">
                    Language
                  </p>
                  <Select value={language.id} onValueChange={changeLanguage}>
                    <SelectTrigger className="h-9 w-[13.5rem]" aria-labelledby="dictation-language-label" data-testid="dictation-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ol className="space-y-3" data-testid="dictation-lines">
                {lines.map((line, i) => {
                  const shown = revealed.has(line.id);
                  const speaking = speakingId === line.id;
                  return (
                    <li
                      key={line.id}
                      className={`rounded-2xl border p-4 transition-colors duration-300 ${
                        shown ? "border-emerald-300/30 bg-emerald-400/10" : "border-foreground/15 bg-foreground/[0.04]"
                      }`}
                      data-testid={`dictation-line-${i + 1}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/20 font-mono text-sm font-bold text-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 self-center" aria-live="polite">
                          {shown ? (
                            <p className="text-lg leading-relaxed text-foreground" data-testid={`dictation-text-${i + 1}`}>
                              <Highlighted text={line.text} words={line.words} />
                            </p>
                          ) : (
                            <div className="space-y-2" data-testid={`dictation-hidden-${i + 1}`}>
                              <span className="sr-only">{speaking ? "Speaking" : "Sentence hidden until it has been read"}</span>
                              <div className={`h-3 w-full rounded-full bg-foreground/15 ${speaking ? "animate-pulse" : ""}`} aria-hidden="true" />
                              <div className={`h-3 w-2/3 rounded-full bg-foreground/15 ${speaking ? "animate-pulse" : ""}`} aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={shown ? "outline" : "default"}
                          onClick={() => speak(line)}
                          disabled={speaking}
                          aria-label={(shown ? "Hear sentence " : "Listen to sentence ") + (i + 1)}
                          className="shrink-0 gap-1.5 rounded-full"
                          data-testid={`dictation-listen-${i + 1}`}
                        >
                          <Volume2 className={`h-4 w-4 ${speaking ? "animate-pulse" : ""}`} aria-hidden="true" />
                          {speaking ? "Reading…" : shown ? "Again" : "Listen"}
                        </Button>
                      </div>
                      {!speechAvailable && !shown && (
                        <button
                          type="button"
                          onClick={() => setRevealed((prev) => new Set(prev).add(line.id))}
                          className="mt-3 text-sm text-primary underline"
                        >
                          Audio isn't available here. Show the sentence
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={generate} className="gap-1.5 rounded-full" data-testid="dictation-regenerate">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> New sentences
                </Button>
                {aiAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={writeWithAi}
                    disabled={aiBusy}
                    className="gap-1.5 rounded-full"
                    data-testid="dictation-ai"
                  >
                    <WandSparkles className="h-4 w-4" aria-hidden="true" /> {aiBusy ? "Getting…" : usedAi ? "Another AI story" : "Write an AI story"}
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={toggleAll} className="ml-auto gap-1.5 rounded-full" data-testid="dictation-toggle-all">
                  {allShown ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  {allShown ? "Cover all" : "Show all"}
                </Button>
              </div>
              {usedAi && (
                <p className="mt-3 text-sm text-muted-foreground" data-testid="dictation-ai-note">
                  These sentences were written by an AI from this lesson's words, and kept so they can be used again. Give them a quick read before using them.
                </p>
              )}
              {focus && <p className="mt-4 text-sm text-muted-foreground">Focus this week: {focus}</p>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
