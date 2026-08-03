// ============================================================
// Voice settings — persisted locally so they survive refresh.
// ============================================================

import type { VoiceSettings } from "./types";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
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

const STORAGE_KEY = "studyshield:voice-settings";

export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return {
      ...DEFAULT_VOICE_SETTINGS,
      ...parsed,
      speechRate: typeof parsed.speechRate === "number" ? Math.min(2, Math.max(0.5, parsed.speechRate)) : DEFAULT_VOICE_SETTINGS.speechRate,
      voiceVolume: typeof parsed.voiceVolume === "number" ? Math.min(1, Math.max(0, parsed.voiceVolume)) : DEFAULT_VOICE_SETTINGS.voiceVolume,
    };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — settings just won't persist
  }
}
