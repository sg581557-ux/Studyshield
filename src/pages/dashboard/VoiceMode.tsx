import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, RotateCcw, Languages, ShieldCheck, Loader2, Send, Keyboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useVoice } from "../../context/VoiceContext";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui";
import { VoiceModeSession, type VoiceModeState } from "../../services/speech/voiceSession";
import { queryMicrophonePermission, type MicPermissionState } from "../../services/speech/diagnostics";
import { VOICE_LANGUAGES, transcriptLanguageLabel } from "../../services/speech/languages";

interface Exchange {
  user: string;
  assistant: string;
  language: string;
}

interface FallbackInfo {
  reason: string;
  message: string;
}

const QUICK_LANGS = ["auto", "en", "hinglish", "hi"];

export default function VoiceMode() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { settings, updateSettings } = useVoice();

  const [state, setState] = useState<VoiceModeState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [spokenChars, setSpokenChars] = useState(0);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [fallback, setFallback] = useState<FallbackInfo | null>(null);
  const [typedQuestion, setTypedQuestion] = useState("");
  const [level, setLevel] = useState(0);
  const [speechActive, setSpeechActive] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");

  const sessionRef = useRef<VoiceModeSession | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const refreshPermission = useCallback(async () => {
    setMicPermission(await queryMicrophonePermission());
  }, []);

  // Permission state on mount — drives the "blocked" hint under the mic.
  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const ensureSession = useCallback((): VoiceModeSession => {
    if (!sessionRef.current) {
      sessionRef.current = new VoiceModeSession({
        profileId: profile?.id ?? null,
        profile,
        settings: () => settingsRef.current,
        callbacks: {
          onState: (s) => {
            setState(s);
            // A successful mic start clears the typing fallback and
            // confirms the permission was granted.
            if (s === "listening") {
              setFallback(null);
              setMicPermission("granted");
            }
          },
          onTranscript: (text, final) => {
            setLiveTranscript(text);
            if (final) {
              setExchanges((prev) => [...prev, { user: text, assistant: "", language: "en" }]);
            }
          },
          onAssistant: (text, language) => {
            setExchanges((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && !last.assistant) {
                copy[copy.length - 1] = { ...last, assistant: text, language };
              } else {
                copy.push({ user: "", assistant: text, language });
              }
              return copy;
            });
            setLiveTranscript("");
            setSpokenText(text);
            setSpokenChars(0);
          },
          onSpeakingProgress: (charIndex) => setSpokenChars(charIndex),
          onDetectedLanguage: (lang) => setDetectedLang(lang),
          onLevel: (lvl, active) => {
            setLevel(lvl);
            setSpeechActive(active);
          },
          onError: (code, message) => {
            setState("idle");
            setError(message);
            console.warn(`[Voice Mentor] failed to start (${code})`, message);
            // Re-check the permission state — e.g. after the user allowed
            // the mic, the next tap should start without the old error.
            void refreshPermission();
          },
          onFallback: (reason, message) => {
            setFallback({ reason, message });
            setError(null);
            toast.info("Voice input isn't available here — switched to typing. Replies still play aloud.");
          },
        },
      });
    }
    return sessionRef.current;
  }, [profile, settings, toast]);

  const toggle = useCallback(async () => {
    setError(null);
    const session = ensureSession();
    if (state === "idle") {
      setStarting(true);
      await session.start();
      setStarting(false);
    } else if (state === "speaking" || state === "thinking") {
      // Taking the floor mid-reply: stop speech, cancel the pending
      // response, and listen for the new question.
      session.interrupt();
    } else {
      session.stopListening();
    }
  }, [ensureSession, state]);

  const retryMic = useCallback(async () => {
    setError(null);
    setStarting(true);
    await ensureSession().start();
    setStarting(false);
  }, [ensureSession]);

  const sendTyped = useCallback(async () => {
    const text = typedQuestion.trim();
    if (!text) return;
    setTypedQuestion("");
    await ensureSession().sendText(text);
  }, [ensureSession, typedQuestion]);

  const replayLast = useCallback(() => {
    const ok = sessionRef.current?.replayLastReply();
    if (!ok) toast.info("Nothing to replay yet — ask the mentor something first.");
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.end();
    };
  }, []);

  const stateLabel: Record<VoiceModeState, string> = {
    idle: "Tap the mic to talk to your mentor",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    interrupted: "You took the floor — listening…",
  };

  const stateHint: Record<VoiceModeState, string> = {
    idle: "Continuous conversation · speaking auto-resumes listening",
    listening: "I'm listening — long pauses don't cut you off",
    thinking: "I'm checking your planner, backlog and mocks",
    speaking: "Just start talking to interrupt me — no need to tap",
    interrupted: "Go ahead — I stopped and I'm listening for your question",
  };

  const speakingCaption = spokenText ?? exchanges[exchanges.length - 1]?.assistant ?? "";

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-10rem)] justify-between py-4">
      <div className="w-full text-center">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center justify-center gap-2">
          <ShieldCheck className="w-6 h-6 text-accent-400" /> Voice Mentor
        </h1>
        <p className="text-sm text-slate-400 mt-1">Talk naturally — Hindi, Hinglish, English and 9 more languages.</p>

        {/* Language selector */}
        <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
          <Languages className="w-3.5 h-3.5 text-slate-500" />
          {QUICK_LANGS.map((code) => {
            const lang = VOICE_LANGUAGES.find((l) => l.code === code)!;
            const active = settings.voiceLanguage === code;
            return (
              <button
                key={code}
                onClick={() => updateSettings({ voiceLanguage: code })}
                className={cn(
                  "text-xs rounded-full px-3 py-1 border transition-colors",
                  active ? "bg-accent-600/20 border-accent-500/50 text-accent-300" : "bg-white/5 border-white/10 text-slate-400 hover:text-white",
                )}
              >
                {code === "auto" ? lang.label : `${lang.label} (${lang.native})`}
              </button>
            );
          })}
        </div>
        {detectedLang && state === "speaking" && (
          <p className="text-[11px] text-slate-500 mt-2">Detected: {transcriptLanguageLabel(detectedLang)}</p>
        )}
      </div>

      {/* Transcript / captions area */}
      <div className="w-full max-w-2xl mx-auto px-4 text-center min-h-24 flex flex-col items-center justify-center">
        {error && (
          <div className="bg-danger-600/10 border border-danger-600/30 rounded-xl px-4 py-3 text-sm text-danger-200 mb-3">
            <p className="leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={() => void retryMic()}
                disabled={starting}
                className="text-xs bg-accent-600/20 border border-accent-500/50 text-accent-200 rounded-lg px-3 py-1.5 hover:bg-accent-600/30 transition-colors disabled:opacity-50"
              >
                {starting ? "Starting…" : "Try again"}
              </button>
              <button onClick={() => setError(null)} className="text-xs text-danger-300/70 hover:text-danger-200 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {state === "listening" && liveTranscript && (
          <p className="text-sm text-slate-200 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 italic">“{liveTranscript}”</p>
        )}

        {state === "interrupted" && liveTranscript && (
          <p className="text-sm text-slate-200 bg-accent-500/10 border border-accent-500/30 rounded-2xl px-4 py-3 italic">“{liveTranscript}”</p>
        )}

        {state === "thinking" && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-accent-400" /> Analysing your study data…
          </div>
        )}

        {state === "speaking" && speakingCaption && (
          <div className="w-full bg-ink-900/60 border border-emerald-500/20 rounded-2xl px-5 py-4 text-left">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Mentor is speaking
              </p>
              <button
                onClick={replayLast}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                title="Replay response"
                aria-label="Replay response"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <span className="text-emerald-100">{speakingCaption.slice(0, spokenChars)}</span>
              <span className="text-slate-600">{speakingCaption.slice(spokenChars)}</span>
            </p>
          </div>
        )}

        {state === "idle" && exchanges.length > 0 && (
          <div className="w-full space-y-2 text-left">
            {exchanges.slice(-2).map((ex, i) => (
              <div key={i} className="space-y-1.5">
                {ex.user && <p className="text-sm text-slate-200 bg-white/5 rounded-xl px-3 py-2">🗣️ {ex.user}</p>}
                {ex.assistant && <p className="text-xs text-slate-400 bg-white/[0.03] rounded-xl px-3 py-2 leading-relaxed">{ex.assistant.slice(0, 300)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Big mic + state, or typing fallback */}
      <div className="flex flex-col items-center gap-4 pb-2 w-full">
        {fallback ? (
          <div className="w-full max-w-xl space-y-3">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-200/90">
              <p className="font-medium text-amber-100 mb-1 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5" /> Typing fallback — speech recognition isn't available here
              </p>
              <p className="leading-relaxed">{fallback.message}</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendTyped();
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={typedQuestion}
                onChange={(e) => setTypedQuestion(e.target.value)}
                disabled={state === "thinking" || state === "speaking"}
                placeholder="Type your question… (Hindi, Hinglish, English)"
                className="input-base flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!typedQuestion.trim() || state === "thinking" || state === "speaking"}
              >
                <Send className="w-4 h-4" /> Send
              </Button>
            </form>
            <button
              onClick={() => void retryMic()}
              disabled={starting}
              className="mx-auto block text-xs text-slate-400 hover:text-white transition-colors"
            >
              {starting ? "Checking…" : "Try the microphone again"}
            </button>
          </div>
        ) : (
          <>
            {/* Waveform — speaking: animated; listening: live voice level */}
            {(state === "listening" || state === "speaking" || state === "interrupted") && (
              <div className="flex items-end gap-1 h-12">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-1.5 rounded-full",
                      state === "speaking" ? "bg-emerald-400" : speechActive ? "bg-accent-300" : "bg-accent-500/50",
                    )}
                    style={
                      state === "speaking"
                        ? { animation: `eq 0.9s ease-in-out infinite`, animationDelay: `${(i % 7) * 0.1}s`, height: "30%" }
                        : {
                            height: `${Math.max(10, level * 100 * (0.55 + ((i * 37) % 45) / 100))}%`,
                            transition: "height 80ms linear",
                          }
                    }
                  />
                ))}
              </div>
            )}

            {(state === "listening" || state === "interrupted") && speechActive && (
              <p className="text-xs text-accent-300 -mt-1 animate-pulse">● You're speaking — I'm listening</p>
            )}

            <button
              onClick={toggle}
              disabled={starting}
              aria-label={state === "idle" ? "Start voice mode" : "Stop"}
              className={cn(
                "relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all select-none",
                "border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
                state === "idle" && "bg-accent-600/20 border-accent-500/50 text-accent-400 hover:bg-accent-600/30 active:scale-95",
                state === "listening" && "bg-danger-600/25 border-danger-500/60 text-danger-300",
                state === "interrupted" && "bg-accent-600/25 border-accent-500/60 text-accent-300",
                state === "thinking" && "bg-ink-800 border-white/10 text-slate-500",
                state === "speaking" && "bg-emerald-600/25 border-emerald-500/60 text-emerald-300",
              )}
              style={
                (state === "listening" || state === "interrupted") && level > 0.02
                  ? { boxShadow: `0 0 ${24 + level * 56}px rgba(244, 63, 94, ${0.2 + level * 0.4})` }
                  : undefined
              }
            >
              {(state === "listening" || state === "speaking" || state === "interrupted") && (
                <>
                  <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                  <span className="absolute -inset-3 rounded-full border border-current/30 animate-pulse" />
                </>
              )}
              {state === "idle" ? <Mic className="w-10 h-10" /> : state === "speaking" ? <Volume2 className="w-10 h-10" /> : <Square className="w-9 h-9" />}
            </button>

            <div className="text-center">
              <p className="text-sm font-medium text-white">{starting ? "Starting…" : stateLabel[state]}</p>
              <p className="text-xs text-slate-500 mt-1">{stateHint[state]}</p>
              {micPermission === "denied" && state === "idle" && !error && (
                <p className="text-xs text-amber-300/90 mt-2 max-w-sm mx-auto leading-relaxed">
                  Microphone permission is blocked for this site. Click the lock icon in the address bar, allow the
                  microphone, then tap the mic again.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
