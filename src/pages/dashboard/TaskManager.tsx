import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ListTodo, Plus, Trash2, Check } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, Button, Modal, Chip, EmptyState } from "../../components/ui";
import { TASK_TYPE_LABELS, TASK_TYPE_DURATIONS_MIN, uid } from "../../lib/constants";
import { todayISODate, minutesToHM } from "../../lib/utils";
import type { PlanTask, TaskType, Priority } from "../../lib/types";

const TYPES: TaskType[] = ["study", "practice", "dpp", "module", "pyq", "general_revision", "formula_revision", "mock", "break"];

export default function TaskManager() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "completed">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", type: "study" as TaskType, estimated_minutes: 45, priority: "medium" as Priority, scheduled_date: todayISODate() });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const t = await db.getAllTasks().catch(() => [] as PlanTask[]);
    setTasks(t); setLoading(false);
  };

  const filtered = tasks.filter((t) => {
    if (filter === "today") return t.scheduled_date === todayISODate();
    if (filter === "completed") return t.completed;
    return true;
  });

  const toggle = async (id: string, completed: boolean) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
    await db.updateTask(id, { completed }).catch(() => {});
  };

  const remove = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await db.deleteTask(id).catch(() => {});
    toast.info("Task deleted");
  };

  const create = async () => {
    if (!form.title.trim()) { toast.error("Enter a title"); return; }
    try {
      const newTasks = await db.insertTasks([{
        title: form.title.trim(), subject: form.subject, type: form.type,
        estimated_minutes: form.estimated_minutes, priority: form.priority, completed: false,
        scheduled_date: form.scheduled_date, start_time: null, end_time: null,
        chapter: "", source: "manual", plan_id: null,
      }]);
      setTasks((p) => [newTasks[0], ...p]);
      setModalOpen(false);
      setForm({ title: "", subject: "", type: "study", estimated_minutes: 45, priority: "medium", scheduled_date: todayISODate() });
      toast.success("Task created");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">All your study tasks in one place</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Task</Button>
      </div>

      <div className="flex gap-2">
        {(["all", "today", "completed"] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "today" ? "Today" : "Completed"}</Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardBody><EmptyState icon={<ListTodo className="w-6 h-6" />} title="No tasks" description="Create a task or generate an AI plan" action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> New Task</Button>} /></CardBody></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card><CardBody className="p-3 flex items-center gap-3">
                <button onClick={() => toggle(t.id, !t.completed)} className={`w-5 h-5 rounded-md border-2 transition-all shrink-0 ${t.completed ? "bg-success-500 border-success-500" : "border-white/20 hover:border-accent-400"}`}>
                  {t.completed && <Check className="w-3 h-3 text-white m-auto" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${t.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                    <span>{t.scheduled_date}</span><span>·</span><span>{TASK_TYPE_LABELS[t.type]}</span>
                    {t.subject && <><span>·</span><span className="text-accent-400">{t.subject}</span></>}
                  </div>
                </div>
                <span className="text-xs text-slate-500">{minutesToHM(t.estimated_minutes)}</span>
                <button onClick={() => remove(t.id)} className="text-slate-600 hover:text-danger-400"><Trash2 className="w-4 h-4" /></button>
              </CardBody></Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Task">
        <div className="space-y-4">
          <div><label className="input-label">Title</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-base" placeholder="Task title" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="input-label">Subject</label><input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="input-base" placeholder="Optional" /></div>
            <div><label className="input-label">Date</label><input type="date" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="input-base" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="input-label">Type</label><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TaskType, estimated_minutes: TASK_TYPE_DURATIONS_MIN[e.target.value as TaskType] || 45 }))} className="select-base">{TYPES.map((t) => <option key={t} value={t} className="bg-slate-900 text-white">{TASK_TYPE_LABELS[t]}</option>)}</select></div>
            <div><label className="input-label">Duration (min)</label><input type="number" value={form.estimated_minutes} onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: Number(e.target.value) }))} className="input-base" /></div>
          </div>
          <div><label className="input-label">Priority</label><div className="flex gap-2">{(["low", "medium", "high"] as Priority[]).map((p) => <Chip key={p} active={form.priority === p} onClick={() => setForm((f) => ({ ...f, priority: p }))}>{p}</Chip>)}</div></div>
          <div className="flex gap-2 pt-2"><Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="flex-1" onClick={create}><Plus className="w-4 h-4" /> Create</Button></div>
        </div>
      </Modal>
    </div>
  );
}
