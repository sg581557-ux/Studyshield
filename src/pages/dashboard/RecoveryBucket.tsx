import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, SectionTitle, EmptyState } from "../../components/ui";
import { minutesToHM, TASK_TYPE_LABELS } from "../../lib/constants";
import type { RecoveryItem } from "../../lib/types";
import { CrazyListSkeleton } from "../../components/loaders/AestheticLoader";

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-warning-400" },
  scheduled: { label: "Scheduled", color: "text-accent-400" },
  recovered: { label: "Recovered", color: "text-success-400" },
};

export default function RecoveryBucket() {
  const { toast } = useToast();
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "recovered">("pending");

  // Refetch whenever the filter changes. The fetch lives inside the effect
  // (React's documented fetch-on-mount shape), and the loading flip happens
  // during render when the filter changes so the spinner shows immediately.
  const [prevFilter, setPrevFilter] = useState(filter);
  if (prevFilter !== filter) {
    setPrevFilter(filter);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = filter === "all" ? await db.getRecoveryItems() : await db.getRecoveryItems(filter);
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error("[RecoveryBucket] load threw", err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  async function markRecovered(id: string) {
    try { await db.markRecoveryRecovered(id); setItems((p) => p.filter((i) => i.id !== id)); toast.success("Marked as recovered"); }
    catch (err) { console.error("[RecoveryBucket] markRecovered", err); toast.error("Failed to mark recovered"); }
  }

  async function remove(id: string) {
    try { await db.deleteRecoveryItem(id); setItems((p) => p.filter((i) => i.id !== id)); toast.info("Item removed"); }
    catch (err) { console.error("[RecoveryBucket] remove", err); toast.error("Failed to remove"); }
  }

  const pendingCount = items.filter((i) => i.recovery_status === "pending").length;
  const totalMinutes = items.filter((i) => i.recovery_status === "pending").reduce((a, i) => a + i.estimated_minutes, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2"><RotateCcw className="w-5 h-5 text-warning-400" /> Recovery Bucket</h1>
        <p className="text-sm text-slate-500 mt-0.5">Missed work is never deleted — it's recovered gradually in future plans.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardBody className="text-center"><p className="text-2xl font-bold text-warning-400">{pendingCount}</p><p className="text-xs text-slate-500 mt-1">Pending recovery</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-2xl font-bold text-white">{minutesToHM(totalMinutes)}</p><p className="text-xs text-slate-500 mt-1">Time to recover</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-2xl font-bold text-white">{items.filter((i) => i.recovery_status === "recovered").length}</p><p className="text-xs text-slate-500 mt-1">Recovered</p></CardBody></Card>
      </div>

      <div className="flex gap-2">
        {(["pending", "recovered", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === f ? "bg-accent-600/20 text-accent-400" : "text-slate-400 hover:bg-white/5"}`}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      <Card><CardBody>
        <SectionTitle>Recovery items</SectionTitle>
        {loading ? <CrazyListSkeleton count={5} /> :
         items.length === 0 ? <EmptyState icon={<CheckCircle2 className="w-8 h-8" />} title="Nothing in recovery" description={filter === "pending" ? "All caught up! Great work." : "No items match this filter."} /> : (
          <div className="space-y-1.5 mt-2">
            {items.map((item) => {
              const meta = STATUS_META[item.recovery_status] ?? STATUS_META.pending;
              return (
                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <div className="w-9 h-9 rounded-xl bg-warning-600/15 flex items-center justify-center shrink-0">
                    {item.recovery_status === "recovered" ? <CheckCircle2 className="w-4 h-4 text-success-400" /> : <Clock className="w-4 h-4 text-warning-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${item.recovery_status === "recovered" ? "text-slate-600" : "text-slate-200"}`}>{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-600">{TASK_TYPE_LABELS[item.task_type] ?? item.task_type}</span>
                      {item.subject && <span className="text-[10px] text-slate-600">· {item.subject}</span>}
                      <span className={`text-[10px] ${meta.color}`}>{meta.label}</span>
                      {item.times_rescheduled > 0 && <span className="text-[10px] text-slate-700">· rescheduled {item.times_rescheduled}x</span>}
                      <span className="text-[10px] text-slate-700">· missed {item.date_missed}</span>
                    </div>
                    {item.reason && <p className="text-[10px] text-slate-600 mt-0.5 truncate"><AlertCircle className="w-2.5 h-2.5 inline mr-1" />{item.reason}</p>}
                  </div>
                  <span className="text-xs text-slate-600 w-12 text-right">{minutesToHM(item.estimated_minutes)}</span>
                  {item.recovery_status === "pending" && (
                    <>
                      <button onClick={() => markRecovered(item.id)} className="text-slate-600 hover:text-success-400" title="Mark recovered"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(item.id)} className="text-slate-600 hover:text-danger-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </CardBody></Card>
    </div>
  );
}
