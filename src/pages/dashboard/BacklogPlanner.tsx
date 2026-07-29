import { useEffect, useState } from "react";
import { ListChecks, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, Button, EmptyState, Modal, ProgressBar } from "../../components/ui";
import { computeModuleRemaining } from "../../services/db";
import type { BacklogItem, BacklogKind, ModuleProgress, Priority } from "../../lib/types";
import { BACKLOG_KINDS, MODULE_PROGRESS_OPTIONS } from "../../lib/constants";

export default function BacklogPlanner() {
  const { toast } = useToast();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [kinds, setKinds] = useState<BacklogKind[]>(["lecture"]);
  const [pendingLec, setPendingLec] = useState(1);
  const [pendingDpp, setPendingDpp] = useState(0);
  const [modProgress, setModProgress] = useState<ModuleProgress>("not_started");
  const [modTotal, setModTotal] = useState(0);
  const [modSolved, setModSolved] = useState(0);

  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); try { setItems(await db.getBacklogItems()); } catch { setItems([]); } finally { setLoading(false); } }

  async function add() {
    if (!subject.trim() || !chapter.trim()) { toast.error("Subject and chapter are required"); return; }
    try {
      await db.addBacklogDetail({ subject: subject.trim(), chapter: chapter.trim(), backlog_types: kinds, pending_lectures: pendingLec, pending_dpps: pendingDpp, module_progress: modProgress, module_total_questions: modTotal, module_solved_questions: modSolved });
      toast.success("Backlog added");
      setShowAdd(false); setSubject(""); setChapter(""); setKinds(["lecture"]); setPendingLec(1); setPendingDpp(0); setModTotal(0); setModSolved(0);
      await load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to add"); }
  }

  async function remove(id: string) { try { await db.deleteBacklogItem(id); setItems((p) => p.filter((i) => i.id !== id)); } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Delete failed"); } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-white flex items-center gap-2"><ListChecks className="w-5 h-5 text-accent-400" /> Backlog</h1><p className="text-sm text-slate-500 mt-0.5">Track lectures, DPPs and modules you're behind on.</p></div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add</Button>
      </div>
      <Card><CardBody>
        {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-accent-500 animate-spin" /></div> :
         items.length === 0 ? <EmptyState icon={<ListChecks className="w-8 h-8" />} title="No backlog" description="You're all caught up." /> : (
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{i.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{i.subject ?? ""} {i.chapter ? `· ${i.chapter}` : ""}</p>
                  </div>
                  <button onClick={() => remove(i.id)} className="text-slate-600 hover:text-danger-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-500">{i.overall_progress ?? 0}%</span>
                  <ProgressBar value={i.overall_progress ?? 0} className="flex-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody></Card>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add backlog">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="input-label">Subject</span><input className="input-base" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Physics" /></label>
            <label className="block"><span className="input-label">Chapter</span><input className="input-base" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Kinematics" /></label>
          </div>
          <div><span className="input-label">Types</span><div className="flex flex-wrap gap-2 mt-1">{BACKLOG_KINDS.map((k) => { const a = kinds.includes(k.value); return <button key={k.value} type="button" onClick={() => setKinds(a ? kinds.filter((x) => x !== k.value) : [...kinds, k.value])} className={`rounded-full px-3 py-1 text-xs ${a ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400"}`}>{k.label}</button>; })}</div></div>
          {kinds.includes("lecture") && <label className="block"><span className="input-label">Pending lectures</span><input type="number" min="0" className="input-base" value={pendingLec} onChange={(e) => setPendingLec(Number(e.target.value))} /></label>}
          {kinds.includes("dpp") && <label className="block"><span className="input-label">Pending DPPs</span><input type="number" min="0" className="input-base" value={pendingDpp} onChange={(e) => setPendingDpp(Number(e.target.value))} /></label>}
          {kinds.includes("module") && (<>
            <label className="block"><span className="input-label">Module progress</span><select className="select-base" value={modProgress} onChange={(e) => setModProgress(e.target.value as ModuleProgress)}>{MODULE_PROGRESS_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-slate-900 text-white">{o.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="input-label">Total questions</span><input type="number" min="0" className="input-base" value={modTotal} onChange={(e) => setModTotal(Number(e.target.value))} /></label>
              <label className="block"><span className="input-label">Solved</span><input type="number" min="0" className="input-base" value={modSolved} onChange={(e) => setModSolved(Number(e.target.value))} /></label>
            </div>
            <p className="text-xs text-slate-600">Remaining: {computeModuleRemaining(modTotal, modSolved)} Qs</p>
          </>)}
          <Button className="w-full" onClick={add}>Add backlog</Button>
        </div>
      </Modal>
    </div>
  );
}
