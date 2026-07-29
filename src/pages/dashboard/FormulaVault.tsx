import { useEffect, useMemo, useState } from "react";
import { Sigma, Search, Star, Loader2, Copy, Share2, Printer, Download } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/db";
import { Card, CardBody, EmptyState } from "../../components/ui";
import type { Formula } from "../../lib/types";

const RECENT_KEY = "studyshield.formula.recent";

export default function FormulaVault() {
  const { profile } = useAuth();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const [exam, setExam] = useState<string>("all");
  const [chapter, setChapter] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(RECENT_KEY);
        if (raw) setRecentIds(JSON.parse(raw));
      } catch {
        setRecentIds([]);
      }
    }
    load();
  }, [profile?.target_exam]);

  async function load() {
    if (!profile?.target_exam) { setLoading(false); return; }
    setLoading(true);
    try {
      const [f, b] = await Promise.all([db.getFormulasForExam(profile.target_exam), db.getBookmarks()]);
      setFormulas(f);
      setBookmarks(new Set(b.map((x) => x.formula_id)));
    } catch { setFormulas([]); }
    finally { setLoading(false); }
  }

  const exams = useMemo(() => ["all", ...Array.from(new Set(formulas.map((f) => f.exam_id || f.exam || "General")))], [formulas]);
  const subjects = useMemo(() => ["all", ...Array.from(new Set(formulas.filter((f) => (exam === "all" || (f.exam_id || f.exam || "General") === exam)).map((f) => f.subject)))], [formulas, exam]);
  const chapters = useMemo(() => ["all", ...Array.from(new Set(formulas.filter((f) => (exam === "all" || (f.exam_id || f.exam || "General") === exam) && (subject === "all" || f.subject === subject)).map((f) => f.chapter)))], [formulas, exam, subject]);
  const difficulties = useMemo(() => ["all", ...Array.from(new Set(formulas.map((f) => String(f.difficulty || "medium"))))], [formulas]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return formulas.filter((f) => {
      const examKey = f.exam_id || f.exam || "General";
      if (exam !== "all" && examKey !== exam) return false;
      if (subject !== "all" && f.subject !== subject) return false;
      if (chapter !== "all" && f.chapter !== chapter) return false;
      if (difficulty !== "all" && String(f.difficulty || "medium").toLowerCase() !== difficulty.toLowerCase()) return false;
      if (favoritesOnly && !bookmarks.has(f.id)) return false;
      if (recentOnly && !recentIds.includes(f.id)) return false;
      if (!query) return true;
      const haystack = [f.name, f.expression, f.subject, f.chapter, f.explanation, f.shortcut, ...(f.keywords || []), ...(f.exam_tags || []), ...(f.common_mistakes || [])].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [formulas, exam, subject, chapter, difficulty, favoritesOnly, recentOnly, bookmarks, recentIds, q]);

  function markRecent(id: string) {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, 12);
      if (typeof window !== "undefined") {
        try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }

  async function toggleBookmark(id: string) {
    try { if (bookmarks.has(id)) { await db.removeBookmark(id); setBookmarks((p) => { const n = new Set(p); n.delete(id); return n; }); } else { await db.addBookmark(id); setBookmarks((p) => new Set(p).add(id)); } }
    catch (err) { console.error("[formulas] bookmark threw", err); }
  }

  async function copyFormula(formula: Formula) {
    const text = `${formula.name}\n${formula.expression}\n\n${formula.explanation}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else window.prompt("Copy this formula", text);
      markRecent(formula.id);
    } catch (err) { console.error("[formulas] copy threw", err); }
  }

  async function shareFormula(formula: Formula) {
    const text = `${formula.name} • ${formula.expression}`;
    try {
      if (navigator.share) await navigator.share({ title: formula.name, text });
      else await copyFormula(formula);
      markRecent(formula.id);
    } catch (err) { console.error("[formulas] share threw", err); }
  }

  function printFormula(formula: Formula) {
    markRecent(formula.id);
    window.print();
  }

  function exportChapter(formula: Formula) {
    const blob = new Blob([`${formula.name}\n${formula.expression}\n\n${formula.explanation}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${formula.subject}-${formula.chapter}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-white flex items-center gap-2"><Sigma className="w-5 h-5 text-accent-400" /> Formula Vault</h1><p className="text-sm text-slate-500 mt-0.5">Browse, search and bookmark formulas for your exam.</p></div>
      <Card><CardBody className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input className="input-base pl-9" placeholder="Search formulas, variables, chapters, exams…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2">
            <select className="select-base w-auto" value={exam} onChange={(e) => { setExam(e.target.value); setSubject("all"); setChapter("all"); }}><option value="all" className="bg-slate-900 text-white">All exams</option>{exams.filter((item) => item !== "all").map((item) => <option key={item} value={item} className="bg-slate-900 text-white">{item}</option>)}</select>
            <select className="select-base w-auto" value={subject} onChange={(e) => { setSubject(e.target.value); setChapter("all"); }}>{subjects.map((s) => <option key={s} value={s} className="bg-slate-900 text-white">{s === "all" ? "All subjects" : s}</option>)}</select>
            <select className="select-base w-auto" value={chapter} onChange={(e) => setChapter(e.target.value)}>{chapters.map((c) => <option key={c} value={c} className="bg-slate-900 text-white">{c === "all" ? "All chapters" : c}</option>)}</select>
            <select className="select-base w-auto" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>{difficulties.map((d) => <option key={d} value={d} className="bg-slate-900 text-white">{d === "all" ? "All levels" : d}</option>)}</select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => setFavoritesOnly((v) => !v)} className={`rounded-full px-3 py-1.5 border transition-colors ${favoritesOnly ? "border-warning-400/40 bg-warning-400/10 text-warning-300" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>Favorites</button>
          <button onClick={() => setRecentOnly((v) => !v)} className={`rounded-full px-3 py-1.5 border transition-colors ${recentOnly ? "border-accent-400/40 bg-accent-400/10 text-accent-300" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>Recently viewed</button>
        </div>
      </CardBody></Card>
      {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-accent-500 animate-spin" /></div> :
       filtered.length === 0 ? <EmptyState icon={<Sigma className="w-8 h-8" />} title="No formulas" description="No formulas match your search." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((f) => (
            <Card key={f.id} className="border border-white/10 bg-[#08090d]/90"><CardBody>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{f.subject} · {f.chapter} · {String(f.difficulty || "medium").toLowerCase()}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{f.name}</p>
                </div>
                <button onClick={() => toggleBookmark(f.id)} className={`shrink-0 ${bookmarks.has(f.id) ? "text-warning-400" : "text-slate-600 hover:text-warning-400"}`}><Star className={`w-4 h-4 ${bookmarks.has(f.id) ? "fill-warning-400" : ""}`} /></button>
              </div>
              <p className="mt-2 font-mono text-sm text-accent-300">{f.expression}</p>
              {f.explanation && <p className="text-xs text-slate-500 mt-2">{f.explanation}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { markRecent(f.id); copyFormula(f); }} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"><Copy className="mr-1 inline w-3.5 h-3.5" />Copy</button>
                <button onClick={() => { markRecent(f.id); shareFormula(f); }} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"><Share2 className="mr-1 inline w-3.5 h-3.5" />Share</button>
                <button onClick={() => { markRecent(f.id); printFormula(f); }} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"><Printer className="mr-1 inline w-3.5 h-3.5" />Print</button>
                <button onClick={() => exportChapter(f)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"><Download className="mr-1 inline w-3.5 h-3.5" />Export</button>
              </div>
            </CardBody></Card>
          ))}
        </div>
      )}
    </div>
  );
}
