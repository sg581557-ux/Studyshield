// ============================================================
// Provider factory.
//
// Swap backends by returning different providers here:
// - OpenAI Realtime: RealtimeConversationProvider with id
//   "openai-realtime"
// - ElevenLabs / Azure / Deepgram / Gladia / AssemblyAI:
//   SpeechToTextProvider + TextToSpeechProvider implementations
// Nothing else in the app changes.
// ============================================================

import { BrowserSpeechToText, BrowserTextToSpeech } from "./browser";
import type { RealtimeConversationProvider, SpeechToTextProvider, TextToSpeechProvider } from "./types";

export interface ProviderSet {
  stt: SpeechToTextProvider;
  tts: TextToSpeechProvider;
  /** Present when a full-duplex backend is configured; null = turn-based fallback. */
  realtime: RealtimeConversationProvider | null;
}

/** Placeholder used when no realtime backend is configured. */
class UnavailableRealtime implements RealtimeConversationProvider {
  readonly id = "none";
  readonly supported = false;
  async connect(): Promise<void> {
    throw new Error("No realtime provider configured");
  }
  disconnect(): void {}
}

export function getProviders(): ProviderSet {
  return {
    stt: new BrowserSpeechToText(),
    tts: new BrowserTextToSpeech(),
    realtime: null,
  };
}

export const realtimeAvailable = false;

export type { SpeechToTextProvider, TextToSpeechProvider, RealtimeConversationProvider } from "./types";
export { sttErrorMessage } from "./browser";
