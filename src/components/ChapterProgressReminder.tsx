import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, CheckCircle2, ChevronRight, PlayCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { db } from "../services/db";
import { Modal, Button, Card, CardBody } from "./ui";
import {
  loadReminderState, isReminderEligible, markReminderShown, snoozeReminder,
  fastTrackChapter, type ChapterReminderState,
} from "../services/chapterReminder";
import { backlogExamFamily } from "../lib/backlogMeta";
import { todayISODate } from "../lib/constants";
import type { PlanTask, SyllabusSubject, SyllabusChapter, UserChapter, ChapterStatus } from "../lib/types";

type Phase = "hidden" | "ask" | "update";

interface SubjectRow {
  subject: SyllabusSubject;
  chapters: SyllabusChapter[];
  current: SyllabusChapter | null;
  next: SyllabusChapter | null;
}

const IN_PROGRESS: ChapterStatus[] = ["in_progress", "started"];

export default function ChapterProgressReminder() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("hidden");
  const [fastTrack, setFastTrack] = useState(false);
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const stateRef = useRef<ChapterReminderState>(loadReminderState());
  const [stateVersion, setStateVersion] = useState(0);

  const examFamily = useMemo(() => backlogExamFamily(profile?.target_exam ?? ""), [profile?.target_exam]);

  const loadRows = useCallback(async (): Promise<SubjectRow[]> => {
    if (!profile) return [];
    const subjects = await db.getSubjects(profile.target_exam ?? "").catch(() => [] as SyllabusSubject[]);
    const all = await Promise.all(subjects.map((s) => db.getChapters(s.id).catch(() => [] as SyllabusChapter[])));
    const ucs = (await db.getUserChapters().catch(() => [] as UserChapter[])).filter(
      (u) => backlogExamFamily(u.exam) === examFamily,
    );
    return subjects.map((s, i) => {
      const chapters = all[i] ?? [];
      const ordered = chapters.slice().sort((a, b) => a.display_order - b.display_order);
      const statusFor = (name: string): ChapterStatus | null => ucs.find((u) => u.subject === s.name && u.chapter === name)?.status ?? null;
      let current: SyllabusChapter | null = null;
      for (const c of ordered) {
        const st = statusFor(c.name);
        if (st && IN_PROGRESS.includes(st)) { current = c; break; }
      }
      const currentIdx = current ? ordered.indexOf(current) : -1;
      let next: SyllabusChapter | null = null;
      if (current) {
        for (let i = currentIdx + 1; i < ordered.length; i++) {
          const st = statusFor(ordered[i].name);
          if (!st || st === "not_started") { next = ordered[i]; break; }
        }
      } else {
        next = ordered[0] ?? null;
      }
      return { subject: s, chapters: ordered, current, next };
    }).filter((r) => r.chapters.length > 0);
  }, [profile, examFamily]);

  // Evaluate eligibility: cadence passed → show; fast-track (chapter ≥80% done
  // today) → show; re-check once a minute while hidden.
  useEffect(() => {
    if (!profile?.onboarding_completed) return;
    let cancelled = false;

    async function check() {
      if (cancelled || phase !== "hidden") return;
      if (!isReminderEligible(stateRef.current)) return;
      const todayTasks = await db.getTasksForDate(todayISODate()).catch(() => [] as PlanTask[]);
      const grouped = new Map<string, { done: number; total: number }>();
      for (const t of todayTasks) {
        if (!t.subject || !t.chapter || t.type === "break") continue;
        const key = `${t.subject}|${t.chapter}`;
        const g = grouped.get(key) ?? { done: 0, total: 0 };
        g.total += 1;
        const st = t.task_status ?? (t.completed ? "completed" : "pending");
        if (st === "completed") g.done += 1;
        grouped.set(key, g);
      }
      const fastTrackNow = Array.from(grouped.values()).some((g) => fastTrackChapter(g.done, g.total));
      const rows = await loadRows();
      if (cancelled) return;
      if (rows.length === 0) return; // no syllabus — nothing to update
      if (isReminderEligible(stateRef.current)) {
        setFastTrack(fastTrackNow);
        setPhase("ask");
      }
    }

    void check();
    const iv = window.setInterval(check, 60_000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [profile?.onboarding_completed, phase, stateVersion, loadRows]);

  useEffect(() => {
    if (phase !== "update") return;
    void loadRows().then((r) => setRows(r));
  }, [phase, loadRows]);

  function openUpdate() {
    stateRef.current = markReminderShown(stateRef.current);
    setStateVersion((v) => v + 1);
    setPhase("update");
  }
  function remindTomorrow() {
    stateRef.current = snoozeReminder(stateRef.current);
    setStateVersion((v) => v + 1);
    setPhase("hidden");
    toast.info("Reminder set for tomorrow.");
  }
  function skipWeek() {
    stateRef.current = markReminderShown(stateRef.current);
    setStateVersion((v) => v + 1);
    setPhase("hidden");
    toast.info("Skipped — I'll check again next week.");
  }
  function closeAll() {
    setPhase("hidden");
  }

  async function setStatus(row: SubjectRow, chapter: SyllabusChapter, status: ChapterStatus) {
    if (!profile) return;
    const key = `${row.subject.name}|${chapter.name}`;
    setBusyKey(key);
    try {
      await db.upsertUserChapter({
        exam: profile.target_exam ?? "",
        subject: row.subject.name,
        chapter: chapter.name,
        status,
        confidence: status === "completed" ? 4 : 3,
      });
      const updated = await loadRows();
      setRows(updated);
      toast.success(status === "completed" ? `Completed: ${chapter.name}` : `Started: ${chapter.name}`);
    } catch (err) {
      console.error("[ChapterProgressReminder] upsert threw", err);
      toast.error("Update failed — try again.");
    } finally {
      setBusyKey(null);
    }
  }

  if (phase === "hidden") return null;

  return (
    <Modal open onClose={phase === "update" ? closeAll : skipWeek} title={phase === "ask" ? "Keep your AI Planner accurate 📚" : "Quick chapter update"}>
      {phase === "ask" ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-600/20 flex items-center justify-center shrink-0"><BookMarked className="w-5 h-5 text-accent-400" /></div>
            <div>
              <p className="text-sm text-slate-300">
                {fastTrack ? "Looks like you just finished a chapter's planned tasks — tell me where you are so the next plan picks up correctly." : "Your planner works best when it knows where you are in your syllabus. A quick check takes under 30 seconds."}
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5">Shown at most once a week — only when a chapter is progressing or long overdue for an update.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={openUpdate}><CheckCircle2 className="w-4 h-4" /> Update Now</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" onClick={remindTomorrow}>Remind Me Tomorrow</Button>
              <Button variant="ghost" size="sm" onClick={skipWeek}>Skip This Week</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Move each subject's current chapter forward — <span className="text-slate-300">Completed ✓</span> or <span className="text-slate-300">Start Now ▶</span>.</p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {rows.length === 0 && (
              <Card><CardBody><p className="text-sm text-slate-400">Loading your syllabus…</p></CardBody></Card>
            )}
            {rows.map((row) => (
              <Card key={row.subject.id}><CardBody className="space-y-2">
                <p className="text-sm font-semibold text-white">{row.subject.name}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Current</p>
                      <p className="text-xs text-slate-300 truncate">{row.current ? row.current.name : "Not started yet"}</p>
                    </div>
                    {row.current && (
                      <Button size="sm" variant="ghost" loading={busyKey === `${row.subject.name}|${row.current.name}`} onClick={() => setStatus(row, row.current as SyllabusChapter, "completed")}>
                        Completed
                      </Button>
                    )}
                  </div>
                  {row.next && row.current && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Next</p>
                        <p className="text-xs text-slate-300 truncate">{row.next.name}</p>
                      </div>
                      <Button size="sm" variant="ghost" loading={busyKey === `${row.subject.name}|${row.next.name}`} onClick={() => setStatus(row, row.next as SyllabusChapter, "in_progress")}>
                        Start Now
                      </Button>
                    </div>
                  )}
                  {!row.current && row.next && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">First chapter</p>
                        <p className="text-xs text-slate-300 truncate">{row.next.name}</p>
                      </div>
                      <Button size="sm" variant="ghost" loading={busyKey === `${row.subject.name}|${row.next.name}`} onClick={() => setStatus(row, row.next as SyllabusChapter, "in_progress")}>
                        <PlayCircle className="w-3.5 h-3.5" /> Start
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody></Card>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-600">Updates apply to your next plan immediately.</p>
            <Button size="sm" onClick={closeAll}><X className="w-4 h-4" /> Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
