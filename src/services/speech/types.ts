// ============================================================
// Voice Mentor engine contract.
//
// The Mentor business logic only talks to the VoiceEngine
// interface below. Future backends (OpenAI Realtime,
// ElevenLabs, Azure Speech) only need to implement this
// interface — no changes to the chat UI or logic.
// ============================================================

export type VoiceEngineKind = "browser" | "openai-realtime" | "elevenlabs" | "azure" | "unsupported";

export interface EngineCapabilities {
  recognition: boolean;
  synthesis: boolean;
}

export interface VoiceSettings {
  autoRead: boolean;
  /** 0.5–2; production default 1.15 (natural coaching pace). */
  speechRate: number;
  preferredVoiceURI: string | null;
  autoSend: boolean;
  /** "auto" | "en" | "hinglish" | "hi" | "bn" | "ta" | "te" | "mr" | "gu" | "kn" | "ml" | "pa" | "ur" */
  voiceLanguage: string;
  autoDetectLanguage: boolean;
  autoStartListening: boolean;
  /** 0–1 */
  voiceVolume: number;
  voiceStyle: "auto" | "male" | "female";
  /** Barge-in: stop the reply the moment the user starts talking. */
  autoInterrupt: boolean;
  /** Apply noise suppression + echo cancellation on the mic stream. */
  noiseSuppression: boolean;
  /** Same voice personality across languages (Google/Microsoft family). */
  voiceFamily: "auto" | "google" | "microsoft";
  /**
   * How the mentor's voice sounds: calm & supportive, motivational
   * coach, strict accountability, or friendly companion.
   */
  voicePersonality: "calm" | "motivational" | "strict" | "friendly";
}

export interface RecognitionEvents {
  /** Live (non-final) transcript updates while the user is speaking. */
  onPartial?: (text: string) => void;
  /** A complete utterance, finalised by silence or the user stopping. */
  onFinal?: (text: string, reason: "silence" | "manual" | "timeout") => void;
  onStatusChange?: (status: "listening" | "stopped") => void;
  onError?: (code: string, message: string) => void;
}

export interface SynthesisEvents {
  onStateChange?: (state: "started" | "paused" | "resumed" | "ended" | "stopped") => void;
  /** Fired at word boundaries; charIndex is an offset into the spoken text. */
  onBoundary?: (charIndex: number) => void;
  /**
   * How to voice THIS utterance: the mentor personality to use and
   * the student situation detected for this reply. Both are optional —
   * when absent the engine falls back to the settings personality and
   * a neutral tone.
   */
  style?: {
    personality?: "calm" | "motivational" | "strict" | "friendly";
    situation?: "neutral" | "behind" | "achieved" | "stressed" | "low-productivity";
  };
}

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
}

export interface VoiceEngine {
  readonly kind: VoiceEngineKind;
  readonly capabilities: EngineCapabilities;
  /** Start listening. Returns false if recognition is unavailable. */
  startListening(events: RecognitionEvents): boolean;
  stopListening(): void;
  /** Speak a reply aloud. Returns false if synthesis is unavailable. */
  speak(text: string, events: SynthesisEvents): boolean;
  pause(): void;
  resume(): void;
  stopSpeaking(): void;
  listVoices(): VoiceOption[];
  applySettings(s: VoiceSettings): void;
}
