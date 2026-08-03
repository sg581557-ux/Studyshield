// ============================================================
// Browser (Web Speech API) providers.
// Chrome/Edge native speech recognition + synthesis, including
// Indian-language voices. Used as the default STT/TTS backend.
// ============================================================

import type {
  SpeechToTextProvider,
  SttSessionEvents,
  TextToSpeechProvider,
  TtsSessionEvents,
  TtsSpeakOptions,
  TtsVoice,
} from "./types";
import { pickBestVoice, sortVoicesByQuality, type RatedVoice } from "../voicePicker";

// ---- shared helpers -----------------------------------------------------

interface RecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [alternative: number]: { transcript: string };
    };
  };
}

interface RecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionInstance;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function browserSttSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function browserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function sttErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
    case "not-allowed-error":
      return "Please allow microphone permission, then tap the mic again.";
    case "no-speech":
      return "No speech was detected. Speak closer to the microphone or check your Bluetooth earphones.";
    case "audio-capture":
      return "No microphone detected. Connect a mic or Bluetooth earphones and try again.";
    case "network":
      return "Speech recognition needs an internet connection. Reconnect and try again.";
    case "timeout":
      return "Listening timed out — no speech detected. Tap the mic and speak again.";
    case "empty":
      return "Nothing was heard. Tap the mic and speak, or switch to text chat.";
    case "start-failed":
      return "Could not start the microphone. Try again.";
    default:
      return `Speech recognition failed (${code}). Try again.`;
  }
}

// Long silence window: while the user may still be mid-sentence, a pause
// must NOT end the turn. The session's VAD calls endOfSpeech() once the
// user truly stopped, which arms the much shorter finalize window below.
const SILENCE_MS = 6000;
/** Armed by endOfSpeech(): finalise ~this long after VAD reports silence. */
const FINALIZE_MS = 1200;
const TIMEOUT_MS = 30000;

export class BrowserSpeechToText implements SpeechToTextProvider {
  readonly id = "browser-stt";
  readonly supported = browserSttSupported();

  private recognition: RecognitionInstance | null = null;
  private events: SttSessionEvents = {};
  private listening = false;
  private finalTranscript = "";
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSpeechAt = 0;
  private stopReason: "silence" | "manual" | "timeout" = "manual";
  private errored = false;
  private finalizing = false;
  /**
   * Bumped on every start()/abort(): event handlers from an older
   * recognition instance must never fire into the current session.
   */
  private generation = 0;

  start(options: { lang: string; events: SttSessionEvents }): boolean {
    const ctor = getRecognitionCtor();
    if (!ctor) return false;

    this.clearTimers();
    this.events = options.events;
    this.finalTranscript = "";
    this.listening = true;
    this.stopReason = "manual";
    this.errored = false;
    this.finalizing = false;

    const gen = ++this.generation;

    // Detach any stale session FIRST: a fresh instance is created on
    // every start() so an instant restart (barge-in) never hits
    // Chrome's "recognition already active" InvalidStateError.
    const stale = this.recognition;
    if (stale) {
      try {
        stale.abort();
      } catch {
        // already ended
      }
      stale.onresult = null;
      stale.onerror = null;
      stale.onend = null;
      stale.onspeechend = null;
    }

    const recognition = new ctor();
    this.recognition = recognition;
    // Continuous + interimResults (checked requirement):
    //   - continuous: keep recognizing across pauses in a long sentence
    //   - interimResults: surface partials live ("I want to improve…")
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const isCurrent = (): boolean => this.listening && gen === this.generation;

    recognition.onresult = (e: RecognitionEventLike) => {
      if (!isCurrent()) return;
      this.lastSpeechAt = Date.now();
      // New speech cancels any pending VAD finalize window and re-arms
      // the long silence window — brief pauses never end the turn.
      this.finalizing = false;
      this.armSilenceTimer();
      this.armTimeoutTimer();
      // Fire-and-forget: the caller logs "speech detected" and can use
      // it to reset other timers (e.g. barge-in windows).
      this.events.onUserSpeechDetected?.();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result?.[0]?.transcript ?? "";
        if (result.isFinal) {
          this.finalTranscript = `${this.finalTranscript} ${transcript}`.trim();
        } else {
          interim += transcript;
        }
      }
      this.events.onResult?.(`${this.finalTranscript}${interim ? ` ${interim}` : ""}`.trim(), this.finalTranscript.length > 0 && !interim);
    };

    recognition.onspeechend = () => {
      if (!isCurrent()) return;
      this.lastSpeechAt = Date.now();
      this.armSilenceTimer();
    };

    recognition.onerror = (e: { error: string }) => {
      if (!isCurrent()) return;
      const code = e.error;
      if (code === "no-speech") {
        this.errored = true;
        this.stop();
        this.events.onError?.("empty", sttErrorMessage("no-speech"));
        return;
      }
      if (code === "aborted") {
        this.stop();
        return;
      }
      this.errored = true;
      this.stop();
      this.events.onError?.(code, sttErrorMessage(code));
    };

    recognition.onend = () => {
      if (gen !== this.generation) return;
      this.listening = false;
      this.clearTimers();
      this.events.onStatus?.("stopped");
      if (this.errored) return;
      const text = this.finalTranscript.trim();
      if (text) {
        this.events.onResult?.(text, true);
      } else if (this.stopReason !== "manual") {
        this.events.onError?.("empty", sttErrorMessage("empty"));
      }
    };

    recognition.lang = options.lang || "en-IN";
    try {
      recognition.start();
    } catch {
      // Abort the new session and report failure — the caller
      // (voiceSession) runs diagnostics to pinpoint the real cause
      // (permission denied, no device, transient InvalidStateError).
      try {
        recognition.abort();
      } catch {
        // onend will still fire
      }
      this.listening = false;
      this.recognition = null;
      return false;
    }
    this.lastSpeechAt = Date.now();
    this.armSilenceTimer();
    this.armTimeoutTimer();
    this.events.onStatus?.("listening");
    return true;
  }

  stop(): void {
    if (!this.listening || !this.recognition) return;
    this.stopReason = "manual";
    try {
      this.recognition.stop();
    } catch {
      // onend will still fire
    }
  }

  abort(): void {
    const recognition = this.recognition;
    if (!recognition) return;
    this.generation++; // invalidate this session's event handlers
    this.listening = false;
    this.clearTimers();
    try {
      recognition.abort();
    } catch {
      // already ended
    }
    this.recognition = null;
  }

  endOfSpeech(): void {
    if (!this.listening || !this.recognition || this.finalizing) return;
    this.finalizing = true;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (!this.listening || !this.finalizing) return;
      this.stopReason = "silence";
      this.recognition?.stop();
    }, FINALIZE_MS);
  }

  private armSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.listening && Date.now() - this.lastSpeechAt >= SILENCE_MS) {
        this.stopReason = "silence";
        this.recognition?.stop();
      }
    }, SILENCE_MS + 300);
  }

  /** Global guard: stop an empty session after 30s (re-armed on speech). */
  private armTimeoutTimer(): void {
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      if (!this.listening) return;
      this.stopReason = "timeout";
      if (!this.finalTranscript.trim()) {
        this.errored = true;
        this.events.onError?.("timeout", sttErrorMessage("timeout"));
      }
      this.recognition?.stop();
    }, TIMEOUT_MS);
  }

  private clearTimers(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.silenceTimer = null;
    this.timeoutTimer = null;
  }
}

// ---- TTS ------------------------------------------------------------------

export class BrowserTextToSpeech implements TextToSpeechProvider {
  readonly id = "browser-tts";
  readonly supported = browserTtsSupported();

  private events: TtsSessionEvents = {};
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private fading = false;

  speak(text: string, options: TtsSpeakOptions): boolean {
    if (!this.supported || typeof speechSynthesis === "undefined") return false;
    const ev = options.events ?? {};
    this.events = ev;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.min(2, Math.max(0.5, options.rate ?? 1));
    utterance.volume = Math.min(1, Math.max(0, options.volume ?? 1));
    utterance.pitch = Math.min(2, Math.max(0.5, options.pitch ?? 1));
    utterance.lang = options.lang || "en-IN";

    const voice = this.pickVoice(options);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
      ev.onVoiceSelected?.({ uri: voice.voiceURI, name: voice.name, lang: voice.lang });
    }

    utterance.onstart = () => ev.onState?.("started");
    utterance.onpause = () => ev.onState?.("paused");
    utterance.onresume = () => ev.onState?.("resumed");
    utterance.onend = () => {
      // Events for a stale utterance are dropped: its session is gone.
      if (this.activeUtterance === utterance) this.activeUtterance = null;
      if (!this.fading || this.activeUtterance === utterance) ev.onState?.("ended");
    };
    utterance.onerror = () => {
      if (this.activeUtterance === utterance) this.activeUtterance = null;
      if (!this.fading) ev.onState?.("ended");
    };
    utterance.onboundary = (e: SpeechSynthesisEvent) => ev.onBoundary?.(e.charIndex);

    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
      this.activeUtterance = utterance;
      return true;
    } catch {
      this.activeUtterance = null;
      ev.onState?.("ended");
      return false;
    }
  }

  /**
   * Smooth stop: ramp the active utterance's volume down over ~100ms
   * before cancelling, so interruptions don't cut audio abruptly.
   * Engines that can't apply live volume changes just get the quick
   * cancel at the end of the ramp.
   */
  fadeOut(): void {
    if (!this.activeUtterance || this.fading || typeof speechSynthesis === "undefined") return;
    const u = this.activeUtterance;
    const STEPS = 4;
    let step = 0;
    this.fading = true;
    const tick = (): void => {
      if (this.activeUtterance !== u) {
        this.fading = false;
        return;
      }
      step++;
      if (step >= STEPS) {
        this.fading = false;
        this.stop();
        return;
      }
      try {
        // Best-effort live volume ramp (Chrome applies this mid-speech;
        // other engines ignore it and the cancel below still lands).
        u.volume = Math.max(0, 1 - step / (STEPS + 1));
      } catch {
        // ignore — fall through to the next step
      }
      setTimeout(tick, 25);
    };
    tick();
  }

  /**
   * Consistent-voice picker backed by the shared quality ranker:
   * natural/neural/premium voices first, robotic voices last,
   * exact preferred URI wins, then family+gender in the language.
   */
  private pickVoice(options: TtsSpeakOptions): SpeechSynthesisVoice | null {
    if (!this.supported) return null;
    const all = speechSynthesis.getVoices();
    if (all.length === 0) return null;

    const rated: RatedVoice[] = all.map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
    const best = pickBestVoice(rated, {
      lang: options.lang || "en-IN",
      preferredURI: options.preferredVoiceURI,
      voiceStyle: options.voiceStyle ?? "auto",
      family: options.family ?? "auto",
    });
    if (!best) return null;
    return all.find((v) => v.voiceURI === best.voiceURI) ?? null;
  }

  pause(): void {
    if (this.supported && typeof speechSynthesis !== "undefined") speechSynthesis.pause();
  }

  resume(): void {
    if (this.supported && typeof speechSynthesis !== "undefined") speechSynthesis.resume();
  }

  stop(): void {
    if (this.supported && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.activeUtterance = null;
    this.fading = false;
    this.events.onState?.("stopped");
  }

  listVoices(): TtsVoice[] {
    if (!this.supported || typeof speechSynthesis === "undefined") return [];
    const voices = speechSynthesis.getVoices();
    const rated: RatedVoice[] = voices.map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
    return sortVoicesByQuality(rated, { lang: "en-IN", voiceStyle: "auto", family: "auto" }).map((v) => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
    }));
  }
}
