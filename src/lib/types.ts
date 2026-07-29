export type ChapterStatus =
  | "not_started" | "started" | "in_progress" | "completed"
  | "backlog" | "revision_pending" | "revision_completed"
  | "dpp_pending" | "module_pending" | "pyq_pending" | "mastered";
export type EnergyLevel = "low" | "normal" | "high";
export type StudyMode = "balanced" | "hard_push" | "recovery" | "exam_sprint";
export type Priority = "low" | "medium" | "high";
export type BacklogKind = "lecture" | "dpp" | "module";
export type ModuleProgress = "not_started" | "started" | "in_progress" | "completed";

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

export interface Profile {
  id: string; email: string; full_name: string | null; display_name: string;
  target_exam: string | null; exam_year: string | null; school_board: string | null;
  school_class: string | null; attends_school: boolean; coaching_enabled: boolean;
  coaching_name: string | null; coaching_is_live: boolean; coaching_days: string[] | null;
  coaching_start: string | null; coaching_end: string | null; lecture_duration_min: number;
  revision_time: string | null; daily_goal_hours: number; study_mode: StudyMode | null;
  onboarding_completed: boolean; onboarding_step: number; longest_streak: number;
  xp?: number | null; achievements: Record<string, unknown>; created_at: string | null;
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
  id: string; user_id: string; duration_minutes: number; completed: boolean;
  strict_mode: boolean; started_at: string; completed_at: string | null;
}

export interface UserChapter {
  id: string; user_id: string; exam: string; subject: string; chapter: string;
  status: ChapterStatus; lectures_remaining: number; questions_remaining: number;
  revision_pending: number; confidence: number; created_at: string; updated_at: string;
  progress: Record<string, unknown>;
}

export interface SyllabusExam { id: string; name: string; category: string; }
export interface SyllabusSubject { id: string; exam_id: string; name: string; display_order: number; }
export interface SyllabusChapter { id: string; subject_id: string; name: string; display_order: number; }

export interface Formula {
  id: string;
  exam_id: string;
  exam?: string;
  subject: string;
  chapter: string;
  name: string;
  expression: string;
  variables: FormulaVariable[];
  unit: string;
  explanation: string;
  shortcut: string;
  common_mistakes: string[];
  pyq_importance?: string;
  difficulty: FormulaDifficulty | string;
  created_at: string;
  exam_tags?: string[];
  keywords?: string[];
  important_notes?: string[];
  memory_tips?: string[];
  tricks?: string[];
}

export interface FormulaBookmark { id: string; user_id: string; formula_id: string; created_at: string; }
export interface FormulaView { id: string; user_id: string; formula_id: string; viewed_at: string; }
export interface SchoolChapterTracking { id: string; user_id: string; exam_id: string; subject: string; chapter: string; is_active: boolean; created_at: string; }
export interface RevisionScheduleItem { id: string; user_id: string; exam: string; subject: string; chapter: string; revision_number: number; scheduled_date: string; completed: boolean; completed_at: string | null; created_at: string; }
export interface MockTestResult { id: string; user_id: string; test_name: string; subject: string | null; total_marks: number; obtained_marks: number; test_date: string; weak_chapters: string[]; strong_chapters: string[]; created_at: string; }

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
  updated_at?: string | null;
}

export interface DailyPlanInputsInput {
  plan_date: string; was_school_day: boolean; study_hours: number;
  energy_level: EnergyLevel; exam_tomorrow: boolean;
}

export interface OnboardingInput {
  full_name: string; target_exam: string; exam_year: string; school_board: string;
  school_class: string; attends_school: boolean; coaching_enabled: boolean;
  coaching_name: string; coaching_is_live: boolean; coaching_days: string[];
  coaching_start: string; coaching_end: string; lecture_duration_min: number;
  revision_time: string; daily_goal_hours: number; study_mode: StudyMode;
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
