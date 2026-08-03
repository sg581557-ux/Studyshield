// ============================================================
// Voice quality ranking + selection.
//
// Not all SpeechSynthesis voices sound human. This module scores
// every installed voice and prefers natural, high-quality ones
// (Google voices, neural/online/premium voices), pushes robotic
// voices (e.g. the classic Microsoft David/Mark/Zira trio) to
// the bottom, and only falls back to them when nothing better
// exists on the device.
//
// Shared by the Mentor chat engine and the Voice Mode provider,
// so both paths sound identical.
// ============================================================

export interface RatedVoice {
  name: string;
  lang: string;
  voiceURI: string;
}

export interface VoicePickOptions {
  /** Requested language/locale, e.g. "en-IN", "hi-IN". */
  lang: string;
  preferredURI?: string | null;
  voiceStyle?: "auto" | "male" | "female";
  family?: "auto" | "google" | "microsoft";
}

/** High-quality markers — neural, premium, online, Google's voices, Apple's natural ones. */
const NATURAL_HINTS = /google|natural|neural|premium|enhanced|online|local-network|samantha|karen|daniel|serena|fiona|tessa|novel|magic/i;

/** The classic robotic-sounding Windows voices. */
const ROBOTIC_HINTS = /microsoft\s+(?:david|mark|zira)\b/i;

/** A voice named exactly after its locale (e.g. "English (India)") is usually the default stub. */
const UNNAMED_RE = /^default$/i;

const MALE_HINTS =
  /male|man|guy|david|daniel|neil|rishi|arjun|ravi|aarav|abhay|kiran|aaron|marcus|pranav|samir|tom|alex|ryan|oliver|jack|james|liam|noah|fred|george|mikhail/i;
const FEMALE_HINTS =
  /female|woman|girl|zira|susan|samantha|victoria|kavya|priya|lekha|heera|swara|ananya|meera|nisha|sarika|jenny|emma|arohi|aria|ava|joanna|amy|salli|kendra|nicole|marley|allison/i;

function familyMatch(name: string, family: "auto" | "google" | "microsoft"): boolean {
  if (family === "google") return /google/i.test(name);
  if (family === "microsoft") return /microsoft/i.test(name);
  return true;
}

function genderMatch(name: string, style: "auto" | "male" | "female"): boolean {
  if (style === "male") return MALE_HINTS.test(name);
  if (style === "female") return FEMALE_HINTS.test(name);
  return true;
}

/**
 * Quality score for one voice in the context of the requested
 * language, style and family. Higher = more natural for the job.
 */
export function scoreVoice(v: RatedVoice, opts: VoicePickOptions): number {
  const name = v.name;
  const lang = v.lang.toLowerCase();
  const langBase = lang.split("-")[0];
  const targetBase = (opts.lang || "en-IN").split("-")[0].toLowerCase();
  let score = 0;

  // Natural, human-sounding first.
  if (NATURAL_HINTS.test(name)) score += 8;
  // Robotic voices are a last resort.
  if (ROBOTIC_HINTS.test(name)) score -= 7;
  // Unnamed default stubs are rarely the best pick.
  if (UNNAMED_RE.test(name) || name.toLowerCase() === lang) score -= 3;

  // Language match is the strongest signal.
  if (langBase === targetBase) {
    score += 10;
    if (lang === opts.lang.toLowerCase()) score += 4; // exact locale
  } else if (langBase === "en") {
    score += 2; // English is a decent fallback for any language
  }

  // Same-family consistency keeps one mentor "person" across languages.
  if (familyMatch(name, opts.family ?? "auto")) score += 6;

  // Gender/style preference.
  if (genderMatch(name, opts.voiceStyle ?? "auto")) score += 5;

  // Extra polish for premium/neural/online variants.
  if (/premium|enhanced|natural|online|local-network/i.test(name)) score += 3;

  return score;
}

/** Exact URI match wins outright; otherwise the best-scoring voice. */
export function pickBestVoice(all: RatedVoice[], opts: VoicePickOptions): RatedVoice | null {
  if (!all || all.length === 0) return null;
  if (opts.preferredURI) {
    const preferred = all.find((v) => v.voiceURI === opts.preferredURI);
    if (preferred) return preferred;
  }
  let best: RatedVoice | null = null;
  let bestScore = -Infinity;
  for (const v of all) {
    const s = scoreVoice(v, opts);
    if (s > bestScore || (s === bestScore && best === null)) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

/**
 * Best-quality first ordering for settings UIs: natural voices on
 * top, robotic ones at the bottom.
 */
export function sortVoicesByQuality(all: RatedVoice[], opts: VoicePickOptions): RatedVoice[] {
  return [...all].sort((a, b) => {
    const diff = scoreVoice(b, opts) - scoreVoice(a, opts);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}
