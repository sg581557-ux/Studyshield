// ===== Education / Onboarding =====
export type EducationBoard = 'CBSE' | 'ICSE' | 'State Board' | 'Other';
export type ClassLevel = '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'Dropper';
export type ExamGoal = 'JEE Main' | 'JEE Advanced' | 'NEET' | 'School Only' | 'Custom';

export type ChapterStatus = 'not-started' | 'in-progress' | 'completed' | 'needs-revision';
export type LectureStatus = 'not-started' | 'watching' | 'completed';
export type TheoryStatus = 'not-started' | 'completed';
export type ModuleProgress = 'not-started' | 'ex1-done' | 'ex2-done' | 'ex3-done' | 'fully-done';
export type DppStatus = 'not-started' | 'completed';
export type PyqStatus = 'not-started' | 'completed';
export type NotesStatus = 'not-started' | 'completed';
export type FormulaSheetStatus = 'not-started' | 'completed';
export type RevisionStatus = 'never' | 'once' | 'multiple';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface ChapterProgress {
  chapterStatus: ChapterStatus;
  lectureStatus: LectureStatus;
  theoryStatus: TheoryStatus;
  moduleProgress: ModuleProgress;
  dppStatus: DppStatus;
  pyqStatus: PyqStatus;
  notesStatus: NotesStatus;
  formulaSheetStatus: FormulaSheetStatus;
  revisionStatus: RevisionStatus;
  confidenceLevel: number;
  difficultyLevel: DifficultyLevel;
  estimatedStudyHours: number;
  lastStudiedDate: string;
  nextRevisionDate: string;
  studySessions: number;
  completionPercentage: number;
  weakTopics: string;
  strongTopics: string;
  notes: string;
}

export interface ChapterResource {
  exam?: string; board?: string;
  subject: string; chapter: string;
  lectureLink?: string; moduleLink?: string; dppLink?: string;
  notesLink?: string; formulaLink?: string; pyqLink?: string;
}

export interface SyllabusSubject { name: string; chapters: string[]; }
export interface SyllabusConfig { subjects: SyllabusSubject[]; }

export type RevisionFrequency = 'daily' | 'every-2-days' | 'weekly';
export type StudySessionLength = 30 | 45 | 60 | 90 | 120;

export interface SubjectProgress {
  currentChapter: string;
  completedChapters: string[];
  backlogChapters: string[];
  weakTopics: string;
  strongTopics: string;
  confidence: number;
}

export interface OnboardingData {
  fullName: string;
  board: EducationBoard;
  classLevel: ClassLevel;
  examGoal: ExamGoal;
  wakeUpTime: string;
  sleepTime: string;
  schoolStart: string;
  schoolEnd: string;
  coachingStart: string;
  coachingEnd: string;
  dailyStudyHours: number;
  preferredSessionLength: StudySessionLength;
  subjects: Record<string, SubjectProgress>;
  maxTasksPerDay: number;
  preferredSubjectOrder: string[];
  breakDuration: number;
  revisionFrequency: RevisionFrequency;
  weeklyMockTestDay: number;
  dailyQuestionTarget: number;
  dailyStudyHourTarget: number;
  weeklyRevisionTarget: number;
  monthlyGoals: string;
}

// ===== Tasks / Planner / Goals =====
export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed' | 'skipped';
export type TaskSource = 'ai' | 'manual';

export interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  chapter?: string;
  priority: Priority;
  status: TaskStatus;
  source: TaskSource;
  taskType: 'study' | 'revision' | 'practice' | 'mock-test' | 'backlog' | 'analysis' | 'lecture' | 'module' | 'dpp' | 'pyq';
  estimatedMinutes: number;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PlannerEvent {
  id: string; title: string; subject: string; date: string;
  startTime: string; endTime: string;
  type: 'study' | 'revision' | 'mock-test' | 'break' | 'class'; notes?: string;
}

export interface Goal { id: string; title: string; targetHours: number; dailyProgress: number; weeklyProgress: number; createdAt: string; }
export interface StudySession { id: string; subject: string; duration: number; date: string; notes?: string; type: 'study' | 'revision' | 'mock-test' | 'break'; }
export interface StreakData { currentStreak: number; longestStreak: number; lastStudyDate: string; weekHistory: boolean[]; }
export interface Note { id: string; title: string; content: string; subject?: string; createdAt: string; updatedAt: string; }
export interface FormulaSheetDoc { id: string; title: string; subject: string; formulas: { id: string; name: string; formula: string; note?: string }[]; createdAt: string; updatedAt: string; }
export interface UserSettings { pomodoroWork: number; pomodoroBreak: number; pomodoroLongBreak: number; notifications: boolean; theme: 'dark'; }
export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  examGoal: string;
  examId?: string;
  targetYear: string;
  onboardingComplete: boolean;
}

export interface UserData {
  tasks: Task[];
  plannerEvents: PlannerEvent[];
  goals: Goal[];
  sessions: StudySession[];
  streak: StreakData;
  notes: Note[];
  formulaSheets: FormulaSheetDoc[];
  settings: UserSettings;
  chapterProgress: Record<string, Record<string, ChapterProgress>>;
}

// ===== Module Tracker System =====
export type ModuleStatus = 'not-started' | 'in-progress' | 'completed' | 'revision-needed';
export type ModuleDifficulty = 'easy' | 'medium' | 'advanced';

export interface StudyModule {
  id: string;
  subject: string;
  chapter: string;
  moduleName: string;
  totalExercises: number;
  completedExercises: number;
  totalQuestions: number;
  solvedQuestions: number;
  wrongQuestions: number;
  revisionQuestions: number;
  difficulty: ModuleDifficulty;
  status: ModuleStatus;
  targetDate?: string;
  dailyQuestionTarget: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleTrackerData {
  modules: StudyModule[];
}

// ===== Formula Vault System =====
export type FormulaSubject = 'Physics' | 'Chemistry' | 'Mathematics';
export type FormulaCategory =
  | 'Class 11' | 'Class 12'
  | 'Physical Chemistry' | 'Organic Chemistry' | 'Inorganic Chemistry';

export interface Formula {
  id: string;
  subject: FormulaSubject;
  category: FormulaCategory;
  chapter: string;
  name: string;
  formula: string;
  variables: { symbol: string; description: string }[];
  notes?: string;
  jeeTip?: string;
}

export interface FormulaVaultData {
  favorites: string[];
  recentlyViewed: string[];
}

// ===== Chrome Extension Integration =====
export type ExtensionConnectionState = 'checking' | 'connected' | 'disconnected';

export interface FocusSessionState {
  active: boolean;
  startTime: string | null;
  durationMinutes: number;
  remainingSeconds: number;
  strictMode: boolean;
  blockedSites: string[];
}

export interface BlockedAttempt {
  id: string;
  url: string;
  domain: string;
  timestamp: string;
  sessionId: string | null;
}

export interface ExtensionState {
  connectionState: ExtensionConnectionState;
  blockedSites: string[];
  focusSession: FocusSessionState;
  blockedAttempts: BlockedAttempt[];
  totalFocusMinutes: number;
  strictMode: boolean;
  wasConnectedDuringSession: boolean;
}

export type ExtensionMessageType =
  | 'SS_PING' | 'SS_PONG' | 'SS_HEARTBEAT'
  | 'SS_START_SESSION' | 'SS_STOP_SESSION' | 'SS_SESSION_ACTIVE'
  | 'SS_UPDATE_BLOCKED_SITES' | 'SS_GET_BLOCKED_SITES'
  | 'SS_BLOCKED_ATTEMPT' | 'SS_STRICT_MODE'
  | 'SS_RECONNECT';

export interface ExtensionMessage {
  type: ExtensionMessageType;
  source: 'studyshield-website' | 'studyshield-extension';
  payload?: unknown;
}
