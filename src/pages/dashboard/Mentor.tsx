import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BrainCircuit, Camera, Clock, Download, Flame, Image as ImageIcon, ListChecks,
  Loader2, MessageSquare, Mic, MoreHorizontal, Paperclip, Plus, RefreshCw, RotateCcw,
  Send, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui";
import CropDialog from "../../components/mentor/CropDialog";
import ImagePreviewPanel, { type PendingImage } from "../../components/mentor/ImagePreviewPanel";
import { ChatMessage, TypingDots, type MessageFeedback } from "../../components/mentor/ChatMessage";
import { cn } from "../../lib/utils";
import { SEO } from "../../components/SEO";
import {
  buildMentorContext, createMentorThread, getMentorMessages,
  listMentorThreads, sendMentorMessage,
  type MentorChatMessage, type MentorContext, type MentorImageData, type MentorThread, type PlannerChange,
} from "../../services/mentor";
import {
  applyMentorPlannerChange, undoMentorPlannerChange,
  type PlannerSnapshot,
} from "../../services/plannerMentor";
import {
  clearSessionImages, compressImage, fileToDataUrl, getSessionImage, imageMarkersIn,
  newImageId, placeholderImageMarkers, storeSessionImage, validateImageFile,
} from "../../lib/imageUtils";

const SUGGESTED_PROMPTS = [
  "Plan today's strategy",
  "Can I finish my syllabus?",
  "What should I revise today?",
  "Which chapter should I study next?",
  "How do I improve my marks?",
  "Clear my backlog",
];

const STAGES_IMAGE = ["Analyzing your image…", "Reading the question…", "Solving step by step…", "Writing your answer…"];
const STAGES_TEXT = ["AI Mentor is thinking…", "Writing your answer…"];

const VISIBLE_MESSAGES = 80;
const COMPOSER_MAX_HEIGHT = 144;

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function collectImages(msgs: MentorChatMessage[]): Record<string, MentorImageData> {
  const out: Record<string, MentorImageData> = {};
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role !== "user") continue;
    let found = false;
    for (const id of imageMarkersIn(m.content)) {
      if (out[id]) continue;
      const entry = getSessionImage(id);
      if (entry) {
        out[id] = { dataUrl: entry.dataUrl, alt: entry.alt };
        found = true;
      }
    }
    if (found) break;
  }
  return out;
}

function formatShareDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function Mentor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<MentorThread[]>([]);
  const [activeThread, setActiveThread] = useState<MentorThread | null>(null);
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [context, setContext] = useState<MentorContext | null>(null);
  const [input, setInput] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showSetupNotice, setShowSetupNotice] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string>("");
  const [error, setError] = useState<{ message: string; retryable: boolean; kind: string } | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [stageList, setStageList] = useState<string[]>([]);
  const [stageIdx, setStageIdx] = useState(0);

  const [moreOpen, setMoreOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_MESSAGES);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, MessageFeedback>>({});
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [micListening, setMicListening] = useState(false);
  const [micSupported] = useState(() => !!getSpeechRecognition());

  const [plannerEnabled, setPlannerEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("mentor:planner_enabled") !== "0"; } catch { return true; }
  });
  const [planChange, setPlanChange] = useState<{
    change: PlannerChange; snapshot: PlannerSnapshot; summary: string[]; errors: string[];
  } | null>(null);
  const [planBusy, setPlanBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const micBaseTextRef = useRef("");
  const micFinalTextRef = useRef("");

  const activeThreadRef = useRef(activeThread);
  useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const timesRef = useRef(times);
  useEffect(() => { timesRef.current = times; }, [times]);
  const speakingIdxRef = useRef(speakingIdx);
  useEffect(() => { speakingIdxRef.current = speakingIdx; }, [speakingIdx]);
  const nearBottomRef = useRef(true);
  const forceJumpRef = useRef(false);

  const stopReveal = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => () => {
    stopReveal();
    clearSessionImages();
    recognitionRef.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [stopReveal]);

  useEffect(() => {
    if (!sending || stageList.length === 0) return;
    const timer = setInterval(() => setStageIdx((i) => (i + 1) % stageList.length), 1400);
    return () => clearInterval(timer);
  }, [sending, stageList.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMoreOpen(false);
      if (lightbox) setLightbox(null);
      if (cropOpen) setCropOpen(false);
      if (micListening) {
        recognitionRef.current?.abort();
        setMicListening(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, cropOpen, micListening]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = Array.from(items)
        .filter((it) => it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (imageFiles.length === 0) return;
      e.preventDefault();
      handleFile(imageFiles[0]);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (sending || streaming) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (forceJumpRef.current) {
      forceJumpRef.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (nearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending, streaming]);

  const nowLabel = () => new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: profile?.time_format !== "24h",
  });

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }

  async function handleFile(file: File) {
    if (sending || preparing) return;
    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingImage({ id: newImageId(), dataUrl, fileName: file.name || "captured-photo.jpg" });
    } catch {
      toast.error("Couldn't read that image. Please try another file.");
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
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
      setVisibleCount(VISIBLE_MESSAGES);
      forceJumpRef.current = true;
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    buildMentorContext(profile.id, profile)
      .then(setContext)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updated_at]);

  const resetChatState = () => {
    stopReveal();
    setSending(false);
    setError(null);
    setLastFailedText(null);
    setPendingImage(null);
    setFeedbackMap({});
    setVisibleCount(VISIBLE_MESSAGES);
    nearBottomRef.current = true;
    forceJumpRef.current = true;
  };

  async function handleNewChat() {
    const thread = await createMentorThread();
    if (!thread) {
      toast.error("Could not create a new chat. Please try again.");
      return;
    }
    resetChatState();
    setThreads((prev) => [thread, ...prev]);
    setActiveThread(thread);
    setMessages([]);
    setTimes([]);
    setShowSetupNotice(false);
    composerRef.current?.focus();
  }

  async function handleSelectThread(id: string) {
    const thread = threads.find((t) => t.id === id);
    if (!thread || sending) return;
    resetChatState();
    setActiveThread(thread);
    setMessages(await getMentorMessages(id));
    setTimes([]);
    setMoreOpen(false);
  }

  async function sendText(text: string, userContent?: string) {
    if (sending || streaming) return;
    const thread = activeThreadRef.current;
    if (!thread) {
      const created = await createMentorThread();
      if (!created) {
        toast.error("Could not start a chat. Please try again.");
        return;
      }
      setThreads((prev) => [created, ...prev]);
      setActiveThread(created);
      await handleSendWithThread(created, text, { persistUser: true }, userContent);
      return;
    }
    await handleSendWithThread(thread, text, { persistUser: true }, userContent);
  }

  async function handleSend() {
    if (sending || preparing || streaming) return;
    if (pendingImage) {
      await handleSolve();
      return;
    }
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    await sendText(text);
  }

  async function handleSolve() {
    if (!pendingImage || sending || preparing || streaming) return;
    const img = pendingImage;
    setPreparing(true);
    try {
      const compressed = await compressImage(img.dataUrl);
      storeSessionImage(img.id, compressed, img.fileName);
    } catch (err) {
      console.error("[mentor] image compression failed, sending original", err);
      storeSessionImage(img.id, img.dataUrl, img.fileName);
    }
    const text = input.trim() || "Solve this question.";
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    setPendingImage(null);
    const userContent = `[IMAGE:${img.id}]\n${text}`;
    await sendText(text, userContent);
    setPreparing(false);
  }

  const startReveal = useCallback((full: string) => {
    stopReveal();
    if (!full) return;
    setStreaming(true);
    const ticks = Math.min(220, Math.max(10, Math.round(full.length / 14)));
    const step = Math.max(1, Math.ceil(full.length / ticks));
    let i = 0;
    revealTimerRef.current = setInterval(() => {
      i = Math.min(full.length, i + step);
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        if (!last || last.role !== "assistant") return prev;
        next[next.length - 1] = { role: "assistant", content: full.slice(0, i) };
        return next;
      });
      if (i >= full.length) stopReveal();
    }, 16);
  }, [stopReveal]);

  async function handleSendWithThread(
    thread: MentorThread, text: string, opts: { persistUser: boolean },
    userContent?: string, historyOverride?: MentorChatMessage[],
  ) {
    const isRetry = !opts.persistUser;
    const content = userContent ?? text;
    setInput("");
    if (composerRef.current) autoGrow(composerRef.current);
    setSending(true);
    setError(null);
    setStageIdx(0);
    setStageList(imageMarkersIn(content).length > 0 ? STAGES_IMAGE : STAGES_TEXT);
    const newMsg: MentorChatMessage = { role: "user", content };
    if (!isRetry) {
      setMessages((prev) => [...prev, newMsg]);
      setTimes((prev) => [...prev, nowLabel()]);
    }
    try {
      const ctx = context ?? await buildMentorContext(profile?.id ?? "", profile);
      if (!context) setContext(ctx);
      const history = historyOverride ?? (isRetry ? messages.slice(0, -1) : messages);
      const images = collectImages([...history, newMsg]);
      const result = await sendMentorMessage(thread.id, thread.title, content, history, ctx, { persistUser: opts.persistUser, plannerEnabled }, undefined, images);
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setTimes((prev) => [...prev, nowLabel()]);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, updated_at: new Date().toISOString() } : t)));
      setLastFailedText(null);
      if (result.source === "offline") {
        setOfflineReason(result.reason ?? "AI Mentor service is not configured.");
        setShowSetupNotice(true);
      }
      startReveal(result.reply);
      const plannerChange = result.planner;
      if (plannerChange) {
        void (async () => {
          setPlanBusy(true);
          try {
            const res = await applyMentorPlannerChange(plannerChange, profile);
            if (res.applied) {
              setPlanChange({ change: plannerChange, snapshot: res.snapshot!, summary: res.summary, errors: res.errors });
              loadContext();
            } else {
              toast.info("The mentor suggested a plan change, but it didn't fit your plan — nothing was changed.");
            }
          } catch (err) {
            console.error("[mentor] apply plan change failed", err);
            toast.error("Couldn't apply the mentor's plan change. Nothing was changed.");
          } finally {
            setPlanBusy(false);
          }
        })();
      }
    } catch (err) {
      const e = err as { kind?: string; retryable?: boolean; message?: string };
      setError({
        message: e?.message || "The AI Mentor could not be reached. Please try again.",
        retryable: e?.retryable ?? false,
        kind: e?.kind ?? "unknown",
      });
      setLastFailedText(content);
    } finally {
      setSending(false);
    }
  }

  async function handleRetry() {
    if (!activeThread || !lastFailedText || sending || streaming) return;
    await handleSendWithThread(activeThread, lastFailedText, { persistUser: false }, lastFailedText);
  }

  const togglePlanner = () => {
    setPlannerEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("mentor:planner_enabled", next ? "1" : "0"); } catch { /* ignore */ }
      toast.info(next ? "Mentor can now adjust your plan" : "Mentor plan adjustments turned off");
      return next;
    });
  };

  const handleUndoPlanChange = async () => {
    if (!planChange || planBusy) return;
    setPlanBusy(true);
    try {
      const ok = await undoMentorPlannerChange(planChange.change, planChange.snapshot);
      if (ok) {
        toast.success("Reverted the mentor's plan change");
        setPlanChange(null);
        loadContext();
      } else {
        toast.error("Couldn't fully revert — please check your plan.");
      }
    } catch (err) {
      console.error("[mentor] undo plan change failed", err);
      toast.error("Undo failed — please check your plan.");
    } finally {
      setPlanBusy(false);
    }
  };

  const handleRegenerate = useCallback(async (idx: number) => {
    if (sending || streaming) return;
    const thread = activeThreadRef.current;
    const all = messagesRef.current;
    if (!thread) return;
    let userIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (all[i]?.role === "user") {
        userIdx = i;
        break;
      }
    }
    if (userIdx < 0) return;
    const userMsg = all[userIdx];
    setMessages(all.slice(0, userIdx + 1));
    setTimes(timesRef.current.slice(0, userIdx + 1));
    setFeedbackMap((prev) => {
      const next: Record<number, MessageFeedback> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        if (ki <= userIdx) next[ki] = prev[ki];
      }
      return next;
    });
    setVisibleCount(VISIBLE_MESSAGES);
    nearBottomRef.current = true;
    forceJumpRef.current = true;
    await handleSendWithThread(thread, userMsg.content, { persistUser: false }, userMsg.content, all.slice(0, userIdx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, streaming]);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy automatically — select the text and copy manually.");
    }
  }, [toast]);

  const handleReadAloud = useCallback((idx: number, content: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech isn't supported in this browser.");
      return;
    }
    if (speakingIdxRef.current === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const text = placeholderImageMarkers(content);
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setSpeakingIdx(null);
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  }, [toast]);

  const handleFeedback = useCallback((idx: number, fb: MessageFeedback) => {
    setFeedbackMap((prev) => {
      const next = { ...prev };
      if (next[idx] === fb) delete next[idx];
      else next[idx] = fb;
      return next;
    });
    toast.success(fb === "like" ? "Thanks for the feedback!" : "Noted — I'll keep improving.");
  }, [toast]);

  const handleShare = useCallback(async (idx: number, content: string) => {
    const all = messagesRef.current;
    let q = "";
    for (let i = idx - 1; i >= 0; i--) {
      if (all[i]?.role === "user") {
        q = placeholderImageMarkers(all[i].content);
        break;
      }
    }
    const text = q ? `Q: ${q}\n\nA: ${content}` : content;
    const shareData = { title: "StudyShield AI Mentor", text };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied question & answer to clipboard");
      }
    } catch {
      // user dismissed the share sheet — not an error
    }
  }, [toast]);

  const handleExportChat = useCallback(() => {
    const all = messagesRef.current;
    if (all.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    const body = all
      .map((m) => `## ${m.role === "user" ? "You" : "AI Mentor"}\n\n${placeholderImageMarkers(m.content)}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# StudyShield AI Mentor chat\n\n${body}\n`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mentor-chat.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported as markdown");
  }, [toast]);

  const toggleMic = useCallback(() => {
    if (!micSupported) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    if (micListening) {
      recognitionRef.current?.stop();
      return;
    }
    try {
      const Ctor = getSpeechRecognition();
      if (!Ctor) return;
      const rec = new Ctor();
      rec.lang = "en-IN";
      rec.interimResults = true;
      rec.continuous = false;
      micBaseTextRef.current = input;
      micFinalTextRef.current = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) micFinalTextRef.current += r[0].transcript;
          else interim += r[0].transcript;
        }
        const base = micBaseTextRef.current.trim();
        const spoken = `${micFinalTextRef.current}${interim}`.trim();
        setInput(spoken ? `${base ? `${base} ` : ""}${spoken}` : base);
      };
      rec.onend = () => setMicListening(false);
      rec.onerror = () => setMicListening(false);
      recognitionRef.current = rec;
      rec.start();
      setMicListening(true);
      toast.success("Listening… speak your question");
    } catch {
      setMicListening(false);
      toast.error("Couldn't start voice input. Try again.");
    }
  }, [micSupported, micListening, input, toast]);

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

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  const visibleMessages = messages.length > visibleCount ? messages.slice(-visibleCount) : messages;
  const baseIndex = messages.length - visibleMessages.length;
  const busy = sending || preparing || streaming;

  return (
    <>
      <SEO robots="noindex, nofollow" />
      <div
      className="flex h-screen flex-col overflow-hidden bg-ink-950 supports-[height:100dvh]:h-dvh"
      onDragOver={(e) => {
        if (busy) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (busy) return;
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
    >
      {/* ── Fixed header ─────────────────────────────────────────────── */}
      <header className="z-40 shrink-0 border-b border-white/5 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[900px] items-center gap-1.5 px-3 md:h-16 md:gap-2 md:px-6">
          <button
            onClick={goBack}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-600/20">
              <ShieldCheck className="h-5 w-5 text-accent-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">StudyShield AI Mentor</p>
              <p className="hidden truncate text-[10px] text-slate-500 md:block">Answers grounded in your real planner, backlog, revision and stats</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleNewChat} className="shrink-0">
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <div className="relative shrink-0">
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-label="More options"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden />
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-40 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl"
                  >
                    {threads.length > 0 && (
                      <>
                        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Conversations
                        </p>
                        {threads.slice(0, 8).map((t) => (
                          <button
                            key={t.id}
                            role="menuitem"
                            onClick={() => handleSelectThread(t.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              activeThread?.id === t.id ? "bg-accent-600/15 text-accent-400" : "text-slate-200 hover:bg-white/5",
                            )}
                          >
                            <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" />
                            <span className="min-w-0 flex-1 truncate">{t.title}</span>
                            <span className="shrink-0 text-[10px] text-slate-500">{formatShareDate(t.updated_at)}</span>
                          </button>
                        ))}
                        <div className="my-1 border-t border-white/5" />
                      </>
                    )}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        togglePlanner();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
                    >
                      <BrainCircuit className="h-4 w-4 shrink-0 text-accent-400" />
                      <span className="min-w-0 flex-1 truncate text-left">Mentor may adjust my plan</span>
                      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", plannerEnabled ? "bg-accent-600" : "bg-white/10")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", plannerEnabled ? "left-[18px]" : "left-0.5")} />
                      </span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={async () => {
                        setMoreOpen(false);
                        await loadContext();
                        toast.success("Student data refreshed");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
                    >
                      <RefreshCw className="h-4 w-4 text-accent-400" /> Refresh student data
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        handleExportChat();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/5"
                    >
                      <Download className="h-4 w-4 text-accent-400" /> Export chat
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Scrollable chat area ─────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto" aria-live="polite" aria-relevant="additions">
        <div className="mx-auto w-full max-w-[900px] space-y-5 px-4 pb-6 pt-4 md:px-6 md:pt-6">
          {loadingData ? (
            <div className="flex h-full min-h-[40vh] items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your preparation data…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-600/20">
                  <ShieldCheck className="h-8 w-8 text-accent-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Hi! I'm your AI Mentor</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
                  Ask me anything — I'll answer from your real StudyShield data: planner, backlog, revision, mocks and stats.
                </p>
                {statsChips.length > 0 && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {statsChips.map((chip) => (
                      <div key={chip.label} className="flex items-center gap-2 rounded-xl border border-white/5 bg-ink-900 px-3 py-1.5">
                        <chip.icon className={cn("h-4 w-4", chip.color)} />
                        <span className="text-xs text-slate-400">{chip.label}</span>
                        <span className="text-sm font-semibold text-white">{chip.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendText(p)}
                      className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-accent-500/50 hover:bg-white/10 hover:text-white"
                    >
                      <Sparkles className="mr-1 inline h-3 w-3 text-accent-400" />
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {showSetupNotice && (
                <div className="rounded-xl border border-warning-600/30 bg-warning-600/10 px-4 py-3 text-sm text-warning-300">
                  <strong className="font-semibold">Offline mentor mode.</strong> {offlineReason} The mentor answered from your real
                  data without an LLM. Deploy the <code className="text-warning-200">mentor-chat</code> edge function and set an{" "}
                  <code className="text-warning-200">OPENROUTER_API_KEY</code> (or <code className="text-warning-200">OPENAI_API_KEY</code>) secret
                  for full conversational answers.
                </div>
              )}
              {error && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-danger-200">
                      Mentor request failed{error.kind !== "unknown" ? ` — ${error.kind.replace(/_/g, " ")}` : ""}
                    </p>
                    <p className="mt-0.5 text-danger-300/90">{error.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {error.retryable && (
                      <Button variant="ghost" size="sm" onClick={handleRetry} disabled={busy}>
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry
                      </Button>
                    )}
                    <button onClick={() => setError(null)} aria-label="Dismiss" className="text-danger-300/70 hover:text-danger-200">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {messages.length > visibleCount && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setVisibleCount((c) => Math.min(messages.length, c + VISIBLE_MESSAGES))}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Show earlier messages ({messages.length - visibleCount})
                  </button>
                </div>
              )}

              <div className="space-y-5">
                {visibleMessages.map((m, i) => {
                  const idx = baseIndex + i;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <ChatMessage
                        msg={m}
                        index={idx}
                        time={times[idx]}
                        streaming={streaming && idx === messages.length - 1 && m.role === "assistant"}
                        feedback={feedbackMap[idx] ?? null}
                        speaking={speakingIdx === idx}
                        onOpenImage={setLightbox}
                        onCopy={handleCopy}
                        onRegenerate={handleRegenerate}
                        onReadAloud={handleReadAloud}
                        onFeedback={handleFeedback}
                        onShare={handleShare}
                      />
                    </motion.div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2.5 md:gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-600/20">
                        <ShieldCheck className="h-4 w-4 text-accent-400" />
                      </div>
                      <div className="rounded-2xl rounded-tl-md border border-white/5 bg-ink-800 px-4 py-3.5">
                        <TypingDots label={stageList[stageIdx] ?? "AI Mentor is thinking…"} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Fixed composer ───────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/5 bg-ink-950/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
        <div className="mx-auto w-full max-w-[900px] px-3 py-3 md:px-6">
          {planChange && (
            <div className="mb-3 flex items-start gap-3 rounded-2xl border border-accent-500/25 bg-accent-600/10 px-4 py-3">
              <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Planner updated by your mentor</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                  {planChange.summary.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
                {planChange.errors.length > 0 && (
                  <p className="mt-1 text-[11px] text-warning-300">
                    {planChange.errors.length} change{planChange.errors.length > 1 ? "s" : ""} skipped — {planChange.errors[0]}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {planBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleUndoPlanChange}>
                      Undo
                    </Button>
                    <button onClick={() => setPlanChange(null)} aria-label="Dismiss" className="text-slate-400 transition-colors hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {pendingImage && (
            <ImagePreviewPanel
              image={pendingImage}
              preparing={preparing}
              onCropZoom={() => setCropOpen(true)}
              onReplace={() => fileInputRef.current?.click()}
              onRemove={() => setPendingImage(null)}
              onSolve={() => handleSolve()}
            />
          )}
          <div className="flex items-end gap-1 rounded-3xl border border-white/10 bg-ink-900/80 px-2 py-2 shadow-lg shadow-black/20 transition-colors focus-within:border-accent-500/60">
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload image"
              title="Upload image (JPG · PNG · WEBP)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              aria-label="Take photo"
              title="Take a photo"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              onClick={toggleMic}
              aria-label={micListening ? "Stop voice input" : "Voice input"}
              title={micListening ? "Stop voice input" : micSupported ? "Voice input" : "Voice input not supported"}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                micListening ? "animate-pulse bg-danger-600/20 text-danger-400" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Mic className="h-5 w-5" />
            </button>
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={micListening ? "Listening…" : pendingImage ? "Add a hint or question (optional)…" : "Ask your mentor anything…"}
              aria-label="Message your mentor"
              className="max-h-[144px] min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] leading-6 text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={busy || (!input.trim() && !pendingImage)}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending || preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Enter to send · Shift+Enter for a new line · paste, drop or attach an image to solve · answers use your live study data
          </p>
        </div>
      </div>

      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/85">
          <div className="rounded-2xl border-2 border-dashed border-accent-500 bg-ink-900/80 px-10 py-8 text-center">
            <ImageIcon className="mx-auto mb-3 h-8 w-8 text-accent-400" />
            <p className="text-sm font-medium text-white">Drop image to solve</p>
            <p className="mt-1 text-xs text-slate-400">JPG · PNG · WEBP · up to 10 MB</p>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileInput} aria-hidden />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInput} aria-hidden />

      {cropOpen && pendingImage && (
        <CropDialog
          src={pendingImage.dataUrl}
          alt={pendingImage.fileName}
          onCancel={() => setCropOpen(false)}
          onSave={(dataUrl) => {
            setPendingImage((p) => (p ? { ...p, dataUrl } : p));
            setCropOpen(false);
          }}
        />
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={() => setLightbox(null)}
          >
            <button
              autoFocus
              onClick={() => setLightbox(null)}
              aria-label="Close image preview"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightbox}
              alt="Uploaded question image"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
