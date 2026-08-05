import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { db } from "../services/db";
import { buildDailyCheckin } from "../services/mentorCheckin";
import { useAuth } from "../context/AuthContext";
import { todayISODate } from "../lib/constants";
import { Card, CardBody } from "./ui";

export default function MentorCheckinCard() {
  const { profile } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (regenerate: boolean) => {
    if (regenerate) setBusy(true);
    try {
      const today = todayISODate();
      let checkin = await db.getDailyCheckin(today);
      if (!checkin || regenerate) {
        const built = await buildDailyCheckin(profile?.target_exam);
        if (built) {
          checkin = await db.upsertDailyCheckin({
            date: today,
            message: built.message,
            completed_tasks: built.completedTasks,
            missed_tasks: built.missedTasks,
            focus_score: built.focusScore,
          });
        }
      }
      setMessage(checkin?.message ?? null);
    } finally {
      setBusy(false);
    }
  }, [profile?.target_exam]);

  // Mount-time load — inlined in the effect (React's documented fetch-on-mount
  // shape) so the rule sees the post-await setStates instead of a traced call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = todayISODate();
        let checkin = await db.getDailyCheckin(today);
        if (!checkin) {
          const built = await buildDailyCheckin(profile?.target_exam);
          if (built) {
            checkin = await db.upsertDailyCheckin({
              date: today,
              message: built.message,
              completed_tasks: built.completedTasks,
              missed_tasks: built.missedTasks,
              focus_score: built.focusScore,
            });
          }
        }
        if (!cancelled) setMessage(checkin?.message ?? null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.target_exam]);

  if (!message) return null;

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent-400" /> Mentor Daily Check-in
          </h3>
          <button
            onClick={() => load(true)}
            disabled={busy}
            title="Regenerate today's check-in"
            className="p-1.5 rounded-lg text-slate-500 hover:text-accent-400 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{message}</p>
      </CardBody>
    </Card>
  );
}
