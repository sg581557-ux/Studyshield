// ============================================================
// Voice engine factory.
//
// Currently returns the browser (Web Speech API) engine. To add
// OpenAI Realtime / ElevenLabs / Azure later, implement the
// VoiceEngine interface and return it here — the Mentor chat
// logic never changes.
// ============================================================

import { BrowserVoiceEngine, UnsupportedVoiceEngine } from "./browserSpeech";
import type { VoiceEngine, VoiceSettings } from "./types";

export function createVoiceEngine(settings: VoiceSettings): VoiceEngine {
  if (typeof window === "undefined") return new UnsupportedVoiceEngine();
  const supported =
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) ||
    "speechSynthesis" in window;
  if (!supported) return new UnsupportedVoiceEngine();
  return new BrowserVoiceEngine(settings);
}

export type { VoiceEngine, VoiceSettings, RecognitionEvents, SynthesisEvents, VoiceOption } from "./types";
export { DEFAULT_VOICE_SETTINGS, loadVoiceSettings, saveVoiceSettings } from "./settings";
