import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, Send, Plus, RefreshCw, Loader2, MessageSquare, Sparkles, Flame, ListChecks, RotateCcw, Clock, BrainCircuit, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button, Card, CardBody } from "../../components/ui";
import { cn } from "../../lib/utils";
import {
  buildMentorContext, createMentorThread, getMentorMessages,
  listMentorThreads, sendMentorMessage,
  type MentorChatMessage, type MentorContext, type MentorThread,
} from "../../services/mentor";

const SUGGESTED_PROMPTS = [
  "Plan today's strategy",
  "Can I finish my syllabus?",
  "What should I revise today?",
  "Which chapter should I study next?",
  "How do I improve my marks?",
  "Clear my backlog",
];

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (!part) return;
    let m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      nodes.push(
        <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-accent-400 underline decoration-accent-400/40 underline-offset-2 break-all">
          {renderInline(m[1])}
        </a>,
      );
      return;
    }
    m = part.match(/^(https?:\/\/[^\s)]+)$/);
    if (m) {
      nodes.push(
        <a key={i} href={m[1]} target="_blank" rel="noopener noreferrer" className="text-accent-400 underline decoration-accent-400/40 underline-offset-2 break-all">
          {m[1]}
        </a>,
      );
      return;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(<code key={i} className="font-mono text-[0.9em] bg-white/10 rounded px-1 py-0.5">{part.slice(1, -1)}</code>);
      return;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(<strong key={i} className="font-semibold">{renderInline(part.slice(2, -2))}</strong>);
      return;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      nodes.push(<em key={i}>{renderInline(part.slice(1, -1))}</em>);
      return;
    }
    nodes.push(part);
  });
  return nodes;
}

function renderBlocks(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKind: "ul" | "ol" | null = null;
  let k = 0;
  const flushList = () => {
    if (!listKind || listItems.length === 0) return;
    const Tag = listKind === "ul" ? "ul" : "ol";
    out.push(
      <Tag key={`l${k++}`} className={cn("pl-5 my-1.5 space-y-0.5", listKind === "ul" ? "list-disc" : "list-decimal")}>
        {listItems}
      </Tag>,
    );
    listItems = [];
    listKind = null;
  };
  lines.forEach((line, i) => {
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (listKind !== kind) {
        flushList();
        listKind = kind;
      }
      listItems.push(<li key={i}>{renderInline((ul ?? ol)![1])}</li>);
      return;
    }
    flushList();
    if (line.trim() === "") {
      out.push(<div key={`s${i}`} className="h-1" />);
    } else {
      out.push(<p key={`p${i}`} className="my-0.5">{renderInline(line)}</p>);
    }
  });
  flushList();
  return out;
}

function Markdown({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: { code: boolean; content: string }[] = [];
    text.split("```").forEach((part, i) => {
      if (i % 2 === 0) {
        if (part.trim().length > 0) out.push({ code: false, content: part });
      } else {
        const nl = part.indexOf("\n");
        out.push({ code: true, content: (nl === -1 ? part : part.slice(nl + 1)).replace(/\n$/, "") });
      }
    });
    return out;
  }, [text]);
  return (
    <div className="min-w-0 text-sm leading-relaxed break-words">
      {parts.map((p, i) =>
        p.code ? (
          <pre key={i} className="bg-ink-950 border border-white/10 rounded-lg p-3 my-2 text-xs overflow-x-auto whitespace-pre leading-relaxed text-slate-300">
            <code>{p.content}</code>
          </pre>
        ) : (
          <div key={i} className="whitespace-pre-wrap">{renderBlocks(p.content)}</div>
        ),
      )}
    </div>
  );
}

export default function Mentor() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [threads, setThreads] = useState<MentorThread[]>([]);
  const [activeThread, setActiveThread] = useState<MentorThread | null>(null);
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [context, setContext] = useState<MentorContext | null>(null);
  const [input, setInput] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSetupNotice, setShowSetupNotice] = useState(false);
  const [offlineReplies, setOfflineReplies] = useState(0);
  const [offlineReason, setOfflineReason] = useState<string>("");
  const [error, setError] = useState<{ message: string; retryable: boolean; kind: string } | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const activeThreadRef = useRef(activeThread);
  useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);

  const nowLabel = () => new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: profile?.time_format !== "24h",
  });

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  async function loadContext() {
    const ctx = await buildMentorContext(profile?.id ?? "", profile);
    setContext(ctx);
  }

  async function loadThreads(selectLatest = true) {
    const list = await listMentorThreads();
    setThreads(list);
    if (selectLatest) {
      if (list.length > 0) {
        setActiveThread(list[0]);
        const msgs = await getMentorMessages(list[0].id);
        setMessages(msgs);
        setTimes([]);
      } else {
        setActiveThread(null);
        setMessages([]);
        setTimes([]);
      }
    }
  }

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      await Promise.all([loadContext(), loadThreads(true)]);
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the mentor context whenever the profile changes (e.g. settings
  // saved in Academic Preferences) so the mentor uses updated preferences
  // without requiring a manual refresh.
  useEffect(() => {
    if (!profile?.id) return;
    buildMentorContext(profile.id, profile)
      .then(setContext)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updated_at]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleNewChat() {
    const thread = await createMentorThread();
    if (!thread) {
      toast.error("Could not create a new chat. Please try again.");
      return;
    }
    setThreads((prev) => [thread, ...prev]);
    setActiveThread(thread);
    setMessages([]);
    setTimes([]);
    setOfflineReplies(0);
    setError(null);
    setLastFailedText(null);
  }

  async function handleSelectThread(id: string) {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;
    setActiveThread(thread);
    setMessages(await getMentorMessages(id));
    setTimes([]);
  }

  async function sendText(text: string) {
    if (sending) return;
    const thread = activeThreadRef.current;
    if (!thread) {
      const created = await createMentorThread();
      if (!created) {
        toast.error("Could not start a chat. Please try again.");
        return;
      }
      setThreads((prev) => [created, ...prev]);
      setActiveThread(created);
      await handleSendWithThread(created, text, { persistUser: true });
      return;
    }
    await handleSendWithThread(thread, text, { persistUser: true });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    await sendText(text);
  }

  async function handleSendWithThread(thread: MentorThread, text: string, opts: { persistUser: boolean }) {
    const isRetry = !opts.persistUser;
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    setSending(true);
    setError(null);
    if (!isRetry) {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setTimes((prev) => [...prev, nowLabel()]);
    }
    try {
      const ctx = context ?? await buildMentorContext(profile?.id ?? "", profile);
      if (!context) setContext(ctx);
      const history = isRetry ? messages.slice(0, -1) : messages;
      const result = await sendMentorMessage(thread.id, thread.title, text, history, ctx, { persistUser: opts.persistUser });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      setTimes((prev) => [...prev, nowLabel()]);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, updated_at: new Date().toISOString() } : t)));
      setLastFailedText(null);
      if (result.source === "offline") {
        setOfflineReason(result.reason ?? "AI Mentor service is not configured.");
        setShowSetupNotice(true);
        setOfflineReplies((n) => n + 1);
      }
    } catch (err) {
      const e = err as { kind?: string; retryable?: boolean; message?: string };
      setError({
        message: e?.message || "The AI Mentor could not be reached. Please try again.",
        retryable: e?.retryable ?? false,
        kind: e?.kind ?? "unknown",
      });
      setLastFailedText(text);
    } finally {
      setSending(false);
    }
  }

  async function handleRetry() {
    if (!activeThread || !lastFailedText || sending) return;
    await handleSendWithThread(activeThread, lastFailedText, { persistUser: false });
  }

  const statsChips = useMemo(() => {
    if (!context) return [];
    const c = context;
    return [
      { icon: Flame, label: "Streak", value: `${c.streak}d`, color: "text-orange-400" },
      { icon: Clock, label: "Week", value: `${c.last7Days.completionRate ?? "–"}%`, color: "text-sky-400" },
      { icon: ListChecks, label: "Backlog", value: `${c.backlog.pendingItems}`, color: "text-rose-400" },
      { icon: RotateCcw, label: "Revision due", value: `${c.revisionDue.length}`, color: "text-amber-400" },
      { icon: BrainCircuit, label: "Today", value: `${Math.round(c.today.plannedMinutes / 60 * 10) / 10}h`, color: "text-emerald-400" },
    ];
  }, [context]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-5.5rem)] md:h-[calc(100vh-3rem)] supports-[height:100dvh]:h-[calc(100dvh-5.5rem)] md:supports-[height:100dvh]:h-[calc(100dvh-3rem)] overflow-hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent-400 shrink-0" /> AI Mentor
          </h1>
          <p className="text-sm text-slate-400 mt-1">Answers grounded in your real planner, backlog, revision and stats.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={async () => { await loadContext(); toast.success("Student data refreshed"); }} title="Refresh student data">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <Plus className="w-4 h-4" /> New chat
          </Button>
        </div>
      </div>

      {statsChips.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {statsChips.map((chip) => (
            <div key={chip.label} className="flex items-center gap-2 bg-ink-900 border border-white/5 rounded-xl px-3 py-1.5">
              <chip.icon className={cn("w-4 h-4", chip.color)} />
              <span className="text-xs text-slate-400">{chip.label}</span>
              <span className="text-sm font-semibold text-white">{chip.value}</span>
            </div>
          ))}
        </div>
      )}

      {threads.length > 0 && (
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <MessageSquare className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={activeThread?.id ?? ""}
            onChange={(e) => handleSelectThread(e.target.value)}
            aria-label="Conversation thread"
            className="flex-1 min-w-0 max-w-full bg-ink-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-accent-500"
          >
            {threads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} · {new Date(t.updated_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {showSetupNotice && (
        <div className="bg-warning-600/10 border border-warning-600/30 rounded-xl px-4 py-3 text-sm text-warning-300 shrink-0">
          <strong className="font-semibold">Offline mentor mode.</strong> {offlineReason} The mentor answered from your real
          data without an LLM. To unlock the full conversational mentor, deploy the <code className="text-warning-200">mentor-chat</code>
          {" "}Supabase edge function and set an <code className="text-warning-200">OPENROUTER_API_KEY</code> (or <code className="text-warning-200">OPENAI_API_KEY</code>) secret.
        </div>
      )}

      {error && (
        <div className="bg-danger-600/10 border border-danger-600/30 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-danger-200">
              Mentor request failed{error.kind !== "unknown" ? ` — ${error.kind.replace(/_/g, " ")}` : ""}
            </p>
            <p className="text-danger-300/90 mt-0.5">{error.message}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {error.retryable && (
              <Button variant="ghost" size="sm" onClick={handleRetry} disabled={sending}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Retry
              </Button>
            )}
            <button onClick={() => setError(null)} className="text-danger-300/70 hover:text-danger-200" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Card className="bg-ink-900 border border-white/5 rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardBody className="p-0 flex-1 min-h-0 flex flex-col">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite" aria-relevant="additions">
            {loadingData ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your preparation data…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 min-w-0">
                <ShieldCheck className="w-10 h-10 text-accent-400 mb-3" />
                <p className="text-slate-300 font-medium">Ask me anything — I'll answer from your real data.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {context
                    ? `${context.exam ?? "Your exam"} · ${context.daysToExam !== null ? `~${context.daysToExam} days to target year · ` : ""}${context.chapters.completed}/${context.chapters.total || "?"} chapters done`
                    : "Loading profile…"}
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendText(p)}
                      className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-slate-300 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 inline mr-1 text-accent-400" />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[85%] md:max-w-[70%] min-w-0 flex-col", m.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn("flex gap-2.5 min-w-0 max-w-full", m.role === "user" ? "flex-row-reverse" : "")}>
                      {m.role === "assistant" && (
                        <div className="w-8 h-8 rounded-xl bg-accent-600/20 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-4 h-4 text-accent-400" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 min-w-0",
                          m.role === "user"
                            ? "chat-user bg-accent-600/90 text-white rounded-br-md"
                            : "bg-ink-800 border border-white/5 text-slate-300 rounded-bl-md",
                        )}
                      >
                        <Markdown text={m.content} />
                      </div>
                    </div>
                    {times[i] && (
                      <span className="text-[10px] text-slate-500 mt-1 px-1">{times[i]}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent-600/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-accent-400" />
                </div>
                <div className="bg-ink-800 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:120ms]" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:240ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Composer — bottom padding keeps the floating add-backlog FAB from covering the input
              (FAB top edge = 5rem + safe-area-inset; mobile page bottom edge sits 1rem above it, md 1.5rem) */}
          <div className="border-t border-white/5 p-3 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow(e.target);
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask your mentor anything — strategy, syllabus, revision, backlog…"
                aria-label="Message your mentor"
                className="input-base resize-none min-w-0 flex-1 max-h-32"
              />
              <Button variant="primary" size="md" onClick={handleSend} disabled={sending || !input.trim()} className="shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              Enter to send · Shift+Enter for a new line ·{" "}
              {offlineReplies > 0 ? `${offlineReplies} reply offline` : "answers use your live study data"}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
