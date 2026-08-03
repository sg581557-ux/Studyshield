// ============================================================
// Speech provider abstraction.
//
// These interfaces are the ONLY contracts the Voice Mode
// conversation layer depends on. Swap in OpenAI Realtime,
// Gemini Live, ElevenLabs, Azure Speech, Deepgram, Gladia or
// AssemblyAI by adding a provider implementation and returning
// it from the factory — the session logic and the Mentor layer
// never change.
// ============================================================

export interface SttResult {
  text: string;
  final: boolean;
}

export interface SttStatusEvent {
  status: "listening" | "stopped";
}

export interface SttErrorEvent {
  code: string;
  message: string;
}

export interface SttSessionEvents {
  onResult?: (text: string, final: boolean) => void;
  onStatus?: (status: "listening" | "stopped") => void;
  onError?: (code: string, message: string) => void;
  /** Fire-and-forget signal that the user started speaking (barge-in support). */
  onUserSpeechDetected?: () => void;
}

export interface SpeechToTextProvider {
  readonly id: string;
  readonly supported: boolean;
  start(options: { lang: string; events: SttSessionEvents }): boolean;
  stop(): void;
  /**
   * Instantly tear down the current recognition session so a fresh
   * `start()` is safe immediately (used for instant barge-in restarts).
   * No events fire for the aborted session.
   */
  abort(): void;
  /**
   * VAD-assisted end-of-speech: the caller detected that the user
   * stopped talking, so shorten the silence window and finalise the
   * transcript quickly (instead of waiting out the long pause timeout).
   * Safe to call anytime; a new partial resets the window.
   */
  endOfSpeech(): void;
}

export type TtsState = "started" | "paused" | "resumed" | "ended" | "stopped";

export interface TtsSessionEvents {
  onState?: (state: TtsState) => void;
  onBoundary?: (charIndex: number) => void;
  /** The voice that will actually be used — logged for debugging consistency. */
  onVoiceSelected?: (voice: TtsVoice) => void;
}

export interface TtsVoice {
  uri: string;
  name: string;
  lang: string;
}

export interface TtsSpeakOptions {
  lang: string;
  rate: number;
  volume: number;
  /** Prosody: pitch 0.5–2 (1 = neutral). Personality + situation blend. */
  pitch?: number;
  /** Preferred voice URI from settings, if any. */
  preferredVoiceURI?: string | null;
  /** "auto" | "male" | "female" — hint for choosing a voice. */
  voiceStyle?: "auto" | "male" | "female";
  /**
   * Voice family preference — keeps the same "personality" across
   * languages (Google voices in every language, or Microsoft voices,
   * or Apple voices) so the mentor sounds like the same person
   * switching languages rather than a different person each time.
   */
  family?: "auto" | "google" | "microsoft";
  events?: TtsSessionEvents;
}

export interface TextToSpeechProvider {
  readonly id: string;
  readonly supported: boolean;
  speak(text: string, options: TtsSpeakOptions): boolean;
  pause(): void;
  resume(): void;
  stop(): void;
  /**
   * Smooth stop: ramp the active utterance's volume down over ~100ms
   * before cancelling, instead of cutting audio abruptly. Falls back
   * to an immediate cancel in engines that can't ramp live volume.
   */
  fadeOut?(): void;
  listVoices(): TtsVoice[];
}

/**
 * Future full-duplex backend (OpenAI Realtime, Gemini Live).
 * When available it replaces the STT → Mentor → TTS round trip and
 * adds native barge-in/interruption. The session already routes
 * through the same Mentor layer either way.
 */
export interface RealtimeConversationProvider {
  readonly id: string;
  readonly supported: boolean;
  connect(options: {
    lang: string;
    onPartialTranscript: (text: string) => void;
    onFinalTranscript: (text: string) => void;
    onAssistantAudioStart: () => void;
    onAssistantText: (text: string) => void;
    onAssistantAudioEnd: () => void;
    onError: (code: string, message: string) => void;
  }): Promise<void>;
  disconnect(): void;
}
