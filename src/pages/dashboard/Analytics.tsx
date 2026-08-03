import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { db } from "../../services/db";
import { Card, CardBody, StatBadge, EmptyState } from "../../components/ui";
import { minutesToHM } from "../../lib/constants";
import type { FocusSession, PlanTask } from "../../lib/types";

export default function Analytics() {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { Promise.all([db.getAllTasks(), db.getFocusSessions()]).then(([t, s]) => { setTasks(t); setSessions(s); }).finally(() => setLoading(false)); }, []);

  const totalMin = tasks.reduce((a, t) => a + t.estimated_minutes, 0);
  const completedMin = tasks.filter((t) => t.completed).reduce((a, t) => a + t.estimated_minutes, 0);
  const focusMin = sessions.filter((s) => s.completed).reduce((a, s) => a + (s.duration_minutes ?? s.minutes ?? 0), 0);
  const byType: Record<string, number> = {};
  for (const t of tasks) byType[t.type] = (byType[t.type] ?? 0) + t.estimated_minutes;
  const maxType = Math.max(1, ...Object.values(byType));

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-accent-400" /> Analytics</h1><p className="text-sm text-slate-500 mt-0.5">Your study activity at a glance.</p></div>
      {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-accent-500 animate-spin" /></div> : tasks.length === 0 && sessions.length === 0 ? <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No data yet" description="Start studying to see your analytics." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBadge label="Total planned" value={minutesToHM(totalMin)} color="bg-accent-600/20" />
            <StatBadge label="Completed" value={minutesToHM(completedMin)} color="bg-success-600/20" />
            <StatBadge label="Focus time" value={minutesToHM(focusMin)} color="bg-warning-600/20" />
            <StatBadge label="Sessions" value={String(sessions.filter((s) => s.completed).length)} color="bg-accent-600/20" />
          </div>
          <Card><CardBody>
            <h3 className="text-sm font-semibold text-white mb-3">Time by task type</h3>
            {Object.keys(byType).length === 0 ? <p className="text-sm text-slate-500">No data.</p> : (
              <div className="space-y-2">
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, min]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-32 capitalize">{type.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-accent-500 rounded-full" style={{ width: `${(min / maxType) * 100}%` }} /></div>
                    <span className="text-xs text-slate-600 w-16 text-right">{minutesToHM(min)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody></Card>
        </>
      )}
    </div>
  );
}
