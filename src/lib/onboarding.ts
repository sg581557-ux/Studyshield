// Onboarding v2 — curated question options and helpers shared by the wizard
// and the persistence layer (db.ts).

export interface OnboardingOption {
  value: string;
  label: string;
}

export const TARGET_EXAMS: OnboardingOption[] = [
  { value: "JEE Main", label: "JEE Main" },
  { value: "JEE Advanced", label: "JEE Advanced" },
  { value: "NEET UG", label: "NEET UG" },
  { value: "BITSAT", label: "BITSAT" },
  { value: "WBJEE", label: "WBJEE" },
  { value: "CUET", label: "CUET" },
  { value: "NDA", label: "NDA" },
  { value: "UPSC CSE", label: "UPSC CSE" },
  { value: "SSC CGL", label: "SSC CGL" },
  { value: "CAT", label: "CAT" },
  { value: "GATE", label: "GATE" },
  { value: "CA Foundation", label: "CA Foundation" },
  { value: "CLAT", label: "CLAT" },
  { value: "IELTS", label: "IELTS" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "GRE", label: "GRE" },
  { value: "GMAT", label: "GMAT" },
  { value: "Other", label: "Other" },
];

// Maps curated exam labels to syllabus_exams ids. Exams without a syllabus
// entry (IELTS, TOEFL, GRE, GMAT) fall back to "other".
const EXAM_ID_MAP: Record<string, string> = {
  "JEE Main": "jee-main",
  "JEE Advanced": "jee-advanced",
  "NEET UG": "neet-ug",
  BITSAT: "bitsat",
  WBJEE: "wbjee",
  CUET: "cuet-ug",
  NDA: "nda",
  "UPSC CSE": "upsc-cse",
  "SSC CGL": "ssc-cgl",
  CAT: "cat",
  GATE: "gate",
  "CA Foundation": "ca-foundation",
  CLAT: "clat",
  IELTS: "other",
  TOEFL: "other",
  GRE: "other",
  GMAT: "other",
  Other: "other",
};

export function examIdForOnboarding(label: string): string {
  return EXAM_ID_MAP[label] ?? "other";
}

export const COACHING_OPTIONS: OnboardingOption[] = [
  { value: "none", label: "None" },
  { value: "pw", label: "PW" },
  { value: "allen", label: "Allen" },
  { value: "aakash", label: "Aakash" },
  { value: "fiitjee", label: "FIITJEE" },
  { value: "vibrant", label: "Vibrant" },
  { value: "motion", label: "Motion" },
  { value: "resonance", label: "Resonance" },
  { value: "unacademy", label: "Unacademy" },
  { value: "self_study", label: "Self Study" },
  { value: "other", label: "Other" },
];

const COACHING_LABELS: Record<string, string> = {
  none: "None",
  pw: "PW",
  allen: "Allen",
  aakash: "Aakash",
  fiitjee: "FIITJEE",
  vibrant: "Vibrant",
  motion: "Motion",
  resonance: "Resonance",
  unacademy: "Unacademy",
  self_study: "Self Study",
  other: "Other",
};

export function coachingLabel(value: string, other: string): string | null {
  if (value === "other") return other.trim() || "Other";
  return COACHING_LABELS[value] ?? null;
}

export const CURRENT_LEVELS: OnboardingOption[] = [
  { value: "beginner", label: "Beginner" },
  { value: "average", label: "Average" },
  { value: "advanced", label: "Advanced" },
  { value: "not_sure", label: "Not Sure" },
];

export const PRIMARY_GOALS: OnboardingOption[] = [
  { value: "air_under_100", label: "AIR under 100" },
  { value: "air_under_1000", label: "AIR under 1000" },
  { value: "college", label: "College Target" },
  { value: "marks", label: "Marks Target" },
  { value: "custom", label: "Custom Goal" },
];

export const PREFERRED_LANGUAGES: OnboardingOption[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "pa", label: "Punjabi" },
  { value: "ur", label: "Urdu" },
];

export const MENTOR_TONES: OnboardingOption[] = [
  { value: "friendly", label: "Friendly" },
  { value: "strict", label: "Strict" },
  { value: "balanced", label: "Balanced" },
];

// Subjects offered per target exam (spec: JEE → PCM, NEET → PCB + Zoology,
// others based on exam).
export const SUBJECTS_BY_EXAM: Record<string, string[]> = {
  "JEE Main": ["Physics", "Chemistry", "Mathematics"],
  "JEE Advanced": ["Physics", "Chemistry", "Mathematics"],
  "NEET UG": ["Physics", "Chemistry", "Botany", "Zoology"],
  BITSAT: ["Physics", "Chemistry", "Mathematics", "English", "Logical Reasoning"],
  WBJEE: ["Physics", "Chemistry", "Mathematics"],
  CUET: ["English", "Mathematics", "Physics", "Chemistry", "Biology", "General Knowledge", "Reasoning"],
  NDA: ["Mathematics", "General Ability Test"],
  "UPSC CSE": ["History", "Geography", "Polity", "Economics", "Science & Technology", "Current Affairs", "Ethics"],
  "SSC CGL": ["Quantitative Aptitude", "English Language", "Reasoning", "General Awareness"],
  CAT: ["Quantitative Aptitude", "Verbal Ability", "Data Interpretation", "Logical Reasoning"],
  GATE: ["Engineering Mathematics", "Core Subjects"],
  "CA Foundation": ["Accounting", "Business Laws", "Quantitative Aptitude", "Business Economics"],
  CLAT: ["Legal Reasoning", "English Language", "Logical Reasoning", "General Knowledge"],
  IELTS: ["Listening", "Reading", "Writing", "Speaking"],
  TOEFL: ["Reading", "Listening", "Speaking", "Writing"],
  GRE: ["Verbal Reasoning", "Quantitative Reasoning", "Analytical Writing"],
  GMAT: ["Verbal Reasoning", "Quantitative Reasoning", "Data Insights"],
  Other: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "General Knowledge", "Logical Reasoning", "Quantitative Aptitude"],
};

export const ONBOARDING_STEP_COUNT = 13;

// --- Habit calibration (AI Planner habit system) -----------------------------

// Realistic weekday study-time buckets (hours). `value` is the bucket key;
// the planner uses the bucket midpoint unless a custom value is provided.
export const STUDY_TIME_BUCKETS: OnboardingOption[] = [
  { value: "2-3", label: "2 – 3 hours" },
  { value: "4-5", label: "4 – 5 hours" },
  { value: "6-7", label: "6 – 7 hours" },
  { value: "8-9", label: "8 – 9 hours" },
  { value: "10+", label: "10+ hours" },
  { value: "custom", label: "Custom" },
];

const BUCKET_MIDPOINTS: Record<string, number> = {
  "2-3": 2.5,
  "4-5": 4.5,
  "6-7": 6.5,
  "8-9": 8.5,
  "10+": 10,
};

export function weekdayStudyHours(value: string, custom: number): number {
  if (value === "custom") return custom > 0 ? custom : 0;
  return BUCKET_MIDPOINTS[value] ?? 0;
}

export const SESSION_LENGTHS: OnboardingOption[] = [
  { value: "25", label: "25 min (Pomodoro)" },
  { value: "40", label: "40 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
];

export const BREAK_OPTIONS: OnboardingOption[] = [
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
];

export const DAYS_OFF_OPTIONS: OnboardingOption[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const PRODUCTIVE_SLOTS: OnboardingOption[] = [
  { value: "morning", label: "Early morning (5–12)" },
  { value: "afternoon", label: "Afternoon (12–4)" },
  { value: "evening", label: "Evening (4–8)" },
  { value: "night", label: "Night (8–12)" },
];

export const SLOT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};
