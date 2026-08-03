import { supabase } from "../lib/supabase";
import { todayISODate } from "../lib/constants";
import { isNetworkError } from "../lib/authErrors";
import { examIdForOnboarding, coachingLabel, ONBOARDING_STEP_COUNT } from "../lib/onboarding";
import { seedFormulasForExam } from "../lib/formulaData";
import type {
  BacklogItem, DailyPlanInputs, DailyPlanInputsInput, FocusSession, Formula,
  FormulaBookmark, FormulaView, MockTestResult, OnboardingInput, OnboardingBacklog,
  PlanTask, Priority, Profile, RevisionScheduleItem, SchoolChapterTracking,
  SyllabusChapter, SyllabusExam, SyllabusSubject, UserChapter, ChapterStatus,
  BacklogDetailInput, BacklogKind, ModuleProgress, StudyMode,
  RecoveryItem, RecoveryItemInput, StudyStats, PlannerGoal, PlannerGoalInput,
  TaskStatus, MentorDailyCheckin, MentorMemory, SmartBacklogInput,
  BacklogResourceProgress,
} from "../lib/types";
import { remainingOf, resourceSummary, resourceMeta, extractBacklogResources, examIdMatchSet, backlogExamFamily } from "../lib/backlogMeta";

function backlogTypesFor(b: OnboardingBacklog): BacklogKind[] {
  const types: BacklogKind[] = [];
  if (b.pending_lectures > 0) types.push("lecture");
  if (b.pending_dpps > 0) types.push("dpp");
  if (b.module_remaining > 0) types.push("module");
  return types;
}

// 2. Auth verification: returns the authenticated user (auth.uid()) or null.
async function currentSessionUser(): Promise<{ id: string; email?: string | null } | null> {
  try {
    const { data } = await supabase!.auth.getSession();
    return data.session?.user ?? null;
  } catch (err) {
    console.error("[onboarding-save] getSession threw", err);
    return null;
  }
}

// 10. Retry-once helper for network failures. Any other error re-throws.
async function withRetry<T>(fn: () => PromiseLike<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isNetworkError(err)) {
      console.warn("[onboarding-save] network error — retrying once", err);
      return await fn();
    }
    throw err;
  }
}

// 1. Print the COMPLETE error: code, message, details, hint, payload, ids, table, op.
function logSaveFailure(op: string, table: string, userId: string, sessionUserId: string | null, payload: unknown, error: unknown) {
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  console.error(`[onboarding-save] FAILED op=${op} table=${table} user=${userId} sessionUser=${sessionUserId ?? "NONE"}`);
  console.error("  error.code:", e?.code ?? "(none)");
  console.error("  error.message:", e?.message ?? "(none)");
  console.error("  error.details:", e?.details ?? "(none)");
  console.error("  error.hint:", e?.hint ?? "(none)");
  console.error("  request payload:", JSON.stringify(payload));
  console.error("  raw error:", error);
}

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

  // Creates a minimal profile row ONLY when one doesn't exist yet. Existing
  // rows are never touched, so returning users keep all their data. Used as a
  // safety net when the handle_new_user DB trigger hasn't run (e.g. users who
  // signed up before the trigger migration was applied).
  async ensureProfile(userId: string, email: string, fullName: string | null): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName ?? "",
        display_name: fullName ?? "",
        onboarding_completed: false,
        onboarding_step: 0,
        updated_at: new Date().toISOString(),
      });
      if (error && !/duplicate key/i.test(error.message)) {
        console.error("[db.ensureProfile]", error);
        throw error;
      }
    } catch (err) { console.error("[db.ensureProfile] threw", err); throw err; }
  },

  async upsertProfile(patch: Partial<Profile> & { id: string }): Promise<Profile | null> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("profiles").upsert({ ...patch, updated_at: new Date().toISOString() }).select("*").maybeSingle();
      if (error) { console.error("[db.upsertProfile]", error); throw error; }
      return (data as Profile) ?? null;
    } catch (err) { console.error("[db.upsertProfile] threw", err); throw err; }
  },

  // Upserts (never silent-updates): if the profile row is missing — e.g. a user
  // signed up before the profile trigger existed — the row is created here so
  // onboarding can never silently fail to save. Every v2 answer has a column.
  // Full diagnostics: session check, table probe, payload log, retry-once.
  async completeOnboarding(userId: string, email: string, input: OnboardingInput): Promise<void> {
    const c = assertClient();
    const table = "profiles";
    const payload: Record<string, unknown> = {
      id: userId, email,
      full_name: input.full_name, display_name: input.full_name,
      age: input.age ? Number(input.age) : null,
      school_class: input.school_class || null,
      school_name: input.school_name || null,
      target_exam: aliasExamId(examIdForOnboarding(input.target_exam)),
      exam_year: input.exam_year || null,
      current_level: input.current_level || null,
      coaching: input.coaching || "none",
      wake_up_time: input.wake_up_time || null,
      sleep_time: input.sleep_time || null,
      subjects: input.subjects,
      primary_goal: input.primary_goal || null,
      custom_goal: input.custom_goal || null,
      preferred_language: input.preferred_language || null,
      mentor_tone: input.mentor_tone || null,
      daily_goal_hours: input.daily_goal_hours,
      // Legacy columns kept in sync for the existing dashboard.
      coaching_enabled: input.coaching === "other" || ["pw", "allen", "aakash", "fiitjee", "vibrant", "motion", "resonance", "unacademy"].includes(input.coaching),
      coaching_name: coachingLabel(input.coaching, input.coaching_other),
      attends_school: true, school_board: "Other", coaching_is_live: false,
      coaching_days: [], coaching_start: input.coaching_start || "16:00", coaching_end: input.coaching_end || "19:00",
      lecture_duration_min: 120, revision_time: "evening", study_mode: "balanced" as StudyMode,
      // Habit calibration (AI Planner habit system).
      weekday_study_hours: input.weekday_study_hours || null,
      saturday_study_hours: input.saturday_study_hours > 0 ? input.saturday_study_hours : null,
      sunday_study_hours: input.sunday_study_hours > 0 ? input.sunday_study_hours : null,
      session_length_min: input.session_length_min || 45,
      break_min: input.break_min || 10,
      days_off: input.days_off ?? [],
      productive_slots: input.productive_slots ?? [],
      onboarding_data: input as unknown as Record<string, unknown>,
      onboarding_completed: true, onboarding_step: ONBOARDING_STEP_COUNT,
      updated_at: new Date().toISOString(),
    };

    // 2. Verify auth: supabase.auth.getUser() + getSession(), auth.uid() match.
    const sessionUser = await currentSessionUser();
    if (!sessionUser) throw new Error("Your session has expired. Please sign in again.");
    if (sessionUser.id !== userId) {
      console.error("[onboarding-save] user id mismatch", { payloadUserId: userId, sessionUserId: sessionUser.id });
      throw new Error("Your session has expired. Please sign in again.");
    }

    // 5. Required fields / type sanity before sending.
    const issues: string[] = [];
    if (!email) issues.push("email is empty");
    if (!input.full_name?.trim()) issues.push("full_name is empty");
    if (!Array.isArray(input.subjects)) issues.push("subjects is not an array");
    if (typeof input.daily_goal_hours !== "number" || !Number.isFinite(input.daily_goal_hours)) issues.push(`daily_goal_hours is not a finite number (${input.daily_goal_hours})`);
    if (issues.length > 0) console.warn("[onboarding-save] payload issues:", issues);

    // 8. Print the full payload before sending.
    console.log(`[onboarding-save] op=upsert table=${table} user=${userId} sessionUser=${sessionUser.id} payload=${JSON.stringify(payload)}`);

    // 3. Verify the table exists (schema cache probe).
    const probe = await c.from(table).select("id").limit(1);
    if (probe.error && (probe.error.code === "PGRST205" || probe.error.code === "42P01")) {
      console.error("[onboarding-save] TABLE MISSING", {
        code: probe.error.code, message: probe.error.message,
        details: probe.error.details, hint: probe.error.hint,
      });
      throw probe.error;
    }

    // 6 + 10. Upsert (onConflict id prevents duplicates); retry once on network failure.
    try {
      const { error } = await withRetry(() => c.from(table).upsert(payload, { onConflict: "id" }));
      if (error) {
        logSaveFailure("upsert", table, userId, sessionUser.id, payload, error);
        throw error;
      }
    } catch (err) {
      if (isNetworkError(err)) throw err; // already retried once
      logSaveFailure("upsert", table, userId, sessionUser.id, payload, err);
      throw err;
    }
  },

  // Best-effort resume state: saves the current step + draft so an interrupted
  // wizard resumes exactly where it left off. Never throws to the caller.
  async saveOnboardingProgress(userId: string, step: number, form: OnboardingInput): Promise<void> {
    const c = assertClient();
    try {
      const { error } = await c.from("profiles").update({
        onboarding_step: step,
        onboarding_data: form as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      if (error) console.warn("[db.saveOnboardingProgress]", error);
    } catch (err) { console.warn("[db.saveOnboardingProgress] threw", err); }
  },

  // Creates backlog_items rows from the onboarding backlog answers. The exam
  // id is stored on each row so the Backlog module can scope queries per exam.
  async addOnboardingBacklogs(userId: string, items: OnboardingBacklog[], examId?: string | null): Promise<void> {
    const c = assertClient();
    const table = "backlog_items";
    try {
      if (items.length === 0) return;

      // 2. Verify auth before writing.
      const sessionUser = await currentSessionUser();
      if (!sessionUser || sessionUser.id !== userId) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const rows = items.map((b) => ({
        title: buildBacklogTitle({
          subject: b.subject, chapter: b.chapter, backlog_types: backlogTypesFor(b),
          pending_lectures: b.pending_lectures, pending_dpps: b.pending_dpps,
          module_progress: "not_started" as ModuleProgress,
          module_total_questions: b.module_remaining, module_solved_questions: 0,
        }),
        subject: b.subject, chapter: b.chapter,
        exam_id: examId ?? null,
        priority: "high" as Priority, status: "todo" as const,
        backlog_types: backlogTypesFor(b),
        pending_lectures: b.pending_lectures, pending_dpps: b.pending_dpps,
        module_total_questions: b.module_remaining, module_solved_questions: 0,
        overall_progress: computeOverallProgress({
          subject: b.subject, chapter: b.chapter, backlog_types: backlogTypesFor(b),
          pending_lectures: b.pending_lectures, pending_dpps: b.pending_dpps,
          module_progress: "not_started" as ModuleProgress,
          module_total_questions: b.module_remaining, module_solved_questions: 0,
        }, b.module_remaining),
        pending_pyqs: b.pending_pyqs, revision_pending: b.revision_pending,
        user_id: userId,
      }));

      // 8. Print the full payload before sending.
      console.log(`[onboarding-save] op=insert table=${table} user=${userId} sessionUser=${sessionUser.id} rows=${rows.length} payload=${JSON.stringify(rows)}`);

      // 3. Verify the table exists.
      const probe = await c.from(table).select("id").limit(1);
      if (probe.error && (probe.error.code === "PGRST205" || probe.error.code === "42P01")) {
        console.error("[onboarding-save] TABLE MISSING", {
          code: probe.error.code, message: probe.error.message,
          details: probe.error.details, hint: probe.error.hint,
        });
        throw probe.error;
      }

      // 10. Insert with retry-once on network failure.
      try {
        const { error } = await withRetry(() => c.from(table).insert(rows));
        if (error) {
          logSaveFailure("insert", table, userId, sessionUser.id, rows, error);
          throw error;
        }
      } catch (err) {
        if (isNetworkError(err)) throw err;
        logSaveFailure("insert", table, userId, sessionUser.id, rows, err);
        throw err;
      }
    } catch (err) { console.error("[db.addOnboardingBacklogs] threw", err); throw err; }
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

  /**
   * Fetches the user's backlog items. When an exam key is provided the rows
   * are filtered at the database level (`exam_id.in(...)`) so no other exam's
   * data is ever loaded. Rows with a null exam_id (legacy items created before
   * exam tagging) are included — they cannot be attributed to another exam.
   */
  async getBacklogItems(examKey?: string | null): Promise<BacklogItem[]> {
    const c = assertClient();
    try {
      let q = c.from("backlog_items").select("*");
      if (examKey) {
        const ids = examIdMatchSet(backlogExamFamily(examKey));
        q = q.or(`exam_id.in.(${ids.join(",")}),exam_id.is.null`);
      }
      const { data, error } = await q.order("created_at", { ascending: false });
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

  // --- Smart Backlog (selection-driven entry flow) ---
  async addSmartBacklog(input: SmartBacklogInput): Promise<BacklogItem> {
    const c = assertClient();
    try {
      const row = buildSmartBacklogRow(input);
      const { data, error } = await c.from("backlog_items").insert(row).select("*").maybeSingle();
      if (error) { console.error("[db.addSmartBacklog]", error); throw error; }
      const item = (data as BacklogItem) ?? null;
      if (!item) throw new Error("Failed to create backlog item");
      return item;
    } catch (err) { console.error("[db.addSmartBacklog] threw", err); throw err; }
  },

  async updateSmartBacklog(id: string, input: SmartBacklogInput): Promise<BacklogItem | null> {
    const c = assertClient();
    try {
      const row = buildSmartBacklogRow(input);
      const { data, error } = await c.from("backlog_items").update(row).eq("id", id).select("*").maybeSingle();
      if (error) { console.error("[db.updateSmartBacklog]", error); throw error; }
      return (data as BacklogItem) ?? null;
    } catch (err) { console.error("[db.updateSmartBacklog] threw", err); throw err; }
  },

  /** One-tap progress: sets the completed count of one resource and re-syncs everything. */
  async updateBacklogResourceProgress(id: string, kind: BacklogKind, completed: number): Promise<BacklogItem | null> {
    const c = assertClient();
    try {
      const { data: existing, error: fe } = await c.from("backlog_items").select("*").eq("id", id).maybeSingle();
      if (fe) { console.error("[db.updateBacklogResourceProgress] fetch", fe); throw fe; }
      const item = existing as BacklogItem | null;
      if (!item) return null;
      const res = extractBacklogResources(item);
      const cur = res[kind] ?? { total: 0, completed: 0 };
      res[kind] = { total: cur.total, completed: Math.max(0, Math.min(cur.total, completed)) };
      const patch = syncBacklogColumns(res);
      patch.backlog_data = { ...(item.backlog_data ?? {}), resources: res as Record<string, unknown> };
      const summary = resourceSummary(res);
      patch.overall_progress = summary.pct;
      patch.status = summary.total > 0 && summary.remaining === 0 ? "done" : "todo";
      patch.completed_at = patch.status === "done" ? new Date().toISOString() : null;
      const { data, error } = await c.from("backlog_items").update(patch).eq("id", id).select("*").maybeSingle();
      if (error) { console.error("[db.updateBacklogResourceProgress] update", error); throw error; }
      return (data as BacklogItem) ?? null;
    } catch (err) { console.error("[db.updateBacklogResourceProgress] threw", err); throw err; }
  },

  /** Swipe-right: mark the whole item complete (or reopen it). */
  async completeBacklogItem(id: string, done: boolean): Promise<BacklogItem | null> {
    const c = assertClient();
    try {
      const { data: existing, error: fe } = await c.from("backlog_items").select("*").eq("id", id).maybeSingle();
      if (fe) { console.error("[db.completeBacklogItem] fetch", fe); throw fe; }
      const item = existing as BacklogItem | null;
      if (!item) return null;
      const summary = resourceSummary(extractBacklogResources(item));
      const patch: Partial<BacklogItem> = {
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
        overall_progress: done ? 100 : summary.pct,
      };
      const { data, error } = await c.from("backlog_items").update(patch).eq("id", id).select("*").maybeSingle();
      if (error) { console.error("[db.completeBacklogItem] update", error); throw error; }
      return (data as BacklogItem) ?? null;
    } catch (err) { console.error("[db.completeBacklogItem] threw", err); throw err; }
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

  // --- Mock tests / PYQ attempts ---
  async getMockTests(): Promise<MockTestResult[]> {
    try {
      const c = assertClient();
      const { data, error } = await c.from("mock_test_results").select("*").order("test_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MockTestResult[];
    } catch (e) { console.error("[db.getMockTests]", e); return []; }
  },
  async addMockTest(input: {
    test_name: string; subject?: string | null; total_marks: number;
    obtained_marks: number; test_date: string; weak_chapters?: string[]; strong_chapters?: string[];
  }): Promise<MockTestResult> {
    const c = assertClient();
    const { data, error } = await c.from("mock_test_results").insert({
      test_name: input.test_name, subject: input.subject ?? null,
      total_marks: input.total_marks, obtained_marks: input.obtained_marks,
      test_date: input.test_date,
      weak_chapters: input.weak_chapters ?? [], strong_chapters: input.strong_chapters ?? [],
    }).select("*").single();
    if (error) throw error;
    return data as MockTestResult;
  },
  async deleteMockTest(id: string): Promise<void> {
    const c = assertClient();
    const { error } = await c.from("mock_test_results").delete().eq("id", id);
    if (error) throw error;
  },

  // --- AI Mentor daily check-ins ---
  async getDailyCheckin(date: string): Promise<MentorDailyCheckin | null> {
    try {
      const c = assertClient();
      const { data, error } = await c.from("mentor_daily_checkins").select("*").eq("date", date).maybeSingle();
      if (error) throw error;
      return (data as MentorDailyCheckin | null) ?? null;
    } catch (e) { console.error("[db.getDailyCheckin]", e); return null; }
  },
  async upsertDailyCheckin(input: {
    date: string; message: string; completed_tasks: unknown[]; missed_tasks: unknown[]; focus_score: number | null;
  }): Promise<MentorDailyCheckin | null> {
    try {
      const c = assertClient();
      const { data, error } = await c.from("mentor_daily_checkins").upsert(input, { onConflict: "user_id,date" }).select("*").maybeSingle();
      if (error) throw error;
      return (data as MentorDailyCheckin | null) ?? null;
    } catch (e) { console.error("[db.upsertDailyCheckin]", e); return null; }
  },
  async getRecentCheckins(limit = 7): Promise<MentorDailyCheckin[]> {
    try {
      const c = assertClient();
      const { data, error } = await c.from("mentor_daily_checkins").select("*").order("date", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as MentorDailyCheckin[];
    } catch (e) { console.error("[db.getRecentCheckins]", e); return []; }
  },
  async getMentorMemories(limit = 20): Promise<MentorMemory[]> {
    try {
      const c = assertClient();
      const { data, error } = await c.from("mentor_memory").select("*").order("importance", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as MentorMemory[];
    } catch (e) { console.error("[db.getMentorMemories]", e); return []; }
  },
};

export function computeModuleRemaining(total: number, solved: number): number {
  return Math.max(0, (total ?? 0) - (solved ?? 0));
}

function moduleProgressFor(r?: BacklogResourceProgress): ModuleProgress {
  if (!r || (r.total ?? 0) <= 0) return "not_started";
  if ((r.completed ?? 0) >= r.total) return "completed";
  if ((r.completed ?? 0) > 0) return "in_progress";
  return "not_started";
}

/** Keeps the legacy scalar columns in sync with the structured resource map. */
export function syncBacklogColumns(res: Partial<Record<BacklogKind, BacklogResourceProgress>>): Record<string, unknown> {
  const kinds = (Object.keys(res) as BacklogKind[]).filter((k) => (res[k]?.total ?? 0) > 0);
  return {
    backlog_types: kinds,
    pending_lectures: remainingOf(res.lecture),
    pending_dpps: remainingOf(res.dpp),
    module_total_questions: res.module?.total ?? 0,
    module_solved_questions: res.module?.completed ?? 0,
    module_progress: moduleProgressFor(res.module),
    pending_pyqs: remainingOf(res.pyq),
    revision_pending: remainingOf(res.revision),
  };
}

export function buildSmartTitle(subject: string, chapter: string, resources: Partial<Record<BacklogKind, BacklogResourceProgress>>): string {
  const bits: string[] = [];
  for (const [kind, r] of Object.entries(resources)) {
    if (!r || (r.total ?? 0) <= 0) continue;
    const meta = resourceMeta(kind as BacklogKind);
    const rem = remainingOf(r);
    bits.push(rem > 0 ? `${meta.label} · ${rem} ${meta.unit}` : `${meta.label} · done`);
  }
  return `${subject} · ${chapter}${bits.length > 0 ? " — " + bits.join(", ") : ""}`;
}

/** Maps a structured SmartBacklogInput to a full backlog_items row. */
export function buildSmartBacklogRow(input: SmartBacklogInput): Record<string, unknown> {
  const res = { ...input.resources };
  const summary = resourceSummary(res);
  const row: Record<string, unknown> = {
    title: buildSmartTitle(input.subject, input.chapter, res),
    subject: input.subject,
    chapter: input.chapter,
    exam_id: input.exam,
    priority: input.priority,
    due_date: input.dueDate || null,
    overall_progress: summary.pct,
    backlog_data: {
      exam: input.exam,
      difficulty: input.difficulty ?? null,
      estimated_minutes: input.estimatedMinutes ?? null,
      resources: res as Record<string, unknown>,
    },
    ...syncBacklogColumns(res),
  };
  row.status = summary.total > 0 && summary.remaining === 0 ? "done" : "todo";
  row.completed_at = row.status === "done" ? new Date().toISOString() : null;
  return row;
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
