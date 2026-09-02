export type ChapterStatus =
  | "not_started" | "started" | "in_progress" | "completed"
  | "backlog" | "revision_pending" | "revision_completed"
  | "dpp_pending" | "module_pending" | "pyq_pending" | "mastered";
export type EnergyLevel = "low" | "normal" | "high";
export type StudyMode = "balanced" | "hard_push" | "recovery" | "exam_sprint";
export type Priority = "low" | "medium" | "high" | "critical";
export type BacklogKind =
  | "lecture" | "module" | "dpp" | "pyq" | "notes"
  | "revision" | "assignment" | "mock_test" | "custom";
export type BacklogDifficulty = "easy" | "medium" | "hard";
export type ModuleProgress = "not_started" | "started" | "in_progress" | "completed";

/** Structured progress for a single backlog resource (e.g. lectures, module questions). */
export interface BacklogResourceProgress {
  total: number;
  completed: number;
}

export interface SmartBacklogInput {
  exam: string;
  subject: string;
  chapter: string;
  resources: Partial<Record<BacklogKind, BacklogResourceProgress>>;
  priority: Priority;
  difficulty?: BacklogDifficulty | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
}

export type TaskStatus =
  | "pending" | "in_progress" | "completed"
  | "skipped" | "partially_completed" | "postponed" | "cancelled";

export type RecoveryStatus = "pending" | "scheduled" | "recovered";
export type ExamPreset =
  | "JEE" | "NEET" | "CBSE" | "Olympiad" | "NDA" | "CUET" | "GATE"
  | "SSC" | "CAT" | "Commerce" | "UPSC" | "Custom";
export type FormulaDifficulty = "easy" | "medium" | "hard";

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit: string;
}

export type GoalType = "weekly" | "monthly";
export type GoalStatus = "active" | "completed" | "regenerated";

// Matches the live `profiles` table schema 1:1 (see supabase/migrations).
// Legacy + app-expected columns that exist in the DB are all present here.
export interface Profile {
  id: string; email: string;
  // Legacy column (migration 1); kept for backward compatibility.
  name?: string | null;
  full_name: string | null; display_name: string;
  // Photo (three aliases exist in the DB; app prefers photo_url).
  photo_url?: string | null; profile_photo?: string | null; avatar_url?: string | null;
  // Contact / identity.
  phone?: string | null; date_of_birth?: string | null; gender?: string | null;
  city?: string | null; state?: string | null; country?: string | null;
  // School / academic.
  school_name?: string | null; school_class?: string | null; class?: string | null;
  board?: string | null; school_board?: string | null; stream?: string | null;
  coaching_type?: string | null; bio?: string | null;
  // Exam / goals.
  exam_id?: string | null; exam_goal?: string | null;
  target_exam: string | null; exam_year?: string | null; target_year?: string | null;
  dream_college?: string | null; dream_branch?: string | null; dream_career?: string | null;
  // Planning / preferences.
  daily_goal_hours: number; study_goal?: string | null; study_mode: StudyMode | null;
  preferred_study_time?: string | null; study_time?: string | null;
  weekly_goal_days?: number | null; motivation_quote?: string | null;
  // Stats (NOT NULL defaults in DB; read defensively via pnum/pstr).
  current_streak?: number; study_hours?: number; modules_completed?: number;
  revision_count?: number; mock_tests_count?: number; xp?: number | null;
  longest_streak: number; achievements?: Record<string, unknown>;
  // Admin management.
  is_admin?: boolean; is_premium?: boolean; is_banned?: boolean;
  banned_at?: string | null; banned_reason?: string | null;
  last_active?: string | null; device_info?: Record<string, unknown> | null;
  reset_at?: string | null;
  // Onboarding state.
  onboarding_completed: boolean; onboarding_step: number;
  onboarding_data?: Record<string, unknown> | null;
  // Coaching / school scheduling.
  coaching_enabled?: boolean; coaching_name?: string | null;
  coaching_is_live?: boolean; coaching_days?: string[] | null;
  coaching_start?: string | null; coaching_end?: string | null;
  lecture_duration_min?: number; revision_time?: string | null;
  attends_school?: boolean;
  // Onboarding v2 fields.
  age?: number | null;
  current_level?: string | null;
  coaching?: string | null;
  wake_up_time?: string | null;
  sleep_time?: string | null;
  subjects?: string[] | null;
  primary_goal?: string | null;
  custom_goal?: string | null;
  preferred_language?: string | null;
  mentor_tone?: string | null;
  // Habit calibration (AI Planner adaptive sizing).
  weekday_study_hours?: string | null;
  saturday_study_hours?: number | null;
  sunday_study_hours?: number | null;
  session_length_min?: number | null;
  break_min?: number | null;
  days_off?: string[] | null;
  productive_slots?: string[] | null;
  // Settings (written by SettingsPage.tsx "Save All Changes").
  school_start?: string | null;
  school_end?: string | null;
  revision_frequency?: string | null;
  difficulty_preference?: string | null;
  ai_planning_style?: string | null;
  notification_prefs?: Record<string, boolean> | null;
  reminder_timings?: string[] | null;
  timezone?: string | null;
  language?: string | null;
  focus_goal?: string | null;
  backlog_strategy?: string | null;
  daily_question_target?: number | null;
  daily_lecture_target?: number | null;
  weak_subjects?: string[] | null;
  strong_subjects?: string[] | null;
  // Coaching flow v2 (new onboarding interview).
  // class_mode: "live" | "recorded" | null (null = self-study / not set).
  class_mode?: string | null;
  // Weekly live-class blocks — the AI Planner blocks these hours.
  class_schedule?: ClassScheduleEntry[] | null;
  // Recorded lectures: duration (min) and count scheduled per day.
  lecture_duration?: number | null;
  lectures_per_day?: number | null;
  // Onboarding v3 fields (migration 20260805160000).
  // Academic stream: science_pcm | science_pcb | science_pcmb | commerce |
  // arts | diploma | other.
  // (profile.stream already exists as a legacy column — kept here once.)
  // Multi-select goals: school exams (cbse/icse/state_board) + competitive
  // exams (jee-main, jee-advanced, neet-ug, cuet-ug, nda, olympiad,
  // upsc-foundation, ssc-cgl, gate, cat, other).
  academic_goals?: string[] | null;
  // Primary productive window (planner schedules hard tasks here):
  // early_morning | morning | afternoon | evening | night | night_owl.
  productive_time?: string | null;
  // Desired hours of sleep per night.
  desired_sleep_hours?: number | null;
  // Weekly mock tests (0–7+).
  tests_per_week?: number | null;
  // Days school is attended ("monday"…"sunday").
  school_days?: string[] | null;
  // Days the student plans to study.
  study_days?: string[] | null;
  // online | offline | hybrid | self_study.
  coaching_mode?: string | null;
  // Academic Preferences (Settings page — migration 20260806120000).
  // School holidays (weekday names, days school is closed).
  school_holidays?: string[] | null;
  // Night Owl study mode toggle.
  night_owl_mode?: boolean | null;
  // AI Planner caps: max/min study hours per day.
  max_daily_study_hours?: number | null;
  min_daily_study_hours?: number | null;
  // Practice % of the practice+revision pool (default 75).
  practice_revision_ratio?: number | null;
  // Task-type priority weights: {backlog, lecture, practice, mock} summing 100.
  priority_weights?: Record<string, number> | null;
  // Mock test preferences.
  test_duration_min?: number | null;
  preferred_test_day?: string | null;
  mock_analysis_prefs?: Record<string, boolean> | null;
  // Personalization.
  accent_color?: string | null;
  time_format?: string | null; // "12h" | "24h"
  date_format?: string | null; // "dmy" | "mdy" | "ymd"
  // Timestamps.
  created_at: string | null; updated_at?: string | null;
  theme?: "light" | "dark" | "system" | null;
}

export interface PlanTask {
  id: string; user_id: string; plan_id: string | null; title: string;
  subject: string | null; type: string; estimated_minutes: number; priority: Priority;
  completed: boolean; scheduled_date: string | null; created_at: string;
  start_time: string | null; end_time: string | null; chapter: string | null;
  source: string | null; tracker_ref: Record<string, unknown> | null; completion_pct: number;
  task_status: TaskStatus; missed_count: number; reschedule_reason: string | null;
  actual_minutes: number | null; priority_score: number;
}

export interface FocusSession {
  id: string;
  user_id?: string;
  duration_minutes?: number;
  completed?: boolean;
  strict_mode?: boolean;
  started_at?: string;
  completed_at?: string | null;
  date?: string;
  minutes?: number;
  taskId?: string | null;
  subjectId?: string | null;
  mode?: string;
  label?: string;
}

export interface UserChapter {
  id: string; user_id: string; exam: string; subject: string; chapter: string;
  status: ChapterStatus; lectures_remaining: number; questions_remaining: number;
  revision_pending: number; confidence: number; created_at: string; updated_at: string;
  progress: Record<string, unknown>;
  /** Explicit "currently being studied" flag, kept in sync with status started/in_progress. */
  is_current?: boolean;
}

export interface SyllabusExam { id: string; name: string; category: string; }
export interface SyllabusSubject { id: string; exam_id: string; name: string; display_order: number; }
export interface SyllabusChapter { id: string; subject_id: string; name: string; display_order: number; }

export interface Formula {
  id: string;
  exam_id?: string;
  exam?: string;
  subject: string;
  chapter: string;
  name: string;
  expression: string;
  variables: FormulaVariable[];
  unit?: string;
  explanation?: string;
  shortcut?: string;
  common_mistakes?: string[];
  pyq_importance?: string;
  difficulty: FormulaDifficulty | string;
  created_at?: string;
  exam_tags?: string[];
  keywords?: string[];
  important_notes?: string[];
  memory_tips?: string[];
  tricks?: string[];
  topic?: string;
  formula?: string;
  description?: string;
  tags?: string[];
  synonyms?: string[];
  importance?: string;
  examRelevance?: string;
  frequentlyUsed?: boolean;
  isBookmarked?: boolean;
  viewCount?: number;
  useCount?: number;
  lastViewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormulaBookmark { id: string; user_id: string; formula_id: string; created_at: string; }
export interface FormulaView { id: string; user_id: string; formula_id: string; viewed_at: string; }
export interface SchoolChapterTracking { id: string; user_id: string; exam_id: string; subject: string; chapter: string; is_active: boolean; created_at: string; }
export interface RevisionScheduleItem { id: string; user_id: string; exam: string; subject: string; chapter: string; revision_number: number; scheduled_date: string; completed: boolean; completed_at: string | null; created_at: string; }
export interface MockTestResult { id: string; user_id: string; test_name: string; subject: string | null; total_marks: number; obtained_marks: number; test_date: string; weak_chapters: string[]; strong_chapters: string[]; created_at: string; }

export interface MentorDailyCheckin {
  id: string; user_id: string; date: string; message: string;
  completed_tasks: unknown[]; missed_tasks: unknown[];
  focus_score: number | null; created_at: string;
}

export interface MentorMemory {
  id: string; user_id: string; category: string; key: string; value: string;
  importance: number; created_at: string; updated_at: string;
}

export interface DailyPlanInputs {
  id: string; user_id: string; plan_date: string; was_school_day: boolean;
  study_hours: number; energy_level: string; exam_tomorrow: boolean; created_at: string;
}

export interface BacklogItem {
  id: string; user_id: string; title: string; module_id: string | null;
  priority: Priority; status: "todo" | "done"; due_date: string | null;
  overall_progress: number; created_at: string;
  completed_at?: string | null; backlog_data?: Record<string, unknown> | null;
  subject?: string | null; chapter?: string | null; exam_id?: string | null;
  backlog_types?: BacklogKind[] | null;
  pending_lectures?: number; pending_dpps?: number;
  module_progress?: ModuleProgress;
  module_total_questions?: number; module_solved_questions?: number; module_questions_remaining?: number;
  pending_pyqs?: number; revision_pending?: number;
  difficulty?: BacklogDifficulty | null;
  estimated_minutes?: number | null;
  updated_at?: string | null;
  // Onboarding v3 per-chapter detail (migration 20260805160000).
  lecture_status?: string | null;   // not_started | in_progress | completed
  revision_level?: number | null;   // revision rounds needed, 0–3
  confidence?: number | null;       // 1 (weak) … 5 (strong)
  // Academic Preferences (migration 20260806120000).
  pending_tests?: number;           // pending mock tests
}

// Patch shape for the Academic Preferences "Subjects & Chapters" editor —
// writes user_chapters + mirrors onto backlog_items when a row exists
// (and creates one when any backlog counter is set).
export interface ChapterProgressPatch {
  exam: string;
  subject: string;
  chapter: string;
  status?: ChapterStatus;
  lectures_remaining?: number;
  questions_remaining?: number;
  revision_pending?: number;
  confidence?: number;
  module_pct?: number;      // 0–100
  dpp_pending?: number;
  pyq_pending?: number;
  revision_level?: number;  // 0–3
  pending_tests?: number;
  difficulty?: BacklogDifficulty | null;
  priority?: Priority;
}

// AI Planner task-type priority weights (sums to 100).
export interface PriorityWeights {
  backlog: number;
  lecture: number;
  practice: number;
  mock: number;
}

export interface DailyPlanInputsInput {
  plan_date: string; was_school_day: boolean; study_hours: number;
  energy_level: EnergyLevel; exam_tomorrow: boolean;
}

// One weekly class block (live classes). Day is lowercase long name ("monday").
export interface ClassScheduleEntry {
  day: string;
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM" 24h
}

// Onboarding v2 — every answer is stored (see the onboarding_v2 migration).
export interface OnboardingBacklog {
  subject: string;
  chapter: string;
  pending_lectures: number;
  pending_dpps: number;
  module_remaining: number;
  pending_pyqs: number;
  revision_pending: number;
  // Onboarding v3 — per-chapter backlog detail (migration 20260805160000).
  lecture_status?: string;      // not_started | in_progress | completed
  module_pct?: number;          // module questions solved, 0–100
  revision_level?: number;      // revision rounds needed, 0–3
  confidence?: number;          // 1 (weak) … 5 (strong)
}

export interface OnboardingInput {
  full_name: string;
  age: string;
  school_class: string;
  target_exam: string;
  target_exam_other: string;
  exam_year: string;
  school_name: string;
  current_level: string;
  coaching: string;
  coaching_other: string;
  coaching_type: string;
  coaching_name: string;
  class_mode: string;
  class_schedule: ClassScheduleEntry[];
  lecture_duration: number;
  lectures_per_day: number;
  preferred_study_time: string;
  daily_goal_hours: number;
  wake_up_time: string;
  sleep_time: string;
  subjects: string[];
  has_backlog: boolean;
  backlogs: OnboardingBacklog[];
  primary_goal: string;
  custom_goal: string;
  preferred_language: string;
  mentor_tone: string;
  // Habit calibration (AI Planner habit system).
  coaching_start: string;
  coaching_end: string;
  weekday_study_hours: string;
  custom_weekday_hours: number;
  saturday_study_hours: number;
  sunday_study_hours: number;
  session_length_min: number;
  break_min: number;
  days_off: string[];
  productive_slots: string[];
  // Onboarding v3 — stream, goals, school schedule, sleep & tests
  // (migration 20260805160000).
  stream: string;
  academic_goals: string[];
  board: string;
  productive_time: string;
  desired_sleep_hours: number;
  tests_per_week: number;
  school_days: string[];
  school_start: string;
  school_end: string;
  study_days: string[];
}

export interface BacklogDetailInput {
  subject: string; chapter: string; backlog_types: BacklogKind[];
  pending_lectures: number; pending_dpps: number; module_progress: ModuleProgress;
  module_total_questions: number; module_solved_questions: number;
}

export interface RecoveryItem {
  id: string; user_id: string; title: string; subject: string | null;
  chapter: string | null; task_type: string; estimated_minutes: number;
  priority: Priority; difficulty: string | null; reason: string | null;
  date_missed: string; times_rescheduled: number; recovery_status: RecoveryStatus;
  original_task_id: string | null; scheduled_recovery_date: string | null;
  recovered_at: string | null; created_at: string; updated_at: string;
}

export interface RecoveryItemInput {
  title: string; subject?: string | null; chapter?: string | null;
  task_type: string; estimated_minutes: number; priority: Priority;
  difficulty?: string | null; reason?: string | null; date_missed: string;
  original_task_id?: string | null;
}

export interface StudyStats {
  id: string; user_id: string; avg_lecture_min: number; avg_dpp_min: number;
  avg_module_min: number; avg_pyq_min: number; avg_revision_min: number;
  avg_focus_session_min: number; completion_rate: number; best_study_hours: string | null;
  weak_subjects: string[]; strong_subjects: string[]; total_study_min: number;
  total_questions_solved: number; total_lectures_completed: number;
  total_tasks_completed: number; streak_days: number; data_points: number;
  updated_at: string; created_at: string;
}

export interface PlannerGoal {
  id: string; user_id: string; goal_type: GoalType;
  period_start: string; period_end: string; goals: Record<string, unknown>;
  results: Record<string, unknown> | null; status: GoalStatus;
  completion_pct: number; created_at: string; updated_at: string;
}

export interface PlannerGoalInput {
  goal_type: GoalType; period_start: string; period_end: string;
  goals: Record<string, unknown>;
}

// ===== Legacy AppData types (used by storage.ts, gamification.ts, useDashboardData.ts) =====

export interface AppData {
  version: number;
  user: User | null;
  tasks: Task[];
  subjects: Subject[];
  chapters: Chapter[];
  focusSessions: FocusSession[];
  formulas: Formula2[];
  formulaViews: FormulaView[];
  pyqAttempts: PYQAttempt[];
  mockTests: MockTest[];
  achievements: Achievement[];
  pomodoro: PomodoroState | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  examGoal: string;
  examId?: string;
  targetYear: string;
  onboardingComplete: boolean;
  xp: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  chapter?: string;
  priority: Priority;
  status: TaskStatus;
  source: 'ai' | 'manual';
  taskType: string;
  estimatedMinutes: number;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  order?: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  exam: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  order?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  threshold: number;
  unlockedAt: string | null;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  threshold: number;
}

export type Formula2 = Formula;

export interface FormulaVariable2 {
  symbol: string;
  description: string;
  unit?: string;
}

export interface FormulaView {
  id: string;
  formulaId: string;
  viewedAt: string;
}

export interface PYQAttempt {
  id: string;
  subject: string;
  topic: string;
  total: number;
  correct: number;
  solved: number;
  date: string;
}

export interface MockTest {
  id: string;
  name: string;
  subject: string;
  totalMarks: number;
  obtainedMarks: number;
  date: string;
}

export interface PomodoroState {
  isRunning: boolean;
  mode: 'work' | 'shortBreak' | 'longBreak';
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cycles: number;
  cyclesCompleted: number;
  secondsLeft: number;
  startedAt: string | null;
}
