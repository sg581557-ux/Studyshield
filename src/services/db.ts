import { supabase } from "../lib/supabase";
import { todayISODate } from "../lib/constants";
import { seedFormulasForExam } from "../lib/formulaData";
import type {
  BacklogItem, DailyPlanInputs, DailyPlanInputsInput, FocusSession, Formula,
  FormulaBookmark, FormulaView, MockTestResult, OnboardingInput, PlanTask,
  Priority, Profile, RevisionScheduleItem, SchoolChapterTracking,
  SyllabusChapter, SyllabusExam, SyllabusSubject, UserChapter, ChapterStatus,
  BacklogDetailInput, BacklogKind, ModuleProgress,
  RecoveryItem, RecoveryItemInput, StudyStats, PlannerGoal, PlannerGoalInput,
  TaskStatus,
} from "../lib/types";

function assertClient() {
  if (!supabase) throw new Error("Supabase client not initialized");
  return supabase;
}

function assertRows<T>(data: T[] | null | undefined, ctx: string): T[] {
  if (data === null || data === undefined) return [];
  if (!Array.isArray(data)) { console.warn(`[db] Unexpected non-array payload from ${ctx}`, data); return []; }
  return data as T[];
}

const JEE_ALIASES = new Set([
  "jee-main", "jee-advanced", "jee main", "jee advanced", "jee-main+jee-advanced",
]);
export function aliasExamId(value: string): string {
  const lower = value.toLowerCase().trim();
  if (JEE_ALIASES.has(lower)) return "jee";
  return value;
}

const examIdCache = new Map<string, string>();

export const db = {
  async getProfile(userId: string): Promise<Profile | null> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) { console.error("[db.getProfile]", error); return null; }
      return (data as Profile) ?? null;
    } catch (err) { console.error("[db.getProfile] threw", err); return null; }
  },

  async upsertProfile(patch: Partial<Profile> & { id: string }): Promise<Profile | null> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("profiles").upsert({ ...patch, updated_at: new Date().toISOString() }).select("*").maybeSingle();
      if (error) { console.error("[db.upsertProfile]", error); throw error; }
      return (data as Profile) ?? null;
    } catch (err) { console.error("[db.upsertProfile] threw", err); throw err; }
  },

  async completeOnboarding(userId: string, input: OnboardingInput): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("profiles").update({
        full_name: input.full_name, display_name: input.full_name, target_exam: aliasExamId(input.target_exam),
        exam_year: input.exam_year, school_board: input.school_board, school_class: input.school_class,
        attends_school: input.attends_school, coaching_enabled: input.coaching_enabled,
        coaching_name: input.coaching_name, coaching_is_live: input.coaching_is_live,
        coaching_days: input.coaching_days, coaching_start: input.coaching_start,
        coaching_end: input.coaching_end, lecture_duration_min: input.lecture_duration_min,
        revision_time: input.revision_time, daily_goal_hours: input.daily_goal_hours,
        study_mode: input.study_mode, onboarding_completed: true, onboarding_step: 4,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      if (error) { console.error("[db.completeOnboarding]", error); throw error; }
    } catch (err) { console.error("[db.completeOnboarding] threw", err); throw err; }
  },

  async updateAcademicSettings(userId: string, patch: Partial<Profile>): Promise<void> {
    const c = assertClient();
    try {
      const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
      if (patch.target_exam) update.target_exam = aliasExamId(patch.target_exam);
      const { error } = await c.from("profiles").update(update).eq("id", userId);
      if (error) { console.error("[db.updateAcademicSettings]", error); throw error; }
    } catch (err) { console.error("[db.updateAcademicSettings] threw", err); throw err; }
  },

  async getTasksForDate(date: string): Promise<PlanTask[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("plan_tasks").select("*").eq("scheduled_date", date).order("start_time", { ascending: true, nullsFirst: false });
      if (error) console.error("[db.getTasksForDate]", error);
      return assertRows<PlanTask>(data, "getTasksForDate");
    } catch (err) { console.error("[db.getTasksForDate] threw", err); return []; }
  },

  async getAllTasks(): Promise<PlanTask[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("plan_tasks").select("*").order("scheduled_date", { ascending: false });
      if (error) console.error("[db.getAllTasks]", error);
      return assertRows<PlanTask>(data, "getAllTasks");
    } catch (err) { console.error("[db.getAllTasks] threw", err); return []; }
  },

  async insertTasks(tasks: PlanTask[]): Promise<PlanTask[]> {
    const c = assertClient();
    try {
      if (tasks.length === 0) return [];
      // Strip client-generated fields so the DB defaults (gen_random_uuid(), now(), auth.uid()) apply.
      // The plan_tasks.id column is uuid — client string ids like "id_..." cause a Postgres type error.
      const clean = tasks.map(({ id, created_at, user_id, ...rest }) => rest);
      const { data, error } = await c.from("plan_tasks").insert(clean as never).select("*");
      if (error) { console.error("[db.insertTasks] Supabase error:", error); throw error; }
      return assertRows<PlanTask>(data, "insertTasks");
    } catch (err) { console.error("[db.insertTasks] threw", err); throw err; }
  },

  async updateTask(id: string, patch: Partial<PlanTask>): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("plan_tasks").update(patch).eq("id", id);
      if (error) { console.error("[db.updateTask]", error); throw error; }
    } catch (err) { console.error("[db.updateTask] threw", err); throw err; }
  },

  async deleteTask(id: string): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("plan_tasks").delete().eq("id", id);
      if (error) { console.error("[db.deleteTask]", error); throw error; }
    } catch (err) { console.error("[db.deleteTask] threw", err); throw err; }
  },

  async deleteTasksForDate(date: string): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("plan_tasks").delete().eq("scheduled_date", date);
      if (error) { console.error("[db.deleteTasksForDate]", error); throw error; }
    } catch (err) { console.error("[db.deleteTasksForDate] threw", err); throw err; }
  },

  async getDailyPlanInputs(date: string): Promise<DailyPlanInputs | null> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("daily_plan_inputs").select("*").eq("plan_date", date).maybeSingle();
      if (error) console.error("[db.getDailyPlanInputs]", error);
      return (data as DailyPlanInputs) ?? null;
    } catch (err) { console.error("[db.getDailyPlanInputs] threw", err); return null; }
  },

  async saveDailyPlanInputs(input: DailyPlanInputsInput): Promise<void> {
    const c = assertClient();
    try {
      // study_hours is integer NOT NULL — round to avoid type errors.
      const payload = { ...input, study_hours: Math.round(input.study_hours) };
      const { error } = await c.from("daily_plan_inputs").upsert(payload, { onConflict: "user_id,plan_date" });
      if (error) { console.error("[db.saveDailyPlanInputs]", error); throw error; }
    } catch (err) { console.error("[db.saveDailyPlanInputs] threw", err); throw err; }
  },

  async getFocusSessions(): Promise<FocusSession[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("focus_sessions").select("*").order("started_at", { ascending: false });
      if (error) console.error("[db.getFocusSessions]", error);
      return assertRows<FocusSession>(data, "getFocusSessions");
    } catch (err) { console.error("[db.getFocusSessions] threw", err); return []; }
  },

  async addFocusSession(durationMinutes: number, completed: boolean, strictMode = false): Promise<FocusSession | null> {
    const c = assertClient();
    try {
      const now = new Date().toISOString();
      const { data, error } = await c.from("focus_sessions").insert({
        duration_minutes: durationMinutes, completed, strict_mode: strictMode,
        started_at: now, completed_at: completed ? now : null,
      }).select("*").maybeSingle();
      if (error) { console.error("[db.addFocusSession]", error); throw error; }
      return (data as FocusSession) ?? null;
    } catch (err) { console.error("[db.addFocusSession] threw", err); throw err; }
  },

  async getUserChapters(): Promise<UserChapter[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("user_chapters").select("*").order("subject", { ascending: true });
      if (error) console.error("[db.getUserChapters]", error);
      return assertRows<UserChapter>(data, "getUserChapters");
    } catch (err) { console.error("[db.getUserChapters] threw", err); return []; }
  },

  async upsertUserChapter(row: { exam: string; subject: string; chapter: string; status?: ChapterStatus; confidence?: number }): Promise<UserChapter | null> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("user_chapters")
        .upsert({ exam: aliasExamId(row.exam), subject: row.subject, chapter: row.chapter, status: row.status ?? "not_started", confidence: row.confidence ?? 3, updated_at: new Date().toISOString() },
          { onConflict: "user_id,exam,subject,chapter" })
        .select("*").maybeSingle();
      if (error) { console.error("[db.upsertUserChapter]", error); throw error; }
      return (data as UserChapter) ?? null;
    } catch (err) { console.error("[db.upsertUserChapter] threw", err); throw err; }
  },

  async getExams(): Promise<SyllabusExam[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("syllabus_exams").select("*").order("name", { ascending: true });
      if (error) console.error("[db.getExams]", error);
      return assertRows<SyllabusExam>(data, "getExams").filter((e) => e.id !== "jee-main" && e.id !== "jee-advanced");
    } catch (err) { console.error("[db.getExams] threw", err); return []; }
  },

  async resolveExamId(storedValue: string | null | undefined): Promise<string | null> {
    if (!storedValue) return null;
    const aliased = aliasExamId(storedValue);
    const cached = examIdCache.get(aliased);
    if (cached) return cached;
    const c = assertClient();
    try {
      const byId = await c.from("syllabus_exams").select("id, name").eq("id", aliased).maybeSingle();
      if (byId.data) { examIdCache.set(aliased, byId.data.id); return byId.data.id; }
      const byName = await c.from("syllabus_exams").select("id, name").ilike("name", aliased).maybeSingle();
      if (byName.data) { examIdCache.set(aliased, byName.data.id); return byName.data.id; }
      const fuzzy = await c.from("syllabus_exams").select("id, name").ilike("name", `%${aliased}%`).maybeSingle();
      if (fuzzy.data) { examIdCache.set(aliased, fuzzy.data.id); return fuzzy.data.id; }
      return aliased;
    } catch (err) { console.error("[db.resolveExamId] threw", err); return aliased; }
  },

  async getSubjects(examKey: string): Promise<SyllabusSubject[]> {
    const c = assertClient();
    try {
      const examId = await this.resolveExamId(examKey);
      if (!examId) return [];
      const { data, error } = await c.from("syllabus_subjects").select("*").eq("exam_id", examId).order("display_order", { ascending: true });
      if (error) console.error("[db.getSubjects]", error);
      return assertRows<SyllabusSubject>(data, "getSubjects");
    } catch (err) { console.error("[db.getSubjects] threw", err); return []; }
  },

  async getChapters(subjectId: string): Promise<SyllabusChapter[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("syllabus_chapters").select("*").eq("subject_id", subjectId).order("display_order", { ascending: true });
      if (error) console.error("[db.getChapters]", error);
      return assertRows<SyllabusChapter>(data, "getChapters");
    } catch (err) { console.error("[db.getChapters] threw", err); return []; }
  },

  async getFormulasForExam(examKey: string): Promise<Formula[]> {
    const c = assertClient();
    try {
      const examId = await this.resolveExamId(examKey);
      if (!examId) return [];
      const { data, error } = await c.from("formula_library").select("*").eq("exam_id", examId).order("subject", { ascending: true }).order("name", { ascending: true });
      if (error) console.error("[db.getFormulasForExam]", error);
      const rows = assertRows<Formula>(data, "getFormulasForExam");
      if (rows.length > 0) return rows;
      return seedFormulasForExam(examId);
    } catch (err) { console.error("[db.getFormulasForExam] threw", err); return seedFormulasForExam(examKey); }
  },

  async getBookmarks(): Promise<FormulaBookmark[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("formula_bookmarks").select("*").order("created_at", { ascending: false });
      if (error) console.error("[db.getBookmarks]", error);
      return assertRows<FormulaBookmark>(data, "getBookmarks");
    } catch (err) { console.error("[db.getBookmarks] threw", err); return []; }
  },

  async addBookmark(formulaId: string): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("formula_bookmarks").insert({ formula_id: formulaId });
      if (error) { console.error("[db.addBookmark]", error); throw error; }
    } catch (err) { console.error("[db.addBookmark] threw", err); throw err; }
  },

  async removeBookmark(formulaId: string): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("formula_bookmarks").delete().eq("formula_id", formulaId);
      if (error) { console.error("[db.removeBookmark]", error); throw error; }
    } catch (err) { console.error("[db.removeBookmark] threw", err); throw err; }
  },

  async getBacklogItems(): Promise<BacklogItem[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("backlog_items").select("*").order("created_at", { ascending: false });
      if (error) console.error("[db.getBacklogItems]", error);
      return assertRows<BacklogItem>(data, "getBacklogItems");
    } catch (err) { console.error("[db.getBacklogItems] threw", err); return []; }
  },

  async addBacklogItem(row: { title: string; subject?: string | null; chapter?: string | null; priority: Priority }): Promise<BacklogItem> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("backlog_items").insert({
        title: row.title, subject: row.subject ?? null, chapter: row.chapter ?? null, priority: row.priority,
      }).select("*").maybeSingle();
      if (error) { console.error("[db.addBacklogItem]", error); throw error; }
      const item = (data as BacklogItem) ?? null;
      if (!item) throw new Error("Failed to create backlog item");
      return item;
    } catch (err) { console.error("[db.addBacklogItem] threw", err); throw err; }
  },

  async addBacklogDetail(input: BacklogDetailInput, priority: Priority = "high"): Promise<BacklogItem> {
    const c = assertClient();
    try {
      const remaining = computeModuleRemaining(input.module_total_questions, input.module_solved_questions);
      const { data, error } = await c.from("backlog_items").insert({
        title: buildBacklogTitle(input), subject: input.subject, chapter: input.chapter, priority,
        backlog_types: input.backlog_types, pending_lectures: input.pending_lectures, pending_dpps: input.pending_dpps,
        module_progress: input.module_progress, module_total_questions: input.module_total_questions,
        module_solved_questions: input.module_solved_questions, overall_progress: computeOverallProgress(input, remaining),
      }).select("*").maybeSingle();
      if (error) { console.error("[db.addBacklogDetail]", error); throw error; }
      const item = (data as BacklogItem) ?? null;
      if (!item) throw new Error("Failed to create backlog item");
      return item;
    } catch (err) { console.error("[db.addBacklogDetail] threw", err); throw err; }
  },

  async updateBacklogItem(id: string, patch: Partial<BacklogItem>): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("backlog_items").update(patch).eq("id", id);
      if (error) { console.error("[db.updateBacklogItem]", error); throw error; }
    } catch (err) { console.error("[db.updateBacklogItem] threw", err); throw err; }
  },

  async decrementBacklog(id: string, kind: BacklogKind, solvedDelta = 1): Promise<BacklogItem | null> {
    const c = assertClient();
    try {
      const { data: existing, error: fe } = await c.from("backlog_items").select("*").eq("id", id).maybeSingle();
      if (fe) { console.error("[db.decrementBacklog] fetch", fe); return null; }
      const item = existing as BacklogItem | null;
      if (!item) return null;
      const patch: Partial<BacklogItem> & Record<string, unknown> = {};
      if (kind === "lecture") patch.pending_lectures = Math.max(0, (item.pending_lectures ?? 0) - 1);
      else if (kind === "dpp") patch.pending_dpps = Math.max(0, (item.pending_dpps ?? 0) - 1);
      else if (kind === "module") {
        const solved = Math.min(item.module_total_questions ?? 0, (item.module_solved_questions ?? 0) + solvedDelta);
        patch.module_solved_questions = solved;
        const remaining = Math.max(0, (item.module_total_questions ?? 0) - solved);
        if (remaining === 0 && (item.module_total_questions ?? 0) > 0) patch.module_progress = "completed" as ModuleProgress;
        else if (solved > 0 && (item.module_progress ?? "not_started") === "not_started") patch.module_progress = "in_progress" as ModuleProgress;
      }
      const { data, error } = await c.from("backlog_items").update(patch).eq("id", id).select("*").maybeSingle();
      if (error) { console.error("[db.decrementBacklog] update", error); throw error; }
      return (data as BacklogItem) ?? null;
    } catch (err) { console.error("[db.decrementBacklog] threw", err); return null; }
  },

  async deleteBacklogItem(id: string): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("backlog_items").delete().eq("id", id);
      if (error) { console.error("[db.deleteBacklogItem]", error); throw error; }
    } catch (err) { console.error("[db.deleteBacklogItem] threw", err); throw err; }
  },

  // --- Recovery Bucket ---
  async getRecoveryItems(status?: string): Promise<RecoveryItem[]> {
    try { return await getRecoveryItems(status); } catch (e) { console.error("[db.getRecoveryItems]", e); return []; }
  },
  async addRecoveryItem(item: RecoveryItemInput): Promise<RecoveryItem | null> {
    try { return await recoveryDb.add(item); } catch (e) { console.error("[db.addRecoveryItem]", e); return null; }
  },
  async markRecoveryScheduled(id: string, date: string): Promise<void> {
    try { await recoveryDb.update(id, { recovery_status: "scheduled", scheduled_recovery_date: date }); } catch (e) { console.error("[db.markRecoveryScheduled]", e); }
  },
  async markRecoveryRecovered(id: string): Promise<void> {
    try { await recoveryDb.markRecovered(id); } catch (e) { console.error("[db.markRecoveryRecovered]", e); }
  },
  async deleteRecoveryItem(id: string): Promise<void> {
    try { await recoveryDb.remove(id); } catch (e) { console.error("[db.deleteRecoveryItem]", e); }
  },

  // --- Study Stats (learning model) ---
  async getStudyStats(): Promise<StudyStats | null> {
    try { return await statsDb.get(); } catch (e) { console.error("[db.getStudyStats]", e); return null; }
  },
  async upsertStudyStats(stats: Partial<StudyStats>): Promise<void> {
    try { await statsDb.upsert(stats); } catch (e) { console.error("[db.upsertStudyStats]", e); }
  },

  // --- Planner Goals ---
  async getActiveGoals(goalType?: string): Promise<PlannerGoal[]> {
    try { return await goalsDb.getActive(goalType); } catch (e) { console.error("[db.getActiveGoals]", e); return []; }
  },
  async addGoal(goal: PlannerGoalInput): Promise<PlannerGoal | null> {
    try { return await goalsDb.add(goal); } catch (e) { console.error("[db.addGoal]", e); return null; }
  },
  async updateGoal(id: string, patch: Partial<PlannerGoal>): Promise<void> {
    try { await goalsDb.update(id, patch); } catch (e) { console.error("[db.updateGoal]", e); }
  },

  // --- Task status ---
  async setTaskStatus(taskId: string, status: TaskStatus, actualMinutes?: number): Promise<void> {
    try { await updateTaskStatus(taskId, status, actualMinutes); } catch (e) { console.error("[db.setTaskStatus]", e); }
  },
  async getMissedTasks(date: string): Promise<PlanTask[]> {
    try {
      const c = assertClient();
      const { data, error } = await c.from("plan_tasks").select("*")
        .eq("scheduled_date", date).in("task_status", ["pending", "partially_completed"]).order("priority_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanTask[];
    } catch (e) { console.error("[db.getMissedTasks]", e); return []; }
  },
  async updateUserChapterProgress(subject: string, chapter: string, patch: Partial<UserChapter> & { progress?: Record<string, unknown> }): Promise<void> {
    try {
      const c = assertClient();
      const { data: existing, error: fe } = await c.from("user_chapters").select("*").eq("subject", subject).eq("chapter", chapter).maybeSingle();
      if (fe) { console.error("[db.updateUserChapterProgress] fetch", fe); return; }
      const cur = existing as UserChapter | null;
      if (!cur) { console.warn("[db.updateUserChapterProgress] chapter not found", subject, chapter); return; }
      const mergedProgress = { ...(cur.progress ?? {}), ...(patch.progress ?? {}) };
      const update: Record<string, unknown> = { ...patch, progress: mergedProgress, updated_at: new Date().toISOString() };
      const lecturesRemaining = Math.max(0, (update.lectures_remaining as number) ?? cur.lectures_remaining ?? 0);
      const questionsRemaining = Math.max(0, (update.questions_remaining as number) ?? cur.questions_remaining ?? 0);
      const revisionPending = Math.max(0, (update.revision_pending as number) ?? cur.revision_pending ?? 0);
      if (lecturesRemaining === 0 && questionsRemaining === 0 && revisionPending === 0) {
        update.status = "completed" as ChapterStatus;
        update.progress = { ...mergedProgress, fullyCompleted: true };
      } else if (cur.status === "not_started") {
        update.status = "in_progress" as ChapterStatus;
      }
      const { error } = await c.from("user_chapters").update(update).eq("id", cur.id);
      if (error) console.error("[db.updateUserChapterProgress] update", error);
    } catch (e) { console.error("[db.updateUserChapterProgress] threw", e); }
  },
  async getActiveUserChapters(): Promise<UserChapter[]> {
    try {
      const all = await this.getUserChapters();
      return all.filter((uc) =>
        (uc.lectures_remaining ?? 0) > 0 ||
        (uc.questions_remaining ?? 0) > 0 ||
        (uc.revision_pending ?? 0) > 0 ||
        (uc.status !== "not_started" && uc.status !== "completed" && uc.status !== "mastered"),
      );
    } catch (e) { console.error("[db.getActiveUserChapters]", e); return []; }
  },
  async getRecentCompletedTasks(days: number): Promise<PlanTask[]> {
    try {
      const c = assertClient();
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      const { data, error } = await c.from("plan_tasks").select("*")
        .eq("task_status", "completed").gte("scheduled_date", cutoff.toISOString().slice(0, 10))
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanTask[];
    } catch (e) { console.error("[db.getRecentCompletedTasks]", e); return []; }
  },
};

export function computeModuleRemaining(total: number, solved: number): number {
  return Math.max(0, (total ?? 0) - (solved ?? 0));
}

export function buildBacklogTitle(input: BacklogDetailInput): string {
  const parts: string[] = [input.subject, input.chapter];
  const bits: string[] = [];
  if (input.backlog_types.includes("lecture") && input.pending_lectures > 0) bits.push(`${input.pending_lectures} lecture${input.pending_lectures > 1 ? "s" : ""}`);
  if (input.backlog_types.includes("dpp") && input.pending_dpps > 0) bits.push(`${input.pending_dpps} DPP${input.pending_dpps > 1 ? "s" : ""}`);
  if (input.backlog_types.includes("module")) {
    const rem = computeModuleRemaining(input.module_total_questions, input.module_solved_questions);
    if (rem > 0) bits.push(`${rem} module Qs`);
  }
  if (bits.length > 0) parts.push(bits.join(", "));
  return parts.join(" — ") || "Backlog item";
}

export function computeOverallProgress(input: BacklogDetailInput, moduleRemaining: number): number {
  let totalUnits = 0, doneUnits = 0;
  if (input.backlog_types.includes("lecture")) totalUnits += input.pending_lectures;
  if (input.backlog_types.includes("dpp")) totalUnits += input.pending_dpps;
  if (input.backlog_types.includes("module")) { totalUnits += Math.max(moduleRemaining, input.module_total_questions); doneUnits += input.module_solved_questions; }
  if (totalUnits <= 0) return 0;
  const pending = (input.pending_lectures ?? 0) + (input.pending_dpps ?? 0) + moduleRemaining;
  return Math.max(0, Math.min(100, Math.round(((totalUnits - pending) / totalUnits) * 100)));
}

// ============================================================
// Recovery Bucket
// ============================================================
async function getRecoveryItems(status?: string): Promise<RecoveryItem[]> {
  const c = assertClient();
  let q = c.from("recovery_bucket").select("*").order("date_missed", { ascending: false });
  if (status) q = q.eq("recovery_status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RecoveryItem[];
}
export const recoveryDb = {
  getAll: () => getRecoveryItems(),
  getPending: () => getRecoveryItems("pending"),
  async add(item: RecoveryItemInput): Promise<RecoveryItem> {
    const c = assertClient();
    const { data, error } = await c.from("recovery_bucket").insert(item).select().single();
    if (error) throw error;
    return data as RecoveryItem;
  },
  async update(id: string, patch: Partial<RecoveryItem>): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("recovery_bucket").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("recovery_bucket").delete().eq("id", id);
    if (error) throw error;
  },
  async markRecovered(id: string): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("recovery_bucket").update({
      recovery_status: "recovered", recovered_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },
};

// Study Stats (learning model) operations
export const statsDb = {
  async get(): Promise<StudyStats | null> {
    const c = assertClient();
    const { data, error } = await c.from("study_stats").select("*").maybeSingle();
    if (error) throw error;
    return data as StudyStats | null;
  },
  async upsert(stats: Partial<StudyStats>): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("study_stats").upsert(stats, { onConflict: "user_id" });
    if (error) throw error;
  },
};

// Planner Goals operations
export const goalsDb = {
  async getActive(goalType?: string): Promise<PlannerGoal[]> {
    const c = assertClient();
    let q = c.from("planner_goals").select("*").eq("status", "active").order("period_start", { ascending: false });
    if (goalType) q = q.eq("goal_type", goalType);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PlannerGoal[];
  },
  async add(goal: PlannerGoalInput): Promise<PlannerGoal> {
    const c = assertClient();
    const { data, error } = await c.from("planner_goals").insert(goal).select().single();
    if (error) throw error;
    return data as PlannerGoal;
  },
  async update(id: string, patch: Partial<PlannerGoal>): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("planner_goals").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("planner_goals").delete().eq("id", id);
    if (error) throw error;
  },
};

// Task status operations (extends existing task management)
export async function updateTaskStatus(taskId: string, status: TaskStatus, actualMinutes?: number): Promise<void> {
  const c = assertClient();
  const patch: Record<string, unknown> = { task_status: status };
  if (status === "completed") { patch.completed = true; patch.completion_pct = 100; }
  else if (status === "in_progress") { patch.completed = false; }
  else if (status === "skipped" || status === "cancelled") { patch.completed = false; }
  if (actualMinutes !== undefined) patch.actual_minutes = actualMinutes;
  const { error } = await c.from("plan_tasks").update(patch).eq("id", taskId);
  if (error) throw error;
}
