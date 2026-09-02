/* eslint-disable react-hooks/set-state-in-effect */
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, CalendarDays, AlertTriangle, Layers } from "lucide-react";
import type { BacklogItem, BacklogKind, BacklogDifficulty, BacklogResourceProgress, Priority, SmartBacklogInput } from "../../lib/types";
import { db } from "../../services/db";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../lib/utils";
import { ChapterPicker } from "./ChapterPicker";
import {
  BACKLOG_RESOURCES, EXAM_LABEL, chaptersFor, DIFFICULTY_META, DIFFICULTY_OPTIONS,
  extractBacklogResources, PRIORITY_META, PRIORITY_OPTIONS,
  pushRecent, resourceMeta, resourceSummary, subjectsForExam,
} from "../../lib/backlogMeta";

type SheetMode = "add" | "bulk" | "edit" | "update";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  items: BacklogItem[];
  /** Active exam family id — the whole sheet is scoped to this exam. */
  exam: string;
  preset?: { exam?: string; subject?: string; kind?: BacklogKind; bulk?: boolean };
  editItem?: BacklogItem | null;
  onSaved: () => Promise<void> | void;
}

function Chip({ active, onClick, children, className, style }: { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={style}
      className={cn(
        "rounded-full px-3.5 py-2 text-xs font-medium transition-all border select-none",
        active ? "bg-accent-600 text-white border-accent-500" : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10",
        className,
      )}>
      {children}
    </button>
  );
}

function Stepper({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(999, value + 1));
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-slate-200 truncate">{label}</p>
        {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={dec} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center active:scale-90 transition-transform"><Minus className="w-4 h-4" /></button>
        <span className="w-10 text-center text-sm font-semibold text-white tabular-nums">{value}</span>
        <button type="button" onClick={inc} className="w-9 h-9 rounded-lg bg-accent-600/20 hover:bg-accent-600/30 text-accent-400 flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{children}</p>;
}

export function AddBacklogSheet({ open, onClose, items, exam: activeExam, preset, editItem, onSaved }: SheetProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<SheetMode>("add");
  const [exam, setExam] = useState(activeExam);
  const [subject, setSubject] = useState("Physics");
  const [chapter, setChapter] = useState("");
  const [kind, setKind] = useState<BacklogKind | null>(null);
  const [resources, setResources] = useState<Partial<Record<BacklogKind, BacklogResourceProgress>>>({});
  const [bulkKinds, setBulkKinds] = useState<BacklogKind[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [difficulty, setDifficulty] = useState<BacklogDifficulty>("medium");
  const [dueDate, setDueDate] = useState("");
  const [duplicate, setDuplicate] = useState<BacklogItem | null>(null);
  const [dupCompleted, setDupCompleted] = useState(0);
  const [dupTotal, setDupTotal] = useState(0);
  const [saving, setSaving] = useState(false);

  const chapterList = useMemo(() => {
    const fromSyllabus = chaptersFor(exam, subject);
    const custom = items
      .filter((i) => i.subject === subject && i.chapter && !fromSyllabus.includes(i.chapter))
      .map((i) => i.chapter as string);
    return [...new Set([...fromSyllabus, ...custom])];
  }, [exam, subject, items]);

  // Seed the form whenever the sheet opens (or the target item/preset changes
  // while open). Uses effect to avoid render-phase setState anti-pattern.
  const seedKey = open
    ? editItem
      ? `edit:${editItem.id}:${activeExam}`
      : `add:${preset?.bulk ? "bulk" : "add"}:${preset?.subject ?? ""}:${preset?.kind ?? ""}:${activeExam}`
    : "closed";
  useEffect(() => {
    if (seedKey === "closed") return;
    // The sheet is always scoped to the active exam — never to another one.
    setExam(activeExam);
    if (editItem) {
      setMode("edit");
      setSubject(editItem.subject ?? "Physics");
      setChapter(editItem.chapter ?? "");
      const res = extractBacklogResources(editItem);
      const kinds = Object.keys(res).filter((k) => (res[k as BacklogKind]?.total ?? 0) > 0);
      setKind((kinds[0] as BacklogKind) ?? null);
      setResources(res);
      setBulkKinds(kinds as BacklogKind[]);
      setPriority(editItem.priority ?? "medium");
      const data = editItem.backlog_data as { difficulty?: BacklogDifficulty } | null;
      setDifficulty(editItem.difficulty ?? data?.difficulty ?? "medium");
      setDueDate(editItem.due_date ?? "");
    } else {
      setMode(preset?.bulk ? "bulk" : "add");
      setSubject(preset?.subject ?? "Physics");
      setChapter("");
      const k = preset?.kind ?? null;
      setKind(k);
      setResources(k ? { [k]: { total: resourceMeta(k).defaultTotal, completed: 0 } } : {});
      setBulkKinds([]);
      setPriority("medium");
      setDifficulty("medium");
      setDueDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // Duplicate detection — pure function of the current form inputs
  const dupInputKey = open && mode !== "update"
    ? `${subject}|${chapter}|${kind}|${editItem?.id ?? ""}|${items.map((i) => `${i.id}:${(i.backlog_types ?? []).join(",")}`).join(";")}`
    : "idle";
  useEffect(() => {
    if (dupInputKey === "idle") return;
    if (!subject || !chapter || !kind) {
      setDuplicate(null);
      return;
    }
    const dup = items.find(
      (i) => i.id !== editItem?.id && i.subject === subject && i.chapter === chapter && (i.backlog_types ?? []).includes(kind),
    ) ?? null;
    if (dup) {
      const r = extractBacklogResources(dup)[kind] ?? { total: 0, completed: 0 };
      setDuplicate(dup);
      setDupTotal(r.total);
      setDupCompleted(r.completed);
    } else {
      setDuplicate(null);
    }
  }, [dupInputKey, subject, chapter, kind, editItem?.id, items]);

  function setResource(k: BacklogKind, field: "total" | "completed", v: number) {
    setResources((prev) => {
      const cur = prev[k] ?? { total: 0, completed: 0 };
      const next = { ...cur, [field]: v };
      if (field === "total") next.completed = Math.min(next.completed, v);
      return { ...prev, [k]: next };
    });
  }

  function selectKind(k: BacklogKind) {
    if (mode === "update") setMode("add");
    setKind(k);
    setResources((prev) => {
      if (prev[k]) return prev;
      return { ...prev, [k]: { total: resourceMeta(k).defaultTotal, completed: 0 } };
    });
  }

  const summary = useMemo(() => resourceSummary(resources), [resources]);
  const dupSummary = useMemo(
    () => resourceSummary({ [kind ?? "lecture"]: { total: dupTotal, completed: dupCompleted } }),
    [dupTotal, dupCompleted, kind],
  );

  async function save() {
    if (mode === "bulk") {
      if (bulkKinds.length === 0) { toast.error("Pick at least one resource"); return; }
      setSaving(true);
      try {
        const fresh = await db.getBacklogItems(exam);
        const existingKeys = new Set(
          fresh.filter((i) => i.subject === subject && i.chapter === chapter)
            .flatMap((i) => i.backlog_types ?? []),
        );
        const toAdd = bulkKinds.filter((k) => !existingKeys.has(k));
        for (const k of toAdd) {
          await db.addSmartBacklog({
            exam, subject, chapter,
            resources: { [k]: { total: resourceMeta(k).defaultTotal, completed: 0 } },
            priority, difficulty, dueDate: dueDate || null,
          });
        }
        if (toAdd.length === 0) toast.info("All selected resources already exist");
        else toast.success(`${toAdd.length} backlog${toAdd.length > 1 ? "s" : ""} added`);
        await onSaved();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add backlogs");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!chapter) { toast.error("Choose a chapter"); return; }
    const input: SmartBacklogInput = {
      exam, subject, chapter,
      resources: mode === "edit" ? resources : (kind ? { ...resources, [kind]: resources[kind] ?? { total: resourceMeta(kind).defaultTotal, completed: 0 } } : resources),
      priority, difficulty, dueDate: dueDate || null,
    };
    if (mode === "edit" && editItem) {
      const editKinds = Object.keys(resources).filter((k) => (resources[k as BacklogKind]?.total ?? 0) > 0);
      if (editKinds.length === 0) { toast.error("Keep at least one resource"); return; }
      setSaving(true);
      try {
        await db.updateSmartBacklog(editItem.id, input);
        pushRecent({ exam, subject, chapter, kind: editKinds[0] as BacklogKind });
        toast.success("Backlog updated");
        await onSaved();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setSaving(false);
      }
      return;
    }
    const kinds = Object.keys(input.resources).filter((k) => (input.resources[k as BacklogKind]?.total ?? 0) > 0);
    if (kinds.length === 0) { toast.error("Set some work first"); return; }
    setSaving(true);
    try {
      await db.addSmartBacklog(input);
      if (kind) pushRecent({ exam, subject, chapter, kind });
      toast.success("Backlog added");
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function saveDuplicateProgress() {
    if (!duplicate || !kind) return;
    setSaving(true);
    try {
      await db.updateBacklogResourceProgress(duplicate.id, kind, dupCompleted);
      toast.success("Progress updated");
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (!saving) onClose();
  }

  const isBulk = mode === "bulk";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full max-w-lg bg-ink-900 rounded-t-3xl border border-white/10 border-b-0 max-h-[92dvh] flex flex-col"
          >
            <div className="w-12 h-1 rounded-full bg-white/15 mx-auto mt-3 shrink-0" />
            <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                {mode === "update" ? "Update progress" : mode === "edit" ? "Edit backlog" : isBulk ? "Bulk add" : "Add backlog"}
                {isBulk && <Layers className="w-4 h-4 text-accent-400" />}
              </h2>
              <button onClick={close} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
              {/* Exam — always the user's selected exam */}
              <div>
                <SectionLabel>Exam</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  <Chip active>{EXAM_LABEL[exam] ?? exam}</Chip>
                  <p className="text-[11px] text-slate-500 self-center">Your selected exam — change it in Settings.</p>
                </div>
              </div>

              {/* Subject */}
              <div>
                <SectionLabel>Subject</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {subjectsForExam(exam).map((s) => (
                    <Chip key={s} active={subject === s} onClick={() => { setSubject(s); setChapter(""); }}>{s}</Chip>
                  ))}
                </div>
              </div>

              {/* Chapter */}
              <div>
                <SectionLabel>Chapter</SectionLabel>
                <ChapterPicker chapters={chapterList} value={chapter} onChange={setChapter} placeholder="Search chapter — e.g. thermodynamics…" />
              </div>

              {/* Resource type */}
              <div>
                <SectionLabel>{isBulk ? "Select resources" : "Resource"}</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {BACKLOG_RESOURCES.map((r) => {
                    const active = isBulk ? bulkKinds.includes(r.kind) : kind === r.kind;
                    return (
                      <Chip
                        key={r.kind}
                        active={active}
                        style={{ borderColor: active ? r.color : undefined }}
                        onClick={() => {
                          if (isBulk) {
                            setBulkKinds((p) => (active ? p.filter((k) => k !== r.kind) : [...p, r.kind]));
                          } else if (mode === "edit") {
                            if (active) {
                              setKind(null);
                              setResources((p) => { const n = { ...p }; delete n[r.kind]; return n; });
                            } else {
                              setKind(r.kind);
                              setResources((p) => p[r.kind] ? p : { ...p, [r.kind]: { total: resourceMeta(r.kind).defaultTotal, completed: 0 } });
                            }
                          } else {
                            selectKind(r.kind);
                          }
                        }}
                      >
                        {r.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>

              {/* Duplicate warning */}
              {duplicate && !isBulk && kind && (
                <div className="rounded-xl border border-warning-500/30 bg-warning-600/10 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-warning-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-warning-300">This backlog already exists</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {subject} · {chapter} — {RESOURCE_LABEL_SAFE(kind)}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setMode("update")}
                          className="flex-1 rounded-lg bg-warning-600 text-white text-xs font-semibold py-2 hover:bg-warning-500 transition-colors"
                        >
                          Update Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => setDuplicate(null)}
                          className="flex-1 rounded-lg bg-white/5 text-slate-200 text-xs font-medium py-2 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          Create Another
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource-specific inputs */}
              {mode !== "update" && kind && !isBulk && (
                <div className="space-y-2.5">
                  <SectionLabel>Details</SectionLabel>
                  <ResourceFields
                    kind={kind}
                    resource={resources[kind] ?? { total: 0, completed: 0 }}
                    onChange={(field, v) => setResource(kind, field, v)}
                  />
                </div>
              )}

              {/* Update-progress inputs for the duplicate */}
              {mode === "update" && duplicate && kind && (
                <div className="space-y-2.5">
                  <SectionLabel>Update progress — {RESOURCE_LABEL_SAFE(kind)}</SectionLabel>
                  <Stepper label="Total" value={dupTotal} onChange={(v) => { setDupTotal(v); setDupCompleted(Math.min(dupCompleted, v)); }} />
                  <Stepper label="Completed" value={dupCompleted} onChange={(v) => setDupCompleted(Math.max(0, Math.min(dupTotal, v)))} />
                  <p className="text-xs text-slate-500">
                    Remaining: <span className="text-slate-300 font-medium">{Math.max(0, dupTotal - dupCompleted)}</span> · Progress: {dupSummary.pct}%
                  </p>
                </div>
              )}

              {/* Priority + difficulty */}
              {mode !== "update" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <SectionLabel>Priority</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {PRIORITY_OPTIONS.map((p) => (
                        <Chip key={p} active={priority === p} onClick={() => setPriority(p)} className="capitalize">{PRIORITY_META[p].label}</Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Difficulty</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)} className="capitalize">{DIFFICULTY_META[d].label}</Chip>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Due date */}
              {mode !== "update" && (
                <div>
                  <SectionLabel>Due date (optional)</SectionLabel>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 [color-scheme:dark] focus:outline-none focus:border-accent-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Live remaining / progress */}
              {mode !== "update" && !isBulk && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Remaining: <span className="text-white font-semibold">{summary.remaining}</span>{" "}
                      {kind ? resourceMeta(kind).unit : "units"}
                    </span>
                    <span className="text-accent-400 font-semibold">{summary.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                    <motion.div
                      className="h-full rounded-full bg-accent-500"
                      animate={{ width: `${summary.pct}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {mode === "update" ? (
                <button
                  onClick={saveDuplicateProgress}
                  disabled={saving}
                  className="w-full rounded-xl bg-warning-600 text-white text-sm font-semibold py-3.5 hover:bg-warning-500 disabled:opacity-50 transition-colors active:scale-[0.99]"
                >
                  {saving ? "Saving…" : "Save progress"}
                </button>
              ) : isBulk ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>{bulkKinds.length} selected</span>
                    <span className="text-slate-400">{chapter || "Pick a chapter first"}</span>
                  </div>
                  <button
                    onClick={save}
                    disabled={saving || bulkKinds.length === 0 || !chapter}
                    className="w-full rounded-xl bg-accent-600 text-white text-sm font-semibold py-3.5 hover:bg-accent-500 disabled:opacity-40 transition-colors active:scale-[0.99]"
                  >
                    {saving ? "Adding…" : `Continue — add ${bulkKinds.length || ""} backlog${bulkKinds.length === 1 ? "" : "s"}`}
                  </button>
                </div>
              ) : (
                <button
                  onClick={save}
                  disabled={saving || (mode === "edit" ? false : !kind)}
                  className="w-full rounded-xl bg-accent-600 text-white text-sm font-semibold py-3.5 hover:bg-accent-500 disabled:opacity-40 transition-colors active:scale-[0.99]"
                >
                  {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add backlog"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const RESOURCE_LABEL_SAFE = (k: BacklogKind): string =>
  BACKLOG_RESOURCES.find((r) => r.kind === k)?.label ?? "Backlog";

function ResourceFields({ kind, resource, onChange }: {
  kind: BacklogKind;
  resource: BacklogResourceProgress;
  onChange: (field: "total" | "completed", v: number) => void;
}) {
  const meta = resourceMeta(kind);
  if (kind === "revision" || kind === "mock_test" || kind === "assignment") {
    return (
      <Stepper
        label={kind === "revision" ? "Revisions remaining" : kind === "mock_test" ? "Pending tests" : "Pending assignments"}
        value={resource.total}
        hint={kind === "revision" ? "Repeated revision rounds left" : undefined}
        onChange={(v) => onChange("total", v)}
      />
    );
  }
  if (kind === "notes" || kind === "custom") {
    return <p className="text-xs text-slate-500">Nothing to track — just marked as pending.</p>;
  }
  const unit = meta.unit;
  return (
    <>
      <Stepper label={`Total ${unit}`} value={resource.total} onChange={(v) => onChange("total", v)} />
      <Stepper
        label={`${kind === "lecture" || kind === "module" ? "Completed" : "Solved"}`}
        value={resource.completed}
        hint={`of ${resource.total} ${unit}`}
        onChange={(v) => onChange("completed", v)}
      />
    </>
  );
}
