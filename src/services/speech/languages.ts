// ============================================================
// Multilingual support for Voice Mode.
// 12 languages + auto-detection (script + Hinglish markers).
// ============================================================

export interface VoiceLanguage {
  code: string;
  label: string;
  native: string;
  stt: string; // SpeechRecognition locale
  tts: string; // SpeechSynthesis locale
}

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "auto", label: "Auto-detect", native: "🌐", stt: "en-IN", tts: "en-IN" },
  { code: "en", label: "English", native: "English", stt: "en-IN", tts: "en-IN" },
  { code: "hinglish", label: "Hinglish", native: "Hinglish", stt: "en-IN", tts: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", stt: "hi-IN", tts: "hi-IN" },
  { code: "bn", label: "Bengali", native: "বাংলা", stt: "bn-IN", tts: "bn-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", stt: "ta-IN", tts: "ta-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", stt: "te-IN", tts: "te-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", stt: "mr-IN", tts: "mr-IN" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", stt: "gu-IN", tts: "gu-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", stt: "kn-IN", tts: "kn-IN" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", stt: "ml-IN", tts: "ml-IN" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", stt: "pa-IN", tts: "pa-IN" },
  { code: "ur", label: "Urdu", native: "اردو", stt: "ur-PK", tts: "ur-IN" },
];

export function getVoiceLanguage(code: string): VoiceLanguage {
  return VOICE_LANGUAGES.find((l) => l.code === code) ?? VOICE_LANGUAGES[0];
}

/** Stable names passed to the mentor prompt. */
export function languagePromptName(code: string): string {
  const map: Record<string, string> = {
    en: "English",
    hinglish: "Hinglish (Hindi-English mix)",
    hi: "Hindi",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    mr: "Marathi",
    gu: "Gujarati",
    kn: "Kannada",
    ml: "Malayalam",
    pa: "Punjabi",
    ur: "Urdu",
  };
  return map[code] ?? "English";
}

const SCRIPT_RANGES: [string, [number, number]][] = [
  ["hi", [0x0900, 0x097f]],
  ["bn", [0x0980, 0x09ff]],
  ["pa", [0x0a00, 0x0a7f]],
  ["gu", [0x0a80, 0x0aff]],
  ["ta", [0x0b80, 0x0bff]],
  ["te", [0x0c00, 0x0c7f]],
  ["kn", [0x0c80, 0x0cff]],
  ["ml", [0x0d00, 0x0d7f]],
  ["ur", [0x0600, 0x06ff]],
];

/** Common Hinglish words that indicate an en+hi mix even in Latin script. */
const HINGLISH_MARKERS = [
  "bhai", "kya", "hai", "nahi", "naahi", "ho", "kar", "karo", "chahiye", "raha", "rahi",
  "aaj", "kal", "bahut", "kiya", "pata", "samajh", "jaldi", "theek", "tha", "thi", "koi",
  "kuch", "padhai", "syllabus", "mock", "dpp", "lecture", "backlog", "revision", "chapter",
  "wala", "wale", "wali", "se", "mein", "ka", "ki", "ke", "bolo", "bolna", "arre",
  "yaar", "bas", "hoga", "karna", "padhna", "apna", "tera", "mera", "aisa", "aisi",
  "mujhe", "tujhe", "tum", "hum", "isliye", "kyu", "kab", "kahan", "sahi", "galat",
  "sirf", "sab", "hamesha", "padho", "padh", "abhi", "waise",
];

/**
 * A single marker hit only proves Hinglish if the word is unmistakably
 * Hindi-in-Latin. Common-English words are deliberately excluded from
 * this set so "show me how to improve" never counts as Hinglish.
 */
const STRONG_HINGLISH_MARKERS = new Set([
  "bhai", "chahiye", "padhai", "padhna", "padho", "padh", "nahi", "raha", "rahi",
  "samajh", "wala", "wale", "wali", "yaar", "isliye", "mujhe", "tujhe", "tum",
  "hum", "sirf", "bahut", "karna", "karo", "hoga", "bas", "arre", "bolo", "bolna",
  "hamesha", "mein", "kya", "koi", "kuch", "theek", "jaldi",
]);

/**
 * Detect the spoken language from a transcript.
 * Script-first (Devanagari → Hindi, Bengali script → Bengali, …).
 * Latin script with Hinglish markers → Hinglish, otherwise English.
 */
export function detectLanguage(text: string, preferred?: string): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return preferred ?? "en";

  // If the user explicitly picked a non-auto language, trust it.
  if (preferred && preferred !== "auto") return preferred;

  // Script detection
  const scores = new Map<string, number>();
  for (const ch of trimmed) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code < 0x0080) continue;
    for (const [lang, [lo, hi]] of SCRIPT_RANGES) {
      if (code >= lo && code <= hi) {
        scores.set(lang, (scores.get(lang) ?? 0) + 1);
        break;
      }
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [lang, count] of scores) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  if (best && bestCount >= 2) return best;

  // Latin text: check Hinglish markers.
  // Short sentences are enough if a strong marker is present ("kya hua?",
  // "bhai kuch bata") — but a single weak hit is never trusted.
  const words = trimmed.toLowerCase().split(/[^a-zà-ÿ]+/);
  const hits = words.filter((w) => HINGLISH_MARKERS.includes(w));
  if (hits.length >= 2) return "hinglish";
  if (hits.length === 1 && STRONG_HINGLISH_MARKERS.has(hits[0])) return "hinglish";
  return "en";
}

export function transcriptLanguageLabel(code: string): string {
  const lang = getVoiceLanguage(code);
  return lang.code === "auto" ? "Auto" : `${lang.label} (${lang.native})`;
}
