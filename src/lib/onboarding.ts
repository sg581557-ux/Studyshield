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

export const COACHING_TYPE_OPTIONS: OnboardingOption[] = [
  { value: "online", label: "Online Coaching" },
  { value: "offline", label: "Offline Coaching" },
  { value: "hybrid", label: "Hybrid (Online + Offline)" },
];

// Coaching flow v2 (2026) ------------------------------------------------
// Step "How do you study?" — online / offline / hybrid / self-study.
export const HOW_STUDY_OPTIONS: OnboardingOption[] = [
  { value: "online", label: "Online Coaching" },
  { value: "offline", label: "Offline Coaching" },
  { value: "hybrid", label: "Hybrid (Online + Offline)" },
  { value: "self_study", label: "Self Study" },
];

// Step "Which coaching do you use?" (only for online/offline).
export const COACHING_NAME_OPTIONS: OnboardingOption[] = [
  { value: "allen", label: "Allen" },
  { value: "pw", label: "PW" },
  { value: "unacademy", label: "Unacademy" },
  { value: "fiitjee", label: "FIITJEE" },
  { value: "resonance", label: "Resonance" },
  { value: "aakash", label: "Aakash" },
  { value: "other", label: "Other" },
];

// Step "How are your classes conducted?"
export const CLASS_MODE_OPTIONS: OnboardingOption[] = [
  { value: "live", label: "Live Classes" },
  { value: "recorded", label: "Recorded Classes" },
];

// Preferred time for recorded lectures / study (self-study users too).
export const PREFERRED_STUDY_TIMES: OnboardingOption[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "flexible", label: "Flexible" },
];

// Valid durations (minutes) for a single recorded lecture.
export const LECTURE_DURATION_OPTIONS: OnboardingOption[] = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "2 hours" },
  { value: "150", label: "2.5 hours" },
];

export const ONBOARDING_STEP_COUNT = 18;

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
  { value: "early_morning", label: "Early Morning (4–8)" },
  { value: "morning", label: "Morning (8–12)" },
  { value: "afternoon", label: "Afternoon (12–4)" },
  { value: "evening", label: "Evening (4–8)" },
  { value: "night", label: "Night (8–10)" },
  { value: "night_owl", label: "Night Owl (>10 PM)" },
];

export const SLOT_LABELS: Record<string, string> = {
  early_morning: "Early Morning",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  night_owl: "Night Owl",
};

// --- Onboarding v3 — stream / class / board / goals --------------------------

export const STREAMS: OnboardingOption[] = [
  { value: "science_pcm", label: "Science — PCM" },
  { value: "science_pcb", label: "Science — PCB" },
  { value: "science_pcmb", label: "Science — PCMB" },
  { value: "commerce", label: "Commerce" },
  { value: "arts", label: "Arts / Humanities" },
  { value: "diploma", label: "Diploma" },
  { value: "other", label: "Other" },
];

export const STREAM_SUBJECTS: Record<string, string[]> = {
  science_pcm: ["Physics", "Chemistry", "Mathematics"],
  science_pcb: ["Physics", "Chemistry", "Biology"],
  science_pcmb: ["Physics", "Chemistry", "Mathematics", "Biology"],
  commerce: ["Accountancy", "Business Studies", "Economics", "Mathematics"],
  arts: ["History", "Political Science", "Geography", "English", "Economics", "Psychology", "Sociology"],
  diploma: ["Engineering Mathematics", "Applied Science", "Engineering Mechanics", "Computer Fundamentals"],
  other: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "General Studies"],
};

export function streamSubjects(stream: string): string[] {
  return STREAM_SUBJECTS[stream] ?? STREAM_SUBJECTS.other;
}

export const SCHOOL_CLASSES: OnboardingOption[] = [
  { value: "6", label: "Class 6" },
  { value: "7", label: "Class 7" },
  { value: "8", label: "Class 8" },
  { value: "9", label: "Class 9" },
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "college", label: "College" },
];

export const SCHOOL_BOARDS: OnboardingOption[] = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE / ISC" },
  { value: "state_board", label: "State Board" },
  { value: "other", label: "Other" },
];

// Multi-select academic goals — school exams first, then competitive exams.
export const ACADEMIC_GOALS: OnboardingOption[] = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE / ISC" },
  { value: "state_board", label: "State Board" },
  { value: "jee-main", label: "JEE Main" },
  { value: "jee-advanced", label: "JEE Advanced" },
  { value: "neet-ug", label: "NEET UG" },
  { value: "cuet-ug", label: "CUET" },
  { value: "nda", label: "NDA" },
  { value: "olympiad", label: "Olympiads" },
  { value: "upsc-foundation", label: "UPSC Foundation" },
  { value: "ssc-cgl", label: "SSC" },
  { value: "gate", label: "GATE" },
  { value: "cat", label: "CAT" },
  { value: "other", label: "Other" },
];

export const ACADEMIC_GOAL_LABELS: Record<string, string> = Object.fromEntries(
  ACADEMIC_GOALS.map((g) => [g.value, g.label]),
);

// Maps an academic-goal value back to a curated exam label (for target_exam).
const GOAL_TO_EXAM_LABEL: Record<string, string> = {
  "jee-main": "JEE Main",
  "jee-advanced": "JEE Advanced",
  "neet-ug": "NEET UG",
  "cuet-ug": "CUET",
  nda: "NDA",
  "upsc-foundation": "UPSC CSE",
  "ssc-cgl": "SSC CGL",
  gate: "GATE",
  cat: "CAT",
};

// Derives the primary target exam label from the selected academic goals.
// School-only goals have no competitive target → returns "" (planner uses
// stream subjects + school board syllabus).
export function primaryExamFromGoals(goals: string[], otherText: string): string {
  for (const g of goals) {
    const label = GOAL_TO_EXAM_LABEL[g];
    if (label) return label;
  }
  if (goals.includes("olympiad")) return "Other";
  if (goals.includes("other") && otherText.trim()) return "Other";
  return "";
}

export const SLEEP_GOAL_OPTIONS: OnboardingOption[] = [
  { value: "6", label: "6 hours" },
  { value: "7", label: "7 hours" },
  { value: "8", label: "8 hours" },
  { value: "9", label: "9+ hours" },
];

export const TESTS_PER_WEEK_OPTIONS: OnboardingOption[] = [
  { value: "0", label: "None" },
  { value: "1", label: "1 test" },
  { value: "2", label: "2 tests" },
  { value: "3", label: "3 tests" },
  { value: "4", label: "4 tests" },
  { value: "5", label: "5 tests" },
  { value: "6", label: "6 tests" },
  { value: "7", label: "7+ tests" },
];

// Study days (weekdays) — same value set as DAYS_OFF_OPTIONS.
export const STUDY_DAYS_OPTIONS: OnboardingOption[] = DAYS_OFF_OPTIONS;

// --- School-board chapter catalog -------------------------------------------
// Used when the target exam has no DB syllabus (e.g. school board exams only).
// Competitive exams load chapters dynamically from syllabus_exams/subjects/
// chapters. Keyed by `${class}|${subject}` — "college"/"diploma" fall back to
// the 12th-grade lists; unknown subjects fall back to a generic list.
const CHAPTERS_11_12_SCIENCE: Record<string, string[]> = {
  Physics: [
    "Units & Measurements", "Kinematics", "Laws of Motion", "Work, Energy & Power",
    "Rotational Motion", "Gravitation", "Properties of Solids & Fluids", "Thermodynamics",
    "Kinetic Theory of Gases", "Oscillations", "Waves", "Electric Charges & Fields",
    "Electrostatics", "Current Electricity", "Magnetic Effects of Current", "Magnetism",
    "EMI & AC", "Ray Optics", "Wave Optics", "Modern Physics",
  ],
  Chemistry: [
    "Some Basic Concepts", "Structure of Atom", "Classification of Elements", "Chemical Bonding",
    "Thermodynamics", "Equilibrium", "Redox Reactions", "Organic Chemistry Basics",
    "Hydrocarbons", "States of Matter", "Solutions", "Electrochemistry", "Chemical Kinetics",
    "d & f Block Elements", "Coordination Compounds", "Haloalkanes & Haloarenes",
    "Alcohols, Phenols & Ethers", "Aldehydes, Ketones & Acids", "Amines", "Biomolecules",
  ],
  Mathematics: [
    "Sets & Relations", "Functions", "Trigonometry", "Complex Numbers", "Quadratic Equations",
    "Sequences & Series", "Permutations & Combinations", "Binomial Theorem", "Straight Lines",
    "Conic Sections", "Limits & Derivatives", "Continuity & Differentiability", "Application of Derivatives",
    "Integrals", "Application of Integrals", "Differential Equations", "Vectors", "3D Geometry",
    "Probability", "Matrices & Determinants", "Linear Programming",
  ],
  Biology: [
    "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
    "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Cell: Unit of Life",
    "Biomolecules", "Cell Cycle & Division", "Photosynthesis", "Respiration in Plants",
    "Plant Growth & Development", "Digestion & Absorption", "Breathing & Exchange of Gases",
    "Body Fluids & Circulation", "Excretory Products", "Locomotion & Movement",
    "Neural Control & Coordination", "Chemical Coordination", "Reproduction", "Genetics & Evolution",
    "Biotechnology", "Ecology",
  ],
};

const CHAPTERS_9_10_SCIENCE: Record<string, string[]> = {
  Physics: ["Motion", "Force & Laws of Motion", "Gravitation", "Work, Energy & Power", "Sound", "Light", "Electricity", "Magnetism", "Sources of Energy"],
  Chemistry: ["Matter in Our Surroundings", "Is Matter Around Us Pure", "Atoms & Molecules", "Structure of Atom", "Chemical Reactions", "Acids, Bases & Salts", "Metals & Non-metals", "Carbon & its Compounds", "Periodic Classification"],
  Mathematics: ["Number Systems", "Polynomials", "Linear Equations", "Coordinate Geometry", "Triangles", "Quadrilaterals", "Circles", "Areas & Volumes", "Statistics", "Probability", "Real Numbers", "Quadratic Equations", "Arithmetic Progressions", "Introduction to Trigonometry", "Trigonometric Identities", "Similar Triangles", "Mensuration"],
  Biology: ["Cell & its Structure", "Tissues", "Diversity in Living Organisms", "Life Processes", "Control & Coordination", "How Do Organisms Reproduce", "Heredity & Evolution", "Our Environment", "Natural Resources"],
};

const CHAPTERS_6_8_SCIENCE: Record<string, string[]> = {
  Physics: ["Motion & Measurement", "Light, Shadows & Reflection", "Electricity & Circuits", "Fun with Magnets", "Force & Pressure", "Friction", "Sound", "Stars & Solar System"],
  Chemistry: ["Matter Around Us", "Fibre to Fabric", "Changes Around Us", "Separation of Substances", "Acids, Bases & Salts", "Physical & Chemical Changes"],
  Mathematics: ["Knowing Our Numbers", "Whole Numbers", "Integers", "Fractions & Decimals", "Algebra", "Basic Geometry", "Symmetry", "Perimeter & Area", "Rational Numbers", "Simple Equations", "Lines & Angles", "Triangles", "Data Handling"],
  Biology: ["Food & Nutrition", "Living Organisms & Habitat", "Body Movements", "Plants & Animals", "Respiration & Excretion", "Reproduction in Plants", "Microorganisms"],
};

const CHAPTERS_COMMERCE: Record<string, string[]> = {
  Accountancy: ["Introduction to Accounting", "Theory Base of Accounting", "Recording of Transactions", "Ledger & Trial Balance", "Depreciation", "Final Accounts", "Partnership Accounts", "Company Accounts", "Financial Statements"],
  "Business Studies": ["Nature of Business", "Forms of Business Organisation", "Public, Private & Global Enterprises", "Business Services", "Emerging Modes of Business", "Social Responsibility", "Principles of Management", "Business Finance", "Marketing Management"],
  Economics: ["Introduction to Microeconomics", "Consumer Behaviour", "Producer Behaviour & Supply", "Forms of Market", "National Income", "Money & Banking", "Determination of Income", "Government Budget", "Indian Economic Development", "Development Experience of India"],
  Mathematics: CHAPTERS_11_12_SCIENCE.Mathematics,
};

const CHAPTERS_ARTS: Record<string, string[]> = {
  History: ["Ancient India", "Medieval India", "Modern India", "World History", "Nationalism in India", "Industrial Revolution", "French Revolution", "Cold War Era"],
  "Political Science": ["Constitution & Why", "Rights in the Indian Constitution", "Election & Representation", "Executive & Legislature", "Judiciary", "Federalism", "Local Governments", "Political Parties", "Democracy"],
  Geography: ["Physical Geography", "Landforms", "Climate & Weather", "Natural Vegetation", "Population", "Human Settlements", "Economic Geography", "Map Work"],
  English: ["Reading Comprehension", "Writing Skills", "Grammar", "Literature: Prose", "Literature: Poetry", "Literature: Drama"],
  Economics: CHAPTERS_COMMERCE.Economics,
  Psychology: ["What is Psychology", "Methods of Enquiry", "Bases of Human Behaviour", "Human Development", "Learning", "Memory", "Motivation & Emotion", "Personality", "Social Influence"],
  Sociology: ["Sociology & Society", "Terms & Concepts", "Social Institutions", "Culture & Socialisation", "Social Change", "Indian Society"],
};

const CHAPTERS_DIPLOMA: Record<string, string[]> = {
  "Engineering Mathematics": ["Algebra", "Trigonometry", "Calculus", "Differential Equations", "Matrices", "Statistics"],
  "Applied Science": ["Units & Dimensions", "Mechanics", "Properties of Matter", "Heat & Thermodynamics", "Electricity & Magnetism", "Optics"],
  "Engineering Mechanics": ["Statics", "Dynamics", "Friction", "Laws of Motion", "Work, Energy & Power"],
  "Computer Fundamentals": ["Introduction to Computers", "Operating Systems", "MS Office", "Networking Basics", "Programming Fundamentals"],
};

const CHAPTERS_OTHER: string[] = [
  "Chapter 1 — Basics", "Chapter 2 — Core Concepts", "Chapter 3 — Intermediate", "Chapter 4 — Advanced", "Chapter 5 — Practice", "Chapter 6 — Revision",
];

export const SUBJECT_CHAPTER_CATALOG: Record<string, Record<string, string[]>> = {
  "11|": CHAPTERS_11_12_SCIENCE,
  "12|": CHAPTERS_11_12_SCIENCE,
  "college|": CHAPTERS_11_12_SCIENCE,
  "9|": CHAPTERS_9_10_SCIENCE,
  "10|": CHAPTERS_9_10_SCIENCE,
  "6|": CHAPTERS_6_8_SCIENCE,
  "7|": CHAPTERS_6_8_SCIENCE,
  "8|": CHAPTERS_6_8_SCIENCE,
};

const STREAM_CATALOGS: Record<string, Record<string, string[]>> = {
  science_pcm: CHAPTERS_11_12_SCIENCE,
  science_pcb: CHAPTERS_11_12_SCIENCE,
  science_pcmb: CHAPTERS_11_12_SCIENCE,
  commerce: CHAPTERS_COMMERCE,
  arts: CHAPTERS_ARTS,
  diploma: CHAPTERS_DIPLOMA,
};

// Chapters for a subject, chosen by class + stream (school-board fallback).
export function chaptersForSubject(subject: string, schoolClass: string, stream: string): string[] {
  const byClass = SUBJECT_CHAPTER_CATALOG[`${schoolClass}|`];
  if (byClass?.[subject]) return byClass[subject];
  if (STREAM_CATALOGS[stream]?.[subject]) return STREAM_CATALOGS[stream][subject];
  return CHAPTERS_OTHER;
}

// Legacy slot normalization for v3 slot keys ("night" now means 8–10 PM;
// legacy profiles stored "night" as 8–12 — treated as evening+night).
export const LEGACY_SLOT_MAP: Record<string, string> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night",
};
