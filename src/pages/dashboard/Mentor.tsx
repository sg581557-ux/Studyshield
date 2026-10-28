import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BrainCircuit, Camera, Clock, Download, Flame, Image as ImageIcon, ListChecks,
  Loader2, MessageSquare, Mic, MicOff, MoreHorizontal, Paperclip, Pause, Play, Plus, RefreshCw, RotateCcw,
  Send, Sparkles, Square, Trash2, X,
} from "lucide-react";
import { EchoAvatar } from "../../components/mentor/EchoAvatar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import CropDialog from "../../components/mentor/CropDialog";
import ImagePreviewPanel, { type PendingImage } from "../../components/mentor/ImagePreviewPanel";
import ExamIntakePopup, { type ExamIntakeValue } from "../../components/mentor/ExamIntakePopup";
import { ChatMessage, TypingDots, type MessageFeedback } from "../../components/mentor/ChatMessage";
import { cn } from "../../lib/utils";
import { SEO } from "../../components/SEO";
import {
  buildMentorContext, createMentorThread, deleteMentorThread, getMentorMessages,
  listMentorThreads, sendMentorMessage,
  type MentorChatMessage, type MentorContext, type MentorImageData, type MentorThread, type PlannerChange,
} from "../../services/mentor";
import {
  applyMentorPlannerChange, undoMentorPlannerChange,
  type PlannerSnapshot,
} from "../../services/plannerMentor";
import { db } from "../../services/db";
import type { PlanTask } from "../../lib/types";
import {
  clearSessionImages, compressImage, fileToDataUrl, getSessionImage, imageMarkersIn,
  newImageId, placeholderImageMarkers, storeSessionImage, validateImageFile,
} from "../../lib/imageUtils";
import { generateCoachingPlan } from "../../services/planner/coachingPlanner";
import { todayISODate } from "../../lib/constants";

const SUGGESTED_PROMPTS = [
  "Plan today's strategy",
  "Can I finish my syllabus?",
  "What should I revise today?",
  "Which chapter should I study next?",
  "How do I improve my marks?",
  "Clear my backlog",
];

// Local fallback for exam intent when LLM didn't propose a plan change
// (e.g., "Echo I have my half yearly exam of cs on tuesday" → create CS revision plan)
function buildLocalExamFallback(userText: string): PlannerChange | null {
  const lower = userText.toLowerCase();
  // Must contain exam/test and a weekday or "tomorrow"
  if (!/(exam|test|paper|half yearly|half-yearly|mid term|midterm)/.test(lower)) return null;
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let targetWeekday: string | null = null;
  for (const w of weekdays) if (lower.includes(w)) { targetWeekday = w; break; }
  const isTomorrow = lower.includes("tomorrow");
  if (!targetWeekday && !isTomorrow) return null;

  // Subject extraction — look for common subjects
  let subject: string | null = null;
  if (/\bcs\b|computer science|computer\b/.test(lower)) subject = "Computer Science";
  else if (lower.includes("physics")) subject = "Physics";
  else if (lower.includes("chemistry")) subject = "Chemistry";
  else if (lower.includes("maths") || lower.includes("mathematics")) subject = "Mathematics";
  else if (lower.includes("biology")) subject = "Biology";
  else if (lower.includes("english")) subject = "English";
  else if (lower.includes("economics")) subject = "Economics";
  else subject = "CS"; // default from user's example

  const today = new Date();
  let examDate: Date;
  if (isTomorrow) {
    examDate = new Date(today);
    examDate.setDate(today.getDate() + 1);
  } else if (targetWeekday) {
    const targetIdx = weekdays.indexOf(targetWeekday);
    const todayIdx = today.getDay();
    let diff = targetIdx - todayIdx;
    if (diff <= 0) diff += 7; // next occurrence, not today
    examDate = new Date(today);
    examDate.setDate(today.getDate() + diff);
  } else {
    return null;
  }
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const examISO = toISO(examDate);
  const dayBefore = new Date(examDate);
  dayBefore.setDate(examDate.getDate() - 1);
  const beforeISO = toISO(dayBefore);

  const isHalfYearly = /half yearly|half-yearly|mid term|midterm/.test(lower);
  const examLabel = isHalfYearly ? "Half Yearly" : "Exam";
  const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Regenerate the whole day (auto-apply) — user asked for full-day regenerate
  // Day before exam: intensive, exam_tomorrow:true, high energy
  // Exam day: light (2h) so planner shows exam focus
  return {
    id,
    reason: lower.slice(0, 80),
    changes: [
      {
        op: "regenerate_plan" as const,
        date: beforeISO,
        exam_tomorrow: true,
        study_hours: 6,
        energy_level: "high" as const,
      },
      {
        op: "regenerate_plan" as const,
        date: examISO,
        exam_tomorrow: false,
        study_hours: 2,
        energy_level: "high" as const,
      },
      // Guarantee CS appears even if regenerate doesn't prioritize it — high-priority revision task
      {
        op: "add_task" as const,
        title: `${subject} ${examLabel} — Intensive Revision`,
        subject,
        task_type: "revision" as const,
        date: beforeISO,
        estimated_minutes: 60,
        priority: "high" as const,
      },
    ],
    // Attach computed dates for direct-DB fallback use
    _beforeISO: beforeISO,
    _examISO: examISO,
    _subject: subject,
    _examLabel: examLabel,
  } as PlannerChange & { _beforeISO: string; _examISO: string; _subject: string; _examLabel: string };
}

async function applyExamFallbackDirect(fallback: PlannerChange & { _beforeISO: string; _examISO: string; _subject: string; _examLabel: string }): Promise<boolean> {
  const beforeISO = fallback._beforeISO;
  const subject = fallback._subject;
  const examLabel = fallback._examLabel;
  try {
    // Directly save daily inputs for day before (exam_tomorrow:true) — always visible in Planner header
    await db.saveDailyPlanInputs({
      plan_date: beforeISO,
      was_school_day: false,
      study_hours: 6,
      energy_level: "high",
      exam_tomorrow: true,
    });
    // Directly insert CS task — bypass capacity/planner checks so it ALWAYS appears
    const title = `${subject} ${examLabel} — Intensive Revision`;
    // Avoid duplicate if already exists from previous attempt
    const existing = await db.getTasksForDate(beforeISO).catch(() => [] as PlanTask[]);
    const already = existing.some((t) => t.title.toLowerCase() === title.toLowerCase());
    if (!already) {
      await db.insertTasks([
        {
          title,
          subject,
          type: "revision",
          chapter: null,
          estimated_minutes: 60,
          priority: "high",
          completed: false,
          scheduled_date: beforeISO,
          start_time: null,
          end_time: null,
          source: "ai_mentor",
          tracker_ref: null,
          completion_pct: 0,
          task_status: "pending",
          missed_count: 0,
          reschedule_reason: null,
          actual_minutes: null,
          priority_score: 0,
        } as unknown as PlanTask,
      ] as PlanTask[]);
    }
    return true;
  } catch (e) {
    console.error("[mentor] direct exam fallback failed", e);
    return false;
  }
}

// ── Local fallback for lecture/chapter swap ──
// Handles "I want to do X instead of Y", "replace Y with X", "switch from Y to X" etc.
// This runs client-side when the LLM's planner decision fails or is slow, so the plan actually updates.
function cleanChapterName(raw: string): string {
  let s = raw.trim();
  // cut at trailing filler like " for today", " today", " tomorrow", " please", " bro", " sir", punctuation
  s = s.split(/\s+(?:for|in|on|at)\s+(?:today|tomorrow)\b/i)[0].trim();
  s = s.split(/[.,!?;]/)[0].trim();
  s = s.replace(/^(?:the|a|an|my|this|that)\s+/i, "").trim();
  // strip trailing today/tomorrow even without preposition
  s = s.replace(/\s+(today|tomorrow)\b/gi, " ").trim();
  // strip trailing lecture/chapter/topic/subject words
  s = s.replace(/\s+(?:lecture|lectures|chapter|chapters|topic|topics|subject)\b/gi, " ").trim();
  s = s.replace(/\s+(?:lec|ch)\b/gi, " ").trim();
  s = s.replace(/\b(?:bro|please|sir|yaar|bhai|echo)\b/gi, " ").trim();
  s = s.replace(/\s+/g, " ").trim();
  // Remove subject prefix like "Mathematics — " if present (we extract subject separately)
  s = s.replace(/^(?:physics|chemistry|mathematics|maths|biology|computer science|computer|cs|economics|english|accounts|business studies|geography)\s*[-—:]\s*/i, "").trim();
  // Also strip subject word stuck at start when user said "Mathematics Sequence and Series" without dash
  const subjectAtStart = s.match(/^(physics|chemistry|mathematics|maths|biology|computer science|computer|cs|economics|english)\s+(.+)$/i);
  if (subjectAtStart && subjectAtStart[2].trim().split(/\s+/).length >= 1) {
    s = subjectAtStart[2].trim();
  }
  return s.trim();
}

function detectSubjectInText(lower: string): string | null {
  if (/\bcomputer science\b|\bcs\b/.test(lower)) return "Computer Science";
  if (lower.includes("physics")) return "Physics";
  if (lower.includes("chemistry")) return "Chemistry";
  if (lower.includes("mathematics") || /\bmaths\b/.test(lower)) return "Mathematics";
  if (lower.includes("biology")) return "Biology";
  if (lower.includes("economics")) return "Economics";
  if (lower.includes("english")) return "English";
  if (lower.includes("geography")) return "Geography";
  return null;
}

function buildLocalLectureSwapFallback(userText: string): (PlannerChange & { _oldTitle: string; _newTitle: string; _subjectHint: string | null; _date: string }) | null {
  const lower = userText.toLowerCase();
  // Must look like a swap intent
  const hasSwapKeyword = /instead of|rather than|replace\s+.+\s+with|switch\s+(?:from\s+)?.+\s+to\s+|change\s+.+\s+to\s+/.test(lower);
  if (!hasSwapKeyword) return null;
  // Exclude exam-driven swaps (handled by exam fallback + popup) — broad: exam keyword + weekday/tomorrow anywhere
  if (/(exam|test|paper|half yearly|half-yearly|mid term|midterm)/.test(lower) && /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)/.test(lower)) return null;

  let oldRaw: string | null = null;
  let newRaw: string | null = null;

  // Pattern 1: X instead of Y / X rather than Y  (new = X, old = Y)
  const insteadKeyword = lower.includes("instead of") ? "instead of" : lower.includes("rather than") ? "rather than" : null;
  if (insteadKeyword) {
    const idx = lower.indexOf(insteadKeyword);
    const left = userText.slice(0, idx).trim();
    const right = userText.slice(idx + insteadKeyword.length).trim();
    // Extract new from left: take after last "do", "study", "cover", "learn", "revise", "complete", "want to do" etc
    let newCandidate = left;
    const doMatch = left.match(/.*\bdo\s+(.+)$/i);
    if (doMatch && doMatch[1].trim().length >= 2) newCandidate = doMatch[1];
    else {
      const studyMatch = left.match(/.*\b(?:study|cover|learn|revise|complete|want to do|wanna do|switch to|change to)\s+(.+)$/i);
      if (studyMatch && studyMatch[1].trim().length >= 2) newCandidate = studyMatch[1];
      else {
        // Fallback: take last 4-5 tokens of left (heuristic for "Sequence and Series lecture")
        const tokens = left.trim().split(/\s+/);
        const slice = tokens.slice(-5).join(" ");
        // If slice contains "do", strip
        newCandidate = slice;
      }
    }
    let oldCandidate = right;
    // Old: take first clause before filler
    oldCandidate = oldCandidate.split(/\s+(?:for|in|on|at)\s+(?:today|tomorrow)\b/i)[0];
    oldCandidate = oldCandidate.split(/[.,!?;]/)[0];
    newRaw = cleanChapterName(newCandidate);
    oldRaw = cleanChapterName(oldCandidate);
  } else if (/replace\s+.+\s+with\s+.+/i.test(lower)) {
    // Pattern 2: replace Y with X  (old = Y, new = X)
    const m = userText.match(/replace\s+(.+?)\s+with\s+(.+)/i);
    if (m) {
      oldRaw = cleanChapterName(m[1]);
      newRaw = cleanChapterName(m[2]);
    }
  } else if (/(?:switch|change)\s+(?:from\s+)?.+\s+to\s+.+/i.test(lower)) {
    // Pattern 3: switch/change (from) Y to X — try greedy 'from' first to handle "switch todays Math lecture from Kinematics to ..."
    let m: RegExpMatchArray | null = null;
    // First try to capture after the last 'from' (most specific for lecture swap)
    m = userText.match(/(?:switch|change).*?\bfrom\s+(.+?)\s+to\s+(.+)/i);
    if (!m) m = userText.match(/(?:switch|change)\s+(.+?)\s+to\s+(.+)/i);
    if (m) {
      oldRaw = cleanChapterName(m[1]);
      newRaw = cleanChapterName(m[2]);
      // Need to clean oldRaw from potential prefix like "today's Mathematics lecture"
      oldRaw = oldRaw.replace(/.*\b(?:lecture|chapter|topic)\s+(?:from\s+)?/i, () => "").trim() || oldRaw;
      // Remove leading junk like "today's Mathematics lecture from"
      oldRaw = oldRaw.replace(/^(?:today'?s?|todays?|mathematics|physics|chemistry|biology)\s+/i, "").trim() || oldRaw;
      // But simpler: if oldRaw still contains lecture words we already stripped
    }
  }

  if (!oldRaw || !newRaw) return null;
  // Validate lengths
  if (oldRaw.length < 2 || newRaw.length < 2 || oldRaw.length > 80 || newRaw.length > 80) return null;
  if (oldRaw.toLowerCase() === newRaw.toLowerCase()) return null;
  // Must not be generic words
  const generic = new Set(["lecture","chapter","topic","subject","today","tomorrow","plan","study"]);
  if (generic.has(oldRaw.toLowerCase()) || generic.has(newRaw.toLowerCase())) return null;
  // Require at least one not being a common filler to avoid false positives like "do this instead of that"
  if (oldRaw.split(/\s+/).length > 6 || newRaw.split(/\s+/).length > 6) {
    // Trim to first 4 words for overly long
    oldRaw = oldRaw.split(/\s+/).slice(0, 4).join(" ");
    newRaw = newRaw.split(/\s+/).slice(0, 4).join(" ");
  }

  const todayISO = todayISODate();
  // Subject hint: prefer subject mentioned near the NEW chapter (left side for instead-of, second group for replace/switch)
  let subjectHint: string | null = null;
  if (insteadKeyword) {
    const leftLower = userText.slice(0, lower.indexOf(insteadKeyword)).toLowerCase();
    subjectHint = detectSubjectInText(leftLower) || detectSubjectInText(lower);
  } else {
    let newGroupRaw: string | null = null;
    const repl = userText.match(/replace\s+(.+?)\s+with\s+(.+)/i);
    if (repl) newGroupRaw = repl[2];
    else {
      const sw = userText.match(/(?:switch|change).*?\bfrom\s+(.+?)\s+to\s+(.+)/i) || userText.match(/(?:switch|change)\s+(.+?)\s+to\s+(.+)/i);
      if (sw) newGroupRaw = sw[2];
    }
    if (newGroupRaw) subjectHint = detectSubjectInText(newGroupRaw.toLowerCase()) || detectSubjectInText(lower);
    else subjectHint = detectSubjectInText(lower);
  }
  // Build a minimal PlannerChange that plannerMentor can execute (remove then add)
  const id = `local-swap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newTitle = subjectHint ? `Lecture: ${subjectHint} — ${newRaw}` : `Lecture: ${newRaw}`;
  const changes: PlannerChange["changes"] = [
    { op: "remove_task" as const, task_title: oldRaw, date: todayISO },
    { op: "add_task" as const, title: newTitle, subject: subjectHint ?? undefined, chapter: newRaw, task_type: "lecture" as const, date: todayISO, estimated_minutes: 60, priority: "high" as const },
  ];
  return {
    id,
    reason: userText.slice(0, 80),
    changes,
    _oldTitle: oldRaw,
    _newTitle: newRaw,
    _subjectHint: subjectHint,
    _date: todayISO,
  } as PlannerChange & { _oldTitle: string; _newTitle: string; _subjectHint: string | null; _date: string };
}

async function applyLectureSwapDirect(fallback: PlannerChange & { _oldTitle: string; _newTitle: string; _subjectHint: string | null; _date: string }): Promise<boolean> {
  const date = fallback._date;
  const oldTitle = fallback._oldTitle;
  const newTitleRaw = fallback._newTitle;
  const subjectHint = fallback._subjectHint;
  try {
    const tasks = await db.getTasksForDate(date).catch(() => [] as PlanTask[]);
    const q = oldTitle.trim().toLowerCase();
    const matches = tasks.filter(
      (t) =>
        (t.task_status ?? (t.completed ? "completed" : "pending")) !== "completed" &&
        t.task_status !== "cancelled" &&
        t.title.toLowerCase().includes(q)
    );
    // Remove matching tasks (never coaching which is usually type coaching)
    const removable = matches.filter((t) => t.source !== "coaching" && t.type !== "coaching");
    const toDelete = removable.length > 0 ? removable : matches;
    // If multiple matches (>3) we treat as too ambiguous and do not delete; instead just add new
    if (toDelete.length > 0 && toDelete.length <= 3) {
      for (const t of toDelete) {
        try { await db.deleteTask(t.id); } catch (e) { console.warn("[mentor] lecture swap delete failed", e); }
      }
    } else if (toDelete.length > 3) {
      console.warn("[mentor] lecture swap too many matches for", oldTitle, toDelete.length);
    }
    // Infer subject for new task
    let subject: string | null = subjectHint;
    if (!subject && toDelete.length > 0 && toDelete[0].subject) subject = toDelete[0].subject;
    // Build title
    const title = subject ? `Lecture: ${subject} — ${newTitleRaw}` : `Lecture: ${newTitleRaw}`;
    // Avoid duplicate new task
    const afterTasks = await db.getTasksForDate(date).catch(() => [] as PlanTask[]);
    const already = afterTasks.some((t) => t.title.toLowerCase() === title.toLowerCase() || t.title.toLowerCase().includes(newTitleRaw.toLowerCase()));
    if (already) return true;
    const sourceTask = toDelete[0] as PlanTask | undefined;
    const minutes = sourceTask?.estimated_minutes ?? 60;
    await db.insertTasks([
      {
        title,
        subject: subject ?? null,
        type: "lecture",
        chapter: newTitleRaw,
        estimated_minutes: minutes,
        priority: "high",
        completed: false,
        scheduled_date: date,
        start_time: null,
        end_time: null,
        source: "ai_mentor",
        tracker_ref: null,
        completion_pct: 0,
        task_status: "pending",
        missed_count: 0,
        reschedule_reason: null,
        actual_minutes: null,
        priority_score: 0,
      } as unknown as PlanTask,
    ] as PlanTask[]);
    return true;
  } catch (e) {
    console.error("[mentor] direct lecture swap failed", e);
    return false;
  }
}

// ── Local intent detection for "create today's plan" — immediate, no LLM needed ──
// Relaxed: bare "todays plan", "today plan", "aaj ka plan" now triggers even without a verb.
// User report: "create todays plan" showed nothing for 5s on studyshield.study — was verb+plan but profile-null blocked bubble.
function isTodayPlanRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Exam flow already handles weekday + exam — exclude it so it doesn't hijack generic plan
  if (/(exam|test|paper|half yearly|half-yearly|mid term|midterm)/.test(lower) && /(on|for|at)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)/i.test(lower)) return false;
  // Bare plan phrases (no verb needed) — catches "todays plan", "today's plan", "aaj ka plan", "plan for today"
  if (/(today'?s?\s*plan|aaj\s*ka\s*plan|kal\s*ka\s*plan|plan\s*for\s*today|study\s*plan(\s*for\s*today)?)/i.test(lower)) return true;
  // Verb + plan anywhere
  if (/(create|generate|make|build|banao|de\s*do|create\s*kar|generate\s*kar|bana\s*do|need|chahiye).{0,30}(plan)/i.test(lower)) return true;
  // "today.*plan" generic
  if (/today.{0,15}plan/i.test(lower)) return true;
  return false;
}

async function generateTodayPlanDirect(profile: import("../../lib/types").Profile | null, todayISO: string): Promise<{ ok: boolean; taskCount: number; hours: number; error?: string }> {
  // If profile is still loading (common on studyshield.study cold start 5s), try to fetch it once instead of failing with "Profile not loaded" and no bubble
  let effectiveProfile = profile;
  if (!effectiveProfile?.id) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const fetched = await db.getProfile(user.id).catch(() => null);
        if (fetched?.id) effectiveProfile = fetched as import("../../lib/types").Profile;
      }
    } catch {}
    if (!effectiveProfile?.id) return { ok: false, taskCount: 0, hours: 0, error: "Profile not loaded — please wait a second and try again" };
  }
  const studyHours = profile.daily_goal_hours ?? 6;
  try {
    const result = await generateCoachingPlan({
      profile,
      studyHours,
      energyLevel: "normal",
      wasSchoolDay: false,
      examTomorrow: false,
      date: todayISO,
    });
    if (!result.tasks || result.tasks.length === 0) return { ok: false, taskCount: 0, hours: studyHours, error: "Planner returned 0 tasks" };
    await db.deleteTasksForDate(todayISO);
    await db.insertTasks(result.tasks);
    await db.saveDailyPlanInputs({ plan_date: todayISO, was_school_day: false, study_hours: studyHours, energy_level: "normal", exam_tomorrow: false });
    try {
      const bump = await db.bumpStreakForPlanGeneration(todayISO);
      if (!bump.alreadyBumped) {
        try { window.dispatchEvent(new CustomEvent("studyshield:streak-updated", { detail: bump.newStreak })); } catch {}
      }
    } catch {}
    return { ok: true, taskCount: result.tasks.length, hours: studyHours };
  } catch (e) {
    console.error("[mentor] generateTodayPlanDirect failed", e);
    return { ok: false, taskCount: 0, hours: studyHours, error: (e as Error)?.message ?? String(e) };
  }
}

const STAGES_IMAGE = ["Analyzing your image…", "Reading the question…", "Solving step by step…", "Writing your answer…"];
const STAGES_TEXT = ["Echo is thinking…", "Writing your answer…"];

const VISIBLE_MESSAGES = 80;
const COMPOSER_MAX_HEIGHT = 144;

// ── Global pending Echo sends — survives SPA navigation (module persists across routes)
// When user sends and navigates away, the fetch keeps running (keepalive) and the
// new Mentor mount can re-attach to the same promise instead of losing the reply.
type PendingSend = { promise: Promise<import("../../services/mentor").MentorReplyResult>; content: string; threadId: string; stageList: string[]; createdAt: number };
const pendingEchoSends = new Map<string, PendingSend>();
function setPendingSend(threadId: string, data: PendingSend) {
  pendingEchoSends.set(threadId, data);
  try { sessionStorage.setItem(`mentor:pending:${threadId}`, JSON.stringify({ createdAt: data.createdAt, content: data.content })); } catch {}
}
function clearPendingSend(threadId: string) {
  pendingEchoSends.delete(threadId);
  try { sessionStorage.removeItem(`mentor:pending:${threadId}`); } catch {}
}
function getPendingSend(threadId: string): PendingSend | null {
  return pendingEchoSends.get(threadId) ?? null;
}

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isSecureContextSafe(): boolean {
  if (typeof window !== "undefined" && typeof window.isSecureContext === "boolean") return window.isSecureContext;
  if (typeof location !== "undefined") return location.protocol === "https:";
  return true;
}

function getSecureHost(): string {
  try { return location.host || "this site"; } catch { return "this site"; }
}

function collectImages(msgs: MentorChatMessage[]): Record<string, MentorImageData> {
  const out: Record<string, MentorImageData> = {};
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role !== "user") continue;
    let found = false;
    for (const id of imageMarkersIn(m.content)) {
      if (out[id]) continue;
      const entry = getSessionImage(id);
      if (entry) {
        out[id] = { dataUrl: entry.dataUrl, alt: entry.alt };
        found = true;
      }
    }
    if (found) break;
  }
  return out;
}

function formatShareDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function Mentor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<MentorThread[]>([]);
  const [activeThread, setActiveThread] = useState<MentorThread | null>(null);
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [context, setContext] = useState<MentorContext | null>(null);
  const [input, setInput] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showSetupNotice, setShowSetupNotice] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string>("");
  const [error, setError] = useState<{ message: string; retryable: boolean; kind: string } | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [stageList, setStageList] = useState<string[]>([]);
  const [stageIdx, setStageIdx] = useState(0);

  const [moreOpen, setMoreOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_MESSAGES);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, MessageFeedback>>({});
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [micListening, setMicListening] = useState(false);
  const [micPaused, setMicPaused] = useState(false);
  const [micElapsed, setMicElapsed] = useState(0);
  const [micSupported] = useState(() => !!getSpeechRecognition());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [examPopupInfo, setExamPopupInfo] = useState<{ subject: string; examLabel: string; examISO: string; beforeISO: string; beforeLabel: string; reason: string } | null>(null);
  const [examPopupBusy, setExamPopupBusy] = useState(false);

  const [plannerEnabled, setPlannerEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("mentor:planner_enabled") !== "0"; } catch { return true; }
  });
  const [planChange, setPlanChange] = useState<{
    change: PlannerChange; snapshot: PlannerSnapshot; summary: string[]; errors: string[];
  } | null>(null);
  const [planBusy, setPlanBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const micBaseTextRef = useRef("");
  const micFinalTextRef = useRef("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraOpeningRef = useRef(false);
  const cameraRafRef = useRef<number | null>(null);
  const cameraAbortRef = useRef<{ cancelled: boolean } | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraCapturing, setCameraCapturing] = useState(false);

  const activeThreadRef = useRef(activeThread);
  useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const timesRef = useRef(times);
  useEffect(() => { timesRef.current = times; }, [times]);
  const speakingIdxRef = useRef(speakingIdx);
  useEffect(() => { speakingIdxRef.current = speakingIdx; }, [speakingIdx]);
  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);
  const nearBottomRef = useRef(true);
  const forceJumpRef = useRef(false);

  const micTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micListeningRef = useRef(micListening);
  const micPausedRef = useRef(micPaused);
  const sendingRef = useRef(sending);
  const streamingRef = useRef(streaming);
  const autoSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSilenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micPollRafRef = useRef<number | null>(null);
  const micRestartCountRef = useRef(0);

  useEffect(() => { micListeningRef.current = micListening; }, [micListening]);
  useEffect(() => { micPausedRef.current = micPaused; }, [micPaused]);
  useEffect(() => { sendingRef.current = sending; }, [sending]);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  const stopReveal = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Central mic audio cleanup — stops waveform stream, AudioContext, analyser, polling, level
  const cleanupMicAudio = useCallback(() => {
    if (micPollRafRef.current) {
      cancelAnimationFrame(micPollRafRef.current);
      micPollRafRef.current = null;
    }
    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect(); } catch { /* ignore */ }
      micSourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch { /* ignore */ }
      analyserRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      // close is async, ignore result
      try { void ctx.close(); } catch { /* ignore */ }
    }
    setMicLevel(0);
  }, []);

  // Mic elapsed timer — ticks only while actively listening (not paused), with drift correction
  useEffect(() => {
    if (micListening && !micPaused) {
      if (micTimerRef.current) {
        clearInterval(micTimerRef.current);
        micTimerRef.current = null;
      }
      const startAt = Date.now() - micElapsed * 1000;
      micTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startAt) / 1000);
        setMicElapsed(elapsed);
      }, 1000);
      return () => {
        if (micTimerRef.current) {
          clearInterval(micTimerRef.current);
          micTimerRef.current = null;
        }
      };
    }
    if (micTimerRef.current) {
      clearInterval(micTimerRef.current);
      micTimerRef.current = null;
    }
  }, [micListening, micPaused]);

  useEffect(() => {
    if (!micListening) {
      setMicElapsed(0);
      micRestartCountRef.current = 0;
    }
  }, [micListening]);

  useEffect(() => () => {
    stopReveal();
    if (micTimerRef.current) {
      clearInterval(micTimerRef.current);
      micTimerRef.current = null;
    }
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    if (voiceSilenceRef.current) {
      clearTimeout(voiceSilenceRef.current);
      voiceSilenceRef.current = null;
    }
    if (micPollRafRef.current) {
      cancelAnimationFrame(micPollRafRef.current);
      micPollRafRef.current = null;
    }
    if (cameraRafRef.current) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    clearSessionImages();
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    recognitionRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    // Camera
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch { /* ignore */ }
      videoRef.current.srcObject = null;
    }
    cleanupMicAudio();
  }, [stopReveal, cleanupMicAudio]);

  useEffect(() => {
    if (!sending || stageList.length === 0) return;
    const timer = setInterval(() => setStageIdx((i) => (i + 1) % stageList.length), 1400);
    return () => clearInterval(timer);
  }, [sending, stageList.length]);

  // Watchdog: if sending hangs (LLM timeout, network stall, missed clearPendingSend), force a visible error with retry
  // Increased from 7s to 25s to match client 25s timeout — previous 7s was too aggressive and showed timeout before LLM could answer
  useEffect(() => {
    if (!sending) return;
    const watchdog = window.setTimeout(() => {
      if (!sendingRef.current) return;
      console.warn("[mentor] watchdog: sending stuck >25s, forcing error with retry");
      setError({ message: "Echo is taking too long — please tap Retry. If you asked to create today's plan, it may already be saved; check the Planner.", retryable: true, kind: "timeout" });
      setSending(false);
      setStreaming(false);
      stopReveal();
      // Ensure scroll shows the error banner
      window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    }, 25000);
    return () => window.clearTimeout(watchdog);
  }, [sending, stopReveal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (examPopupInfo) {
        setExamPopupInfo(null);
        return;
      }
      if (confirmDeleteId) {
        setConfirmDeleteId(null);
        return;
      }
      setMoreOpen(false);
      if (lightbox) setLightbox(null);
      if (cropOpen) setCropOpen(false);
      if (cameraOpen) closeCamera();
      if (micListeningRef.current) {
        pauseRequestedRef.current = false;
        manualStopRef.current = true;
        try { recognitionRef.current?.abort(); } catch { /* ignore */ }
        cleanupMicAudio();
        if (autoSendTimeoutRef.current) {
          clearTimeout(autoSendTimeoutRef.current);
          autoSendTimeoutRef.current = null;
        }
        setMicListening(false);
        setMicPaused(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, cropOpen, cameraOpen, examPopupInfo, confirmDeleteId, cleanupMicAudio]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = Array.from(items)
        .filter((it) => it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (imageFiles.length === 0) return;
      e.preventDefault();
      handleFile(imageFiles[0]);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (sending || streaming) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (forceJumpRef.current) {
      forceJumpRef.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (nearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending, streaming]);

  const nowLabel = () => new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: profile?.time_format !== "24h",
  });

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }

  async function handleFile(file: File) {
    if (sending || preparing) return;
    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingImage({ id: newImageId(), dataUrl, fileName: file.name || "captured-photo.jpg" });
    } catch {
      toast.error("Couldn't read that image. Please try another file.");
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset value so the same file can be selected again
    e.target.value = "";
    if (file) void handleFile(file);
  }

  // ── Camera (getUserMedia + fallback to file input) ──────────────────
  const closeCamera = useCallback(() => {
    if (cameraRafRef.current) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    if (cameraAbortRef.current) cameraAbortRef.current.cancelled = true;
    cameraOpeningRef.current = false;
    setCameraOpen(false);
    setCameraError(null);
    setCameraReady(false);
    setCameraCapturing(false);
    const v = videoRef.current;
    if (v) {
      try { v.pause(); } catch { /* ignore */ }
      // Remove listeners
      v.onloadedmetadata = null;
      v.onerror = null;
      v.oncanplay = null;
      try { v.srcObject = null; } catch { /* ignore */ }
      v.removeAttribute("src");
      try { v.load(); } catch { /* ignore */ }
    }
    const s = cameraStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => {
        try { t.stop(); } catch { /* ignore */ }
      });
      cameraStreamRef.current = null;
    }
  }, []);

  const openCamera = useCallback(async () => {
    if (sending || preparing) return;
    if (cameraOpeningRef.current || cameraOpen) return;
    if (!isSecureContextSafe()) {
      toast.error(`Camera needs HTTPS. Please open ${getSecureHost()} over https://`);
      cameraInputRef.current?.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    cameraOpeningRef.current = true;
    cameraAbortRef.current = { cancelled: false };
    const abortState = cameraAbortRef.current;
    setCameraError(null);
    setCameraReady(false);
    setCameraOpen(true);

    // Fallback chain for constraints
    const constraintsList: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" } as unknown as string, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: "environment" as unknown as string }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    let lastErr: unknown = null;
    for (const c of constraintsList) {
      if (abortState.cancelled) break;
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        break;
      } catch (err) {
        lastErr = err;
        const name = (err as { name?: string })?.name ?? "";
        // Only retry on constraint/not-found errors, otherwise break
        if (name === "OverconstrainedError" || name === "NotFoundError") continue;
        break;
      }
    }

    if (abortState.cancelled) {
      if (stream) stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
      cameraOpeningRef.current = false;
      return;
    }

    if (!stream) {
      cameraOpeningRef.current = false;
      const e = lastErr as Error & { name?: string; message?: string };
      const name = e?.name ?? "";
      const msg = e?.message ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings and try again. You can also use Upload instead.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("No camera found on this device. Use Upload to pick an image.");
      } else if (name === "NotReadableError") {
        setCameraError("Camera is in use by another app. Close it and try again, or use Upload.");
      } else if (name === "SecurityError") {
        setCameraError(`Camera blocked — check browser Permissions-Policy and that ${getSecureHost()} is served over HTTPS. You can use Upload instead.`);
      } else if (name === "AbortError") {
        setCameraError("Camera was interrupted. Try again or use Upload.");
      } else if (!msg) {
        setCameraError("Could not open camera. Try Upload instead. (Unknown error)");
      } else {
        setCameraError(msg || "Could not open camera. Try Upload instead.");
      }
      return;
    }

    cameraStreamRef.current = stream;
    cameraOpeningRef.current = false;

    // Wait for modal/video to mount — retry a few frames for framer-motion
    let attempts = 0;
    const attach = () => {
      if (abortState.cancelled) {
        stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
        return;
      }
      const v = videoRef.current;
      if (!v) {
        if (attempts < 10) {
          attempts++;
          cameraRafRef.current = requestAnimationFrame(attach);
        } else {
          setCameraError("Camera preview failed to load. Try Upload instead.");
          stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
          cameraStreamRef.current = null;
        }
        return;
      }
      // Attach handlers BEFORE srcObject to avoid missed loadedmetadata
      const onReady = () => {
        if (abortState.cancelled) return;
        // iOS needs canplay/playing; use a small timeout to ensure dimensions
        const tryPlay = () => {
          const p = v.play();
          if (p && typeof p.then === "function") {
            p.then(() => {
              if (!abortState.cancelled) setCameraReady(true);
            }).catch((err) => {
              // NotAllowedError if not muted/autoplay blocked, but we are muted+playsInline
              console.warn("[camera] play() failed", err);
              if (!abortState.cancelled) {
                // Still mark ready if dimensions exist, otherwise show error
                if (v.videoWidth && v.videoHeight) setCameraReady(true);
                else setCameraError("Camera started but preview failed. Try capturing anyway or use Upload.");
              }
            });
          } else {
            setCameraReady(true);
          }
        };
        // Wait a tick for dimensions
        setTimeout(tryPlay, 50);
      };
      const onError = () => {
        setCameraError("Camera preview error. Try Upload instead.");
      };
      v.onloadedmetadata = onReady;
      v.oncanplay = onReady;
      v.onerror = onError as unknown as () => void;
      try {
        v.srcObject = stream;
      } catch (err) {
        console.error("[camera] srcObject failed", err);
        // Fallback to object URL for old Safari
        try {
          const url = URL.createObjectURL(stream as unknown as Blob);
          (v as unknown as { src: string }).src = url;
          setTimeout(onReady, 100);
        } catch {
          setCameraError("Camera preview not supported in this browser. Use Upload.");
        }
      }
      // If already have metadata (cached), trigger manually
      if (v.readyState >= 1) setTimeout(onReady, 0);
    };
    cameraRafRef.current = requestAnimationFrame(attach);
  }, [sending, preparing, cameraOpen, toast]);

  const captureFromCamera = useCallback(async () => {
    if (cameraCapturing) return;
    const v = videoRef.current;
    if (!v || !cameraReady) {
      toast.error("Camera not ready yet. Please wait a moment.");
      return;
    }
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) {
      toast.error("Camera frame not ready. Try again or use Upload.");
      return;
    }
    setCameraCapturing(true);
    try {
      // Clamp to 1600 max dim like compressImage to avoid OOM
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d", { alpha: false } as unknown as CanvasRenderingContext2DSettings);
      if (!ctx) {
        toast.error("Could not capture image. Try Upload instead.");
        return;
      }
      try {
        ctx.drawImage(v, 0, 0, cw, ch);
      } catch (err) {
        console.error("[camera] drawImage failed", err);
        toast.error("Capture failed. Try Upload instead.");
        return;
      }
      let dataUrl: string;
      try {
        // Prefer webp if supported, fallback to jpeg
        try {
          dataUrl = canvas.toDataURL("image/webp", 0.92);
          if (!dataUrl.startsWith("data:image/webp")) throw new Error("webp not supported");
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        }
      } catch (err) {
        console.error("[camera] toDataURL failed", err);
        toast.error("Could not encode image (maybe too large). Try Upload.");
        return;
      }
      // Validate size roughly (base64 ~ 1.37x binary)
      const approxBytes = Math.round((dataUrl.length * 3) / 4);
      if (approxBytes > 10 * 1024 * 1024) {
        toast.error("Captured image is too large. Try again with lower resolution or use Upload with a compressed image.");
        return;
      }
      closeCamera();
      setPendingImage({ id: newImageId(), dataUrl, fileName: "camera-capture.jpg" });
      toast.success("Photo captured — you can crop or send it");
    } finally {
      setCameraCapturing(false);
    }
  }, [cameraReady, cameraCapturing, closeCamera, toast]);

  async function loadContext() {
    try {
      const ctx = await buildMentorContext(profile?.id ?? "", profile);
      setContext(ctx);
    } catch (e) {
      console.error("[mentor] loadContext failed", e);
      // Build minimal fallback so Echo still opens (offline mode), never stuck
      try {
        const fallback = await buildMentorContext(profile?.id ?? "", profile).catch(() => null);
        if (fallback) setContext(fallback);
      } catch { /* ignore second failure */ }
    }
  }

  async function loadThreads(selectLatest = true) {
    try {
      const list = await listMentorThreads();
      setThreads(list);
      if (selectLatest) {
        if (list.length > 0) {
          setActiveThread(list[0]);
          try {
            const msgs = await getMentorMessages(list[0].id);
            setMessages(msgs);
          } catch (e) {
            console.error("[mentor] getMentorMessages failed", e);
            setMessages([]);
          }
          setTimes([]);
        } else {
          setActiveThread(null);
          setMessages([]);
          setTimes([]);
        }
      }
    } catch (e) {
      console.error("[mentor] loadThreads failed", e);
      setThreads([]);
      setActiveThread(null);
      setMessages([]);
      setTimes([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    // Hard 10s cap — mirrors AuthContext PROFILE_LOAD_TIMEOUT_MS.
    // On flaky mobile networks Supabase REST can hang indefinitely with
    // no rejection; without this the spinner never clears.
    const hardTimeout = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("[mentor] initial load timed out after 10s — forcing Echo to open");
        setLoadingData(false);
      }
    }, 10000);
    (async () => {
      setLoadingData(true);
      try {
        await Promise.all([loadContext(), loadThreads(true)]);
      } catch (e) {
        console.error("[mentor] initial load threw", e);
      } finally {
        window.clearTimeout(hardTimeout);
        if (!cancelled) {
          setVisibleCount(VISIBLE_MESSAGES);
          forceJumpRef.current = true;
          setLoadingData(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) console.warn("[mentor] profile context refresh timed out");
    }, 10000);
    buildMentorContext(profile.id, profile)
      .then((ctx) => { if (!cancelled) setContext(ctx); })
      .catch((e) => console.error("[mentor] profile context refresh failed", e))
      .finally(() => window.clearTimeout(t));
    return () => { cancelled = true; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updated_at]);

  // Re-attach to a pending Echo send that survived SPA navigation (global map + sessionStorage)
  useEffect(() => {
    if (!activeThread) return;
    const pending = getPendingSend(activeThread.id);
    const hasSessionPending = (() => {
      try { return !!sessionStorage.getItem(`mentor:pending:${activeThread.id}`); } catch { return false; }
    })();
    if (!pending && !hasSessionPending) return;
    // If in-memory pending exists, re-attach to its promise so the new mount sees the reply
    if (pending) {
      setSending(true);
      setStageList(pending.stageList);
      setStageIdx(0);
      pending.promise.then((result) => {
        if (activeThreadRef.current?.id !== pending.threadId) return;
        // Directly set full reply (no streaming animation needed after navigation)
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          // If poll already added the DB message, don't duplicate
          if (last?.role === "assistant" && last.content === result.reply) return prev;
          // If last is user, append full assistant reply
          const isLastUser = last?.role === "user";
          if (isLastUser) return [...prev, { role: "assistant", content: result.reply }];
          // Otherwise ensure last assistant is full
          const next = prev.slice();
          if (next.length > 0 && next[next.length - 1].role === "assistant") {
            next[next.length - 1] = { role: "assistant", content: result.reply };
            return next;
          }
          return [...prev, { role: "assistant", content: result.reply }];
        });
        setTimes((prev) => {
          const next = [...prev];
          while (next.length < messagesRef.current.length + 1) next.push(nowLabel());
          return next;
        });
        setThreads((prev) => prev.map((t) => (t.id === pending.threadId ? { ...t, updated_at: new Date().toISOString() } : t)));
        setLastFailedText(null);
        if (result.source === "offline") {
          setOfflineReason(result.reason ?? "Echo service is not configured.");
          setShowSetupNotice(true);
          const lower = (result.reason ?? "").toLowerCase();
          const isSoft = lower.includes("rate") || lower.includes("busy") || lower.includes("too long") || lower.includes("hiccup") || lower.includes("timed out");
          if (isSoft) setLastFailedText(pending.content);
        }
        if (result.planner) {
          void (async () => {
            setPlanBusy(true);
            try {
              const res = await applyMentorPlannerChange(result.planner!, profile);
              if (res.applied) {
                setPlanChange({ change: result.planner!, snapshot: res.snapshot!, summary: res.summary, errors: res.errors });
                loadContext();
              }
            } catch {}
            setPlanBusy(false);
          })();
        }
      }).catch((err) => {
        const e = err as { kind?: string; retryable?: boolean; message?: string };
        if (activeThreadRef.current?.id !== pending.threadId) return;
        setError({ message: e?.message || "The Echo could not be reached. Please try again.", retryable: e?.retryable ?? false, kind: e?.kind ?? "unknown" });
        setLastFailedText(pending.content);
      }).finally(() => {
        if (activeThreadRef.current?.id === pending.threadId) setSending(false);
      });
      return;
    }
    // No in-memory pending but sessionStorage says we left mid-send (e.g. full reload) — poll DB for the assistant reply
    if (hasSessionPending && !pending) {
      setSending(true);
      let cancelled = false;
      const poll = async () => {
        try {
          const fresh = await getMentorMessages(activeThread.id);
          if (cancelled) return;
          if (fresh.length > messagesRef.current.length) {
            setMessages(fresh);
            setTimes(fresh.map(() => nowLabel()));
            setSending(false);
            try { sessionStorage.removeItem(`mentor:pending:${activeThread.id}`); } catch {}
            return true;
          }
        } catch {}
        return false;
      };
      poll();
      const iv = window.setInterval(async () => {
        const done = await poll();
        if (done) window.clearInterval(iv);
      }, 1500);
      const to = window.setTimeout(() => { window.clearInterval(iv); if (!cancelled) setSending(false); }, 30000);
      return () => { cancelled = true; window.clearInterval(iv); window.clearTimeout(to); };
    }
  }, [activeThread?.id]);

  // While away, the assistant reply is saved to DB — poll + visibility listener + Realtime so it appears instantly on return
  useEffect(() => {
    if (!activeThread || sending) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    // Last is user with no assistant follow-up — likely missed reply while navigating
    const poll = async () => {
      try {
        const fresh = await getMentorMessages(activeThread.id);
        if (fresh.length > messages.length) {
          setMessages(fresh);
          setTimes((prev) => {
            const next = [...prev];
            while (next.length < fresh.length) next.push(nowLabel());
            return next;
          });
          try { sessionStorage.removeItem(`mentor:pending:${activeThread.id}`); } catch {}
        }
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const t = window.setTimeout(() => void poll(), 800);
    const iv = window.setInterval(() => void poll(), 3000);
    // Realtime subscription for instant push (if Realtime enabled on mentor_messages)
    let channel: unknown = null;
    try {
      if (supabase) {
        const ch = supabase
          .channel(`mentor-messages-${activeThread.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_messages", filter: `thread_id=eq.${activeThread.id}` }, () => void poll())
          .subscribe();
        channel = ch;
      }
    } catch {}
    return () => {
      window.clearTimeout(t);
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      try { if (channel && supabase) supabase.removeChannel(channel as never); } catch {}
    };
  }, [activeThread?.id, messages.length, sending]);

  const resetChatState = () => {
    stopReveal();
    setSending(false);
    setError(null);
    setLastFailedText(null);
    setPendingImage(null);
    setFeedbackMap({});
    setVisibleCount(VISIBLE_MESSAGES);
    nearBottomRef.current = true;
    forceJumpRef.current = true;
  };

  async function handleNewChat() {
    const thread = await createMentorThread();
    if (!thread) {
      toast.error("Could not create a new chat. Please try again.");
      return;
    }
    resetChatState();
    setThreads((prev) => [thread, ...prev]);
    setActiveThread(thread);
    setMessages([]);
    setTimes([]);
    setShowSetupNotice(false);
    composerRef.current?.focus();
  }

  async function handleSelectThread(id: string) {
    const thread = threads.find((t) => t.id === id);
    if (!thread || sending) return;
    resetChatState();
    setActiveThread(thread);
    setMessages(await getMentorMessages(id));
    setTimes([]);
    setMoreOpen(false);
  }

  async function handleDeleteThread(threadId: string) {
    if (sending || deletingId) return;
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    setDeletingId(threadId);
    const ok = await deleteMentorThread(threadId);
    setDeletingId(null);
    if (!ok) {
      toast.error("Failed to delete chat. Please try again.");
      return;
    }
    const wasActive = activeThread?.id === threadId;
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    setConfirmDeleteId(null);
    setMoreOpen(false);
    if (wasActive) {
      const remaining = threads.filter((t) => t.id !== threadId);
      if (remaining.length > 0) {
        const next = remaining[0];
        setActiveThread(next);
        try {
          setMessages(await getMentorMessages(next.id));
        } catch {
          setMessages([]);
        }
        setTimes([]);
      } else {
        setActiveThread(null);
        setMessages([]);
        setTimes([]);
      }
      resetChatState();
    }
    toast.success("Chat deleted");
  }

  function requestDeleteThread(threadId: string) {
    setConfirmDeleteId(threadId);
  }

  const handleExamPopupClose = () => {
    setExamPopupInfo(null);
    setExamPopupBusy(false);
  };

  const handleExamPopupConfirm = async (value: ExamIntakeValue) => {
    if (!examPopupInfo) return;
    setExamPopupBusy(true);
    const { beforeISO, examISO, subject, examLabel } = examPopupInfo;
    // Map coverage to energy: not_started/half => high, almost/revision => normal
    const energy: "high" | "normal" = value.coverage === "almost" || value.coverage === "revision" ? "normal" : "high";
    const hours = value.hours ?? 6;
    // Build weak chapter tasks
    const weakList = [...value.weakChapters.filter((c) => c !== "All good"), ...(value.weakText ? value.weakText.split(",").map((s) => s.trim()).filter(Boolean) : [])];
    // Dedupe
    const weakUnique = [...new Set(weakList)].slice(0, 3);
    const changes: PlannerChange["changes"] = [
      { op: "regenerate_plan" as const, date: beforeISO, exam_tomorrow: true, study_hours: hours, energy_level: energy },
      { op: "regenerate_plan" as const, date: examISO, exam_tomorrow: false, study_hours: 2, energy_level: "high" as const },
    ];
    if (weakUnique.length > 0 && !weakUnique.includes("All good")) {
      for (const ch of weakUnique) {
        changes.push({
          op: "add_task" as const,
          title: `${subject} — ${ch} Revision`,
          subject,
          chapter: ch,
          task_type: "revision" as const,
          date: beforeISO,
          estimated_minutes: 45,
          priority: "high" as const,
        });
      }
    } else {
      // Generic intensive revision if no specific weak chapters
      changes.push({
        op: "add_task" as const,
        title: `${subject} ${examLabel} — Intensive Revision`,
        subject,
        task_type: "revision" as const,
        date: beforeISO,
        estimated_minutes: 60,
        priority: "high" as const,
      });
    }

    const fallback: PlannerChange = {
      id: `exam-popup-${Date.now().toString(36)}`,
      reason: examPopupInfo.reason,
      changes,
    };

    try {
      const res = await applyMentorPlannerChange(fallback, profile);
      if (res.applied) {
        setPlanChange({ change: fallback, snapshot: res.snapshot!, summary: res.summary, errors: res.errors });
        loadContext();
        const dateStr = new Date(`${beforeISO}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
        setMessages((prev) => [...prev, { role: "assistant", content: `Done — I've regenerated your plan for ${dateStr} (${hours}h, ${subject} focus) based on your answers. Your weak chapters ${weakUnique.length ? weakUnique.join(", ") : "—"} are now prioritized. Check the Planner updated card and View in AI Planner.` }]);
        setTimes((prev) => [...prev, new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: profile?.time_format !== "24h" })]);
        toast.success("Planner regenerated for your exam");
      } else {
        // Try direct DB as last resort
        const directOk = await applyExamFallbackDirect({ ...fallback, _beforeISO: beforeISO, _examISO: examISO, _subject: subject, _examLabel: examLabel } as PlannerChange & { _beforeISO: string; _examISO: string; _subject: string; _examLabel: string });
        if (directOk) {
          setPlanChange({ change: fallback, snapshot: { tasks: [], deleted: [], added: [{ date: beforeISO, title: `${subject} ${examLabel} — Intensive Revision`, type: "revision" }], inputs: {} } as unknown as PlannerSnapshot, summary: [`Regenerated ${beforeISO} for ${subject} exam`], errors: [] });
          loadContext();
          toast.success("Planner updated for your exam");
        } else {
          toast.info(res.errors[0] ?? "Couldn't update planner for your exam — try generating a plan for that day first.");
        }
      }
    } catch (err) {
      console.error("[mentor] exam popup apply failed", err);
      toast.error("Failed to update planner. Please try again.");
    } finally {
      setExamPopupBusy(false);
      setExamPopupInfo(null);
    }
  };

  async function sendText(text: string, userContent?: string, isVoice = false) {
    if (sending || streaming) return;
    const thread = activeThreadRef.current;
    if (!thread) {
      const created = await createMentorThread();
      if (!created) {
        toast.error("Could not start a chat. Please try again.");
        return;
      }
      setThreads((prev) => [created, ...prev]);
      setActiveThread(created);
      await handleSendWithThread(created, text, { persistUser: true, isVoice }, userContent);
      return;
    }
    await handleSendWithThread(thread, text, { persistUser: true, isVoice }, userContent);
  }

  async function handleSend() {
    if (sending || preparing || streaming) return;
    if (pendingImage) {
      await handleSolve();
      return;
    }
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    await sendText(text);
  }

  async function handleSolve() {
    if (!pendingImage || sending || preparing || streaming) return;
    const img = pendingImage;
    setPreparing(true);
    try {
      const compressed = await compressImage(img.dataUrl);
      storeSessionImage(img.id, compressed, img.fileName);
    } catch (err) {
      console.error("[mentor] image compression failed, sending original", err);
      storeSessionImage(img.id, img.dataUrl, img.fileName);
    }
    const text = input.trim() || "Solve this question.";
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    setPendingImage(null);
    const userContent = `[IMAGE:${img.id}]\n${text}`;
    await sendText(text, userContent);
    setPreparing(false);
  }

  const startReveal = useCallback((full: string) => {
    stopReveal();
    if (!full) return;
    // Fast reveal — was 16ms * 220 ticks (~1.2s for long replies). Now ~0.35s max so Echo feels instant.
    // Very short replies (<120 chars) show instantly to avoid flicker.
    if (full.length < 120) {
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        if (!last || last.role !== "assistant") return prev;
        next[next.length - 1] = { role: "assistant", content: full };
        return next;
      });
      setStreaming(false);
      return;
    }
    setStreaming(true);
    const ticks = Math.min(80, Math.max(8, Math.round(full.length / 28)));
    const step = Math.max(1, Math.ceil(full.length / ticks));
    let i = 0;
    revealTimerRef.current = setInterval(() => {
      i = Math.min(full.length, i + step);
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        if (!last || last.role !== "assistant") return prev;
        next[next.length - 1] = { role: "assistant", content: full.slice(0, i) };
        return next;
      });
      if (i >= full.length) stopReveal();
    }, 12);
  }, [stopReveal]);

  async function handleSendWithThread(
    thread: MentorThread, text: string, opts: { persistUser: boolean; isVoice?: boolean },
    userContent?: string, historyOverride?: MentorChatMessage[],
  ) {
    const isRetry = !opts.persistUser;
    const content = userContent ?? text;
    const isVoice = !!opts.isVoice;
    // If already sending for this thread (e.g. user navigated and back), re-attach instead of double-send
    const existingPending = getPendingSend(thread.id);
    if (existingPending && !isRetry) {
      toast.info("Echo is still answering your previous message…");
      return;
    }
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    setSending(true);
    setError(null);
    setStageIdx(0);
    const stageListForSend = imageMarkersIn(content).length > 0 ? STAGES_IMAGE : STAGES_TEXT;
    setStageList(stageListForSend);
    const newMsg: MentorChatMessage = { role: "user", content };
    if (!isRetry) {
      setMessages((prev) => [...prev, newMsg]);
      setTimes((prev) => [...prev, nowLabel()]);
    }
    try {
      const ctx = context ?? await buildMentorContext(profile?.id ?? "", profile);
      if (!context) setContext(ctx);
      const history = historyOverride ?? (isRetry ? messages.slice(0, -1) : messages);
      const images = collectImages([...history, newMsg]);
      // ── Fast local "create today's plan" — no LLM needed, immediate feedback ──
      const wantsTodayPlan = !isRetry && plannerEnabled && Object.keys(images).length === 0 && isTodayPlanRequest(content);
      let todayPlanLocalResult: { ok: boolean; taskCount: number; hours: number; error?: string } | null = null;
      let todayPlanLocalDone = false;
      const todayISO = todayISODate();
      const todayPlanPromise = wantsTodayPlan
        ? (async () => {
            const r = await generateTodayPlanDirect(profile, todayISO);
            todayPlanLocalResult = r;
            todayPlanLocalDone = true;
            // Show plan-creation feedback immediately, even while LLM is still thinking
            if (r.ok) {
              const summary = `Generated your plan for ${new Date(todayISO + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })} — ${r.taskCount} tasks, ${r.hours}h focus.`;
              // Use a synthetic PlannerChange snapshot so "View in AI Planner" works
              const syntheticChange: PlannerChange = {
                id: `today-plan-${Date.now()}`,
                reason: content.slice(0, 80),
                changes: [{ op: "regenerate_plan", date: todayISO, study_hours: r.hours, energy_level: "normal" }],
              };
              const syntheticSnapshot = { tasks: [], deleted: [], added: [{ date: todayISO, title: `${r.taskCount} tasks`, type: "study" }], inputs: {} } as unknown as PlannerSnapshot;
              setPlanChange({ change: syntheticChange, snapshot: syntheticSnapshot, summary: [summary], errors: [] });
              loadContext();
              toast.success(`✅ Today's plan ready: ${r.taskCount} tasks`);
              // If LLM hasn't yet replied, push an immediate assistant message so user isn't staring at "Echo is thinking"
              if (!sendingRef.current || messagesRef.current[messagesRef.current.length - 1]?.role === "user") {
                // No assistant msg yet — add one now; LLM reply will append after
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant" && last.content === "") return prev;
                  return [...prev, { role: "assistant", content: `Done — ${summary} Check the Planner updated card and View in AI Planner.` }];
                });
                setTimes((prev) => [...prev, nowLabel()]);
              }
            } else {
              toast.error(r.error ?? "Couldn't create today's plan — try AI Planner directly.");
            }
            return r;
          })().catch((e) => {
            console.error("[mentor] today plan local failed", e);
            return null;
          })
        : null;
      // keepalive + global pending so SPA navigation doesn't kill the reply
      const sendPromise = sendMentorMessage(thread.id, thread.title, content, history, ctx, { persistUser: opts.persistUser, plannerEnabled, isVoice }, undefined, images);
      setPendingSend(thread.id, { promise: sendPromise, content, threadId: thread.id, stageList: stageListForSend, createdAt: Date.now() });
      let result: import("../../services/mentor").MentorReplyResult;
      try {
        result = await sendPromise;
      } catch (err) {
        clearPendingSend(thread.id);
        // If today plan already succeeded locally, don't surface LLM error — we have a useful reply
        if ((todayPlanLocalDone as boolean) && (todayPlanLocalResult as unknown as { ok: boolean } | null)?.ok) {
          // Ensure plan feedback is visible and add a fallback reply if LLM gave nothing
          if (messagesRef.current[messagesRef.current.length - 1]?.role === "user") {
            setMessages((prev) => [...prev, { role: "assistant", content: `Done — your plan for today is ready. The AI reply is temporarily delayed, but your plan is already created. Refresh the AI Planner to see it.` }]);
            setTimes((prev) => [...prev, nowLabel()]);
          }
          if (todayPlanPromise) try { await todayPlanPromise; } catch {}
          setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, updated_at: new Date().toISOString() } : t)));
          setSending(false);
          return;
        }
        throw err;
      }
      clearPendingSend(thread.id);
      // Wait for local today plan if it was triggered — ensures banner is set before we decide to show LLM planner
      if (todayPlanPromise) {
        try { await todayPlanPromise; } catch {}
      }
      // If we already pushed a synthetic assistant message for today plan, the next empty we add will be second bubble — that's intentional
      // But if LLM reply is just a generic plan confirmation and we already did local plan, avoid duplicate empty?
      // We always add a new empty for LLM streaming; if synthetic already exists, we'll have two bubbles (plan + LLM text) which is desired
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setTimes((prev) => [...prev, nowLabel()]);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, updated_at: new Date().toISOString() } : t)));
      setLastFailedText(null);
      if (result.source === "offline") {
        setOfflineReason(result.reason ?? "Echo service is not configured.");
        setShowSetupNotice(true);
        const lower = (result.reason ?? "").toLowerCase();
        const isSoft = lower.includes("rate") || lower.includes("busy") || lower.includes("too long") || lower.includes("hiccup") || lower.includes("timed out");
        if (isSoft) setLastFailedText(content);
      }
      startReveal(result.reply);
      // If user mentioned an exam with a date, show popup with options instead of instantly regenerating
      // This fulfills "ask some relevant questions like have you studied" before updating the planner
      const examPopupCandidate = plannerEnabled && Object.keys(images).length === 0 ? buildLocalExamFallback(content) : null;
      if (examPopupCandidate) {
        const info = examPopupCandidate as unknown as { _beforeISO: string; _examISO: string; _subject: string; _examLabel: string; reason: string };
        const beforeLabel = (() => {
          try { return new Date(`${info._beforeISO}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" }); } catch { return info._beforeISO; }
        })();
        setExamPopupInfo({ subject: info._subject, examLabel: info._examLabel, examISO: info._examISO, beforeISO: info._beforeISO, beforeLabel, reason: info.reason });
        // Do not auto-apply yet — wait for popup answers
      } else {
        // ── Lecture/chapter swap local fallback — fixes "echo that i want to do X instead of Y" not updating plan
        // This runs even if the LLM hallucinated "Done switched" but the planner decision returned nothing.
        const lectureSwapCandidate = plannerEnabled && Object.keys(images).length === 0 ? buildLocalLectureSwapFallback(content) : null;
        if (lectureSwapCandidate) {
          void (async () => {
            setPlanBusy(true);
            try {
              // Prefer validated planner path (proper snapshot/undo)
              const res = await applyMentorPlannerChange(lectureSwapCandidate, profile);
              if (res.applied) {
                setPlanChange({ change: lectureSwapCandidate, snapshot: res.snapshot!, summary: res.summary, errors: res.errors });
                loadContext();
                toast.success(`Swapped "${lectureSwapCandidate._oldTitle}" → "${lectureSwapCandidate._newTitle}"`);
              } else {
                // Planner rejected (e.g., old task not found or capacity) — try direct bypass that always inserts new lecture
                console.warn("[mentor] lecture swap via planner rejected, trying direct", res.errors);
                const directOk = await applyLectureSwapDirect(lectureSwapCandidate as unknown as PlannerChange & { _oldTitle: string; _newTitle: string; _subjectHint: string | null; _date: string });
                if (directOk) {
                  const summary = [`Swapped "${lectureSwapCandidate._oldTitle}" for "${lectureSwapCandidate._newTitle}" on ${new Date(lectureSwapCandidate._date + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`];
                  setPlanChange({
                    change: lectureSwapCandidate,
                    snapshot: { tasks: [], deleted: [], added: [{ date: lectureSwapCandidate._date, title: `Lecture: ${lectureSwapCandidate._newTitle}`, type: "lecture" }], inputs: {} } as unknown as PlannerSnapshot,
                    summary,
                    errors: res.errors,
                  });
                  loadContext();
                  toast.success(`Swapped to ${lectureSwapCandidate._newTitle}`);
                } else {
                  if (res.errors.length > 0) toast.info(res.errors[0]);
                  else toast.info("Couldn't swap the lecture — check that today's plan contains the old lecture.");
                }
              }
            } catch (err) {
              console.error("[mentor] lecture swap failed", err);
              try {
                const ok = await applyLectureSwapDirect(lectureSwapCandidate as unknown as PlannerChange & { _oldTitle: string; _newTitle: string; _subjectHint: string | null; _date: string });
                if (ok) {
                  toast.success(`Swapped to ${lectureSwapCandidate._newTitle}`);
                  loadContext();
                } else toast.error("Couldn't swap the lecture. Nothing was changed.");
              } catch {}
            } finally {
              setPlanBusy(false);
            }
          })();
        } else if ((todayPlanLocalDone as boolean) && (todayPlanLocalResult as unknown as { ok: boolean } | null)?.ok) {
          // Today's plan already created locally and shown — skip LLM's planner to avoid duplicate regeneration
        } else {
          const plannerChange = result.planner;
          if (plannerChange) {
            void (async () => {
              setPlanBusy(true);
              try {
                const res = await applyMentorPlannerChange(plannerChange, profile);
                if (res.applied) {
                  setPlanChange({ change: plannerChange, snapshot: res.snapshot!, summary: res.summary, errors: res.errors });
                  loadContext();
                } else {
                  // LLM proposed something but it was rejected — try to salvage with local lecture-swap fallback
                  const salvaged = buildLocalLectureSwapFallback(content);
                  if (salvaged) {
                    const ok = await applyLectureSwapDirect(salvaged as unknown as PlannerChange & { _oldTitle: string; _newTitle: string; _subjectHint: string | null; _date: string });
                    if (ok) {
                      setPlanChange({
                        change: salvaged,
                        snapshot: { tasks: [], deleted: [], added: [{ date: salvaged._date, title: salvaged._newTitle, type: "lecture" }], inputs: {} } as unknown as PlannerSnapshot,
                        summary: [`Swapped "${salvaged._oldTitle}" for "${salvaged._newTitle}"`],
                        errors: [],
                      });
                      loadContext();
                      toast.success(`Swapped to ${salvaged._newTitle} (fallback)`);
                    } else {
                      if (res.errors.length > 0) toast.info(res.errors[0]);
                      else toast.info("The mentor suggested a plan change, but it didn't fit your plan — nothing was changed.");
                    }
                  } else {
                    if (res.errors.length > 0) toast.info(res.errors[0]);
                    else toast.info("The mentor suggested a plan change, but it didn't fit your plan — nothing was changed.");
                  }
                }
              } catch (err) {
                console.error("[mentor] apply plan change failed", err);
                toast.error("Couldn't apply the mentor's plan change. Nothing was changed.");
              } finally {
                setPlanBusy(false);
              }
            })();
          }
        }
      }
    } catch (err) {
      const e = err as { kind?: string; retryable?: boolean; message?: string };
      setError({
        message: e?.message || "The Echo could not be reached. Please try again.",
        retryable: e?.retryable ?? false,
        kind: e?.kind ?? "unknown",
      });
      setLastFailedText(content);
    } finally {
      setSending(false);
    }
  }

  async function handleRetry() {
    if (!activeThread || !lastFailedText || sending || streaming) return;
    await handleSendWithThread(activeThread, lastFailedText, { persistUser: false }, lastFailedText);
  }

  const togglePlanner = () => {
    setPlannerEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("mentor:planner_enabled", next ? "1" : "0"); } catch { /* ignore */ }
      toast.info(next ? "Mentor can now adjust your plan" : "Mentor plan adjustments turned off");
      return next;
    });
  };

  const handleUndoPlanChange = async () => {
    if (!planChange || planBusy) return;
    setPlanBusy(true);
    try {
      const ok = await undoMentorPlannerChange(planChange.change, planChange.snapshot);
      if (ok) {
        toast.success("Reverted the mentor's plan change");
        setPlanChange(null);
        loadContext();
      } else {
        toast.error("Couldn't fully revert — please check your plan.");
      }
    } catch (err) {
      console.error("[mentor] undo plan change failed", err);
      toast.error("Undo failed — please check your plan.");
    } finally {
      setPlanBusy(false);
    }
  };

  const handleRegenerate = useCallback(async (idx: number) => {
    if (sending || streaming) return;
    const thread = activeThreadRef.current;
    const all = messagesRef.current;
    if (!thread) return;
    let userIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (all[i]?.role === "user") {
        userIdx = i;
        break;
      }
    }
    if (userIdx < 0) return;
    const userMsg = all[userIdx];
    setMessages(all.slice(0, userIdx + 1));
    setTimes(timesRef.current.slice(0, userIdx + 1));
    setFeedbackMap((prev) => {
      const next: Record<number, MessageFeedback> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        if (ki <= userIdx) next[ki] = prev[ki];
      }
      return next;
    });
    setVisibleCount(VISIBLE_MESSAGES);
    nearBottomRef.current = true;
    forceJumpRef.current = true;
    await handleSendWithThread(thread, userMsg.content, { persistUser: false }, userMsg.content, all.slice(0, userIdx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, streaming]);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy automatically — select the text and copy manually.");
    }
  }, [toast]);

  const handleReadAloud = useCallback((idx: number, content: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech isn't supported in this browser.");
      return;
    }
    if (speakingIdxRef.current === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const text = placeholderImageMarkers(content);
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setSpeakingIdx(null);
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  }, [toast]);

  const handleFeedback = useCallback((idx: number, fb: MessageFeedback) => {
    setFeedbackMap((prev) => {
      const next = { ...prev };
      if (next[idx] === fb) delete next[idx];
      else next[idx] = fb;
      return next;
    });
    toast.success(fb === "like" ? "Thanks for the feedback!" : "Noted — I'll keep improving.");
  }, [toast]);

  const handleShare = useCallback(async (idx: number, content: string) => {
    const all = messagesRef.current;
    let q = "";
    for (let i = idx - 1; i >= 0; i--) {
      if (all[i]?.role === "user") {
        q = placeholderImageMarkers(all[i].content);
        break;
      }
    }
    const text = q ? `Q: ${q}\n\nA: ${content}` : content;
    const shareData = { title: "StudyShield Echo", text };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied question & answer to clipboard");
      }
    } catch {
      // user dismissed the share sheet — not an error
    }
  }, [toast]);

  const handleExportChat = useCallback(() => {
    const all = messagesRef.current;
    if (all.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    const body = all
      .map((m) => `## ${m.role === "user" ? "You" : "Echo"}\n\n${placeholderImageMarkers(m.content)}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# StudyShield Echo chat\n\n${body}\n`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mentor-chat.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported as markdown");
  }, [toast]);

  const pauseRequestedRef = useRef(false);
  const manualStopRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  // Volume polling for real waveform — works even when analyser becomes ready after effect mount
  useEffect(() => {
    if (!micListening || micPaused) {
      if (micPollRafRef.current) {
        cancelAnimationFrame(micPollRafRef.current);
        micPollRafRef.current = null;
      }
      return;
    }
    const data = new Uint8Array(64);
    let raf = 0;
    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        try {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length / 255;
          setMicLevel(avg);
        } catch { /* ignore */ }
      }
      raf = requestAnimationFrame(tick);
      micPollRafRef.current = raf;
    };
    raf = requestAnimationFrame(tick);
    micPollRafRef.current = raf;
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (micPollRafRef.current === raf) micPollRafRef.current = null;
    };
  }, [micListening, micPaused]);

  const startRecognitionSession = useCallback(async (baseText: string) => {
    if (!isSecureContextSafe()) {
      toast.error(`Microphone needs HTTPS. Please open ${getSecureHost()} over https:// and try again.`);
      return false;
    }
    const CtorNow = getSpeechRecognition();
    if (!CtorNow) {
      toast.error("Voice input isn't supported in this browser. Please use Chrome or Edge on desktop/Android for voice input.");
      return false;
    }
    // Abort any previous recognition and clean previous mic stream before starting new session
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    // Clean previous waveform stream if any (pause left it alive, resume must not leak)
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { await audioContextRef.current.close(); } catch { /* ignore */ }
      audioContextRef.current = null;
      analyserRef.current = null;
      micSourceRef.current = null;
    }
    // Don't show listening UI until permission granted — avoids flicker and timer drift
    micBaseTextRef.current = baseText;
    micFinalTextRef.current = "";
    pauseRequestedRef.current = false;
    manualStopRef.current = false;
    micRestartCountRef.current = 0;

    // Show listening UI immediately — do NOT block on waveform GUM (which would hold mic and cause audio-capture conflict)
    setMicListening(true);
    setMicPaused(false);
    micListeningRef.current = true;
    micPausedRef.current = false;

    try {
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
      const rec = new CtorNow();
      rec.lang = navigator.language || "en-IN";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const transcript = r[0]?.transcript ?? "";
          if (!transcript) continue;
          if (r.isFinal) micFinalTextRef.current += transcript + " ";
          else interim += transcript;
        }
        const base = micBaseTextRef.current.trim();
        const finalPart = micFinalTextRef.current.trim();
        const spoken = `${finalPart}${interim ? ` ${interim}` : ""}`.trim();
        if (spoken) {
          const next = base ? `${base} ${spoken}` : spoken;
          // Avoid cursor jump by only updating if changed
          if (next !== inputRef.current) {
            setInput(next);
            if (composerRef.current) autoGrow(composerRef.current);
            // Keep inputRef in sync immediately so scheduleVoiceAutoSend sees fresh value even before React effect flushes
            inputRef.current = next;
          }
        } else {
          if (base !== inputRef.current) {
            setInput(base);
            inputRef.current = base;
          }
        }
        // Silence auto-send: if user stopped speaking for 1.6s after we have final transcript, auto-stop and send (hands-free)
        if (voiceSilenceRef.current) {
          clearTimeout(voiceSilenceRef.current);
          voiceSilenceRef.current = null;
        }
        const hasSpeech = !!finalPart;
        if (hasSpeech && micListeningRef.current && !micPausedRef.current) {
          voiceSilenceRef.current = setTimeout(() => {
            voiceSilenceRef.current = null;
            if (!micListeningRef.current || micPausedRef.current) return;
            if (sendingRef.current || streamingRef.current) return;
            manualStopRef.current = true;
            pauseRequestedRef.current = false;
            try { rec.stop(); } catch { /* ignore */ }
            scheduleVoiceAutoSend();
          }, 1600);
        }
      };
      rec.onend = () => {
        if (voiceSilenceRef.current) {
          clearTimeout(voiceSilenceRef.current);
          voiceSilenceRef.current = null;
        }
        if (pauseRequestedRef.current) {
          pauseRequestedRef.current = false;
          return;
        }
        if (manualStopRef.current) {
          manualStopRef.current = false;
          setMicListening(false);
          micListeningRef.current = false;
          setMicPaused(false);
          micPausedRef.current = false;
          cleanupMicAudio();
          return;
        }
        // Auto-restart with backoff, max 8 times to avoid tight loop
        if (micListeningRef.current && !micPausedRef.current) {
          micRestartCountRef.current += 1;
          if (micRestartCountRef.current > 8) {
            console.warn("[mic] auto-restart max reached, stopping");
            setMicListening(false);
            micListeningRef.current = false;
            setMicPaused(false);
            micPausedRef.current = false;
            cleanupMicAudio();
            toast.error("Voice input stopped after a while. Tap mic to start again.");
            // If we have a transcript accumulated, auto-send it instead of discarding
            const pend = (micFinalTextRef.current ?? "").trim();
            if (pend) {
              const baseP = (micBaseTextRef.current ?? "").trim();
              let t = baseP ? `${baseP} ${pend}`.trim() : pend;
              if (t && t !== baseP) {
                setTimeout(() => {
                  if (!sendingRef.current && !streamingRef.current) void sendText(t, undefined, true);
                }, 200);
              }
            }
            return;
          }
          const delay = Math.min(1500, 250 + micRestartCountRef.current * 150);
          setTimeout(() => {
            if (recognitionRef.current === rec && micListeningRef.current && !micPausedRef.current) {
              try { rec.start(); micRestartCountRef.current = 0; } catch { /* ignore, onend will retry */ }
            }
          }, delay);
          return;
        }
        setMicListening(false);
        micListeningRef.current = false;
        setMicPaused(false);
        micPausedRef.current = false;
        cleanupMicAudio();
      };
      rec.onerror = (ev) => {
        const code = (ev as unknown as { error?: string })?.error ?? "";
        if (pauseRequestedRef.current && code === "aborted") {
          pauseRequestedRef.current = false;
          return;
        }
        if (manualStopRef.current && code === "aborted") {
          manualStopRef.current = false;
          return;
        }
        if (code === "no-speech") {
          // Keep listening — onend will auto-restart
          return;
        }
        if (code === "aborted") {
          return;
        }
        if (voiceSilenceRef.current) {
          clearTimeout(voiceSilenceRef.current);
          voiceSilenceRef.current = null;
        }
        cleanupMicAudio();
        setMicListening(false);
        micListeningRef.current = false;
        setMicPaused(false);
        micPausedRef.current = false;
        if (code === "not-allowed" || code === "service-not-allowed") {
          const isService = code === "service-not-allowed";
          toast.error(isService ? `Microphone blocked — ensure ${getSecureHost()} is HTTPS and Permissions-Policy allows microphone (check browser lock icon).` : "Microphone access was blocked. Please allow mic permission and try again (click the lock icon in the address bar).");
        } else if (code === "audio-capture") {
          toast.error("No microphone found — please check your mic is connected and not used by another app.");
        } else if (code === "network") {
          toast.error("Voice input needs an internet connection. Check your network and try again.");
        } else if (code === "language-not-supported") {
          toast.error("Your language isn't supported for voice input. Try English.");
        } else {
          toast.error(code ? `Voice input error: ${code}. Try again.` : "Voice input failed. Please try again or type your question.");
        }
      };
      recognitionRef.current = rec;
      manualStopRef.current = false;
      pauseRequestedRef.current = false;
      micRestartCountRef.current = 0;
      try {
        rec.start();
      } catch (err) {
        const e = err as Error & { name?: string };
        if (e?.name === "InvalidStateError") {
          // Already started — ignore
        } else throw err;
      }

      // Fire-and-forget waveform setup (visual only) — never blocks voice. Delay slightly so recognition claims mic first on Chrome.
      if (navigator.mediaDevices?.getUserMedia) {
        void (async () => {
          await new Promise((r) => setTimeout(r, 140));
          if (!micListeningRef.current || micPausedRef.current) return;
          if (micStreamRef.current) return;
          try {
            const s = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as unknown as boolean,
            });
            if (!micListeningRef.current || micPausedRef.current) {
              s.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
              return;
            }
            micStreamRef.current = s;
            try {
              const AudioCtor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
                ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
              if (!AudioCtor) throw new Error("AudioContext not supported");
              const ctx = new AudioCtor();
              if (ctx.state === "suspended") {
                try { await ctx.resume(); } catch { /* ignore */ }
              }
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 128;
              analyser.smoothingTimeConstant = 0.8;
              const src = ctx.createMediaStreamSource(s);
              src.connect(analyser);
              audioContextRef.current = ctx;
              analyserRef.current = analyser;
              micSourceRef.current = src;
            } catch {
              // Waveform analyser failed — keep fake animation
            }
          } catch (err) {
            const e = err as Error & { name?: string };
            const name = e?.name ?? "";
            // Waveform is visual-only — log, don't toast (avoids spamming when mic is already held by SpeechRecognition)
            if (name === "NotAllowedError" || name === "PermissionDeniedError") {
              console.warn("[mic] waveform GUM permission denied", e);
            } else if (name === "NotReadableError") {
              console.warn("[mic] waveform GUM busy (recognition holds mic)", e);
            } else if (name === "SecurityError") {
              console.warn("[mic] waveform GUM security", e);
            } else if (name === "NotFoundError" || name === "OverconstrainedError") {
              console.warn("[mic] waveform GUM no mic", e);
            } else {
              console.warn("[mic] waveform GUM failed", e);
            }
          }
        })();
      }

      return true;
    } catch (err) {
      const e = err as Error & { name?: string };
      cleanupMicAudio();
      setMicListening(false);
      micListeningRef.current = false;
      setMicPaused(false);
      micPausedRef.current = false;
      if (e?.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Allow mic access and try again.");
      } else if (e?.name === "InvalidStateError") {
        toast.error("Voice input is already active. Please wait and try again.");
      } else {
        toast.error(e?.message ?? "Couldn't start voice input. Try again.");
      }
      return false;
    }
  }, [toast, cleanupMicAudio]);

  const scheduleVoiceAutoSend = useCallback(() => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    if (voiceSilenceRef.current) {
      clearTimeout(voiceSilenceRef.current);
      voiceSilenceRef.current = null;
    }
    autoSendTimeoutRef.current = setTimeout(() => {
      autoSendTimeoutRef.current = null;
      const base = (micBaseTextRef.current ?? "").trim();
      const finalPart = (micFinalTextRef.current ?? "").trim();
      let text = (inputRef.current ?? "").trim();
      // Fallback: inputRef may still be stale due to React batching — rebuild from mic refs
      if ((!text || text === base) && finalPart) {
        text = base ? `${base} ${finalPart}`.trim() : finalPart;
        if (text && text !== inputRef.current) {
          setInput(text);
          if (composerRef.current) autoGrow(composerRef.current);
        }
      }
      // Last resort: read directly from textarea DOM (covers batched state delay)
      if ((!text || text === base) && composerRef.current?.value) {
        const domVal = composerRef.current.value.trim();
        if (domVal && domVal !== base) text = domVal;
      }
      if (!text || text === base) {
        if (!text) toast.error("Didn't catch that — please try again or type your question.");
        return;
      }
      if (sendingRef.current || streamingRef.current) return;
      // Ensure UI reflects latest text before sending
      if (text !== inputRef.current) {
        setInput(text);
      }
      void sendText(text, undefined, true);
    }, 400);
  }, [toast]);

  // Debounce toggle to avoid double interval / double GUM
  const toggleMicLockRef = useRef(false);
  const toggleMic = useCallback(async () => {
    if (toggleMicLockRef.current) return;
    toggleMicLockRef.current = true;
    setTimeout(() => { toggleMicLockRef.current = false; }, 400);
    const listening = micListeningRef.current;
    const paused = micPausedRef.current;
    if (listening && !paused) {
      manualStopRef.current = true;
      pauseRequestedRef.current = false;
      if (voiceSilenceRef.current) {
        clearTimeout(voiceSilenceRef.current);
        voiceSilenceRef.current = null;
      }
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      scheduleVoiceAutoSend();
      return;
    }
    if (listening && paused) {
      await startRecognitionSession(inputRef.current ?? "");
      return;
    }
    await startRecognitionSession(inputRef.current ?? "");
  }, [startRecognitionSession, scheduleVoiceAutoSend]);

  const handleMicPause = useCallback(() => {
    if (!micListeningRef.current || micPausedRef.current) return;
    pauseRequestedRef.current = true;
    manualStopRef.current = false;
    setMicPaused(true);
    micPausedRef.current = true;
    if (voiceSilenceRef.current) {
      clearTimeout(voiceSilenceRef.current);
      voiceSilenceRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    // Suspend waveform to save battery while paused, keep stream alive
    if (audioContextRef.current?.state === "running") {
      try { void audioContextRef.current.suspend(); } catch { /* ignore */ }
    }
  }, []);

  const handleMicResume = useCallback(async () => {
    if (!micListeningRef.current || !micPausedRef.current) return;
    setMicPaused(false);
    micPausedRef.current = false;
    pauseRequestedRef.current = false;
    manualStopRef.current = false;
    if (audioContextRef.current?.state === "suspended") {
      try { await audioContextRef.current.resume(); } catch { /* ignore */ }
    }
    // Resume without new GUM if analyser still valid, otherwise fresh session
    if (analyserRef.current && micStreamRef.current) {
      // Try to restart recognition without new GUM
      try {
        const Ctor = getSpeechRecognition();
        if (Ctor) {
          const rec = new Ctor();
          rec.lang = navigator.language || "en-IN";
          rec.interimResults = true;
          rec.continuous = true;
          // Reuse existing handlers by creating new session via startRecognitionSession is safer
          // Fallback to full restart
        }
      } catch { /* ignore */ }
    }
    await startRecognitionSession(inputRef.current ?? "");
  }, [startRecognitionSession]);

  const handleMicStop = useCallback(() => {
    pauseRequestedRef.current = false;
    manualStopRef.current = true;
    setMicPaused(false);
    micPausedRef.current = false;
    if (voiceSilenceRef.current) {
      clearTimeout(voiceSilenceRef.current);
      voiceSilenceRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    scheduleVoiceAutoSend();
  }, [scheduleVoiceAutoSend]);

  const handleMicCancel = useCallback(() => {
    pauseRequestedRef.current = false;
    manualStopRef.current = true;
    setMicPaused(false);
    micPausedRef.current = false;
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    if (voiceSilenceRef.current) {
      clearTimeout(voiceSilenceRef.current);
      voiceSilenceRef.current = null;
    }
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    recognitionRef.current = null;
    cleanupMicAudio();
    setMicListening(false);
    micListeningRef.current = false;
    micFinalTextRef.current = "";
    setInput(micBaseTextRef.current);
    inputRef.current = micBaseTextRef.current;
    setMicLevel(0);
  }, [cleanupMicAudio]);

  const statsChips = useMemo(() => {
    if (!context) return [];
    const c = context;
    return [
      { icon: Flame, label: "Streak", value: `${c.streak}d`, color: "text-orange-400" },
      { icon: Clock, label: "Week", value: `${c.last7Days.completionRate ?? "–"}%`, color: "text-sky-400" },
      { icon: ListChecks, label: "Backlog", value: `${c.backlog.pendingItems}`, color: "text-rose-400" },
      { icon: RotateCcw, label: "Revision due", value: `${c.revisionDue.length}`, color: "text-amber-400" },
      { icon: BrainCircuit, label: "Today", value: `${Math.round(c.today.plannedMinutes / 60 * 10) / 10}h`, color: "text-emerald-400" },
    ];
  }, [context]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  const visibleMessages = messages.length > visibleCount ? messages.slice(-visibleCount) : messages;
  const baseIndex = messages.length - visibleMessages.length;
  const busy = sending || preparing || streaming;

  return (
    <>
      <SEO robots="noindex, nofollow" />
      <div
      className="relative flex flex-1 min-h-0 flex-col overflow-hidden bg-[#070708]"
      onDragOver={(e) => {
        if (busy) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy) return;
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
    >
      {/* Aurora + grid backdrop — premium vibe */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30%] left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,177,255,0.10),transparent_60%)] blur-3xl" />
        <div className="absolute -top-[15%] right-[-8%] h-[520px] w-[560px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>
      {/* ── Premium header ─────────────────────────────────────────────── */}
      <header className="relative z-40 shrink-0 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0a0a0c]/60">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-600/[0.04] via-violet-600/[0.03] to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
        <div className="relative mx-auto flex h-[56px] sm:h-[60px] w-full max-w-[960px] items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:h-[64px] md:gap-3 md:px-6">
          <button
            onClick={goBack}
            aria-label="Back"
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-zinc-300 backdrop-blur transition-all hover:border-white/10 hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <EchoAvatar variant="header" pulse />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-bold tracking-tight text-white">Echo</p>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
                <span className="hidden lg:inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-400">AI Study Mentor</span>
              </div>
              <p className="hidden truncate text-[11px] font-medium leading-none text-zinc-500 md:block">Grounded in your planner • backlog • revision • mocks</p>
              <p className="truncate text-[11px] font-medium leading-none text-zinc-500 md:hidden">Your AI study companion</p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] md:px-4 md:py-2"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
          <button
            onClick={handleNewChat}
            className="flex sm:hidden h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md"
          >
            <Plus className="h-4 w-4" />
          </button>
          {activeThread && (
            <button
              onClick={() => requestDeleteThread(activeThread.id)}
              aria-label="Delete current chat"
              title="Delete this chat"
              disabled={!!deletingId}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-500 backdrop-blur transition-all hover:border-danger-500/20 hover:bg-danger-500/10 hover:text-danger-400 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          <div className="relative shrink-0">
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-label="More options"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-zinc-400 backdrop-blur transition-all hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden />
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#0f0f10]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                  >
                    {threads.length > 0 && (
                      <>
                        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Conversations
                        </p>
                        {threads.slice(0, 8).map((t) => (
                          <div
                            key={t.id}
                            className={cn(
                              "group flex items-center gap-1 rounded-lg px-1 py-0.5 transition-colors",
                              activeThread?.id === t.id ? "bg-accent-600/15" : "hover:bg-white/5",
                            )}
                          >
                            <button
                              role="menuitem"
                              onClick={() => handleSelectThread(t.id)}
                              className={cn(
                                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                                activeThread?.id === t.id ? "text-accent-400" : "text-slate-200",
                              )}
                            >
                              <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" />
                              <span className="min-w-0 flex-1 truncate">{t.title}</span>
                              <span className="shrink-0 text-[10px] text-slate-500">{formatShareDate(t.updated_at)}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDeleteThread(t.id);
                              }}
                              disabled={deletingId === t.id}
                              aria-label={`Delete chat ${t.title}`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 opacity-60 transition-all hover:bg-danger-600/20 hover:text-danger-400 hover:opacity-100 disabled:opacity-30 group-hover:opacity-100"
                              title="Delete chat"
                            >
                              {deletingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ))}
                        <div className="my-1 border-t border-white/5" />
                      </>
                    )}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        togglePlanner();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
                    >
                      <BrainCircuit className="h-4 w-4 shrink-0 text-accent-400" />
                      <span className="min-w-0 flex-1 truncate text-left">Mentor may adjust my plan</span>
                      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", plannerEnabled ? "bg-accent-600" : "bg-white/10")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", plannerEnabled ? "left-[18px]" : "left-0.5")} />
                      </span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={async () => {
                        setMoreOpen(false);
                        await loadContext();
                        toast.success("Student data refreshed");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
                    >
                      <RefreshCw className="h-4 w-4 text-accent-400" /> Refresh student data
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        handleExportChat();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
                    >
                      <Download className="h-4 w-4 text-accent-400" /> Export chat
                    </button>
                    {(activeThread || threads.length > 0) && (
                      <>
                        <div className="my-1 border-t border-white/5" />
                        {activeThread && (
                          <button
                            role="menuitem"
                            onClick={() => requestDeleteThread(activeThread.id)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-danger-300 transition-colors hover:bg-danger-600/10 hover:text-danger-200"
                          >
                            <Trash2 className="h-4 w-4" /> Delete current chat
                          </button>
                        )}
                        {threads.length > 1 && activeThread && (
                          <p className="px-3 py-1 text-[10px] leading-snug text-slate-500">Tip: hover a conversation and tap the trash icon to delete it.</p>
                        )}
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Scrollable chat area ─────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar" aria-live="polite" aria-relevant="additions">
        <div className="mx-auto w-full max-w-[960px] space-y-4 sm:space-y-5 px-3 sm:px-4 pb-6 pt-4 sm:pt-5 md:px-6 md:pt-8">
          {loadingData ? (
            <div className="flex flex-1 min-h-[40vh] flex-col items-center justify-center gap-4 py-8 sm:py-12">
              <div className="relative">
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-accent-500 blur-2xl opacity-20 animate-pulse" />
                <div className="relative">
                  <EchoAvatar variant="hero" />
                  <span className="absolute inset-0 rounded-[22px] border-2 border-white/20 border-t-white animate-spin" style={{ animationDuration: "1.2s" }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold tracking-wide text-white">Warming up Echo…</p>
                <p className="mt-1 text-xs font-medium text-zinc-500">Syncing your planner, backlog and revision • this takes a sec ✨</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center py-4 sm:py-6 overflow-y-auto">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-2xl px-1 sm:px-0">
                {/* Badge */}
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 backdrop-blur">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                  <span className="text-[11px] font-semibold tracking-widest text-zinc-300">ECHO LIVE</span>
                  <span className="h-3 w-px bg-white/10 mx-1" />
                  <span className="text-[11px] font-medium text-zinc-500">AI Study Mentor</span>
                </motion.div>

                {/* Hero orb — new attractive avatar */}
                <motion.div
                  animate={{ y: [-2, 3, -2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative mx-auto mt-4 sm:mt-6 flex justify-center"
                >
                  <EchoAvatar variant="hero" />
                  <motion.div
                    animate={{ y: [0, -5, 0], rotate: [0, 10, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-2 -top-2"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-violet-100">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, 5, 0], x: [0, 3, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    className="absolute -left-3 bottom-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f0f10] border border-white/10 shadow-xl">
                      <BrainCircuit className="h-4 w-4 text-accent-400" />
                    </div>
                  </motion.div>
                  {/* extra twinkle */}
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                    className="absolute right-6 -bottom-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]"
                  />
                  <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    className="absolute left-8 -top-1 h-1 w-1 rounded-full bg-accent-300 shadow-[0_0_6px_rgba(56,177,255,0.8)]"
                  />
                </motion.div>

                <h1 className="mt-4 sm:mt-6 text-[24px] sm:text-[28px] font-black tracking-tight md:text-[34px]">
                  <span className="bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">Hi, I&apos;m </span>
                  <span className="bg-gradient-to-r from-accent-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Echo</span>
                  <span className="ml-1 inline-block animate-pulse text-accent-400">✦</span>
                </h1>
                <p className="mx-auto mt-2 sm:mt-3 max-w-[560px] text-[13px] sm:text-[14px] leading-relaxed text-zinc-400 md:text-[15px]">
                  Your AI study companion — I answer from your <span className="font-semibold text-zinc-200">real StudyShield data</span>: planner, backlog, revision, mocks & stats. Ask, upload a question, or speak.
                </p>

                {statsChips.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 sm:mt-6 grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {statsChips.map((chip, i) => (
                      <motion.div
                        key={chip.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 + i * 0.06 }}
                        whileHover={{ y: -2, scale: 1.02 }}
                        className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur px-2.5 sm:px-3 py-2.5 sm:py-3 text-left transition-colors hover:border-white/10 hover:bg-white/[0.06]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="relative flex items-center gap-1.5 sm:gap-2">
                          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06]">
                            <chip.icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", chip.color)} />
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-zinc-500 truncate">{chip.label}</span>
                        </div>
                        <div className="relative mt-1 sm:mt-1.5 text-[16px] sm:text-[18px] font-black tracking-tight text-white">{chip.value}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Suggested prompts — aesthetic pills */}
                <div className="mx-auto mt-4 sm:mt-7 max-w-[640px]">
                  <p className="mb-2 sm:mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Try asking</p>
                  <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {SUGGESTED_PROMPTS.map((p, i) => (
                      <motion.button
                        key={p}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => sendText(p)}
                        className="group relative inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-zinc-300 backdrop-blur transition-all hover:border-violet-500/30 hover:bg-gradient-to-br hover:from-accent-600/15 hover:to-violet-600/15 hover:text-white hover:shadow-[0_4px_16px_rgba(124,58,237,0.2)]"
                      >
                        <Sparkles className="h-3 w-3 text-zinc-500 transition-colors group-hover:text-violet-300" />
                        {p}
                      </motion.button>
                    ))}
                  </div>
                  <p className="mt-2 sm:mt-3 text-[11px] text-zinc-600 px-2 sm:px-0">Tip: paste, drag-drop or <span className="text-zinc-400">📷 snap</span> a question image — I solve it step-by-step</p>
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {showSetupNotice && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent px-4 py-3 backdrop-blur">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-amber-200 min-w-0">
                      {offlineReason.toLowerCase().includes("rate") || offlineReason.toLowerCase().includes("many requests") || offlineReason.toLowerCase().includes("busy") || offlineReason.toLowerCase().includes("too long") || offlineReason.toLowerCase().includes("hiccup") || offlineReason.toLowerCase().includes("timed out") ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 font-bold"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Echo is busy.</span> {offlineReason} You still got a data-driven answer below — wait ~20s and tap Retry for a fresh AI reply.
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1.5 font-bold"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Offline mentor mode.</span> {offlineReason} The mentor answered from your real data without an LLM. Deploy the <code className="rounded bg-amber-500/20 px-1 py-0.5 text-amber-100">mentor-chat</code> edge function and set an <code className="rounded bg-amber-500/20 px-1 py-0.5 text-amber-100">OPENROUTER_API_KEY</code> for full magic.
                        </>
                      )}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {(offlineReason.toLowerCase().includes("rate") || offlineReason.toLowerCase().includes("busy") || offlineReason.toLowerCase().includes("too long") || offlineReason.toLowerCase().includes("hiccup") || offlineReason.toLowerCase().includes("timed out")) && lastFailedText && (
                        <button onClick={handleRetry} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-400 disabled:opacity-40">
                          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry AI
                        </button>
                      )}
                      <button onClick={() => setShowSetupNotice(false)} aria-label="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-amber-300 hover:bg-white/10 hover:text-amber-200">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-transparent to-transparent px-4 py-3 backdrop-blur">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-red-200">
                      Mentor request failed{error.kind !== "unknown" ? ` — ${error.kind.replace(/_/g, " ")}` : ""}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-red-300/80">{error.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {error.retryable && (
                      <button onClick={handleRetry} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-40">
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry
                      </button>
                    )}
                    <button onClick={() => setError(null)} aria-label="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-red-300 hover:bg-white/10 hover:text-red-200">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {messages.length > visibleCount && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setVisibleCount((c) => Math.min(messages.length, c + VISIBLE_MESSAGES))}
                    className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-zinc-400 backdrop-blur transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                  >
                    Show earlier messages ({messages.length - visibleCount})
                  </button>
                </div>
              )}

              <div className="space-y-5">
                {visibleMessages.map((m, i) => {
                  const idx = baseIndex + i;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <ChatMessage
                        msg={m}
                        index={idx}
                        time={times[idx]}
                        streaming={streaming && idx === messages.length - 1 && m.role === "assistant"}
                        feedback={feedbackMap[idx] ?? null}
                        speaking={speakingIdx === idx}
                        onOpenImage={setLightbox}
                        onCopy={handleCopy}
                        onRegenerate={handleRegenerate}
                        onReadAloud={handleReadAloud}
                        onFeedback={handleFeedback}
                        onShare={handleShare}
                      />
                    </motion.div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <EchoAvatar variant="typing" pulse />
                      <div className="rounded-[20px] rounded-tl-md border border-white/[0.06] bg-[#0f0f10]/80 backdrop-blur-xl px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.24)]">
                        <TypingDots label={stageList[stageIdx] ?? "Echo is thinking…"} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Premium composer ─────────────────────────────────────────── */}
      <div className="relative shrink-0 border-t border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0a0a0c]/60 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-accent-600/[0.03] via-transparent to-transparent" />
        <div className="relative mx-auto w-full max-w-[960px] px-2.5 sm:px-3 py-2.5 sm:py-3 md:px-6 md:py-4">
          {planChange && (
            <div className="relative mb-3 overflow-hidden rounded-2xl border border-accent-500/20 bg-gradient-to-br from-accent-600/10 via-violet-600/10 to-transparent backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />
              <div className="relative flex items-start gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-600 to-violet-600 shadow-lg shadow-accent-600/20">
                  <BrainCircuit className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">Planner updated</p>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">AUTO-APPLIED</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-zinc-400">Echo understood your message and applied it to your AI Planner. Review and undo if needed.</p>
                  <ul className="mt-2 space-y-1">
                    {planChange.summary.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-zinc-300">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" /> {s}
                      </li>
                    ))}
                  </ul>
                  {planChange.errors.length > 0 && (
                    <p className="mt-2 rounded-lg border border-warning-500/20 bg-warning-500/10 px-2.5 py-1.5 text-[11px] font-medium text-warning-300">
                      {planChange.errors.length} change{planChange.errors.length > 1 ? "s" : ""} skipped — {planChange.errors[0]}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      const d = (planChange.change.changes.find((c) => (c as { date?: string }).date) as { date?: string } | undefined)?.date ?? new Date().toISOString().slice(0, 10);
                      navigate(`/planner?date=${d}&from=mentor`);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white backdrop-blur transition-all hover:border-white/10 hover:bg-white/[0.08]"
                  >
                    View in AI Planner <ArrowLeft className="h-3 w-3 rotate-180" />
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {planBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
                  ) : (
                    <>
                      <button onClick={handleUndoPlanChange} className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] hover:text-white">
                        Undo
                      </button>
                      <button onClick={() => setPlanChange(null)} aria-label="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-white">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {pendingImage && (
            <ImagePreviewPanel
              image={pendingImage}
              preparing={preparing}
              onCropZoom={() => setCropOpen(true)}
              onReplace={() => fileInputRef.current?.click()}
              onRemove={() => setPendingImage(null)}
              onSolve={() => handleSolve()}
            />
          )}

          {/* ── Mic listening animation + pause/end controls ───────────── */}
          <AnimatePresence>
            {micListening && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "mb-3 flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-lg",
                  micPaused
                    ? "border-warning-500/30 bg-warning-600/10"
                    : "border-accent-500/30 bg-accent-600/10"
                )}
              >
                {/* Pulsing mic icon + waveform */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                  {/* Ripple rings */}
                  {!micPaused && (
                    <>
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-accent-500/25"
                        animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-accent-500/20"
                        animate={{ scale: [1, 1.9], opacity: [0.4, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                      />
                    </>
                  )}
                  <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-full", micPaused ? "bg-warning-500/20 text-warning-300" : "bg-accent-600 text-white")}>
                    {micPaused ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </div>
                </div>

                {/* Center: status + waveform + timer */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-semibold", micPaused ? "text-warning-200" : "text-white")}>
                      {micPaused ? "Paused" : "Listening…"}
                    </p>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums", micPaused ? "bg-warning-500/20 text-warning-300" : "bg-accent-500/20 text-accent-300")}>
                      {String(Math.floor(micElapsed / 60)).padStart(2, "0")}:{String(micElapsed % 60).padStart(2, "0")}
                    </span>
                    {!micPaused && <span className="hidden text-[11px] text-slate-400 sm:inline">Speak clearly • AI is listening</span>}
                  </div>
                  {/* Waveform bars — real mic level when available, fake animation as fallback */}
                  <div className="mt-1.5 flex items-end gap-1">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const realActive = !!analyserRef.current && !micPaused;
                      const realHeight = realActive ? Math.max(6, 6 + micLevel * (28 - i * 2.5) + (micLevel > 0.02 ? Math.random() * 4 : 0)) : 12;
                      return (
                        <motion.span
                          key={i}
                          className={cn("w-1 rounded-full", micPaused ? "bg-warning-400/60" : "bg-accent-400")}
                          animate={
                            micPaused
                              ? { height: 6, opacity: 0.5 }
                              : realActive
                                ? { height: realHeight, opacity: 1 }
                                : { height: [6, 18 + Math.sin(i) * 8, 10, 22 - i * 2, 8] }
                          }
                          transition={
                            micPaused
                              ? { duration: 0.2 }
                              : realActive
                                ? { duration: 0.08, ease: "easeOut" }
                                : { duration: 0.6 + i * 0.08, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: i * 0.07 }
                          }
                          style={{ height: 12 }}
                        />
                      );
                    })}
                    <span className="ml-2 truncate text-xs text-slate-400">
                      {micPaused ? "Tap Resume to continue" : "Tap Pause to take a breath"}
                    </span>
                  </div>
                </div>

                {/* Controls: Pause/Resume • Stop (End) • Cancel */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {!micPaused ? (
                    <button
                      onClick={handleMicPause}
                      aria-label="Pause listening"
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={handleMicResume}
                      aria-label="Resume listening"
                      className="flex items-center gap-1.5 rounded-full bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-500"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" /> Resume
                    </button>
                  )}
                  <button
                    onClick={handleMicStop}
                    aria-label="End and keep text"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-900 hover:bg-slate-100"
                    title="End & keep transcript"
                  >
                    <Square className="h-3.5 w-3.5 fill-ink-900" />
                  </button>
                  <button
                    onClick={handleMicCancel}
                    aria-label="Cancel voice input"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="group relative flex items-end gap-1 sm:gap-1.5 rounded-[20px] sm:rounded-[24px] border border-white/[0.06] bg-[#0f0f10]/90 px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl transition-all focus-within:border-violet-500/30 focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(124,58,237,0.2)]">
            <div className="absolute inset-0 rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none opacity-0 transition-opacity group-focus-within:opacity-100" />
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload image"
              title="Upload image (JPG · PNG · WEBP)"
              className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.03] text-zinc-400 backdrop-blur transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white hover:scale-105 active:scale-95"
            >
              <Paperclip className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
            <button
              onClick={openCamera}
              aria-label="Take photo"
              title="Take a photo (camera or upload)"
              className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.04] bg-white/[0.03] text-zinc-400 backdrop-blur transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white hover:scale-105 active:scale-95"
            >
              <Camera className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
            <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              {/* Ripple when actively listening (not paused) */}
              {micListening && !micPaused && (
                <>
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-500 to-violet-600 opacity-30"
                    animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-accent-500/15"
                    animate={{ scale: [1, 1.85], opacity: [0.35, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.35 }}
                  />
                </>
              )}
              <button
                onClick={toggleMic}
                aria-label={micListening ? (micPaused ? "Resume voice input" : "Stop voice input") : "Voice input"}
                title={micListening ? (micPaused ? "Resume" : "Stop") : micSupported ? "Voice input" : "Voice input not supported"}
                className={cn(
                  "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95",
                  micListening
                    ? micPaused
                      ? "border-warning-500/20 bg-warning-500/15 text-warning-300"
                      : "border-accent-500/30 bg-gradient-to-br from-accent-600 to-violet-600 text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)]"
                    : "border-white/[0.04] bg-white/[0.03] text-zinc-400 backdrop-blur hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                {micListening ? (micPaused ? <MicOff className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> : <Mic className="h-4 w-4 sm:h-4.5 sm:w-4.5" />) : <Mic className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
              </button>
            </span>
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={micListening ? (micPaused ? "Paused — resume or end…" : "Listening… speak now") : pendingImage ? "Add a hint or question (optional)…" : "Ask Echo anything…"}
              aria-label="Message your mentor"
              className="max-h-[144px] min-w-0 flex-1 resize-none bg-transparent px-1.5 sm:px-2 py-2 text-[14px] sm:text-[15px] leading-6 text-white placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={busy || (!input.trim() && !pendingImage)}
              aria-label="Send message"
              className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent-600 to-violet-600 text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] transition-all hover:from-accent-500 hover:to-violet-500 hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 transition-opacity hover:opacity-100" />
              {sending || preparing ? <Loader2 className="relative h-4 w-4 sm:h-4.5 sm:w-4.5 animate-spin" /> : <Send className="relative h-4 w-4 sm:h-4.5 sm:w-4.5 ml-[1px]" />}
            </button>
          </div>
          <p className="mt-2 sm:mt-2.5 hidden sm:flex items-center justify-center gap-1.5 text-center text-[10px] sm:text-[11px] font-medium tracking-wide text-zinc-600">
            Enter to send · Shift+Enter for a new line · paste, drop or attach an image to solve
          </p>
          <p className="mt-1.5 sm:hidden text-center text-[10px] font-medium tracking-wide text-zinc-600">Tap send or paste an image to solve</p>
        </div>
      </div>

      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[#070708]/80 backdrop-blur-md">
          <div className="relative overflow-hidden rounded-[24px] border-2 border-dashed border-violet-500/50 bg-[#0f0f10]/90 px-10 py-10 text-center shadow-[0_16px_48px_rgba(124,58,237,0.25)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-accent-500/10 to-transparent" />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-accent-600 shadow-lg">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <p className="mt-3 text-sm font-bold text-white">Drop image to solve</p>
              <p className="mt-1 text-xs font-medium text-zinc-400">JPG · PNG · WEBP · up to 10 MB</p>
              <p className="mt-2 text-[11px] text-zinc-500">I&apos;ll read your question and solve step-by-step ✨</p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs — use sr-only technique so programmatic .click() works across browsers (display:none blocks it on iOS) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        onChange={onFileInput}
        aria-hidden
        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", borderWidth: 0 }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        onChange={onFileInput}
        aria-hidden
        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", borderWidth: 0 }}
      />

      {cropOpen && pendingImage && (
        <CropDialog
          src={pendingImage.dataUrl}
          alt={pendingImage.fileName}
          onCancel={() => setCropOpen(false)}
          onSave={(dataUrl) => {
            setPendingImage((p) => (p ? { ...p, dataUrl } : p));
            setCropOpen(false);
          }}
        />
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={() => setLightbox(null)}
          >
            <button
              autoFocus
              onClick={() => setLightbox(null)}
              aria-label="Close image preview"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightbox}
              alt="Uploaded question image"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Camera capture modal (getUserMedia) ───────────────────────── */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] flex flex-col items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Camera capture"
            onClick={closeCamera}
          >
            <div
              className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-ink-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">Take a photo</p>
                <button onClick={closeCamera} aria-label="Close camera" className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                    <span className="ml-2 text-sm text-white">Starting camera…</span>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 p-6 text-center">
                    <p className="text-sm text-slate-300">{cameraError}</p>
                    <button
                      onClick={() => {
                        closeCamera();
                        cameraInputRef.current?.click();
                      }}
                      className="mt-4 rounded-full bg-accent-600 px-5 py-2 text-sm font-medium text-white hover:bg-accent-500"
                    >
                      Choose from gallery
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 p-4">
                <button
                  onClick={closeCamera}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={captureFromCamera}
                  disabled={!cameraReady || !!cameraError}
                  className="flex items-center gap-2 rounded-full bg-accent-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Camera className="h-4 w-4" /> Capture
                </button>
                <button
                  onClick={() => {
                    closeCamera();
                    fileInputRef.current?.click();
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
                >
                  Upload
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete chat confirmation ─────────────────────────────── */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Delete chat confirmation"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger-600/20">
                <Trash2 className="h-5 w-5 text-danger-400" />
              </div>
              <h3 className="text-center text-base font-semibold text-white">Delete this chat?</h3>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-slate-400">
                This will permanently delete the conversation and its messages. This cannot be undone.
              </p>
              {(() => {
                const t = threads.find((x) => x.id === confirmDeleteId);
                return t ? <p className="mt-3 truncate rounded-lg bg-white/5 px-3 py-2 text-center text-xs text-slate-300">“{t.title}”</p> : null;
              })()}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteThread(confirmDeleteId)}
                  disabled={deletingId === confirmDeleteId}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger-600 py-2.5 text-sm font-semibold text-white hover:bg-danger-500 disabled:opacity-50"
                >
                  {deletingId === confirmDeleteId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExamIntakePopup
        open={!!examPopupInfo}
        examInfo={examPopupInfo ? { subject: examPopupInfo.subject, examLabel: examPopupInfo.examLabel, examISO: examPopupInfo.examISO, beforeISO: examPopupInfo.beforeISO, beforeLabel: examPopupInfo.beforeLabel } : null}
        onClose={handleExamPopupClose}
        onConfirm={handleExamPopupConfirm}
        busy={examPopupBusy}
      />
    </div>
    </>
  );
}
