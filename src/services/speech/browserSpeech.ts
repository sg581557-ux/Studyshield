// ============================================================
// Browser implementation of the VoiceEngine using the native
// Web Speech API (SpeechRecognition + SpeechSynthesis).
// Works on Chrome and Edge. Falls back gracefully elsewhere.
// ============================================================

import type {
  EngineCapabilities,
  RecognitionEvents,
  SynthesisEvents,
  VoiceEngine,
  VoiceEngineKind,
  VoiceOption,
  VoiceSettings,
} from "./types";
import { normalizeForTTS } from "./normalize";
import { resolveVoiceParams, pauseMsForChunk, type VoiceParams } from "./personalities";
import { pickBestVoice, sortVoicesByQuality, type RatedVoice } from "./voicePicker";
import { getVoiceLanguage } from "./languages";

const DEFAULT_SETTINGS: VoiceSettings = {
  autoRead: true,
  speechRate: 1.15,
  preferredVoiceURI: null,
  autoSend: true,
  voiceLanguage: "auto",
  autoDetectLanguage: true,
  autoStartListening: true,
  voiceVolume: 1,
  voiceStyle: "auto",
  autoInterrupt: true,
  noiseSuppression: true,
  voiceFamily: "auto",
  voicePersonality: "calm",
};

// SpeechRecognition is not part of the standard TS DOM lib, so we
// declare just the surface we use.
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

const SILENCE_MS = 2200;
const TIMEOUT_MS = 20000;

export function browserRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function browserSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function recognitionErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
    case "not-allowed-error":
      return "Microphone permission was denied. Enable mic access for this site in your browser, then try again.";
    case "no-speech":
      return "No speech was detected. Speak a little closer to the microphone or try typing instead.";
    case "audio-capture":
      return "No microphone was found on this device. Plug one in or type your question instead.";
    case "network":
      return "Speech recognition needs an internet connection. Reconnect and try again, or type instead.";
    case "aborted":
      return "Speech recognition was interrupted. Tap the mic to start again.";
    default:
      return `Speech recognition failed (${code}). Try again or type your question instead.`;
  }
}

export class BrowserVoiceEngine implements VoiceEngine {
  readonly kind: VoiceEngineKind = "browser";
  readonly capabilities: EngineCapabilities = {
    recognition: browserRecognitionSupported(),
    synthesis: browserSynthesisSupported(),
  };

  private settings: VoiceSettings = { ...DEFAULT_SETTINGS };
  private recognition: RecognitionInstance | null = null;
  private recognitionEvents: RecognitionEvents = {};
  private synthEvents: SynthesisEvents = {};

  private listening = false;
  private finalTranscript = "";
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSpeechAt = 0;
  private stopReason: "silence" | "manual" | "timeout" = "manual";
  private errored = false;

  // ---- chunked speaking state -------------------------------------------
  private speakToken = 0;
  private chunkQueue: string[] = [];
  private chunkIndex = 0;
  private chunkBaseOffset = 0;
  private gapTimer: ReturnType<typeof setTimeout> | null = null;
  private inGap = false;
  private pausedInGap = false;
  private activeQueue: { lang: string; voice: SpeechSynthesisVoice | null; params: VoiceParams; token: number } | null = null;

  private clearGap(): void {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
    this.inGap = false;
  }

  constructor(settings?: Partial<VoiceSettings>) {
    if (settings) this.settings = { ...this.settings, ...settings };
  }

  applySettings(s: VoiceSettings): void {
    this.settings = { ...s };
  }

  startListening(events: RecognitionEvents): boolean {
    const ctor = getRecognitionCtor();
    if (!ctor) return false;

    this.recognitionEvents = events;
    this.finalTranscript = "";
    this.listening = true;
    this.stopReason = "manual";
    this.errored = false;

    if (!this.recognition) {
      this.recognition = new ctor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = "en-IN";

      this.recognition.onresult = (e: RecognitionEventLike) => {
        this.lastSpeechAt = Date.now();
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
        this.recognitionEvents.onPartial?.(`${this.finalTranscript}${interim ? ` ${interim}` : ""}`.trim());
      };

      this.recognition.onspeechend = () => {
        // Restart the silence timer — if no more speech within SILENCE_MS,
        // stop and finalise what we have.
        this.lastSpeechAt = Date.now();
        this.armSilenceTimer();
      };

      this.recognition.onerror = (e: { error: string }) => {
        if (!this.listening) return;
        const code = e.error;
        if (code === "no-speech") {
          // Chrome fires no-speech when the whole session was silent.
          this.errored = true;
          this.stopListening();
          this.recognitionEvents.onError?.("empty", recognitionErrorMessage("no-speech"));
          return;
        }
        if (code === "aborted") {
          this.stopListening();
          return;
        }
        this.errored = true;
        this.stopListening();
        this.recognitionEvents.onError?.(code, recognitionErrorMessage(code));
      };

      this.recognition.onend = () => {
        this.listening = false;
        this.clearTimers();
        this.recognitionEvents.onStatusChange?.("stopped");
        if (this.errored) return;
        const text = this.finalTranscript.trim();
        if (text) {
          this.recognitionEvents.onFinal?.(text, this.stopReason);
        } else if (this.stopReason !== "manual") {
          // Session ended because nothing was said (silence/timeout), not
          // because the user deliberately stopped.
          this.recognitionEvents.onError?.("empty", "Nothing was heard. Tap the mic and speak, or type instead.");
        }
      };
    }

    try {
      this.recognition.start();
    } catch {
      this.listening = false;
      this.recognitionEvents.onError?.("start-failed", "Could not start the microphone. Try again.");
      return false;
    }
    this.lastSpeechAt = Date.now();
    this.armSilenceTimer();
    this.timeoutTimer = setTimeout(() => {
      if (!this.listening) return;
      this.stopReason = "timeout";
      if (!this.finalTranscript.trim()) {
        this.errored = true;
        this.recognitionEvents.onError?.("timeout", "Listening timed out — no speech detected. Tap the mic and speak, or type instead.");
      }
      this.recognition?.stop();
    }, TIMEOUT_MS);
    this.recognitionEvents.onStatusChange?.("listening");
    return true;
  }

  stopListening(): void {
    if (!this.listening || !this.recognition) return;
    this.stopReason = "manual";
    try {
      this.recognition.stop();
    } catch {
      // ignore — onend will still fire
    }
  }

  private armSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      const idleMs = Date.now() - this.lastSpeechAt;
      if (this.listening && idleMs >= SILENCE_MS) {
        this.stopReason = "silence";
        this.recognition?.stop();
      }
    }, SILENCE_MS + 300);
  }

  private clearTimers(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.silenceTimer = null;
    this.timeoutTimer = null;
  }

  /**
   * Speak a reply aloud with natural pacing: the text is normalized
   * and split into sentence chunks, each chunk is its own utterance
   * with a personality/situation-tuned pause in between. Pause and
   * resume work both mid-utterance and between chunks.
   */
  speak(text: string, events: SynthesisEvents): boolean {
    if (!this.capabilities.synthesis || typeof speechSynthesis === "undefined") return false;
    this.synthEvents = events;

    const lang = getVoiceLanguage(this.settings.voiceLanguage).tts;
    const params = resolveVoiceParams(this.settings, events.style?.situation ?? "neutral", events.style?.personality);
    const chunks = normalizeForTTS(text, lang).map((c) => c.text);
    if (chunks.length === 0) return false;

    const voice = this.pickVoice(lang);
    const token = ++this.speakToken;
    this.clearGap();
    this.pausedInGap = false;
    this.chunkQueue = chunks;
    this.chunkIndex = 0;
    this.chunkBaseOffset = 0;
    this.activeQueue = { lang, voice, params, token };

    this.speakChunk(voice, token);
    return true;
  }

  /** Speak the next chunk; when the queue is done, fire the final "ended". */
  private speakChunk(voice: SpeechSynthesisVoice | null, token: number): void {
    if (token !== this.speakToken || !this.activeQueue) return;
    if (this.chunkIndex >= this.chunkQueue.length) {
      this.synthEvents.onStateChange?.("ended");
      if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = null;
      return;
    }

    const { lang, params } = this.activeQueue;
    const text = this.chunkQueue[this.chunkIndex];
    const baseOffset = this.chunkBaseOffset;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = params.rate;
    utterance.volume = Math.min(1, Math.max(0, this.settings.voiceVolume));
    utterance.pitch = params.pitch;
    utterance.lang = lang;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onstart = () => {
      if (token !== this.speakToken) return;
      if (this.chunkIndex === 0) this.synthEvents.onStateChange?.("started");
    };
    utterance.onpause = () => {
      if (token === this.speakToken) this.synthEvents.onStateChange?.("paused");
    };
    utterance.onresume = () => {
      if (token === this.speakToken) this.synthEvents.onStateChange?.("resumed");
    };
    utterance.onend = () => {
      if (token !== this.speakToken) return;
      this.chunkIndex++;
      this.chunkBaseOffset += text.length;
      // Natural pause before the next sentence (longer after "?!").
      this.inGap = true;
      this.gapTimer = setTimeout(() => {
        this.inGap = false;
        this.gapTimer = null;
        if (token !== this.speakToken) return;
        if (this.pausedInGap) return; // resume() continues the queue
        this.speakChunk(voice, token);
      }, pauseMsForChunk(text, params.pauseMs));
    };
    utterance.onerror = () => {
      // Chrome fires 'interrupted'/'canceled' for our own cancel() calls —
      // only real failures (token still current) end the reply.
      if (token === this.speakToken) this.synthEvents.onStateChange?.("ended");
    };
    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (token === this.speakToken) this.synthEvents.onBoundary?.(baseOffset + e.charIndex);
    };

    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch {
      if (token === this.speakToken) this.synthEvents.onStateChange?.("ended");
    }
  }

  /**
   * Quality-first voice picker shared with Voice Mode: preferred URI
   * wins, otherwise the best-scoring natural voice (robotic voices are
   * only used when nothing better exists on the device).
   */
  private pickVoice(lang: string): SpeechSynthesisVoice | null {
    if (typeof speechSynthesis === "undefined") return null;
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const rated: RatedVoice[] = voices.map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
    const best = pickBestVoice(rated, {
      lang,
      preferredURI: this.settings.preferredVoiceURI,
      voiceStyle: this.settings.voiceStyle,
      family: this.settings.voiceFamily,
    });
    if (!best) return null;
    return voices.find((v) => v.voiceURI === best.voiceURI) ?? null;
  }

  pause(): void {
    if (typeof speechSynthesis === "undefined") return;
    if (this.inGap) {
      // Between chunks: hold the next sentence instead of letting it fire.
      this.pausedInGap = true;
      this.clearGap();
      this.synthEvents.onStateChange?.("paused");
      return;
    }
    speechSynthesis.pause();
  }

  resume(): void {
    if (typeof speechSynthesis === "undefined") return;
    if (this.pausedInGap && this.activeQueue) {
      this.pausedInGap = false;
      this.inGap = false;
      this.synthEvents.onStateChange?.("resumed");
      this.speakChunk(this.activeQueue.voice, this.activeQueue.token);
      return;
    }
    speechSynthesis.resume();
  }

  stopSpeaking(): void {
    if (typeof speechSynthesis === "undefined") return;
    this.speakToken++;
    this.clearGap();
    this.pausedInGap = false;
    speechSynthesis.cancel();
    this.synthEvents.onStateChange?.("stopped");
  }

  listVoices(): VoiceOption[] {
    if (typeof speechSynthesis === "undefined") return [];
    const voices = speechSynthesis.getVoices();
    const rated: RatedVoice[] = voices.map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
    return sortVoicesByQuality(rated, { lang: "en-IN", voiceStyle: "auto", family: "auto" }).map((v) => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
    }));
  }
}

/** Engine returned when the browser has no speech support at all. */
export class UnsupportedVoiceEngine implements VoiceEngine {
  readonly kind: VoiceEngineKind = "unsupported";
  readonly capabilities: EngineCapabilities = { recognition: false, synthesis: false };
  applySettings(): void {}
  startListening(): boolean {
    return false;
  }
  stopListening(): void {}
  speak(): boolean {
    return false;
  }
  pause(): void {}
  resume(): void {}
  stopSpeaking(): void {}
  listVoices(): VoiceOption[] {
    return [];
  }
}
