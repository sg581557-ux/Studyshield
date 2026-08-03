// ============================================================
// Mentor voice personalities + situation tone adaptation.
//
// Four personalities make the AI Mentor sound like a real
// coach instead of a flat TTS robot:
//   - calm          → warm, steady, reassuring
//   - motivational  → upbeat, energetic
//   - strict        → firm, direct, accountable
//   - friendly      → light, casual companion
//
// On top of the user's chosen personality, the situation the
// student is in (behind schedule, achieved goals, stressed,
// low productivity) shifts pitch / rate / pauses automatically
// so the voice matches the moment.
//
// Prosody-only by design: the mentor's words and logic are
// NEVER changed — only how the reply sounds.
// ============================================================

import type { VoiceSettings } from "./types";
import type { MentorSituation } from "./tone";

export type VoicePersonality = "calm" | "motivational" | "strict" | "friendly";

export interface PersonalityProfile {
  id: VoicePersonality;
  label: string;
  description: string;
  /** Base pitch (0.5–2). Higher = brighter/lighter, lower = deeper/firmer. */
  pitch: number;
  /** Added to the user's speechRate (0.5–2 clamp applies after). */
  rateDelta: number;
  /** Natural pause between spoken sentences (ms). */
  pauseMs: number;
  /** How the voice carries — used for UI descriptions only. */
  emphasis: "soft" | "high-energy" | "firm" | "warm";
}

export const PERSONALITIES: Record<VoicePersonality, PersonalityProfile> = {
  calm: {
    id: "calm",
    label: "Calm & supportive",
    description: "Warm, steady and reassuring — like a patient mentor.",
    pitch: 1.0,
    rateDelta: 0,
    pauseMs: 200,
    emphasis: "soft",
  },
  motivational: {
    id: "motivational",
    label: "Motivational coach",
    description: "Upbeat and energetic — pushes you with enthusiasm.",
    pitch: 1.14,
    rateDelta: 0.08,
    pauseMs: 165,
    emphasis: "high-energy",
  },
  strict: {
    id: "strict",
    label: "Strict accountability",
    description: "Firm and direct — keeps you accountable.",
    pitch: 0.88,
    rateDelta: -0.02,
    pauseMs: 155,
    emphasis: "firm",
  },
  friendly: {
    id: "friendly",
    label: "Friendly companion",
    description: "Light and casual — like studying with a friend.",
    pitch: 1.06,
    rateDelta: 0.03,
    pauseMs: 180,
    emphasis: "warm",
  },
};

export const PERSONALITY_ORDER: VoicePersonality[] = ["calm", "motivational", "strict", "friendly"];

/** Prosody deltas applied on top of the personality when a situation is active. */
export interface ToneOverride {
  pitchDelta: number;
  rateDelta: number;
  pauseDelta: number;
}

export const TONE_ADAPTATIONS: Record<MentorSituation, ToneOverride> = {
  neutral: { pitchDelta: 0, rateDelta: 0, pauseDelta: 0 },
  // Encouraging but accountable — steady and warm, slightly firmer pace.
  behind: { pitchDelta: 0.02, rateDelta: 0.05, pauseDelta: 15 },
  // Celebrate progress — brighter, lighter, a touch faster.
  achieved: { pitchDelta: 0.15, rateDelta: 0.1, pauseDelta: 25 },
  // Calm support — lower, slower, generous pauses.
  stressed: { pitchDelta: -0.12, rateDelta: -0.12, pauseDelta: 60 },
  // Motivating push — faster and more energetic.
  "low-productivity": { pitchDelta: 0.08, rateDelta: 0.12, pauseDelta: -15 },
};

export interface VoiceParams {
  pitch: number;
  rate: number;
  pauseMs: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Final prosody for a reply: user's personality (or an explicit
 * override) blended with the detected student situation.
 */
export function resolveVoiceParams(
  settings: VoiceSettings,
  situation: MentorSituation = "neutral",
  personality?: VoicePersonality,
): VoiceParams {
  const p = PERSONALITIES[personality ?? settings.voicePersonality];
  const tone = TONE_ADAPTATIONS[situation] ?? TONE_ADAPTATIONS.neutral;
  return {
    pitch: clamp(0.5, 2, p.pitch + tone.pitchDelta),
    rate: clamp(0.5, 2, settings.speechRate + p.rateDelta + tone.rateDelta),
    pauseMs: clamp(60, 420, p.pauseMs + tone.pauseDelta),
  };
}

/**
 * Natural emphasis: dramatic endings (questions, exclamations,
 * Hindi sentence enders) get a slightly longer breath than plain
 * sentences, so the reply doesn't sound metronomic. All pauses are
 * kept short (tens of ms) so speech stays conversational.
 */
export function pauseMsForChunk(chunkText: string, basePauseMs: number): number {
  const t = chunkText.trimEnd();
  if (/[?!؟]$/.test(t)) return basePauseMs + 50;
  if (/।$/.test(t)) return basePauseMs + 35;
  if (/,;:$/.test(t)) return basePauseMs + 25;
  return basePauseMs;
}
