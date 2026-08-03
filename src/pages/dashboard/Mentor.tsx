import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, Send, Plus, RefreshCw, Loader2, MessageSquare, Sparkles, Flame, ListChecks, RotateCcw, Clock, BrainCircuit, X, Mic, MicOff, Volume2, VolumeX, Pause, Play, Square } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useVoice } from "../../context/VoiceContext";
import { Button, Card, CardBody } from "../../components/ui";
import { cn } from "../../lib/utils";
import {
  buildMentorContext, createMentorThread, getMentorMessages,
  listMentorThreads, sendMentorMessage,
  type MentorChatMessage, type MentorContext, type MentorThread,
} from "../../services/mentor";
import { detectSituation, type MentorSituation } from "../../services/speech/tone";

const SUGGESTED_PROMPTS = [
  "Plan today's strategy",
  "Can I finish my syllabus?",
  "What should I revise today?",
  "Which chapter should I study next?",
  "How do I improve my marks?",
  "Clear my backlog",
];

function renderBold(text: string): React.ReactNode[] {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-white">{part}</strong> : <span key={i}>{part}</span>,
  );
}

export default function Mentor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { engine, settings, updateSettings } = useVoice();

  const [threads, setThreads] = useState<MentorThread[]>([]);
  const [activeThread, setActiveThread] = useState<MentorThread | null>(null);
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [context, setContext] = useState<MentorContext | null>(null);
  const [input, setInput] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSetupNotice, setShowSetupNotice] = useState(false);
  const [offlineReplies, setOfflineReplies] = useState(0);
  const [offlineReason, setOfflineReason] = useState<string>("");
  const [error, setError] = useState<{ message: string; retryable: boolean; kind: string } | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  // --- Voice state ---
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [spokenChars, setSpokenChars] = useState(0);
  const editingTranscriptRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Last reply read aloud (for the Replay button), with its detected situation. */
  const lastSpokenRef = useRef<{ text: string; situation: MentorSituation } | null>(null);

  const canRecord = engine.capabilities.recognition;
  const canSpeak = engine.capabilities.synthesis;

  const activeThreadRef = useRef(activeThread);
  useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);

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
      } else {
        setActiveThread(null);
        setMessages([]);
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
    setOfflineReplies(0);
    setError(null);
    setLastFailedText(null);
  }

  async function handleSelectThread(id: string) {
    const thread = threads.find((t) => t.id === id);
    if (!thread) return;
    setActiveThread(thread);
    setMessages(await getMentorMessages(id));
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
    await sendText(text);
  }

  async function handleSendWithThread(thread: MentorThread, text: string, opts: { persistUser: boolean }) {
    const isRetry = !opts.persistUser;
    setInput("");
    setSending(true);
    setError(null);
    if (!isRetry) {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
    }
    try {
      const ctx = context ?? await buildMentorContext(profile?.id ?? "", profile);
      if (!context) setContext(ctx);
      const history = isRetry ? messages.slice(0, -1) : messages;
      const result = await sendMentorMessage(thread.id, thread.title, text, history, ctx, { persistUser: opts.persistUser });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, updated_at: new Date().toISOString() } : t)));
      setLastFailedText(null);
      if (result.source === "offline") {
        setOfflineReason(result.reason ?? "AI Mentor service is not configured.");
        setShowSetupNotice(true);
        setOfflineReplies((n) => n + 1);
      }
      // The voice adapts to the student's situation (behind / achieved /
      // stressed / low productivity) — the reply text is never changed.
      readReplyAloud(result.reply, detectSituation(ctx, text));
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

  function readReplyAloud(reply: string, situation: MentorSituation = "neutral") {
    if (!settings.autoRead || !canSpeak) return;
    const ok = engine.speak(reply, {
      style: { personality: settings.voicePersonality, situation },
      onStateChange: (s) => {
        if (s === "started") setSpeaking(true);
        if (s === "paused") setSpeechPaused(true);
        if (s === "resumed") setSpeechPaused(false);
        if (s === "ended" || s === "stopped") {
          setSpeaking(false);
          setSpeechPaused(false);
          setSpokenText(null);
          setSpokenChars(0);
        }
      },
      onBoundary: (i) => setSpokenChars(i),
    });
    if (ok) {
      setSpokenText(reply);
      setSpokenChars(0);
      lastSpokenRef.current = { text: reply, situation };
    }
  }

  function handleReplay() {
    const last = lastSpokenRef.current;
    if (!last || !canSpeak) return;
    engine.stopSpeaking();
    setSpeaking(false);
    setSpeechPaused(false);
    setSpokenChars(0);
    readReplyAloud(last.text, last.situation);
  }

  async function handleRetry() {
    if (!activeThread || !lastFailedText || sending) return;
    await handleSendWithThread(activeThread, lastFailedText, { persistUser: false });
  }

  // --- Voice input ---
  const startRecording = useCallback(() => {
    if (!canRecord || sending) return;
    // Quick follow-up: stop reading the current reply, start listening.
    if (speaking || speechPaused) {
      engine.stopSpeaking();
      setSpeaking(false);
      setSpeechPaused(false);
      setSpokenText(null);
      setSpokenChars(0);
    }
    setVoiceError(null);
    setLiveTranscript("");
    editingTranscriptRef.current = false;
    const ok = engine.startListening({
      onPartial: (t) => {
        if (!editingTranscriptRef.current) setLiveTranscript(t);
      },
      onFinal: (text) => {
        setRecording(false);
        const trimmed = text.trim();
        if (!trimmed) return;
        if (settings.autoSend && !editingTranscriptRef.current) {
          setLiveTranscript("");
          void sendText(trimmed);
        } else {
          setLiveTranscript(trimmed);
        }
      },
      onStatusChange: (s) => setRecording(s === "listening"),
      onError: (code, message) => {
        setRecording(false);
        if (code === "empty" || code === "timeout") return;
        setVoiceError(message);
      },
    });
    if (ok) {
      setRecording(true);
    } else {
      setVoiceError("The microphone could not start in this browser. Try typing instead.");
    }
  }, [canRecord, sending, speaking, speechPaused, engine, settings.autoSend]);

  const stopRecording = useCallback(() => {
    engine.stopListening();
    setRecording(false);
  }, [engine]);

  const toggleMic = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  const sendTranscript = async () => {
    const text = liveTranscript.trim();
    if (!text || sending) return;
    setLiveTranscript("");
    setVoiceError(null);
    await sendText(text);
  };

  // --- Keyboard shortcuts: Alt+M toggles recording, Escape stops speech ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        toggleMic();
      } else if (e.key === "Escape" && (speaking || speechPaused)) {
        engine.stopSpeaking();
        setSpeaking(false);
        setSpeechPaused(false);
        setSpokenText(null);
        setSpokenChars(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMic, speaking, speechPaused, engine]);

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
      if (recording) stopRecording();
      else handleSend();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent-400" /> AI Mentor
          </h1>
          <p className="text-sm text-slate-400 mt-1">Answers grounded in your real planner, backlog, revision and stats{canRecord ? " · press Alt+M to talk" : ""}.</p>
        </div>
        <div className="flex items-center gap-2">
          {canSpeak && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateSettings({ autoRead: !settings.autoRead })}
              title={settings.autoRead ? "Voice replies are on — click to mute" : "Voice replies are off — click to enable"}
            >
              {settings.autoRead ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} Voice {settings.autoRead ? "on" : "off"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={async () => { await loadContext(); toast.success("Student data refreshed"); }} title="Refresh student data">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <Plus className="w-4 h-4" /> New chat
          </Button>
        </div>
      </div>

      {statsChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <select
            value={activeThread?.id ?? ""}
            onChange={(e) => handleSelectThread(e.target.value)}
            className="bg-ink-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-accent-500"
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
        <div className="bg-warning-600/10 border border-warning-600/30 rounded-xl px-4 py-3 text-sm text-warning-300">
          <strong className="font-semibold">Offline mentor mode.</strong> {offlineReason} The mentor answered from your real
          data without an LLM. To unlock the full conversational mentor, deploy the <code className="text-warning-200">mentor-chat</code>
          {" "}Supabase edge function and set an <code className="text-warning-200">OPENROUTER_API_KEY</code> (or <code className="text-warning-200">OPENAI_API_KEY</code>) secret.
        </div>
      )}

      {!canRecord && !canSpeak && (
        <div className="bg-ink-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-400">
          Voice isn't supported in this browser. The mentor works exactly the same — just type your questions.
        </div>
      )}

      {voiceError && (
        <div className="bg-danger-600/10 border border-danger-600/30 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3">
          <p className="text-danger-200">{voiceError}</p>
          <button onClick={() => setVoiceError(null)} className="text-danger-300/70 hover:text-danger-200 shrink-0" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-danger-600/10 border border-danger-600/30 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3">
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

      <Card className="bg-ink-900 border border-white/5 rounded-2xl">
        <CardBody className="p-0">
          <div ref={scrollRef} className="h-[46vh] overflow-y-auto px-4 py-4 space-y-4">
            {loadingData ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your preparation data…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
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
                <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-accent-600/20 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-accent-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
                      m.role === "user"
                        ? "bg-accent-600/90 text-white rounded-br-md"
                        : "bg-ink-800 border border-white/5 text-slate-300 rounded-bl-md",
                    )}
                  >
                    {renderBold(m.content)}
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

          {/* Status bar: 🎙️ Listening / 🤖 Thinking / 🔊 Speaking */}
          {(recording || sending || speaking) && (
            <div className="border-t border-white/5 px-4 py-2 flex items-center gap-2 flex-wrap">
              {recording && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-300 bg-danger-600/10 border border-danger-600/30 rounded-full px-3 py-1">
                  <Mic className="w-3.5 h-3.5 animate-pulse" /> 🎙️ Listening…
                </span>
              )}
              {sending && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-300 bg-accent-600/10 border border-accent-600/30 rounded-full px-3 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 🤖 Thinking…
                </span>
              )}
              {speaking && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-600/10 border border-emerald-600/30 rounded-full px-3 py-1">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" /> 🔊 Speaking…
                </span>
              )}
              {recording && (
                <span className="text-[11px] text-slate-500">Speak now — it auto-stops on silence{settings.autoSend ? " and sends" : ""} · tap mic or Alt+M to stop</span>
              )}
            </div>
          )}

          {/* Captions while the reply is being read aloud */}
          {spokenText && (
            <div className="border-t border-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Reading reply aloud{speechPaused ? " (paused)" : ""}
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={settings.speechRate}
                    onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })}
                    title="Speaking speed"
                    aria-label="Speaking speed"
                    className="bg-ink-950 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-accent-500"
                  >
                    {[0.8, 1.0, 1.15, 1.25, 1.4].map((r) => (
                      <option key={r} value={r} className="bg-slate-900 text-white">{r}×</option>
                    ))}
                  </select>
                  <button
                    onClick={handleReplay}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-accent-400 hover:bg-white/5 transition-colors"
                    title="Replay response"
                    aria-label="Replay response"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => (speechPaused ? engine.resume() : engine.pause())}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-accent-400 hover:bg-white/5 transition-colors"
                    title={speechPaused ? "Resume" : "Pause"}
                    aria-label={speechPaused ? "Resume" : "Pause"}
                  >
                    {speechPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { engine.stopSpeaking(); setSpeaking(false); setSpeechPaused(false); setSpokenText(null); setSpokenChars(0); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-danger-400 hover:bg-white/5 transition-colors"
                    title="Stop"
                    aria-label="Stop"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-h-16 overflow-hidden">
                <span className="text-emerald-200">{spokenText.slice(0, spokenChars)}</span>
                <span className="text-slate-600">{spokenText.slice(spokenChars)}</span>
              </p>
            </div>
          )}

          {/* Composer: listening panel or normal input */}
          <div className="border-t border-white/5 p-3">
            {recording || liveTranscript ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger-500" />
                  </span>
                  <span className="text-xs font-medium text-danger-300">📝 Live transcript{recording ? " — keep talking" : ""}</span>
                </div>
                <textarea
                  value={liveTranscript}
                  onChange={(e) => { editingTranscriptRef.current = true; setLiveTranscript(e.target.value); }}
                  onFocus={() => { editingTranscriptRef.current = true; }}
                  rows={2}
                  placeholder="Your words will appear here…"
                  className="flex-1 w-full bg-ink-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500 resize-none"
                />
                <div className="flex items-center gap-2">
                  {recording && (
                    <Button variant="ghost" size="sm" onClick={stopRecording}>
                      <MicOff className="w-4 h-4" /> Stop
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={sendTranscript} disabled={sending || !liveTranscript.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                  </Button>
                  <span className="text-[11px] text-slate-600">Edit the transcript before sending if you like</span>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="Ask your mentor anything — strategy, syllabus, revision, backlog…"
                  className="flex-1 bg-ink-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500 resize-none"
                />
                {canRecord && (
                  <button
                    onClick={toggleMic}
                    disabled={sending || loadingData}
                    title={recording ? "Stop recording (Alt+M)" : "Talk to your mentor (Alt+M)"}
                    aria-label={recording ? "Stop recording" : "Start recording"}
                    className={cn(
                      "h-[46px] w-[46px] rounded-xl flex items-center justify-center transition-colors shrink-0",
                      recording
                        ? "bg-danger-600 text-white animate-pulse"
                        : "bg-white/5 border border-white/10 text-slate-300 hover:text-accent-400 hover:border-accent-500/50",
                    )}
                  >
                    {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}
                <Button variant="primary" size="md" onClick={handleSend} disabled={sending || !input.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            )}
            <p className="text-[11px] text-slate-600 mt-1.5">
              Enter to send · Shift+Enter for a new line{canRecord ? " · Alt+M to talk" : ""} ·{" "}
              {offlineReplies > 0 ? `${offlineReplies} reply offline` : "answers use your live study data"}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
