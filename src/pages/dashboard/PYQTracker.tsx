import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, TrendingUp } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, Button, Modal, EmptyState } from "../../components/ui";
import { PYQ_YEARS } from "../../lib/constants";
import type { MockTestResult } from "../../lib/types";

export default function PYQTracker() {
  const { toast } = useToast();
  const [tests, setTests] = useState<MockTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ test_name: "", subject: "", total_marks: 100, obtained_marks: 0, test_date: new Date().toISOString().slice(0, 10), year: 2024 });

  useEffect(() => { load(); }, []);
  const load = async () => { const t = await db.getMockTests().catch(() => [] as MockTestResult[]); setTests(t); setLoading(false); };

  const add = async () => {
    if (!form.test_name.trim()) { toast.error("Enter test name"); return; }
    try {
      const m = await db.addMockTest({ test_name: form.test_name.trim(), subject: form.subject || null, total_marks: form.total_marks, obtained_marks: form.obtained_marks, test_date: form.test_date, weak_chapters: [], strong_chapters: [] });
      setTests((p) => [m, ...p]); setModalOpen(false);
      setForm({ test_name: "", subject: "", total_marks: 100, obtained_marks: 0, test_date: new Date().toISOString().slice(0, 10), year: 2024 });
      toast.success("PYQ attempt logged");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (id: string) => { await db.deleteMockTest(id).catch(() => {}); setTests((p) => p.filter((t) => t.id !== id)); };

  if (loading) return <div className="text-slate-500 text-sm">Loading…</div>;

  const avgPct = tests.length > 0 ? Math.round((tests.reduce((a, t) => a + (t.obtained_marks / t.total_marks) * 100, 0) / tests.length)) : 0;
  const best = tests.reduce((a, t) => Math.max(a, (t.obtained_marks / t.total_marks) * 100), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-white">PYQ Tracker</h1><p className="text-sm text-slate-500 mt-1">Track previous year question attempts</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> Log Attempt</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardBody><p className="text-xs text-slate-500">Total Attempts</p><p className="text-2xl font-bold text-white mt-1">{tests.length}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-slate-500">Average Score</p><p className="text-2xl font-bold text-white mt-1">{avgPct}%</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-slate-500">Best Score</p><p className="text-2xl font-bold text-success-400 mt-1">{Math.round(best)}%</p></CardBody></Card>
      </div>

      {tests.length === 0 ? (
        <Card><CardBody><EmptyState icon={<FileText className="w-6 h-6" />} title="No PYQ attempts yet" description="Log your first previous year question attempt" action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Log Attempt</Button>} /></CardBody></Card>
      ) : (
        <div className="space-y-2">
          {tests.map((t, i) => {
            const pct = Math.round((t.obtained_marks / t.total_marks) * 100);
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card><CardBody className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-600/15 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5 text-accent-400" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{t.test_name}</p><p className="text-xs text-slate-500">{t.subject || "All subjects"} · {t.test_date}</p></div>
                  <div className="text-right"><p className={`text-lg font-bold ${pct >= 75 ? "text-success-400" : pct >= 50 ? "text-warning-400" : "text-danger-400"}`}>{pct}%</p><p className="text-xs text-slate-600">{t.obtained_marks}/{t.total_marks}</p></div>
                  <button onClick={() => remove(t.id)} className="text-slate-600 hover:text-danger-400"><Trash2 className="w-4 h-4" /></button>
                </CardBody></Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log PYQ Attempt">
        <div className="space-y-4">
          <div><label className="input-label">Test Name</label><input value={form.test_name} onChange={(e) => setForm((f) => ({ ...f, test_name: e.target.value }))} className="input-base" placeholder="e.g. JEE Main 2023" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="input-label">Subject (optional)</label><input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="input-base" placeholder="Physics" /></div>
            <div><label className="input-label">Year</label><select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} className="select-base">{PYQ_YEARS.map((y) => <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="input-label">Total Marks</label><input type="number" value={form.total_marks} onChange={(e) => setForm((f) => ({ ...f, total_marks: Number(e.target.value) }))} className="input-base" /></div>
            <div><label className="input-label">Obtained</label><input type="number" value={form.obtained_marks} onChange={(e) => setForm((f) => ({ ...f, obtained_marks: Number(e.target.value) }))} className="input-base" /></div>
            <div><label className="input-label">Date</label><input type="date" value={form.test_date} onChange={(e) => setForm((f) => ({ ...f, test_date: e.target.value }))} className="input-base" /></div>
          </div>
          <div className="flex gap-2 pt-2"><Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="flex-1" onClick={add}><Plus className="w-4 h-4" /> Log</Button></div>
        </div>
      </Modal>
    </div>
  );
}
