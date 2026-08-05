import { useEffect, useState } from "react";
import { BookMarked, Loader2, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/db";
import { Card, CardBody, EmptyState } from "../../components/ui";
import { CHAPTER_STATUS_OPTIONS, CHAPTER_STATUS_LABELS } from "../../lib/constants";
import type { ChapterStatus, Priority, SyllabusSubject, UserChapter } from "../../lib/types";

// Statuses that carry pending work counts the planner consumes.
const DETAIL_STATUSES = new Set<ChapterStatus>([
  "backlog", "dpp_pending", "module_pending", "pyq_pending", "revision_pending",
]);

interface PendingCounts {
  lectures: number;
  dpps: number;
  modules: number;
  pyqs: number;
  revisions: number;
  priority: Priority;
}

function defaultCountsFor(status: ChapterStatus): PendingCounts {
  switch (status) {
    case "backlog": return { lectures: 2, dpps: 1, modules: 20, pyqs: 1, revisions: 0, priority: "high" };
    case "dpp_pending": return { lectures: 0, dpps: 1, modules: 0, pyqs: 0, revisions: 0, priority: "medium" };
    case "module_pending": return { lectures: 0, dpps: 0, modules: 20, pyqs: 0, revisions: 0, priority: "medium" };
    case "pyq_pending": return { lectures: 0, dpps: 0, modules: 0, pyqs: 1, revisions: 0, priority: "medium" };
    case "revision_pending": return { lectures: 0, dpps: 0, modules: 0, pyqs: 0, revisions: 1, priority: "medium" };
    default: return { lectures: 0, dpps: 0, modules: 0, pyqs: 0, revisions: 0, priority: "medium" };
  }
}

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className="shrink-0">{label}</span>
      <input
        type="number" min={0} max={100} step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value || 0)))}
        className="input-base !w-16 !px-2 !py-1 text-xs"
      />
    </label>
  );
}

export default function SubjectManager() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<SyllabusSubject[]>([]);
  const [chapters, setChapters] = useState<Record<string, { id: string; name: string }[]>>({});
  const [ucs, setUcs] = useState<UserChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [pendingFor, setPendingFor] = useState<string | null>(null);
  const [counts, setCounts] = useState<PendingCounts | null>(null);
  const [saving, setSaving] = useState(false);

  // Refetch the syllabus whenever the target exam changes. The fetch is
  // inlined in the effect (React's documented fetch-on-mount shape); the
  // loading flip happens during render when the exam changes so the spinner
  // shows immediately.
  const [prevExam, setPrevExam] = useState<string | null | undefined>(profile?.target_exam);
  if (prevExam !== profile?.target_exam) {
    setPrevExam(profile?.target_exam);
    setLoading(true);
  }

  useEffect(() => {
    const target = profile?.target_exam;
    if (!target) return;
    let cancelled = false;
    (async () => {
      try {
        const subs = await db.getSubjects(target);
        if (cancelled) return;
        setSubjects(subs);
        const map: Record<string, { id: string; name: string }[]> = {};
        await Promise.all(subs.map(async (s) => { map[s.id] = (await db.getChapters(s.id)).map((c) => ({ id: c.id, name: c.name })); }));
        if (cancelled) return;
        setChapters(map);
        setUcs(await db.getUserChapters());
        if (subs[0]) setActiveSubject(subs[0].id);
      } catch { if (!cancelled) setSubjects([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [profile?.target_exam]);

  async function setStatus(subject: string, chapter: string, status: ChapterStatus) {
    const key = `${subject}|${chapter}`;
    if (DETAIL_STATUSES.has(status)) {
      setPendingFor(key);
      setCounts(defaultCountsFor(status));
      return;
    }
    setPendingFor(null);
    setCounts(null);
    try {
      await db.upsertUserChapter({ exam: profile!.target_exam!, subject, chapter, status });
      setUcs(await db.getUserChapters());
    } catch (err) { console.error("[subjects] setStatus threw", err); }
  }

  async function applyCounts(subject: string, chapter: string, status: ChapterStatus) {
    if (!counts) return;
    setSaving(true);
    try {
      await db.saveChapterProgress({
        exam: profile!.target_exam!,
        subject, chapter, status,
        lectures_remaining: counts.lectures,
        dpp_pending: counts.dpps,
        pyq_pending: counts.pyqs,
        revision_pending: counts.revisions,
        module_pct: counts.modules > 0 ? Math.max(0, 100 - counts.modules) : undefined,
        priority: counts.priority,
      });
      setUcs(await db.getUserChapters());
      setPendingFor(null);
      setCounts(null);
    } catch (err) { console.error("[subjects] applyCounts threw", err); }
    finally { setSaving(false); }
  }

  const statusFor = (subject: string, chapter: string): ChapterStatus => ucs.find((u) => u.subject === subject && u.chapter === chapter)?.status ?? "not_started";
  const active = subjects.find((s) => s.id === activeSubject);
  const activeChapters = active ? chapters[active.id] ?? [] : [];

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-white flex items-center gap-2"><BookMarked className="w-5 h-5 text-accent-400" /> Subjects</h1><p className="text-sm text-slate-500 mt-0.5">Mark chapters in progress or backlog — the AI planner schedules lectures, modules, DPPs and PYQs from what you set.</p></div>
      {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-accent-500 animate-spin" /></div> :
       subjects.length === 0 ? <EmptyState icon={<BookMarked className="w-8 h-8" />} title="No syllabus" description="Set a target exam in settings to load your syllabus." /> : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            {subjects.map((s) => (
              <button key={s.id} onClick={() => setActiveSubject(s.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${activeSubject === s.id ? "bg-accent-600/15 text-accent-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{s.name}</button>
            ))}
          </div>
          <div className="md:col-span-3 space-y-2">
            {activeChapters.length === 0 ? <EmptyState title="No chapters" description="No chapters found for this subject." /> : activeChapters.map((c) => {
              const subject = active?.name ?? "";
              const st = statusFor(subject, c.name);
              const key = `${subject}|${c.name}`;
              const editing = pendingFor === key;
              return (
                <Card key={c.id}><CardBody className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-200 truncate">{c.name}</p>
                    <select className="select-base w-auto text-xs py-1" value={st} onChange={(e) => setStatus(subject, c.name, e.target.value as ChapterStatus)}>
                      {CHAPTER_STATUS_OPTIONS.map((o) => <option key={o} value={o} className="bg-slate-900 text-white">{CHAPTER_STATUS_LABELS[o]}</option>)}
                    </select>
                  </div>
                  {editing && counts && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                      <span className="text-xs font-semibold text-accent-400">Pending work:</span>
                      {counts.lectures > 0 || st === "backlog" ? <NumField label="Lectures" value={counts.lectures} onChange={(v) => setCounts({ ...counts, lectures: v })} /> : null}
                      {counts.dpps > 0 || st === "backlog" ? <NumField label="DPPs" value={counts.dpps} onChange={(v) => setCounts({ ...counts, dpps: v })} /> : null}
                      {counts.modules > 0 || st === "backlog" ? <NumField label="Module Qs" value={counts.modules} onChange={(v) => setCounts({ ...counts, modules: v })} step={5} /> : null}
                      {counts.pyqs > 0 || st === "backlog" ? <NumField label="PYQs" value={counts.pyqs} onChange={(v) => setCounts({ ...counts, pyqs: v })} /> : null}
                      {counts.revisions > 0 || st === "backlog" ? <NumField label="Revisions" value={counts.revisions} onChange={(v) => setCounts({ ...counts, revisions: v })} /> : null}
                      <select className="select-base w-auto !px-2 text-xs py-1" value={counts.priority} onChange={(e) => setCounts({ ...counts, priority: e.target.value as Priority })}>
                        <option value="low" className="bg-slate-900 text-white">Low</option>
                        <option value="medium" className="bg-slate-900 text-white">Medium</option>
                        <option value="high" className="bg-slate-900 text-white">High</option>
                        <option value="critical" className="bg-slate-900 text-white">Critical</option>
                      </select>
                      <button onClick={() => applyCounts(subject, c.name, st)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-accent-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-500 transition-colors disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Apply"}
                      </button>
                      <button onClick={() => { setPendingFor(null); setCounts(null); }} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                    </div>
                  )}
                </CardBody></Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
