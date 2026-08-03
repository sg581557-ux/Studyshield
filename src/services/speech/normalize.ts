// ============================================================
// TTS text normalization.
//
// Turns raw mentor replies (markdown + Latin-script education
// terms + formulas) into natural, correctly-pronounced speech:
//
//   "**Direct Answer** DPP me 80% aaye"  →  "Direct Answer.
//    डी पी पी में 80% आए"
//
//   "x² + H₂SO₄, d/dx sin θ"            →  "x square plus
//    H two S O four, d by dx sin theta"
//
// Language-aware pronunciation dictionary (en/hi/bn), formula
// expansion, markdown stripping, and sentence chunking for
// natural pauses. Provider-agnostic — any TTS backend benefits.
// ============================================================

// ---- education-term pronunciation dictionaries ------------------------

const EN_TERMS: Record<string, string> = {
  DPP: "D P P",
  "DPPs": "D P P",
  PYQ: "P Y Q",
  "PYQs": "P Y Q",
  NLM: "N L M",
  IUPAC: "I U P A C",
  NCERT: "N C E R T",
  JEE: "J E E",
  IIT: "I I T",
  NTA: "N T A",
  KVPY: "K V P Y",
  MCQ: "M C Q",
  "MCQs": "M C Q",
  NEET: "neet",
};

const HI_TERMS: Record<string, string> = {
  DPP: "डी पी पी",
  "DPPs": "डी पी पी",
  PYQ: "पी वाई क्यू",
  "PYQs": "पी वाई क्यू",
  NLM: "एन एल एम",
  IUPAC: "आई यू पी ए सी",
  NCERT: "एन सी ई आर टी",
  JEE: "जे ई ई",
  IIT: "आई आई टी",
  NTA: "एन टी ए",
  KVPY: "के वी पी वाय",
  MCQ: "एम सी क्यू",
  "MCQs": "एम सी क्यू",
  NEET: "नीट",
};

const BN_TERMS: Record<string, string> = {
  DPP: "ডি পি পি",
  "DPPs": "ডি পি পি",
  PYQ: "পি ওয়াই কিউ",
  "PYQs": "পি ওয়াই কিউ",
  NLM: "এন এল এম",
  IUPAC: "আই ইউ পি এ সি",
  NCERT: "এন সি ই আর টি",
  JEE: "জে ই ই",
  IIT: "আই আই টি",
  NTA: "এন টি এ",
  KVPY: "কে ভি পি ওয়াই",
  MCQ: "এম সি কিউ",
  "MCQs": "এম সি কিউ",
  NEET: "নিট",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyDictionary(text: string, langBase: string): string {
  const dict = langBase === "hi" ? HI_TERMS : langBase === "bn" ? BN_TERMS : EN_TERMS;
  let out = text;
  for (const [term, spoken] of Object.entries(dict)) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi"), spoken);
  }
  return out;
}

// ---- formula / symbol expansions (education mode) -----------------------

const SYMBOL_RULES: [RegExp, string][] = [
  // Superscripts / subscripts — specific before generic
  [/\b([A-Za-z])²\b/g, "$1 square"],
  [/\b([A-Za-z0-9])³\b/g, "$1 cubed"],
  [/\b([A-Za-z0-9])⁴\b/g, "$1 to the power 4"],
  [/\b([A-Za-z0-9])⁵\b/g, "$1 to the power 5"],
  [/\b([A-Za-z0-9])⁶\b/g, "$1 to the power 6"],
  [/\b([A-Za-z0-9])⁷\b/g, "$1 to the power 7"],
  [/\b([A-Za-z0-9])⁸\b/g, "$1 to the power 8"],
  [/\b([A-Za-z0-9])⁹\b/g, "$1 to the power 9"],
  [/\b([A-Za-z0-9])⁰\b/g, "$1 to the power 0"],
  [/\b([A-Za-z0-9])¹\b/g, "$1 to the power 1"],
  [/₀/g, " zero"],
  [/₁/g, " one"],
  [/₂/g, " two"],
  [/₃/g, " three"],
  [/₄/g, " four"],
  [/₅/g, " five"],
  [/₆/g, " six"],
  [/₇/g, " seven"],
  [/₈/g, " eight"],
  [/₉/g, " nine"],
  // Derivatives — longest forms first
  [/\bd²y\/dx²\b/gi, "second derivative of y with respect to x"],
  [/\bd²\/dx²\b/gi, "second derivative with respect to x"],
  [/\bdy\/dx\b/gi, "dy by dx"],
  [/\bd\/dx\b/gi, "d by dx"],
  // Symbols
  [/∫/g, "integral of "],
  [/√/g, "square root of "],
  [/±/g, "plus or minus "],
  [/×/g, "times "],
  [/÷/g, "divided by "],
  [/≈/g, "approximately "],
  [/≠/g, "not equal to "],
  [/≤/g, "less than or equal to "],
  [/≥/g, "greater than or equal to "],
  [/→/g, "gives "],
  [/⇒/g, "implies "],
  [/∴/g, "therefore "],
  [/∵/g, "since "],
  [/∞/g, "infinity "],
  [/∑/g, "sum of "],
  [/∝/g, "proportional to "],
  [/∈/g, "in "],
  [/&/g, " and "],
  // Greek letters
  [/θ/g, "theta "],
  [/α/g, "alpha "],
  [/β/g, "beta "],
  [/γ/g, "gamma "],
  [/δ/g, "delta "],
  [/Δ/g, "delta "],
  [/λ/g, "lambda "],
  [/μ/g, "mu "],
  [/π/g, "pi "],
  [/σ/g, "sigma "],
  [/ω/g, "omega "],
  [/φ/g, "phi "],
  [/τ/g, "tau "],
  [/ε/g, "epsilon "],
  [/°/g, " degrees"],
];

function applyFormulaExpansions(text: string): string {
  let out = text;
  for (const [re, rep] of SYMBOL_RULES) out = out.replace(re, rep);
  return out;
}

// ---- markdown stripping ---------------------------------------------------

const MARKDOWN_RULES: [RegExp, string][] = [
  [/```[\s\S]*?```/g, " "], // code blocks
  [/`([^`]*)`/g, "$1"], // inline code
  [/#{1,6}\s*/g, ""], // headers (###, ##, #)
  [/\*\*(.*?)\*\*/g, "$1"], // bold **text**
  [/__(.*?)__/g, "$1"], // bold __text__
  [/\[([^\]]+)\]\([^)]*\)/g, "$1"], // links [text](url)
  [/^\s{0,3}[-*+]\s+/gm, ""], // bullet lists
  [/^\s{0,3}\d+[.)]\s+/gm, ""], // numbered lists
  [/^\s*>\s?/gm, ""], // blockquotes
  [/\*([^*\n]+)\*/g, "$1"], // italic *text* (single line)
  [/\n{2,}/g, " "], // collapse blank lines
];

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F0FF}]/gu;

export function langBaseOf(lang: string): string {
  return (lang ?? "").split("-")[0].toLowerCase();
}

/**
 * Single-string cleanup for providers that speak one utterance at a
 * time (e.g. the legacy Mentor-chat engine).
 */
export function cleanTextForTTS(raw: string, lang: string): string {
  let text = raw ?? "";
  for (const [re, rep] of MARKDOWN_RULES) text = text.replace(re, rep);
  text = text.replace(EMOJI_RE, " ");
  text = applyFormulaExpansions(text);
  text = applyDictionary(text, langBaseOf(lang));
  return text.replace(/\s{2,}/g, " ").trim();
}

export interface TtsChunk {
  text: string;
}

const MAX_CHUNK_LEN = 200;

function splitLong(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const out: string[] = [];
  let rest = s;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) break; // no good split point — give up chunking
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Split normalized text into speakable chunks: full sentences first,
 * then long sentences are broken at comma boundaries (clause-level
 * pauses instead of reading a wall of text), and anything still too
 * long is cut at word boundaries.
 */
export function splitSpeechText(cleaned: string): string[] {
  const sentences = cleaned.split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter(Boolean);

  const chunks: string[] = [];
  for (const sentence of sentences) {
    // Short sentences are spoken whole — commas inside are handled
    // naturally by the TTS engine.
    if (sentence.length <= 160) {
      chunks.push(sentence);
      continue;
    }
    // Long sentence: prefer clause boundaries (commas) for natural
    // breath pauses, then hard-split anything still oversized.
    const clauses = sentence.split(/(?<=[,;:])\s+/).map((c) => c.trim()).filter(Boolean);
    if (clauses.length <= 1) {
      chunks.push(...splitLong(sentence, MAX_CHUNK_LEN));
      continue;
    }
    let buffer = "";
    for (const clause of clauses) {
      if (buffer && buffer.length + clause.length + 1 > MAX_CHUNK_LEN) {
        chunks.push(buffer);
        buffer = "";
      }
      buffer = buffer ? `${buffer} ${clause}` : clause;
    }
    if (buffer) chunks.push(buffer);
  }
  return chunks;
}

/**
 * Normalize + split a reply into sentence-sized chunks. Each chunk is
 * spoken as its own utterance with a short gap, so the AI pauses
 * naturally between sentences instead of reading the whole reply flat.
 */
export function normalizeForTTS(raw: string, lang: string): TtsChunk[] {
  const cleaned = cleanTextForTTS(raw, lang);
  if (!cleaned) return [];
  return splitSpeechText(cleaned).map((text) => ({ text }));
}

/**
 * Streaming variant: normalize a single sentence as it arrives from
 * the LLM stream and split it into clause-sized chunks that can be
 * spoken immediately without waiting for the rest of the reply.
 */
export function normalizeStreamText(raw: string, lang: string): TtsChunk[] {
  const cleaned = cleanTextForTTS(raw, lang);
  if (!cleaned) return [];
  return splitSpeechText(cleaned).map((text) => ({ text }));
}
