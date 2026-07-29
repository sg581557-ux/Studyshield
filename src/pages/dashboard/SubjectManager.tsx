import { useEffect, useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/db";
import { Card, CardBody, EmptyState } from "../../components/ui";
import { CHAPTER_STATUS_OPTIONS, CHAPTER_STATUS_LABELS, CHAPTER_STATUS_COLORS } from "../../lib/constants";
import type { ChapterStatus, SyllabusSubject, UserChapter } from "../../lib/types";

export default function SubjectManager() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<SyllabusSubject[]>([]);
  const [chapters, setChapters] = useState<Record<string, { id: string; name: string }[]>>({});
  const [ucs, setUcs] = useState<UserChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => { load(); }, [profile?.target_exam]);
  async function load() {
    if (!profile?.target_exam) { setLoading(false); return; }
    setLoading(true);
    try {
      const subs = await db.getSubjects(profile.target_exam);
      setSubjects(subs);
      const map: Record<string, { id: string; name: string }[]> = {};
      await Promise.all(subs.map(async (s) => { map[s.id] = (await db.getChapters(s.id)).map((c) => ({ id: c.id, name: c.name })); }));
      setChapters(map);
      setUcs(await db.getUserChapters());
      if (subs[0]) setActiveSubject(subs[0].id);
    } catch { setSubjects([]); }
    finally { setLoading(false); }
  }

  async function setStatus(subject: string, chapter: string, status: ChapterStatus) {
    try { await db.upsertUserChapter({ exam: profile!.target_exam!, subject, chapter, status }); setUcs(await db.getUserChapters()); }
    catch (err) { console.error("[subjects] setStatus threw", err); }
  }

  const statusFor = (subject: string, chapter: string): ChapterStatus => ucs.find((u) => u.subject === subject && u.chapter === chapter)?.status ?? "not_started";
  const active = subjects.find((s) => s.id === activeSubject);
  const activeChapters = active ? chapters[active.id] ?? [] : [];

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-white flex items-center gap-2"><BookMarked className="w-5 h-5 text-accent-400" /> Subjects</h1><p className="text-sm text-slate-500 mt-0.5">Track chapter progress across your syllabus.</p></div>
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
              const st = statusFor(active?.name ?? "", c.name);
              return (
                <Card key={c.id}><CardBody className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-200 truncate">{c.name}</p>
                  <select className="select-base w-auto text-xs py-1" value={st} onChange={(e) => setStatus(active?.name ?? "", c.name, e.target.value as ChapterStatus)}>
                    {CHAPTER_STATUS_OPTIONS.map((o) => <option key={o} value={o} className="bg-slate-900 text-white">{CHAPTER_STATUS_LABELS[o]}</option>)}
                  </select>
                </CardBody></Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
