// Global text-to-speech preferences: volume, speaking rate and which
// browser voice reads words aloud. Separate from ThemeContext (visual
// display prefs) since this is audio-only and only matters on screens
// that actually speak -- Practice's Listen mode, its meaning-clue
// read-aloud, and Find the letter.
//
// `rate` overrides the content-driven default (TTS_RATE.slow for
// Reception, .standard otherwise, defined alongside each speaking
// component) once the user picks one -- null means "use that default",
// so nobody's experience changes until they open the settings.
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const VoiceSettingsContext = createContext(null);

const STORAGE_KEYS = {
  volume: "spellstars.ttsVolume",
  rate: "spellstars.ttsRate.user",
  voiceURI: "spellstars.ttsVoiceURI",
};

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private browsing / storage disabled -- preference just won't persist.
  }
}

const readInitialVolume = () => {
  const stored = Number(readStorage(STORAGE_KEYS.volume));
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 1;
};

const readInitialRate = () => {
  const stored = Number(readStorage(STORAGE_KEYS.rate));
  return Number.isFinite(stored) && stored >= 0.5 && stored <= 1.5 ? stored : null;
};

const readInitialVoiceURI = () => readStorage(STORAGE_KEYS.voiceURI) || "";

// Speech Synthesis voices load asynchronously (sometimes only after
// `voiceschanged` fires), so this polls the API rather than reading it once.
function useAvailableVoices() {
  const [voices, setVoices] = useState(() => window.speechSynthesis?.getVoices() ?? []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return undefined;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  return voices;
}

export function VoiceSettingsProvider({ children }) {
  const [volume, setVolume] = useState(readInitialVolume);
  const [rate, setRate] = useState(readInitialRate);
  const [voiceURI, setVoiceURI] = useState(readInitialVoiceURI);
  const voices = useAvailableVoices();

  useEffect(() => writeStorage(STORAGE_KEYS.volume, String(volume)), [volume]);
  useEffect(() => writeStorage(STORAGE_KEYS.rate, rate == null ? null : String(rate)), [rate]);
  useEffect(() => writeStorage(STORAGE_KEYS.voiceURI, voiceURI || null), [voiceURI]);

  // English voices first (this site only ever asks for en-GB), but every
  // voice the browser offers is still listed after them.
  const englishVoices = useMemo(() => voices.filter((v) => v.lang?.toLowerCase().startsWith("en")), [voices]);
  const otherVoices = useMemo(() => voices.filter((v) => !v.lang?.toLowerCase().startsWith("en")), [voices]);

  // Applies these preferences to an utterance, given the content's own
  // default rate (TTS_RATE.slow/.standard) as the fallback.
  const applyTo = (utterance, defaultRate) => {
    utterance.volume = volume;
    utterance.rate = rate ?? defaultRate;
    const voice = voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : null;
    if (voice) utterance.voice = voice;
  };

  const value = useMemo(
    () => ({
      volume,
      setVolume,
      rate,
      setRate,
      voiceURI,
      setVoiceURI,
      englishVoices,
      otherVoices,
      applyTo,
    }),
    // applyTo closes over volume/rate/voiceURI/voices, which are already deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [volume, rate, voiceURI, englishVoices, otherVoices],
  );

  return <VoiceSettingsContext.Provider value={value}>{children}</VoiceSettingsContext.Provider>;
}

export function useVoiceSettings() {
  const ctx = useContext(VoiceSettingsContext);
  if (!ctx) throw new Error("useVoiceSettings must be used within a VoiceSettingsProvider");
  return ctx;
}
