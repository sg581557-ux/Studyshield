import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Trash2, CheckCircle2, RotateCcw, Clock, CalendarDays, Plus, Pencil } from "lucide-react";
import type { BacklogItem, BacklogKind } from "../../lib/types";
import { cn } from "../../lib/utils";
import {
  extractBacklogResources, estimatedMinutesFor, minutesToHM, PRIORITY_META,
  remainingOf, resourceMeta, resourceSummary, subjectColor,
} from "../../lib/backlogMeta";

interface BacklogCardProps {
  item: BacklogItem;
  onEdit: (item: BacklogItem) => void;
  onDelete: (item: BacklogItem) => void;
  onToggleComplete: (item: BacklogItem) => void;
  onIncrement: (item: BacklogItem, kind: BacklogKind) => void;
}

const LONG_PRESS_MS = 450;

export function BacklogCard({ item, onEdit, onDelete, onToggleComplete, onIncrement }: BacklogCardProps) {
  const resources = extractBacklogResources(item);
  const summary = resourceSummary(resources);
  const done = item.status === "done";
  const color = subjectColor(item.subject);
  const meta = PRIORITY_META[item.priority] ?? PRIORITY_META.medium;
  const eta = estimatedMinutesFor(item);
  const pressTimer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  function onDragEnd(_: unknown, info: PanInfo) {
    setDragging(false);
    if (info.offset.x < -110 || info.velocity.x < -600) onDelete(item);
    else if (info.offset.x > 110 || info.velocity.x > 600) onToggleComplete(item);
  }

  function startPress() {
    if (dragging) return;
    pressTimer.current = window.setTimeout(() => {
      if (!dragging) onEdit(item);
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  const primaryKind = Object.keys(resources).find((k) => (resources[k as BacklogKind]?.total ?? 0) > 0) as BacklogKind | undefined;
  const primary = primaryKind ? resources[primaryKind] : undefined;

  return (
    <div className="relative rounded-2xl overflow-hidden group">
      {/* Swipe action backgrounds — purely decorative, revealed by the drag */}
      <div className="absolute inset-0 flex" aria-hidden="true">
        <div className="flex-1 bg-danger-600/90 flex items-center justify-start pl-5 text-white">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="flex-1 bg-success-600/90 flex items-center justify-end pr-5 text-white">
          {done ? <RotateCcw className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.12}
        onDragStart={() => setDragging(true)}
        onDragEnd={onDragEnd}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 30 }}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerMove={(e) => { if (e.buttons > 0) cancelPress(); }}
        className={cn(
          "relative rounded-2xl bg-ink-900 border border-white/10 overflow-hidden transition-colors",
          done ? "opacity-80" : "hover:border-white/20",
        )}
      >
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
        <div className="pl-4 pr-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn("text-sm font-semibold truncate", done ? "text-slate-500 line-through" : "text-white")}>
                  {item.chapter || "Untitled"}
                </p>
                {done && <CheckCircle2 className="w-4 h-4 text-success-400 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{item.subject}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleComplete(item); }}
                title={done ? "Mark as not done" : "Mark as done"}
                aria-label={done ? "Mark as not done" : "Mark as done"}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                {done ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                title="Edit"
                aria-label="Edit backlog item"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                title="Delete"
                aria-label="Delete backlog item"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-danger-600/30 text-slate-400 hover:text-danger-400 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Resource chips */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {Object.entries(resources).filter(([, r]) => (r?.total ?? 0) > 0).map(([k, r]) => {
              const meta = resourceMeta(k as BacklogKind);
              const rem = remainingOf(r);
              const active = rem > 0 && !done;
              return (
                <button
                  key={k}
                  onClick={() => active && onIncrement(item, k as BacklogKind)}
                  title={active ? "+1 done" : meta.label}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active ? "hover:bg-white/10" : "opacity-70",
                  )}
                  style={{ borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14`, color: meta.color }}
                >
                  {meta.label}
                  <span className="tabular-nums">{r!.completed}/{r!.total}</span>
                  {active && <Plus className="w-3 h-3" />}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 mt-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${done ? 100 : summary.pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300 tabular-nums shrink-0">
              {done ? 100 : summary.pct}%
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap mt-2.5 text-[11px] text-slate-500">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", meta.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
            {summary.remaining > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {eta > 0 ? `${minutesToHM(eta)} left` : `${summary.remaining} left`}
              </span>
            )}
            {item.due_date && (
              <span className={cn("inline-flex items-center gap-1", new Date(item.due_date) < new Date() && !done && "text-danger-400")}>
                <CalendarDays className="w-3 h-3" />
                {new Date(item.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
            )}
            {primary && summary.remaining > 0 && !done && (
              <span className="inline-flex items-center gap-1 ml-auto">
                Remaining <span className="text-slate-300 font-semibold tabular-nums">{summary.remaining}</span>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
