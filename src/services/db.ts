import { supabase } from "../lib/supabase";
import { isNetworkError } from "../lib/authErrors";
import { seedFormulasForExam } from "../lib/formulaData";
import { sanitizeProfilePayload, fallbackLegacyPayload, sanitizeBacklogRowInput, isInvalidTypeError } from "../lib/profilePayload";
import type {
  BacklogItem, DailyPlanInputs, DailyPlanInputsInput, FocusSession, Formula,
  FormulaBookmark, MockTestResult, OnboardingInput, OnboardingBacklog,
  PlanTask, Priority, Profile, SyllabusChapter, SyllabusExam, SyllabusSubject,
  UserChapter, ChapterStatus, BacklogDetailInput, BacklogKind, ModuleProgress,
  RecoveryItem, RecoveryItemInput, StudyStats, PlannerGoal,
  PlannerGoalInput, TaskStatus, MentorDailyCheckin, MentorMemory,
  SmartBacklogInput, BacklogResourceProgress,
  ChapterProgressPatch,
} from "../lib/types";
import { remainingOf, resourceSummary, resourceMeta, extractBacklogResources, examIdMatchSet, backlogExamFamily } from "../lib/backlogMeta";

function backlogTypesFor(b: OnboardingBacklog): BacklogKind[] {
  const types: BacklogKind[] = [];
  if (b.pending_lectures > 0) types.push("lecture");
  if (b.pending_dpps > 0) types.push("dpp");
  if (b.module_remaining > 0) types.push("module");
  return types;
}

// Onboarding v3 stores module progress as a 0–100 percentage; the backlog
// schema stores it as solved/total question counts. Clamp + convert.
function clampModulePct(pct: number | undefined | null): number {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
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
//    Also extracts the exact missing column from Postgres/PostgREST errors
//    ("A field in the save doesn't exist in the profiles table" / 42703 / PGRST204).
function logSaveFailure(op: string, table: string, userId: string, sessionUserId: string | null, payload: unknown, error: unknown) {
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  console.error(`[onboarding-save] FAILED op=${op} table=${table} user=${userId} sessionUser=${sessionUserId ?? "NONE"}`);
  console.error("  error.code:", e?.code ?? "(none)");
  console.error("  error.message:", e?.message ?? "(none)");
  console.error("  error.details:", e?.details ?? "(none)");
  console.error("  error.hint:", e?.hint ?? "(none)");
  console.error("  MISSING COLUMN:", missingColumnFromError(error) ?? "(none)");
  console.error("  request payload:", JSON.stringify(payload));
  console.error("  raw error:", error);
}

// Extracts the column name Postgres/PostgREST complained about from a save
// error. Handles PostgREST ("Could not find the 'x' column of 'profiles' in
// the schema cache") and Postgres (42703: column ... does not exist).
export function missingColumnFromError(error: unknown): string | null {
  const e = error as { code?: string; message?: string; details?: string };
  const code = e?.code ?? "";
  const message = e?.message ?? "";
  const details = e?.details ?? "";
  const isColumnError =
    code === "42703" || code === "PGRST204" ||
    /does not exist/i.test(details) ||
    /Could not find the '.*' column/i.test(message) ||
    /A field in the save doesn't exist/i.test(message);
  if (!isColumnError) return null;
  const fromDetails = details.match(/(?:column|relation)\s+"?([a-zA-Z0-9_.]+)"?\s+does not exist/i);
  if (fromDetails) return fromDetails[1].split(".").pop() ?? null;
  const fromMessage = message.match(/Could not find the '([^']+)' column/i);
  if (fromMessage) return fromMessage[1];
  return details || message || null;
}

// Logs a failed profile save from anywhere in the app with the full payload
// and the exact missing column (if any). Used by pages that write profiles
// directly (SettingsPage, SignupPage) so no save can ever fail silently.
export function logProfileSaveFailure(source: string, table: string, payload: unknown, error: unknown) {
  console.error(`[${source}] FAILED table=${table}`);
  console.error("  MISSING COLUMN:", missingColumnFromError(error) ?? "(none)");
  console.error("  request payload:", JSON.stringify(payload));
  console.error("  complete error:", error);
}

/**
 * Resilient backlog insert/update helpers — live DB was missing columns
 * (completed_at, difficulty, estimated_minutes) so every add failed with
 * PGRST204 "Could not find the 'X' column … in the schema cache".
 * Instead of crashing, we strip the missing column and retry so the row
 * still saves. The migration 20260907120000 adds the columns for future
 * installs; this fallback keeps older DBs working until they migrate.
 */
function isMissingColumnError(error: unknown): string | null {
  return missingColumnFromError(error);
}

function isGeneratedColumnError(error: unknown): string | null {
  const e = error as { code?: string; message?: string };
  if (e?.code === "428C9" && e?.message?.includes("module_questions_remaining")) return "module_questions_remaining";
  return null;
}

function stripColumns(payload: Record<string, unknown>, cols: string[]): Record<string, unknown> {
  const next = { ...payload };
  for (const c of cols) delete next[c];
  return next;
}

async function insertBacklogWithFallback(
  c: ReturnType<typeof assertClient>,
  row: Record<string, unknown>,
): Promise<BacklogItem> {
  let payload: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await c.from("backlog_items").insert(payload).select("*").maybeSingle();
    if (!error) {
      const item = (data as BacklogItem) ?? null;
      if (!item) throw new Error("Failed to create backlog item");
      return item;
    }
    const missing = isMissingColumnError(error) ?? isGeneratedColumnError(error);
    if (missing && payload.hasOwnProperty(missing)) {
      console.warn(`[db.insertBacklogWithFallback] stripping missing/generated column '${missing}' and retrying`, error);
      payload = stripColumns(payload, [missing]);
      continue;
    }
    console.error("[db.insertBacklogWithFallback]", error);
    throw error;
  }
  throw new Error("insertBacklogWithFallback: too many retries");
}

async function updateBacklogWithFallback(
  c: ReturnType<typeof assertClient>,
  id: string,
  patch: Record<string, unknown>,
): Promise<BacklogItem | null> {
  let payload: Record<string, unknown> = { ...patch };
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await c.from("backlog_items").update(payload).eq("id", id).select("*").maybeSingle();
    if (!error) return (data as BacklogItem) ?? null;
    const missing = isMissingColumnError(error) ?? isGeneratedColumnError(error);
    if (missing && payload.hasOwnProperty(missing)) {
      console.warn(`[db.updateBacklogWithFallback] stripping missing/generated column '${missing}' and retrying`, error);
      payload = stripColumns(payload, [missing]);
      continue;
    }
    console.error("[db.updateBacklogWithFallback]", error);
    throw error;
  }
  return null;
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
  // rows are never touched (INSERT ... ON CONFLICT DO NOTHING preserves
  // existing data), so returning users keep all their data. Used as a safety
  // net when the handle_new_user DB trigger hasn't run (e.g. users who signed
  // up before the trigger migration was applied, or OAuth users whose trigger
  // insert raced). Accepts optional avatar URL from OAuth providers (Google
  // stores it as picture/avatar_url in user_metadata).
  async ensureProfile(userId: string, email: string, fullName: string | null, avatarUrl?: string | null): Promise<Profile | null> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName ?? "",
        display_name: fullName ?? "",
        avatar_url: avatarUrl ?? null,
        onboarding_completed: false,
        onboarding_step: 0,
        updated_at: new Date().toISOString(),
      }).select("*").maybeSingle();
      if (error) {
        // 23505 = unique violation (duplicate key) — profile already exists.
        // This is expected when the DB trigger already created the row; just
        // re-fetch it instead of throwing.
        if (error.code === "23505" || /duplicate key/i.test(error.message)) {
          const { data: existing } = await c.from("profiles").select("*").eq("id", userId).maybeSingle();
          return (existing as Profile) ?? null;
        }
        console.error("[db.ensureProfile]", error);
        throw error;
      }
      return (data as Profile) ?? null;
    } catch (err) { console.error("[db.ensureProfile] threw", err); throw err; }
  },

  async upsertProfile(patch: Partial<Profile> & { id: string }): Promise<Profile | null> {
    const c = assertClient();
    try {
      const payload = { ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>;
      const { data, error } = await c.from("profiles").upsert(payload).select("*").maybeSingle();
      if (error && isInvalidTypeError(error)) {
        console.warn("[db.upsertProfile] 22P02 — retrying with legacy fallback", error);
        const fallback: Record<string, unknown> = { ...payload };
        if (typeof fallback.target_exam === "string") fallback.target_exam = [fallback.target_exam as string];
        if (typeof fallback.exam_year === "string" && /^\d{4}$/.test(fallback.exam_year as string)) fallback.exam_year = Number(fallback.exam_year);
        const { data: fbData, error: fbError } = await c.from("profiles").upsert(fallback).select("*").maybeSingle();
        if (fbError) { logProfileSaveFailure("db.upsertProfile-fallback", "profiles", fallback, fbError); throw fbError; }
        return (fbData as Profile) ?? null;
      }
      if (error) { logProfileSaveFailure("db.upsertProfile", "profiles", patch, error); throw error; }
      return (data as Profile) ?? null;
    } catch (err) { console.error("[db.upsertProfile] threw", err); throw err; }
  },

  // Upserts (never silent-updates): if the profile row is missing — e.g. a user
  // signed up before the profile trigger existed — the row is created here so
  // onboarding can never silently fail to save. Every v2 answer has a column.
  // Full diagnostics: session check, table probe, payload log, retry-once.
  // Returns the CONFIRMED row: after the upsert the row is re-selected and
  // verified (onboarding_completed === true) so the wizard only proceeds when
  // the database actually persisted everything. On transient failure the whole
  // upsert is retried once before giving up.
  async completeOnboarding(userId: string, email: string, input: OnboardingInput): Promise<Profile | null> {
    const c = assertClient();
    const table = "profiles";

    // Sanitized payload — every field coerced to its Postgres type to prevent 22P02.
    // Handles NaN, empty strings, array vs scalar mismatches, and legacy schemas.
    let payload: Record<string, unknown> = sanitizeProfilePayload(userId, email, input);

    // 2. Verify auth: supabase.auth.getUser() + getSession(), auth.uid() match.
    const sessionUser = await currentSessionUser();
    if (!sessionUser) throw new Error("Your session has expired. Please sign in again.");
    if (sessionUser.id !== userId) {
      console.error("[onboarding-save] user id mismatch", { payloadUserId: userId, sessionUserId: sessionUser.id });
      throw new Error("Your session has expired. Please sign in again.");
    }

    // 5. Required fields / type sanity before sending (sanitized payload is authoritative).
    const issues: string[] = [];
    if (!email) issues.push("email is empty");
    if (!(payload.full_name as string)?.trim()) issues.push("full_name is empty");
    if (!Array.isArray(payload.subjects)) issues.push("subjects is not an array");
    if (typeof payload.daily_goal_hours !== "number" || !Number.isFinite(payload.daily_goal_hours as number)) issues.push(`daily_goal_hours is not a finite number (${payload.daily_goal_hours})`);
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

    // 6 + 10. Upsert (onConflict id prevents duplicates); retry once on network
    // failure. After the write, RE-SELECT the row and verify it persisted —
    // only then report success. One full retry of (upsert + verify) on
    // transient failures before giving up. Handles 22P02 type errors with legacy fallback.
    const persist = async (): Promise<Profile | null> => {
      try {
        const { error } = await withRetry(() => c.from(table).upsert(payload, { onConflict: "id" }));
        if (error) throw error;
        const { data, error: verifyError } = await c.from(table).select("*").eq("id", userId).maybeSingle();
        if (verifyError) throw verifyError;
        const row = data as Profile | null;
        if (!row || row.onboarding_completed !== true) {
          console.warn("[onboarding-save] verify failed — row missing or not completed", { row: row && { id: row.id, onboarding_completed: row.onboarding_completed } });
          return null;
        }
        return row;
      } catch (err) {
        // 22P02 = invalid type (string into int, string into text[], etc).
        // Retry once with legacy-compatible types (text[] for target_exam, int for exam_year).
        if (isInvalidTypeError(err)) {
          console.warn("[onboarding-save] 22P02 invalid type — retrying with legacy fallback payload", err);
          const fallback = fallbackLegacyPayload(payload);
          console.log(`[onboarding-save] fallback payload=${JSON.stringify(fallback)}`);
          try {
            const { error: fbError } = await c.from(table).upsert(fallback, { onConflict: "id" });
            if (fbError) throw fbError;
            // Keep payload in sync for outer retry/logging
            payload = fallback;
            const { data, error: verifyError2 } = await c.from(table).select("*").eq("id", userId).maybeSingle();
            if (verifyError2) throw verifyError2;
            const row2 = data as Profile | null;
            if (row2 && row2.onboarding_completed === true) return row2;
            return null;
          } catch (fbErr) {
            logSaveFailure("upsert-fallback", table, userId, sessionUser.id, fallback, fbErr);
            throw fbErr;
          }
        }
        logSaveFailure("upsert", table, userId, sessionUser.id, payload, err);
        throw err;
      }
    };

    // Upsert + verify. One full retry of the pair on any transient failure
    // (network error, row not yet visible), then fail loudly with diagnostics.
    try {
      const row = await persist();
      if (row) return row;
    } catch (err) {
      console.warn("[onboarding-save] first attempt failed; retrying once", err);
      // If first attempt was 22P02 and already retried via fallback, don't infinite loop;
      // outer retry will use the (possibly mutated) payload.
    }
    try {
      const row = await persist();
      if (row) return row;
    } catch (err2) {
      logSaveFailure("upsert", table, userId, sessionUser.id, payload, err2);
      throw err2;
    }
    const msg = "Your profile could not be saved to the database. Please try again.";
    console.error("[onboarding-save] final verification failed after retries", { userId, table });
    throw new Error(msg);
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

      const rows = items.map((b) => {
        const s = sanitizeBacklogRowInput(b);
        const safeSubject = String(b.subject ?? "").trim();
        const safeChapter = String(b.chapter ?? "").trim();
        // Recompute title/progress from sanitized numbers to avoid NaN/null
        const titleInput: BacklogDetailInput = {
          subject: safeSubject,
          chapter: safeChapter,
          backlog_types: backlogTypesFor({ ...b, ...s } as OnboardingBacklog),
          pending_lectures: s.pending_lectures,
          pending_dpps: s.pending_dpps,
          module_progress: "not_started" as ModuleProgress,
          module_total_questions: 100,
          module_solved_questions: s.module_pct,
        };
        const progress = computeOverallProgress(titleInput, s.module_pct);
        const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
        return {
          title: buildBacklogTitle(titleInput),
          subject: safeSubject,
          chapter: safeChapter,
          exam_id: examId ?? null,
          priority: "high" as Priority,
          status: "todo" as const,
          backlog_types: backlogTypesFor({ ...b, ...s } as OnboardingBacklog),
          pending_lectures: s.pending_lectures,
          pending_dpps: s.pending_dpps,
          module_total_questions: 100,
          module_solved_questions: s.module_pct,
          overall_progress: safeProgress,
          pending_pyqs: s.pending_pyqs,
          revision_pending: s.revision_pending,
          lecture_status: s.lecture_status,
          revision_level: s.revision_level,
          confidence: s.confidence,
          user_id: userId,
        };
      });

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

      // 10. Insert with retry-once on network failure. Handles 22P02 via per-row fallback.
      try {
        const { error } = await withRetry(() => c.from(table).insert(rows));
        if (error) throw error;
      } catch (err) {
        if (isNetworkError(err)) throw err;
        // Try per-row fallback (handles missing columns, generated columns and 22P02)
        if (isInvalidTypeError(err) || missingColumnFromError(err) || (err as { code?: string })?.code === "428C9") {
          console.warn("[db.addOnboardingBacklogs] bulk insert failed with type/missing column — retrying per-row with fallback", err);
          for (const row of rows) {
            try {
              // Use resilient helper that strips missing/generated columns and retries
              await insertBacklogWithFallback(c, row as Record<string, unknown>);
            } catch (rowErr) {
              if (isInvalidTypeError(rowErr)) {
                console.warn("[db.addOnboardingBacklogs] row still invalid type, attempting minimal fallback", rowErr);
                // Minimal fallback: strip overall_progress to 0 and ensure ints
                const minimal: Record<string, unknown> = {
                  title: row.title,
                  subject: row.subject,
                  chapter: row.chapter,
                  exam_id: row.exam_id,
                  priority: row.priority,
                  status: row.status,
                  user_id: row.user_id,
                  backlog_types: row.backlog_types,
                  pending_lectures: row.pending_lectures,
                  pending_dpps: row.pending_dpps,
                  module_total_questions: row.module_total_questions,
                  module_solved_questions: row.module_solved_questions,
                  overall_progress: 0,
                  pending_pyqs: row.pending_pyqs,
                  revision_pending: row.revision_pending,
                  lecture_status: row.lecture_status,
                  revision_level: row.revision_level,
                  confidence: row.confidence,
                };
                await insertBacklogWithFallback(c, minimal);
              } else {
                throw rowErr;
              }
            }
          }
          return;
        }
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
      // Sanitize exam_year if present (string vs int mismatch)
      if (update.exam_year !== undefined && typeof update.exam_year === "string" && /^\d{4}$/.test(update.exam_year as string)) {
        // keep as string for intended schema; fallback will convert to int on 22P02
      }
      let { error } = await c.from("profiles").update(update).eq("id", userId);
      if (error && isInvalidTypeError(error)) {
        console.warn("[db.updateAcademicSettings] 22P02 invalid type — retrying with legacy fallback", error);
        const fallback: Record<string, unknown> = { ...update };
        if (typeof fallback.target_exam === "string") fallback.target_exam = [fallback.target_exam as string];
        if (typeof fallback.exam_year === "string" && /^\d{4}$/.test(fallback.exam_year as string)) fallback.exam_year = Number(fallback.exam_year);
        const retry = await c.from("profiles").update(fallback).eq("id", userId);
        if (retry.error) { logProfileSaveFailure("db.updateAcademicSettings-fallback", "profiles", fallback, retry.error); throw retry.error; }
        return;
      }
      if (error) { logProfileSaveFailure("db.updateAcademicSettings", "profiles", update, error); throw error; }
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
      const clean = tasks.map((t) => {
        const { id: _id, created_at: _createdAt, user_id: _userId, ...rest } = t;
        return rest;
      });
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

  async getAllDailyPlanInputs(): Promise<DailyPlanInputs[]> {
    const c = assertClient();
    try {
      const { data, error } = await c.from("daily_plan_inputs").select("*").order("plan_date", { ascending: false });
      if (error) console.error("[db.getAllDailyPlanInputs]", error);
      return assertRows<DailyPlanInputs>(data, "getAllDailyPlanInputs");
    } catch (err) { console.error("[db.getAllDailyPlanInputs] threw", err); return []; }
  },

  // Streak via plan generation: max 1 per day, only for today's plan. Handles gaps and first streak start.
  async bumpStreakForPlanGeneration(date: string): Promise<{ newStreak: number; alreadyBumped: boolean }> {
    const c = assertClient();
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      if (date !== todayStr) return { newStreak: 0, alreadyBumped: true }; // only today's plan counts
      const sessionUser = await currentSessionUser();
      if (!sessionUser) return { newStreak: 0, alreadyBumped: true };
      // Guard duplicated bump same day via storage as fast path
      const storageKey = `studyshield:streakBump:${sessionUser.id}:${todayStr}`;
      try {
        if (typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1") {
          const stats = await this.getStudyStats().catch(() => null);
          return { newStreak: stats?.streak_days ?? 0, alreadyBumped: true };
        }
      } catch { /* ignore storage */ }
      // Check if daily_plan_inputs for today already existed BEFORE this generation
      // Caller should have already inserted today's plan, but we need to know if this is first generation today.
      // We use count of daily inputs for today: if 2nd generation today, we already bumped.
      // We detect by checking if today's plan count was 1 before and now still 1 — we can't know.
      // Instead we track last bump date in study_stats via updated_at comparison: if streak already bumped today, skip.
      // We store last bump marker in localStorage after successful bump, and also check study_stats yesterday gap.
      // To be device-independent, we also fetch all plan inputs to see if yesterday had activity.
      const stats = await this.getStudyStats().catch(() => null);
      const existingStreak = stats?.streak_days ?? 0;
      // If we already have a plan for today before this call, check via daily inputs count for today vs stats bump
      // Simpler: if stats updated_at is today and we already set storage, skip. But if new device, storage miss.
      // Fetch all daily plans to compute correct streak including today
      const allPlans = await this.getAllDailyPlanInputs().catch(() => [] as DailyPlanInputs[]);
      const planDates = new Set(allPlans.map((p) => p.plan_date));
      // Also union completed task dates
      const tasks = await this.getAllTasks().catch(() => [] as PlanTask[]);
      const taskDates = new Set(tasks.filter((t) => t.task_status === "completed" || t.completed).map((t) => t.scheduled_date).filter(Boolean) as string[]);
      const allActive = new Set<string>([...planDates, ...taskDates]);
      // Ensure today is in active (it should be after generation)
      allActive.add(todayStr);
      // Compute streak via same logic as computeCurrentStreak but with plan dates
      let streak = 0;
      const d = new Date(today);
      for (let i = 0; i < 365; i++) {
        if (i > 0) d.setDate(d.getDate() - 1);
        const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
        const ds = `${y}-${m}-${day}`;
        if (allActive.has(ds)) streak++;
        else if (i > 0) break;
      }
      // Max 1 per day: if existingStreak === streak then we already bumped (since streak includes today)
      // Compare computed streak with existing persisted streak
      if (existingStreak >= streak && existingStreak > 0) {
        try { if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
        return { newStreak: existingStreak, alreadyBumped: true };
      }
      // Need to bump: persist new streak
      const newStreak = streak || 1; // ensure at least 1 on first plan
      await this.upsertStudyStats({ streak_days: newStreak }).catch(() => {});
      // Sync longest
      try {
        const profile = await this.getProfile(sessionUser.id).catch(() => null);
        if (profile && newStreak > (profile.longest_streak ?? 0)) {
          await this.upsertProfile({ id: sessionUser.id, longest_streak: newStreak }).catch(() => {});
        }
      } catch { /* ignore */ }
      try { if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
      return { newStreak, alreadyBumped: false };
    } catch (err) {
      console.error("[db.bumpStreakForPlanGeneration] threw", err);
      return { newStreak: 0, alreadyBumped: true };
    }
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
      if (completed) {
        // XP: 2 per minute (matches FocusTimer toast)
        void this.incrementXP(Math.max(0, Math.round(durationMinutes * 2))).catch(() => { /* ignore */ });
      }
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
      const status = row.status ?? "not_started";
      const active = status === "started" || status === "in_progress";
      const existing = await c.from("user_chapters")
        .select("*").eq("subject", row.subject).eq("chapter", row.chapter).maybeSingle();
      if (existing.error) { console.error("[db.upsertUserChapter] fetch", existing.error); throw existing.error; }
      const cur = existing.data as UserChapter | null;
      // Marking a chapter started/in_progress means it is being studied now —
      // seed two lectures so the planner schedules its 2/day minimum
      // (column default is 0).
      const seedLecture = active
        && (cur?.lectures_remaining ?? 0) <= 0 && (cur?.questions_remaining ?? 0) <= 0 && (cur?.revision_pending ?? 0) <= 0;
      const payload: Record<string, unknown> = {
        exam: aliasExamId(row.exam), subject: row.subject, chapter: row.chapter,
        status, confidence: row.confidence ?? 3, updated_at: new Date().toISOString(),
        is_current: active,
      };
      if (seedLecture) payload.lectures_remaining = 2;
      const { data, error } = await c.from("user_chapters")
        .upsert(payload, { onConflict: "user_id,exam,subject,chapter" })
        .select("*").maybeSingle();
      if (error) { console.error("[db.upsertUserChapter]", error); throw error; }
      return (data as UserChapter) ?? null;
    } catch (err) { console.error("[db.upsertUserChapter] threw", err); throw err; }
  },

  // --- Academic Preferences: chapter/subject editor ----------------------
  // Writes user_chapters (authoritative for planner/revision/focus) and
  // mirrors the counters onto backlog_items when a matching row exists.
  // When any backlog-style counter is set and no row exists, one is created
  // so the Backlog module reflects the same numbers.
  async saveChapterProgress(patch: ChapterProgressPatch): Promise<void> {
    const c = assertClient();
    try {
      const { exam, subject, chapter } = patch;
      const examKey = aliasExamId(exam || "");
      const progress = {} as Record<string, unknown>;
      if (patch.module_pct !== undefined) progress.module_pct = clampModulePct(patch.module_pct);
      if (patch.dpp_pending !== undefined) progress.dpp_pending = Math.max(0, Math.round(patch.dpp_pending || 0));
      if (patch.pyq_pending !== undefined) progress.pyq_pending = Math.max(0, Math.round(patch.pyq_pending || 0));
      if (patch.revision_level !== undefined) progress.revision_level = Math.max(0, Math.min(3, Math.round(patch.revision_level || 0)));
      if (patch.pending_tests !== undefined) progress.pending_tests = Math.max(0, Math.round(patch.pending_tests || 0));

      const existing = await c.from("user_chapters")
        .select("*").eq("subject", subject).eq("chapter", chapter).maybeSingle();
      if (existing.error) { console.error("[db.saveChapterProgress] fetch", existing.error); throw existing.error; }
      const uc = existing.data as UserChapter | null;

      const ucPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status) {
        ucPatch.status = patch.status;
        ucPatch.is_current = patch.status === "started" || patch.status === "in_progress";
      }
      if (patch.lectures_remaining !== undefined) ucPatch.lectures_remaining = Math.max(0, Math.round(patch.lectures_remaining || 0));
      // Seeding: a chapter marked started/in_progress with no counters gets two
      // lectures so the planner schedules its 2/day minimum (column default is 0).
      const activeStatus = patch.status === "started" || patch.status === "in_progress";
      const noCounters = (uc?.lectures_remaining ?? 0) <= 0 && (uc?.questions_remaining ?? 0) <= 0 && (uc?.revision_pending ?? 0) <= 0;
      if (patch.status && activeStatus && patch.lectures_remaining === undefined && noCounters) {
        ucPatch.lectures_remaining = 2;
      }
      if (patch.questions_remaining !== undefined) ucPatch.questions_remaining = Math.max(0, Math.round(patch.questions_remaining || 0));
      if (patch.revision_pending !== undefined) ucPatch.revision_pending = Math.max(0, Math.round(patch.revision_pending || 0));
      if (patch.confidence !== undefined) ucPatch.confidence = Math.max(1, Math.min(5, Math.round(patch.confidence || 3)));
      if (Object.keys(progress).length > 0) ucPatch.progress = { ...(uc?.progress ?? {}), ...progress };

      if (uc) {
        const { error } = await c.from("user_chapters").update(ucPatch).eq("id", uc.id);
        if (error) { console.error("[db.saveChapterProgress] update", error); throw error; }
      } else {
        const activeStatus = patch.status === "started" || patch.status === "in_progress";
        const lectureDefault = activeStatus
          && Math.max(0, Math.round(patch.lectures_remaining ?? 0)) <= 0
          && Math.max(0, Math.round(patch.questions_remaining ?? 0)) <= 0
          && Math.max(0, Math.round(patch.revision_pending ?? 0)) <= 0;
        const { error } = await c.from("user_chapters").insert({
          exam: examKey, subject, chapter,
          status: patch.status ?? "not_started",
          is_current: activeStatus,
          lectures_remaining: lectureDefault ? 2 : Math.max(0, Math.round(patch.lectures_remaining ?? 0)),
          questions_remaining: Math.max(0, Math.round(patch.questions_remaining ?? 0)),
          revision_pending: Math.max(0, Math.round(patch.revision_pending ?? 0)),
          confidence: Math.max(1, Math.min(5, Math.round(patch.confidence ?? 3))),
          progress: Object.keys(progress).length > 0 ? progress : undefined,
        });
        if (error) { console.error("[db.saveChapterProgress] insert", error); throw error; }
      }

      // Mirror onto backlog_items (all rows for this subject+chapter).
      const blRes = await c.from("backlog_items").select("*").eq("subject", subject).eq("chapter", chapter);
      if (blRes.error) { console.error("[db.saveChapterProgress] backlog fetch", blRes.error); throw blRes.error; }
      const backlogRows = assertRows<BacklogItem>(blRes.data, "saveChapterProgress.backlog");

      const blPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status) blPatch.lecture_status = patch.status;
      if (patch.lectures_remaining !== undefined) blPatch.pending_lectures = Math.max(0, Math.round(patch.lectures_remaining || 0));
      if (patch.dpp_pending !== undefined) blPatch.pending_dpps = Math.max(0, Math.round(patch.dpp_pending || 0));
      if (patch.pyq_pending !== undefined) blPatch.pending_pyqs = Math.max(0, Math.round(patch.pyq_pending || 0));
      if (patch.revision_pending !== undefined) blPatch.revision_pending = Math.max(0, Math.round(patch.revision_pending || 0));
      if (patch.revision_level !== undefined) blPatch.revision_level = Math.max(0, Math.min(3, Math.round(patch.revision_level || 0)));
      if (patch.confidence !== undefined) blPatch.confidence = Math.max(1, Math.min(5, Math.round(patch.confidence || 3)));
      if (patch.pending_tests !== undefined) blPatch.pending_tests = Math.max(0, Math.round(patch.pending_tests || 0));
      if (patch.priority) blPatch.priority = patch.priority;
      if (patch.difficulty !== undefined) blPatch.difficulty = patch.difficulty;
      if (patch.module_pct !== undefined) {
        blPatch.module_total_questions = 100;
        blPatch.module_solved_questions = clampModulePct(patch.module_pct);
        blPatch.module_questions_remaining = Math.max(0, 100 - clampModulePct(patch.module_pct));
        blPatch.module_progress = clampModulePct(patch.module_pct) >= 100 ? "completed" : clampModulePct(patch.module_pct) > 0 ? "in_progress" : "not_started";
      }

      const pendingLectures = Math.max(0, Math.round(patch.lectures_remaining ?? 0));
      const pendingDpps = Math.max(0, Math.round(patch.dpp_pending ?? 0));
      const pendingPyqs = Math.max(0, Math.round(patch.pyq_pending ?? 0));
      const pendingRevision = Math.max(0, Math.round(patch.revision_pending ?? 0));
      const pendingTests = Math.max(0, Math.round(patch.pending_tests ?? 0));
      const hasContent =
        pendingLectures > 0 || pendingDpps > 0 || pendingPyqs > 0 ||
        pendingRevision > 0 || pendingTests > 0 || (patch.module_pct ?? 0) > 0 ||
        (patch.status === "completed" && !uc);

      if (backlogRows.length > 0) {
        // Recompute overall progress from the merged counters.
        const merged = backlogRows[0];
        const blFull = { ...merged, ...blPatch };
        const resources = extractBacklogResources(blFull as BacklogItem);
        const overallPct = resourceSummary(resources).pct;
        blPatch.overall_progress = overallPct;
        blPatch.status = overallPct >= 100 ? "done" : "todo";
        // Add completed_at if the item is now done (resilient to missing column)
        if (blPatch.status === "done") (blPatch as Record<string, unknown>).completed_at = new Date().toISOString();
        else (blPatch as Record<string, unknown>).completed_at = null;
        for (const row of backlogRows) {
          const patchWithExam = { ...blPatch, exam_id: row.exam_id };
          // Strip generated column if present in patch
          delete (patchWithExam as Record<string, unknown>).module_questions_remaining;
          const updated = await updateBacklogWithFallback(c, row.id, patchWithExam);
          if (!updated) console.warn("[db.saveChapterProgress] backlog update returned null for", row.id);
        }
      } else if (hasContent) {
        const row = buildSmartBacklogRow({
          exam: examKey,
          subject,
          chapter,
          priority: patch.priority ?? "high",
          difficulty: patch.difficulty ?? null,
          resources: {
            lecture: { total: pendingLectures, completed: 0 },
            dpp: { total: pendingDpps, completed: 0 },
            module: { total: 100, completed: (blPatch.module_solved_questions as number) ?? 0 },
            pyq: { total: pendingPyqs, completed: 0 },
            revision: { total: pendingRevision, completed: 0 },
          },
        });
        // Remove generated column if buildSmartBacklogRow included it via stripped fallback
        delete (row as Record<string, unknown>).module_questions_remaining;
        await insertBacklogWithFallback(c, row as Record<string, unknown>);
      }
    } catch (err) { console.error("[db.saveChapterProgress] threw", err); throw err; }
  },

  /** Removes a chapter everywhere: user_chapters + backlog_items + tracking. */
  async deleteChapter(subject: string, chapter: string): Promise<void> {
    const c = assertClient();
    try {
      const { error: e1 } = await c.from("user_chapters").delete().eq("subject", subject).eq("chapter", chapter);
      if (e1) { console.error("[db.deleteChapter] user_chapters", e1); throw e1; }
      const { error: e2 } = await c.from("backlog_items").delete().eq("subject", subject).eq("chapter", chapter);
      if (e2) { console.error("[db.deleteChapter] backlog_items", e2); throw e2; }
      const { error: e3 } = await c.from("school_chapter_tracking").delete().eq("subject", subject).eq("chapter", chapter);
      if (e3) { console.error("[db.deleteChapter] school_chapter_tracking", e3); throw e3; }
    } catch (err) { console.error("[db.deleteChapter] threw", err); throw err; }
  },

  /** Marks a chapter complete: status + zeroed counters everywhere. */
  async markChapterCompleted(subject: string, chapter: string): Promise<void> {
    const c = assertClient();
    try {
      const now = new Date().toISOString();
      const { error: e1 } = await c.from("user_chapters")
        .update({ status: "completed", lectures_remaining: 0, questions_remaining: 0, revision_pending: 0, progress: { fullyCompleted: true }, updated_at: now })
        .eq("subject", subject).eq("chapter", chapter);
      if (e1) { console.error("[db.markChapterCompleted] user_chapters", e1); throw e1; }
      // Resilient backlog update — handles missing completed_at/difficulty columns
      const patch: Record<string, unknown> = { status: "done", overall_progress: 100, completed_at: now, pending_lectures: 0, pending_dpps: 0, pending_pyqs: 0, revision_pending: 0, pending_tests: 0, updated_at: now };
      // Apply to all rows for this chapter one-by-one with fallback
      const { data: rows } = await c.from("backlog_items").select("id").eq("subject", subject).eq("chapter", chapter);
      for (const r of (rows as { id: string }[] | null) ?? []) {
        try { await updateBacklogWithFallback(c, r.id, patch); } catch (e2) { console.error("[db.markChapterCompleted] backlog_items", e2); throw e2; }
      }
    } catch (err) { console.error("[db.markChapterCompleted] threw", err); throw err; }
  },

  /** Resets a chapter's progress to not started (counters zeroed, rows kept). */
  async resetChapterProgress(subject: string, chapter: string): Promise<void> {
    const c = assertClient();
    try {
      const now = new Date().toISOString();
      const { error: e1 } = await c.from("user_chapters")
        .update({ status: "not_started", lectures_remaining: 0, questions_remaining: 0, revision_pending: 0, confidence: 3, progress: { notStarted: true }, updated_at: now })
        .eq("subject", subject).eq("chapter", chapter);
      if (e1) { console.error("[db.resetChapterProgress] user_chapters", e1); throw e1; }
      const patch2: Record<string, unknown> = { status: "todo", overall_progress: 0, completed_at: null, pending_lectures: 0, pending_dpps: 0, pending_pyqs: 0, revision_pending: 0, pending_tests: 0, updated_at: now };
      const { data: rows2 } = await c.from("backlog_items").select("id").eq("subject", subject).eq("chapter", chapter);
      for (const r of (rows2 as { id: string }[] | null) ?? []) {
        try { await updateBacklogWithFallback(c, r.id, patch2); } catch (e2) { console.error("[db.resetChapterProgress] backlog_items", e2); throw e2; }
      }
    } catch (err) { console.error("[db.resetChapterProgress] threw", err); throw err; }
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
   * are filtered at the database level so no other exam's data is ever loaded.
   * Rows with a null exam_id (legacy items created before exam tagging) are
   * included — they cannot be attributed to another exam.
   * Fixed: previously used unquoted `exam_id.in.(a,b)` which fails for text
   * values with hyphens/spaces; now uses proper `in` filter plus separate null
   * query and merges results to avoid PostgREST quoting bugs.
   */
  async getBacklogItems(examKey?: string | null): Promise<BacklogItem[]> {
    const c = assertClient();
    try {
      if (!examKey) {
        const { data, error } = await c.from("backlog_items").select("*").order("created_at", { ascending: false });
        if (error) console.error("[db.getBacklogItems]", error);
        return assertRows<BacklogItem>(data, "getBacklogItems");
      }
      const ids = examIdMatchSet(backlogExamFamily(examKey));
      // Use two queries to avoid PostgREST `or` quoting issues for text values
      const [withExam, withNull] = await Promise.all([
        c.from("backlog_items").select("*").in("exam_id", ids).order("created_at", { ascending: false }),
        c.from("backlog_items").select("*").is("exam_id", null).order("created_at", { ascending: false }),
      ]);
      if (withExam.error) console.error("[db.getBacklogItems] withExam", withExam.error);
      if (withNull.error) console.error("[db.getBacklogItems] withNull", withNull.error);
      const merged = [...assertRows<BacklogItem>(withExam.data, "getBacklogItems.withExam"), ...assertRows<BacklogItem>(withNull.data, "getBacklogItems.withNull")];
      // Deduplicate and sort by created_at desc
      const seen = new Set<string>();
      const deduped: BacklogItem[] = [];
      for (const item of merged.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))) {
        if (!seen.has(item.id)) { seen.add(item.id); deduped.push(item); }
      }
      return deduped;
    } catch (err) { console.error("[db.getBacklogItems] threw", err); return []; }
  },

  /** Increment XP for the current user. Silently handles missing xp column (PGRST204) by logging. */
  async incrementXP(amount: number): Promise<void> {
    if (amount <= 0) return;
    const c = assertClient();
    try {
      const sessionUser = await currentSessionUser();
      if (!sessionUser) return;
      // Fetch current XP
      const { data, error: fetchError } = await c.from("profiles").select("xp").eq("id", sessionUser.id).maybeSingle();
      if (fetchError) {
        const missing = missingColumnFromError(fetchError);
        if (missing) console.warn(`[db.incrementXP] missing column ${missing} — run supabase/profiles_fix_columns.sql`, fetchError);
        else console.error("[db.incrementXP] fetch", fetchError);
        return;
      }
      const current = (data as { xp?: number } | null)?.xp ?? 0;
      const next = current + amount;
      const { error } = await c.from("profiles").update({ xp: next, updated_at: new Date().toISOString() }).eq("id", sessionUser.id);
      if (error) {
        const missing = missingColumnFromError(error);
        if (missing) console.warn(`[db.incrementXP] missing column ${missing}`, error);
        else console.error("[db.incrementXP] update", error);
      }
    } catch (err) { console.error("[db.incrementXP] threw", err); }
  },

  async addBacklogItem(row: { title: string; subject?: string | null; chapter?: string | null; priority: Priority }): Promise<BacklogItem> {
    const c = assertClient();
    try {
      return await insertBacklogWithFallback(c, {
        title: row.title, subject: row.subject ?? null, chapter: row.chapter ?? null, priority: row.priority,
      });
    } catch (err) { console.error("[db.addBacklogItem] threw", err); throw err; }
  },

  async addBacklogDetail(input: BacklogDetailInput, priority: Priority = "high"): Promise<BacklogItem> {
    const c = assertClient();
    try {
      const remaining = computeModuleRemaining(input.module_total_questions, input.module_solved_questions);
      return await insertBacklogWithFallback(c, {
        title: buildBacklogTitle(input), subject: input.subject, chapter: input.chapter, priority,
        backlog_types: input.backlog_types, pending_lectures: input.pending_lectures, pending_dpps: input.pending_dpps,
        module_progress: input.module_progress, module_total_questions: input.module_total_questions,
        module_solved_questions: input.module_solved_questions, overall_progress: computeOverallProgress(input, remaining),
      });
    } catch (err) { console.error("[db.addBacklogDetail] threw", err); throw err; }
  },

  async updateBacklogItem(id: string, patch: Partial<BacklogItem>): Promise<void> {
    const c = assertClient();
    try {
      // Use fallback helper to handle missing columns gracefully
      const sanitized = { ...(patch as Record<string, unknown>) };
      delete sanitized.module_questions_remaining;
      await updateBacklogWithFallback(c, id, sanitized);
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
      const updated = await updateBacklogWithFallback(c, id, patch as Record<string, unknown>);
      return updated;
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
      const item = await insertBacklogWithFallback(c, row);
      // Award XP for adding a backlog (10 XP)
      void this.incrementXP(10).catch(() => { /* ignore */ });
      return item;
    } catch (err) { console.error("[db.addSmartBacklog] threw", err); throw err; }
  },

  async updateSmartBacklog(id: string, input: SmartBacklogInput): Promise<BacklogItem | null> {
    const c = assertClient();
    try {
      const row = buildSmartBacklogRow(input);
      return await updateBacklogWithFallback(c, id, row);
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
      const patch = syncBacklogColumns(res) as Record<string, unknown>;
      patch.backlog_data = { ...(item.backlog_data ?? {}), resources: res as Record<string, unknown> };
      const summary = resourceSummary(res);
      patch.overall_progress = summary.pct;
      patch.status = summary.total > 0 && summary.remaining === 0 ? "done" : "todo";
      patch.completed_at = patch.status === "done" ? new Date().toISOString() : null;
      const updated = await updateBacklogWithFallback(c, id, patch);
      if (updated) {
        if (patch.status === "done") void this.incrementXP(20).catch(() => { /* ignore */ });
        else void this.incrementXP(5).catch(() => { /* ignore */ });
      }
      return updated;
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
      const patch: Record<string, unknown> = {
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
        overall_progress: done ? 100 : summary.pct,
      };
      const updated = await updateBacklogWithFallback(c, id, patch);
      if (updated && done) void this.incrementXP(50).catch(() => { /* ignore */ });
      return updated;
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
      update.is_current = update.status === "started" || update.status === "in_progress";
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
      // Use local date for cutoff to match computeCurrentStreak (UTC slice is off by 1 for IST)
      const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - days);
      const y = cutoff.getFullYear();
      const m = String(cutoff.getMonth() + 1).padStart(2, "0");
      const d = String(cutoff.getDate()).padStart(2, "0");
      const cutoffStr = `${y}-${m}-${d}`;
      const { data, error } = await c.from("plan_tasks").select("*")
        .eq("task_status", "completed").gte("scheduled_date", cutoffStr)
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

  // --- Echo daily check-ins ---
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
  // Only send completed_at when the row is done — avoids a PGRST204 retry on
  // DBs that haven't yet applied 20260907120000 (todo rows have null anyway).
  if (row.status === "done") row.completed_at = new Date().toISOString();
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
  let totalUnits = 0;
  if (input.backlog_types.includes("lecture")) totalUnits += input.pending_lectures;
  if (input.backlog_types.includes("dpp")) totalUnits += input.pending_dpps;
  if (input.backlog_types.includes("module")) totalUnits += Math.max(moduleRemaining, input.module_total_questions);
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
  if (status === "completed") {
    // XP for completing a task (50 XP)
    try { await db.incrementXP(50); } catch { void 0; }
  }
}
