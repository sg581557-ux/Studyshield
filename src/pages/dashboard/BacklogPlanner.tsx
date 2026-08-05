import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, Plus, Loader2, Sparkles, X, Layers, Zap, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { db, buildSmartTitle } from "../../services/db";
import { Card, CardBody, Button, EmptyState } from "../../components/ui";
import { BacklogCard } from "../../components/backlog/BacklogCard";
import { AddBacklogSheet } from "../../components/backlog/AddBacklogSheet";
import type { BacklogItem, BacklogKind, SmartBacklogInput } from "../../lib/types";
import {
  backlogExamFamily, EXAM_LABEL, examIdForBacklog, extractBacklogResources, loadRecent, pushRecent, resourceMeta,
  resourceSummary, subjectColor, remainingOf, type RecentBacklog,
} from "../../lib/backlogMeta";
import { uid } from "../../lib/constants";

const QUICK_CHIPS: BacklogKind[] = ["lecture", "module", "dpp", "pyq", "revision", "mock_test"];

interface Suggestion {
  id: string;
  kind: BacklogKind;
  exam: string;
  subject: string;
  chapter: string;
  title: string;
  body: string;
}

function deriveSuggestions(items: BacklogItem[]): Suggestion[] {
  const groups = new Map<string, BacklogItem[]>();
  for (const i of items) {
    if (!i.subject || !i.chapter) continue;
    const key = `${i.subject}|${i.chapter}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  const out: Suggestion[] = [];
  for (const [key, group] of groups) {
    const [subject, chapter] = key.split("|");
    const has = (k: BacklogKind) => group.some((i) => (i.backlog_types ?? []).includes(k));
    const resourceDone = (k: BacklogKind) => group.some((i) => {
      const r = extractBacklogResources(i)[k];
      return r && r.total > 0 && r.completed >= r.total;
    });
    const exam = examIdForBacklog(group[0]);
    if (resourceDone("lecture") && !has("module")) {
      out.push({ id: `mod-${key}`, kind: "module", exam, subject, chapter, title: "Add Module Backlog?", body: "Lectures done — a module will lock the practice in." });
    }
    if (resourceDone("module") && !has("dpp")) {
      out.push({ id: `dpp-${key}`, kind: "dpp", exam, subject, chapter, title: "Add DPP Backlog?", body: "Module complete — a DPP sheet keeps the practice sharp." });
    }
    if (resourceDone("dpp") && !has("pyq")) {
      out.push({ id: `pyq-${key}`, kind: "pyq", exam, subject, chapter, title: "Add PYQ backlog?", body: "DPP done — previous-year questions are the next step." });
    }
    if (resourceDone("pyq") && !has("revision")) {
      out.push({ id: `rev-${key}`, kind: "revision", exam, subject, chapter, title: "Schedule revision?", body: "PYQs done — revision is what makes it stick." });
    }
  }
  return out.slice(0, 3);
}

export default function BacklogPlanner() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preset, setPreset] = useState<{ exam?: string; subject?: string; kind?: BacklogKind; bulk?: boolean } | undefined>(undefined);
  const [editItem, setEditItem] = useState<BacklogItem | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // The whole Backlog module is scoped to the user's selected exam. Switching
  // exams (profile.target_exam) instantly refetches with the new filter.
  const activeExam = useMemo(() => backlogExamFamily(profile?.target_exam), [profile?.target_exam]);
  const activeExamLabel = EXAM_LABEL[activeExam] ?? activeExam;

  // Recent quick-adds come straight from localStorage and are never written by
  // this component, so they're derived (not state). Dismissed suggestions
  // reset whenever the exam changes — render-phase adjustment so the reset
  // commits with the exam switch.
  const recent = useMemo(() => loadRecent().filter((r) => r.exam === activeExam), [activeExam]);
  const [prevExam, setPrevExam] = useState(activeExam);
  if (prevExam !== activeExam) {
    setPrevExam(activeExam);
    setDismissedSuggestions(new Set());
  }

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await db.getBacklogItems(activeExam)); } catch { setItems([]); }
    finally { setLoading(false); }
  }, [activeExam]);

  // Initial + exam-switch refetch, inlined in the effect (React's documented
  // fetch-on-mount shape). The loading flip happens during render when the
  // exam changes so the spinner shows immediately.
  const [prevLoadExam, setPrevLoadExam] = useState(activeExam);
  if (prevLoadExam !== activeExam) {
    setPrevLoadExam(activeExam);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await db.getBacklogItems(activeExam);
        if (!cancelled) setItems(data);
      } catch { if (!cancelled) setItems([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeExam]);

  // Deep-link support (?add=1&kind=…&bulk=1): the URL is an external system,
  // so this syncs form state from it during render (the React "adjusting
  // state when a prop changes" pattern), then strips the params in an effect.
  const urlKey = searchParams.toString();
  const [prevUrlKey, setPrevUrlKey] = useState(urlKey);
  if (prevUrlKey !== urlKey) {
    setPrevUrlKey(urlKey);
    if (searchParams.get("add")) {
      const kind = (searchParams.get("kind") as BacklogKind | null) ?? undefined;
      const bulk = searchParams.get("bulk") === "1";
      setPreset(bulk ? { bulk: true } : kind ? { kind } : {});
      setEditItem(null);
      setSheetOpen(true);
    }
  }

  useEffect(() => {
    if (searchParams.get("add")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const suggestions = useMemo(
    () => deriveSuggestions(items).filter((s) => !dismissedSuggestions.has(s.id)),
    [items, dismissedSuggestions],
  );

  function openAdd(kind?: BacklogKind) {
    setPreset(kind ? { kind } : {});
    setEditItem(null);
    setSheetOpen(true);
  }

  function openBulk() {
    setPreset({ bulk: true });
    setEditItem(null);
    setSheetOpen(true);
  }

  function openEdit(item: BacklogItem) {
    setEditItem(item);
    setPreset(undefined);
    setSheetOpen(true);
  }

  function applyPatch(id: string, patch: Partial<BacklogItem>) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function handleSaved() {
    await load();
  }

  function handleDelete(item: BacklogItem) {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== item.id));
    db.deleteBacklogItem(item.id).catch((err) => {
      setItems(prev);
      toast.error(err instanceof Error ? err.message : "Delete failed");
    });
  }

  function handleToggleComplete(item: BacklogItem) {
    const done = item.status !== "done";
    applyPatch(item.id, { status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null, overall_progress: done ? 100 : (resourceSummary(extractBacklogResources(item)).pct) });
    db.completeBacklogItem(item.id, done).then((updated) => {
      if (updated) applyPatch(item.id, updated);
    }).catch(() => { toast.error("Failed to update"); load(); });
  }

  function handleIncrement(item: BacklogItem, kind: BacklogKind) {
    const res = extractBacklogResources(item);
    const cur = res[kind] ?? { total: 0, completed: 0 };
    if (cur.total <= 0) return;
    const completed = Math.min(cur.total, cur.completed + 1);
    res[kind] = { total: cur.total, completed };
    const summary = resourceSummary(res);
    const done = summary.total > 0 && summary.remaining === 0;
    applyPatch(item.id, {
      overall_progress: done ? 100 : summary.pct,
      status: done ? "done" : item.status,
      completed_at: done ? new Date().toISOString() : item.completed_at,
    });
    db.updateBacklogResourceProgress(item.id, kind, completed).then((updated) => {
      if (updated) applyPatch(item.id, updated);
    }).catch(() => { toast.error("Failed to save progress"); load(); });
  }

  async function quickAdd(recentEntry: RecentBacklog) {
    const existing = items.find(
      (i) => i.subject === recentEntry.subject && i.chapter === recentEntry.chapter && (i.backlog_types ?? []).includes(recentEntry.kind),
    );
    if (existing) { toast.info("Already in backlog"); return; }
    const input: SmartBacklogInput = {
      exam: activeExam,
      subject: recentEntry.subject,
      chapter: recentEntry.chapter,
      resources: { [recentEntry.kind]: { total: resourceMeta(recentEntry.kind).defaultTotal, completed: 0 } },
      priority: "medium",
    };
    const temp: BacklogItem = tempItemFromInput(input);
    setItems((p) => [temp, ...p]);
    try {
      const real = await db.addSmartBacklog(input);
      setItems((p) => p.map((i) => (i.id === temp.id ? real : i)));
      pushRecent({ exam: input.exam, subject: input.subject, chapter: input.chapter, kind: recentEntry.kind });
      toast.success("Backlog added");
    } catch (err) {
      setItems((p) => p.filter((i) => i.id !== temp.id));
      toast.error(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function acceptSuggestion(s: Suggestion) {
    const input: SmartBacklogInput = {
      exam: s.exam, subject: s.subject, chapter: s.chapter,
      resources: { [s.kind]: { total: resourceMeta(s.kind).defaultTotal, completed: 0 } },
      priority: "medium",
    };
    const temp = tempItemFromInput(input);
    setItems((p) => [temp, ...p]);
    setDismissedSuggestions((p) => new Set(p).add(s.id));
    try {
      const real = await db.addSmartBacklog(input);
      setItems((p) => p.map((i) => (i.id === temp.id ? real : i)));
      pushRecent({ exam: input.exam, subject: input.subject, chapter: input.chapter, kind: s.kind });
      toast.success(`${resourceMeta(s.kind).label} backlog added`);
    } catch (err) {
      setItems((p) => p.filter((i) => i.id !== temp.id));
      toast.error(err instanceof Error ? err.message : "Failed to add");
    }
  }

  const visible = useMemo(() => {
    if (filter === "pending") return items.filter((i) => i.status !== "done");
    if (filter === "done") return items.filter((i) => i.status === "done");
    return items;
  }, [items, filter]);

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-accent-400" /> Backlog
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
              <GraduationCap className="w-3 h-3 text-accent-400" /> {activeExamLabel}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Tap a chip — add an entire backlog in seconds.</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button size="sm" variant="ghost" onClick={openBulk}><Layers className="w-4 h-4" /> Bulk</Button>
          <Button size="sm" onClick={() => openAdd()}><Plus className="w-4 h-4" /> Add</Button>
        </div>
      </div>

      {/* Quick add chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {QUICK_CHIPS.map((k) => {
          const meta = resourceMeta(k);
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.93 }}
              onClick={() => openAdd(k)}
              className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium text-slate-200 bg-ink-900 shrink-0 active:scale-95 transition-transform"
              style={{ borderColor: `${meta.color}44` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </motion.button>
          );
        })}
        <button
          onClick={openBulk}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-accent-400 bg-accent-600/10 shrink-0"
        >
          <Zap className="w-4 h-4" /> Bulk add
        </button>
      </div>

      {/* AI suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-accent-500/25 bg-accent-600/10 p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-accent-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Smart suggestions
              </p>
            </div>
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{s.subject} · {s.chapter} — {s.body}</p>
                </div>
                <button
                  onClick={() => acceptSuggestion(s)}
                  className="shrink-0 rounded-lg bg-accent-600 text-white text-xs font-semibold px-3 py-2 hover:bg-accent-500 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setDismissedSuggestions((p) => new Set(p).add(s.id))}
                  className="shrink-0 w-7 h-7 rounded-lg bg-white/5 text-slate-500 hover:text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recently added */}
      {recent.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Recently added</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {recent.map((r, idx) => {
              const meta = resourceMeta(r.kind);
              return (
                <motion.button
                  key={`${r.subject}-${r.chapter}-${r.kind}-${idx}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => quickAdd(r)}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left min-w-36"
                >
                  <p className="text-xs font-semibold text-white truncate">{r.chapter}</p>
                  <p className="text-[10px] mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: subjectColor(r.subject) }} />
                    <span className="text-slate-500 truncate">{r.subject} · {meta.label}</span>
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {([["all", `All · ${items.length}`], ["pending", `Pending · ${items.length - doneCount}`], ["done", `Done · ${doneCount}`]] as const).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 text-accent-500 animate-spin" /></div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="w-8 h-8" />}
              title={items.length === 0 ? `No backlogs found for ${activeExamLabel}` : "Nothing here"}
              description={items.length === 0 ? "Tap “Add backlog” to start clearing chapters for this exam." : "Try a different filter."}
              action={<Button size="sm" onClick={() => openAdd()}><Plus className="w-4 h-4" /> Add Backlog</Button>}
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {visible.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <BacklogCard
                      item={item}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onToggleComplete={handleToggleComplete}
                      onIncrement={handleIncrement}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Mobile add bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-950/90 backdrop-blur border-t border-white/10 px-4 py-3 flex gap-2">
        <button onClick={openBulk} className="flex-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium py-3 flex items-center justify-center gap-1.5">
          <Layers className="w-4 h-4" /> Bulk
        </button>
        <button onClick={() => openAdd()} className="flex-[2] rounded-xl bg-accent-600 text-white text-sm font-semibold py-3 flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Add backlog
        </button>
      </div>

      <AddBacklogSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditItem(null); }}
        items={items}
        exam={activeExam}
        preset={preset}
        editItem={editItem}
        onSaved={handleSaved}
      />
    </div>
  );
}

function tempItemFromInput(input: SmartBacklogInput): BacklogItem {
  const kinds = (Object.keys(input.resources) as BacklogKind[]).filter((k) => (input.resources[k]?.total ?? 0) > 0);
  const now = new Date().toISOString();
  return {
    id: uid("tmp"),
    user_id: "",
    title: buildSmartTitle(input.subject, input.chapter, input.resources),
    module_id: null,
    priority: input.priority,
    status: "todo",
    due_date: input.dueDate ?? null,
    overall_progress: 0,
    created_at: now,
    backlog_data: input as unknown as Record<string, unknown>,
    subject: input.subject,
    chapter: input.chapter,
    exam_id: input.exam,
    backlog_types: kinds,
    pending_lectures: remainingOf(input.resources.lecture),
    pending_dpps: remainingOf(input.resources.dpp),
    module_total_questions: input.resources.module?.total ?? 0,
    module_solved_questions: input.resources.module?.completed ?? 0,
    pending_pyqs: remainingOf(input.resources.pyq),
    revision_pending: remainingOf(input.resources.revision),
  };
}
