// ============================================================
// Voice Mode session — Conversation Layer.
//
// Orchestrates the real-time turn loop:
//   idle → listening → thinking → speaking → listening automatically
//   (speaking/thinking → interrupted → listening on barge-in)
//
// Real-time behaviors:
//   - Immediate barge-in: VAD hears the user while the AI responds →
//     the LLM stream is aborted, TTS is faded out (~100ms), the floor
//     is handed back instantly (interruption well under ~200ms).
//   - Streamed speech: the mentor reply starts playing as soon as the
//     first sentences arrive from the LLM — no waiting for the whole
//     reply before talking.
//   - Cancel previous response: a new utterance while the previous
//     answer is still being generated aborts the stream, discards the
//     unfinished reply and starts a fresh response.
//   - Continuous listening: 6s pause window + VAD-assisted finalize
//     (1.2s after real silence) — long sentences are never cut off,
//     yet turns end quickly. Recognition stays live while the mentor
//     talks, so an interrupt is captured in the same utterance.
//   - Multilingual: detects the spoken language, the mentor replies
//     in the same language, and TTS matches the reply's language
//     with a consistent voice identity (family + gender).
//   - Pronunciation: streamed deltas are normalized (markdown
//     stripped, education dictionary, formula expansions) and spoken
//     in sentence/clause chunks for natural pacing.
//
// Depends ONLY on:
//   - Speech providers (Voice Layer, via getProviders())
//   - VAD (independent of STT — swappable for OpenAI Realtime /
//     Gemini Live, which report speech events natively)
//   - Mentor layer (buildMentorContext / streamMentorMessage +
//     offline fallback)
//   - Voice settings + language detection + text normalization
// ============================================================

import {
  buildMentorContext,
  createMentorThread,
  fallbackMentorReply,
  getMentorMessages,
  listMentorThreads,
  streamMentorMessage,
  type MentorContext,
  type MentorError,
  type MentorThread,
} from "../mentor";
import { getProviders } from "./providers";
import type { VoiceSettings } from "./types";
import { detectLanguage, getVoiceLanguage } from "./languages";
import {
  collectVoiceDiagnostics,
  hasAudioInputDevices,
  logVoiceDiagnostics,
  micFailureMessage,
  queryMicrophonePermission,
  requestMicrophonePermission,
  type MicProbeResult,
} from "./diagnostics";
import { createVoiceActivityDetector, openMicStream, type VoiceActivityDetector } from "./vad";
import { normalizeForTTS, normalizeStreamText } from "./normalize";
import { pauseMsForChunk, resolveVoiceParams, type VoiceParams } from "./personalities";
import { detectSituation } from "./tone";

export type VoiceModeState = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

export interface VoiceModeCallbacks {
  onState: (state: VoiceModeState) => void;
  /** Live/partial or final user transcript. */
  onTranscript: (text: string, final: boolean) => void;
  /** Assistant reply — fires per spoken sentence while streaming and once more at the end. */
  onAssistant: (text: string, language: string) => void;
  onSpeakingProgress: (charIndex: number, total: number) => void;
  onDetectedLanguage: (language: string) => void;
  /** Live mic level 0..1 from the VAD (UI meter), and whether speech is active. */
  onLevel?: (level: number, speechActive: boolean) => void;
  onError: (code: string, message: string) => void;
  /**
   * Speech recognition is truly unavailable (neither SpeechRecognition
   * nor webkitSpeechRecognition exists) — the UI should switch to the
   * typed-question fallback. Replies are still spoken aloud.
   */
  onFallback?: (reason: string, message: string) => void;
}

export interface VoiceModeSessionOptions {
  profileId: string | null;
  profile: unknown;
  /** Getter so live settings changes (language, rate, volume…) apply mid-session. */
  settings: () => VoiceSettings;
  callbacks: VoiceModeCallbacks;
}

const MIN_LISTEN_GAP_MS = 300;
/**
 * Ignore VAD barge-in during the first ms of a TTS chunk (the brief
 * level spike Chrome reports from its own audio settling). Kept short
 * so interruption stays well under ~200ms.
 */
const BARGE_IN_BLOCK_MS = 120;
/** A streamed reply that produces no delta for this long is aborted. */
const STREAM_STALL_MS = 45000;

const log = (msg: string, ...args: unknown[]): void => {
  console.log(`[Voice] ${msg}`, ...args);
};

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

export class VoiceModeSession {
  private stt = getProviders().stt;
  private tts = getProviders().tts;
  private options: VoiceModeSessionOptions;
  private thread: MentorThread | null = null;
  private context: MentorContext | null = null;
  private history: { role: "user" | "assistant"; content: string }[] = [];
  private listening = false;
  private ended = false;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  /** True after a start() failure that was diagnosed as mic-related. */
  private retriedStart = false;
  /** True once the mic proved usable this session — skip repeat probes. */
  private micVerified = false;
  /** True when Voice Mode is running in the typed-question fallback. */
  private fallbackActive = false;

  // ---- realtime pieces -------------------------------------------------
  private vad: VoiceActivityDetector | null = null;
  private vadStream: MediaStream | null = null;
  private bargeInBlockedUntil = 0;
  /**
   * Monotonic turn counter. Every new utterance / interrupt increments
   * it, which invalidates the in-flight LLM stream and TTS callbacks of
   * the previous turn (single guard against race conditions).
   */
  private turnToken = 0;
  /** Abort controller for the in-flight mentor stream (cancel-on-interrupt). */
  private streamAbort: AbortController | null = null;
  private streamWatchdog: ReturnType<typeof setTimeout> | null = null;
  /** Accumulated reply text (live captions + final). */
  private streamReply = "";
  /** Reply language code ("en" | "hi" | "hinglish" | …). */
  private streamLangCode = "en";
  private streamLangTts = "en-IN";
  private streamParams: VoiceParams = { pitch: 1, rate: 1, pauseMs: 200 };
  /** Partial sentence text still being assembled from deltas. */
  private streamBuffer = "";
  /** True once the final `done` event arrived (or offline fallback). */
  private streamDone = false;
  /** Normalized chunks still waiting to be spoken. */
  private ttsQueue: string[] = [];
  private ttsBusy = false;
  private spokenBase = 0;
  /** Until this timestamp, "empty"/"timeout" errors right after an
   *  interrupt are swallowed and listening silently resumes. */
  private bargeInSuppressErrorsUntil = 0;
  /** Last user utterance — used to detect the student's situation. */
  private lastUserText = "";
  /** Last assistant reply — lets the user replay it aloud. */
  private lastReply: { text: string; lang: string } | null = null;

  state: VoiceModeState = "idle";

  constructor(options: VoiceModeSessionOptions) {
    this.options = options;
  }

  get threadId(): string | null {
    return this.thread?.id ?? null;
  }

  /** Pre-warm thread + student context, verify mic readiness, then start listening. */
  async start(): Promise<void> {
    if (this.ended) {
      // Allow restarting after end() by creating a fresh session instead.
      return;
    }
    if (this.state === "listening") return;
    if (this.state === "thinking" || this.state === "speaking" || this.state === "interrupted") {
      // User asked again while a reply was in flight — stop it and take
      // the floor (cancel the previous response).
      this.interrupt();
      return;
    }
    // A new user-initiated start may follow a diagnosed failure — retry fresh.
    this.retriedStart = false;
    this.fallbackActive = false;
    await this.prewarm();
    if (await this.ensureReady()) {
      this.beginListening();
    }
  }

  /**
   * Prove the browser can capture speech BEFORE starting, so a mic
   * permission problem is never reported as "unsupported". Logs the
   * exact support matrix, and switches to the typing fallback when the
   * browser exposes no recognition API at all (fall back, don't block).
   */
  private async ensureReady(): Promise<boolean> {
    const diag = collectVoiceDiagnostics();
    diag.permissionState = await queryMicrophonePermission();
    logVoiceDiagnostics(diag);

    // Only fall back to unsupported when BOTH constructors are missing.
    if (!diag.hasSpeechRecognition && !diag.hasWebkitSpeechRecognition) {
      this.fallbackActive = true;
      this.options.callbacks.onFallback?.(
        "speech-recognition-missing",
        `This browser doesn't expose speech recognition (window.SpeechRecognition = ${String(diag.speechRecognition)}, window.webkitSpeechRecognition = ${String(diag.webkitSpeechRecognition)}). Replies will still be read aloud — type your questions below.`,
      );
      this.setState("idle");
      return false;
    }

    if (!diag.mediaDevices || !diag.getUserMedia) {
      this.setState("idle");
      this.options.callbacks.onError("audio-capture", micFailureMessage("unsupported"));
      return false;
    }

    if (!diag.secureContext) {
      this.setState("idle");
      this.options.callbacks.onError("not-secure", micFailureMessage("not-secure"));
      return false;
    }

    if (diag.permissionState === "denied") {
      this.setState("idle");
      this.options.callbacks.onError("not-allowed", micFailureMessage("permission-denied"));
      return false;
    }

    if (!this.micVerified) {
      if (diag.permissionState === "granted") {
        // Cheap device sanity check — enumerateDevices never shows a prompt.
        if (!(await hasAudioInputDevices())) {
          this.setState("idle");
          this.options.callbacks.onError("audio-capture", micFailureMessage("no-device"));
          return false;
        }
        this.micVerified = true;
      } else {
        // prompt, or "unknown" (Firefox/Safari can't query the microphone
        // permission) — probe once: this shows the permission prompt and
        // proves the mic works, so start() can't fail with a vague error.
        const probe = await requestMicrophonePermission();
        if (!probe.granted) {
          this.setState("idle");
          this.reportMicProblem(probe);
          return false;
        }
        this.micVerified = true;
      }
    }

    return true;
  }

  private reportMicProblem(probe: MicProbeResult): void {
    const code =
      probe.reason === "permission-denied"
        ? "not-allowed"
        : probe.reason === "no-device" || probe.reason === "unsupported"
          ? "audio-capture"
          : probe.reason === "in-use"
            ? "in-use"
            : probe.reason === "not-secure"
              ? "not-secure"
              : "mic-error";
    this.options.callbacks.onError(code, micFailureMessage(probe.reason));
  }

  private beginListening(): void {
    if (this.ended) return;
    const resumed = this.state === "idle" && this.history.length > 0;
    this.setState("listening");
    this.listening = true;
    this.attachVad();
    log(resumed ? "Listening resumed" : "Listening started");
    const lang = getVoiceLanguage(this.options.settings().voiceLanguage).stt;
    const ok = this.stt.start({
      lang,
      events: {
        onResult: (text, final) => {
          if (!this.listening) return;
          this.options.callbacks.onTranscript(text, final);
          if (final) void this.processUtterance(text);
        },
        onStatus: (status) => {
          if (status === "stopped") {
            this.listening = false;
            log("Listening stopped");
          }
        },
        onUserSpeechDetected: () => log("Speech started (STT)"),
        onError: (code, message) => {
          this.listening = false;
          if (this.ended) return;
          // A barge-in often ends with recognition finding nothing (the
          // interrupting gesture, a short "hey", or background noise) —
          // that is NOT an error: resume listening silently.
          if ((code === "empty" || code === "timeout") && now() < this.bargeInSuppressErrorsUntil) {
            log(`Recognition ${code} after interruption — resuming listening`);
            this.setState("idle");
            this.beginListening();
            return;
          }
          // While the mentor is replying, recognition may idle out on its
          // silence timer (6s) or global timeout. Not a failure — barge-in
          // keeps working via the VAD, and the mic is re-armed when the
          // reply finishes.
          if ((code === "empty" || code === "timeout") && (this.state === "thinking" || this.state === "speaking" || this.state === "interrupted")) {
            log(`Recognition ${code} idled out during reply — ignoring`);
            if (this.state === "interrupted") {
              this.setState("idle");
              this.beginListening();
            }
            return;
          }
          this.setState("idle");
          if (code === "timeout") log("Recognition timeout — no speech");
          else if (code === "empty") log("Recognition ended with no speech");
          else log(`Recognition error (${code})`);
          this.options.callbacks.onError(code, message);
        },
      },
    });
    if (!ok) {
      this.listening = false;
      this.setState("idle");
      // start() returned false — diagnose the REAL cause instead of
      // claiming the browser is unsupported (common in Edge: the API
      // exists but the mic is denied, or a previous recognition session
      // was still tearing down when start() was called again).
      void this.handleStartFailure();
    }
  }

  /**
   * Called when stt.start() returns false. Determines exactly why:
   * missing recognition API → typing fallback; denied mic → permission
   * message; otherwise retry once (transient "already active" errors in
   * Edge/Chrome) before reporting a precise failure.
   */
  private async handleStartFailure(): Promise<void> {
    const diag = collectVoiceDiagnostics();
    diag.permissionState = await queryMicrophonePermission();
    logVoiceDiagnostics(diag);

    if (!diag.hasSpeechRecognition && !diag.hasWebkitSpeechRecognition) {
      this.fallbackActive = true;
      this.options.callbacks.onFallback?.(
        "speech-recognition-missing",
        `This browser doesn't expose speech recognition (window.SpeechRecognition = ${String(diag.speechRecognition)}, window.webkitSpeechRecognition = ${String(diag.webkitSpeechRecognition)}). Replies will still be spoken aloud — type your questions below.`,
      );
      return;
    }

    if (!diag.mediaDevices || !diag.getUserMedia) {
      this.options.callbacks.onError("audio-capture", micFailureMessage("unsupported"));
      return;
    }

    if (!diag.secureContext) {
      this.options.callbacks.onError("not-secure", micFailureMessage("not-secure"));
      return;
    }

    if (diag.permissionState === "denied") {
      this.options.callbacks.onError("not-allowed", micFailureMessage("permission-denied"));
      return;
    }

    const probe = await requestMicrophonePermission();
    if (!probe.granted) {
      this.reportMicProblem(probe);
      return;
    }
    this.micVerified = true;

    // Mic is fine — start() probably raced a previous recognition session
    // (InvalidStateError). Retry once before reporting a failure.
    if (this.ended || this.state !== "idle") return;
    if (this.retriedStart) {
      // The mic itself works, so target the transient-cause message instead
      // of blaming the hardware or permission.
      this.options.callbacks.onError(
        "start-failed",
        (await hasAudioInputDevices())
          ? "The microphone could not be started. Close other apps using it, then tap the mic again."
          : micFailureMessage("no-device"),
      );
      return;
    }
    this.retriedStart = true;
    await new Promise((resolve) => setTimeout(resolve, 350));
    this.beginListening();
  }

  // ============================================================
  // Turn processing — streaming, cancelable, race-safe.
  // ============================================================

  private async processUtterance(text: string): Promise<void> {
    if (!this.thread) {
      // No thread means persistence is unavailable — still answer in-memory.
      await this.prewarm();
    }
    const turn = ++this.turnToken;
    this.lastUserText = text;
    this.bargeInSuppressErrorsUntil = 0;

    // A new question cancels whatever the mentor was still doing
    // (cancels the previous response / stops partial speech).
    this.abortStream();
    this.cancelSpeakingQueue();

    this.setState("thinking");
    this.attachVad();
    log("Speech ended — processing utterance");

    // Language detection: script + Hinglish markers, unless the user
    // picked a fixed language or disabled auto-detection. Detection is
    // independent of the LLM — future speech providers can pass their
    // own detected-language metadata instead.
    const settings = this.options.settings();
    const spokenLang = settings.autoDetectLanguage
      ? detectLanguage(text, settings.voiceLanguage)
      : settings.voiceLanguage === "auto"
        ? "en"
        : settings.voiceLanguage;
    this.options.callbacks.onDetectedLanguage(spokenLang);
    log(`Language detected: ${spokenLang} — "${text.slice(0, 60)}"`);

    const ctx = this.context ?? (await this.prewarmCtx());

    // Re-check after the async context build: the user may have asked
    // again, or the session was ended while we waited.
    if (turn !== this.turnToken || this.ended) return;

    this.streamLangCode = spokenLang;
    this.streamLangTts = getVoiceLanguage(spokenLang === "hinglish" ? "hi" : spokenLang).tts;
    this.streamParams = resolveVoiceParams(
      this.options.settings(),
      detectSituation(this.context ?? null, this.lastUserText),
    );
    this.streamBuffer = "";
    this.streamDone = false;
    this.streamReply = "";
    this.spokenBase = 0;
    this.ttsQueue = [];
    this.ttsBusy = false;

    const controller = new AbortController();
    this.streamAbort = controller;

    const finishTurn = (reply: string, replyLang: string | null | undefined): void => {
      if (this.ended || turn !== this.turnToken) return;
      if (this.streamAbort === controller) this.streamAbort = null;
      this.clearWatchdog();
      this.streamDone = true;
      this.flushStreamBuffer(turn); // speak any leftover partial sentence

      const final = reply.trim() || this.streamReply.trim();
      if (!final) {
        this.setState("idle");
        this.options.callbacks.onError("empty_reply", "The mentor returned an empty answer. Try again.");
        return;
      }
      const lang = replyLang ?? spokenLang;
      this.history = [...this.history, { role: "user", content: text }, { role: "assistant", content: final }];
      this.lastReply = { text: final, lang };
      this.options.callbacks.onAssistant(final, lang);
      this.maybeFinishSpeaking(turn);
    };

    const onDelta = (delta: string): void => {
      if (this.ended || turn !== this.turnToken) return;
      this.streamReply += delta;
      this.feedStream(delta, turn);
    };

    const onError = (err: MentorError): void => {
      if (this.ended || turn !== this.turnToken) return;
      if (this.streamAbort === controller) this.streamAbort = null;
      this.clearWatchdog();
      // The mentor service is genuinely unavailable — fall back to the
      // deterministic offline mentor so the user still gets an answer.
      if (err.kind === "not_deployed" || err.kind === "not_configured") {
        log("Mentor service unavailable — using offline fallback");
        const reply = fallbackMentorReply(text, ctx as MentorContext);
        this.history = [...this.history, { role: "user", content: text }, { role: "assistant", content: reply }];
        this.lastReply = { text: reply, lang: spokenLang };
        this.speakReply(reply, spokenLang);
        return;
      }
      this.streamDone = true;
      this.ttsQueue = [];
      this.ttsBusy = false;
      this.setState("idle");
      this.options.callbacks.onError(err.kind, err.message);
    };

    // Watchdog: if nothing arrives for STREAM_STALL_MS, abort & report.
    this.streamWatchdog = setTimeout(() => {
      if (this.ended || turn !== this.turnToken) return;
      log("Stream stalled — aborting");
      this.turnToken++; // invalidate the stale turn
      this.abortStream();
      this.setState("idle");
      this.options.callbacks.onError(
        "network",
        "The AI Mentor reply took too long. Check your connection and try again.",
      );
    }, STREAM_STALL_MS);

    streamMentorMessage({
      threadId: this.thread?.id ?? "voice-mode",
      threadTitle: this.thread?.title ?? "Voice conversation",
      userText: text,
      history: this.history,
      context: ctx as MentorContext,
      persistUser: Boolean(this.thread),
      language: spokenLang === "auto" ? undefined : spokenLang,
      signal: controller.signal,
      onDelta,
      onDone: finishTurn,
      onError,
    });
  }

  private async prewarmCtx(): Promise<MentorContext | null> {
    try {
      this.context = await buildMentorContext(this.options.profileId ?? "", this.options.profile as never);
    } catch {
      // best effort — mentor service handles a missing context
    }
    return this.context as MentorContext | null;
  }

  /**
   * Pre-warm thread + history + context once; subsequent calls are no-ops.
   */
  private async prewarm(): Promise<void> {
    if (!this.thread) {
      try {
        const threads = await listMentorThreads();
        this.thread = threads[0] ?? null;
      } catch {
        this.thread = null;
      }
    }
    if (!this.thread) {
      try {
        this.thread = await createMentorThread("Voice conversation");
      } catch {
        this.thread = null;
      }
    }
    if (this.thread) {
      try {
        this.history = await getMentorMessages(this.thread.id);
      } catch {
        this.history = [];
      }
    }
    try {
      this.context = await buildMentorContext(this.options.profileId ?? "", this.options.profile as never);
    } catch {
      this.context = null;
    }
  }

  // ============================================================
  // Streaming speech — normalized, chunked, interruptible.
  // ============================================================

  /** Assemble completed sentences from incoming deltas and speak them. */
  private feedStream(delta: string, turn: number): void {
    if (this.ended || turn !== this.turnToken) return;
    this.streamBuffer += delta;
    const parts = this.streamBuffer.split(/(?<=[.!?।])\s+/);
    if (parts.length > 1) {
      this.streamBuffer = parts.pop() ?? "";
      for (const sentence of parts) this.enqueueSentence(sentence, turn);
    }
  }

  /** Speak whatever partial sentence is still buffered (end of stream). */
  private flushStreamBuffer(turn: number): void {
    if (this.ended || turn !== this.turnToken) return;
    const rest = this.streamBuffer.trim();
    this.streamBuffer = "";
    if (rest) this.enqueueSentence(rest, turn);
  }

  /** Normalize one completed sentence, update live captions, queue it. */
  private enqueueSentence(sentence: string, turn: number): void {
    if (this.ended || turn !== this.turnToken) return;
    const chunks = normalizeStreamText(sentence, this.streamLangTts);
    if (chunks.length === 0) return;
    // Live caption: the reply grows as it's being spoken.
    this.options.callbacks.onAssistant(this.streamReply, this.streamLangCode);
    for (const c of chunks) this.ttsQueue.push(c.text);
    this.pump(turn);
  }

  /** Speak queued chunks one at a time, back-to-back with tiny pauses. */
  private pump(turn: number): void {
    if (this.ended || turn !== this.turnToken) {
      this.ttsQueue = [];
      return;
    }
    if (this.ttsBusy) return;
    const chunk = this.ttsQueue.shift();
    if (!chunk) {
      this.maybeFinishSpeaking(turn);
      return;
    }

    this.ttsBusy = true;
    const settings = this.options.settings();
    const params = this.streamParams;
    const afterPause = pauseMsForChunk(chunk, params.pauseMs);

    const ok = this.tts.speak(chunk, {
      lang: this.streamLangTts,
      rate: params.rate,
      volume: settings.voiceVolume,
      pitch: params.pitch,
      preferredVoiceURI: settings.preferredVoiceURI,
      voiceStyle: settings.voiceStyle,
      family: settings.voiceFamily,
      events: {
        onState: (state) => {
          if (this.ended || turn !== this.turnToken) return;
          if (state === "started") {
            this.setState("speaking");
            this.bargeInBlockedUntil = now() + BARGE_IN_BLOCK_MS;
            log("AI speaking");
          }
          if (state === "ended") {
            this.ttsBusy = false;
            this.spokenBase += chunk.length;
            setTimeout(() => this.pump(turn), afterPause);
          }
          if (state === "stopped") {
            this.ttsBusy = false;
            this.ttsQueue = [];
          }
        },
        onBoundary: (charIndex) => {
          if (this.ended || turn !== this.turnToken) return;
          this.options.callbacks.onSpeakingProgress(
            this.spokenBase + charIndex,
            Math.max(this.streamReply.length, this.spokenBase + charIndex),
          );
        },
      },
    });

    if (!ok) {
      this.ttsBusy = false;
      setTimeout(() => this.pump(turn), 80);
    }
  }

  /** After a fully flushed turn: close out once the queue is quiet. */
  private maybeFinishSpeaking(turn: number): void {
    if (this.ended || turn !== this.turnToken) return;
    if (!this.streamDone || this.ttsBusy || this.ttsQueue.length > 0) return;
    log("AI finished speaking");
    this.spokenBase = 0;
    this.options.callbacks.onSpeakingProgress(0, 0);
    if (this.state === "speaking") this.setState("idle");
    this.scheduleAutoListen();
  }

  /** Speak the last assistant reply again — same voice and tone. */
  replayLastReply(): boolean {
    if (!this.lastReply || this.ended) return false;
    this.turnToken++; // drop any in-flight TTS callbacks from the old turn
    this.abortStream();
    this.cancelSpeakingQueue();
    this.speakReply(this.lastReply.text, this.lastReply.lang);
    return true;
  }

  /** Queue a full reply for playback (used by replay + offline fallback). */
  private speakReply(text: string, lang: string): void {
    const turn = this.turnToken;
    this.streamLangCode = lang;
    this.streamLangTts = getVoiceLanguage(lang === "hinglish" ? "hi" : lang).tts;
    this.streamParams = resolveVoiceParams(
      this.options.settings(),
      detectSituation(this.context ?? null, this.lastUserText),
    );
    const chunks = normalizeForTTS(text, this.streamLangTts);
    if (chunks.length === 0) {
      this.setState("idle");
      this.scheduleAutoListen();
      return;
    }
    this.streamReply = text;
    this.streamDone = true;
    this.spokenBase = 0;
    this.ttsQueue = [];
    this.ttsBusy = false;
    for (const c of chunks) this.ttsQueue.push(c.text);
    this.options.callbacks.onAssistant(text, lang);
    this.pump(turn);
  }

  /** Cancel the current TTS utterance (fade-out) and drain the queue. */
  private cancelSpeakingQueue(): void {
    this.ttsQueue = [];
    this.spokenBase = 0;
    if (this.tts.fadeOut) this.tts.fadeOut();
    else this.tts.stop();
  }

  // ============================================================
  // Barge-in — the core "real conversation" behavior.
  // ============================================================

  /**
   * Abort the in-flight mentor LLM stream. Silence-only: the caller
   * checks the turn token before touching state.
   */
  private abortStream(): void {
    if (this.streamAbort) {
      this.streamAbort.abort();
      this.streamAbort = null;
    }
    this.streamBuffer = "";
    this.streamDone = false;
    this.clearWatchdog();
  }

  private clearWatchdog(): void {
    if (this.streamWatchdog) {
      clearTimeout(this.streamWatchdog);
      this.streamWatchdog = null;
    }
  }

  /**
   * VAD/caller detected the student speaking while the AI was talking
   * or thinking: abort the reply stream and stop TTS instantly.
   */
  private handleBargeIn(): void {
    if (this.ended) return;
    if (this.state !== "speaking" && this.state !== "thinking") return;
    if (!this.options.settings().autoInterrupt) {
      log("Barge-in ignored — auto interrupt disabled in settings");
      return;
    }
    if (now() < this.bargeInBlockedUntil) {
      // The TTS settle window: our own voice just started. Re-check in a
      // moment — if the user is still talking, interrupt then.
      log("Barge-in candidate during TTS settle — re-checking");
      setTimeout(() => this.handleBargeIn(), 80);
      return;
    }
    this.interruptInternal("vad");
  }

  /** User taps the mic while the reply is being read: stop, listen again. */
  interrupt(): void {
    if (this.ended || this.state === "idle") return;
    this.interruptInternal("manual");
  }

  private interruptInternal(reason: "vad" | "manual"): void {
    const detectedAt = now();
    log(`Interruption detected (${reason})`);

    this.bargeInSuppressErrorsUntil = now() + 3000;
    this.turnToken++; // invalidate the in-flight stream + TTS callbacks
    this.abortStream();
    this.cancelSpeakingQueue(); // smooth fade-out, then instant cancel
    this.options.callbacks.onSpeakingProgress(0, 0);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);

    this.setState("interrupted");

    if (this.listening) {
      // Recognition is already live: it will finalise the user's new
      // utterance and hand it to processUtterance. Ask it to finalise
      // quickly once the user actually stops talking.
      this.stt.endOfSpeech();
    } else {
      // Recognition had idled out (long silence during a long reply) —
      // start a fresh session right away so the whole interrupt is heard.
      this.beginListening();
    }
    log(`Interruption handled in ${Math.round(now() - detectedAt)}ms`);
  }

  /** Stop the current listening session (keeps thread/context warm). */
  stopListening(): void {
    this.listening = false;
    this.stt.stop();
    this.setState("idle");
  }

  stopSpeaking(): void {
    this.cancelSpeakingQueue();
  }

  // ============================================================
  // VAD lifecycle — one mic stream powers barge-in + the level meter.
  // ============================================================

  private async attachVad(): Promise<void> {
    if (this.ended || this.fallbackActive || this.vad) return;
    const settings = this.options.settings();
    const constraints =
      settings.noiseSuppression === false
        ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const open = this.vadStream
      ? { stream: this.vadStream, error: null }
      : await openMicStream(constraints);
    if (!open.stream) {
      // VAD is auxiliary (barge-in + the level meter). The main STT
      // reports its own mic errors — log why barge-in is unavailable
      // instead of spamming the user with a second error.
      console.warn(`[Voice] VAD mic unavailable (${open.error?.reason ?? "unknown"}) — barge-in disabled`);
      return;
    }
    this.vadStream = open.stream;
    this.vad = createVoiceActivityDetector(
      open.stream,
      {
        onLevel: (level, speechActive) => {
          if (this.state === "listening" || this.state === "speaking" || this.state === "interrupted") {
            this.options.callbacks.onLevel?.(level, speechActive);
          }
        },
        onSpeechStart: () => {
          log("Speech started (VAD)");
          this.handleBargeIn();
        },
        onSpeechEnd: () => {
          log("Speech ended (VAD)");
          // User really stopped talking: finalise the transcript quickly
          // (recognition never cuts a long sentence, and turns end fast).
          if (this.state === "listening" || this.state === "interrupted") this.stt.endOfSpeech();
        },
      },
      { threshold: 0.028, startHoldMs: 70, endHoldMs: 650 },
    );
    this.vad.start();
  }

  private scheduleAutoListen(): void {
    if (this.ended || this.fallbackActive || !this.options.settings().autoStartListening || this.state !== "idle") return;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      if (!this.ended && this.state === "idle") this.beginListening();
    }, MIN_LISTEN_GAP_MS);
  }

  /**
   * Send a typed question — used by the fallback UI when the browser has
   * no speech recognition. The mentor reply is still spoken aloud.
   */
  async sendText(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this.ended || this.state !== "idle") return;
    this.options.callbacks.onTranscript(trimmed, true);
    await this.processUtterance(trimmed);
  }

  /** Full teardown: stop everything, mark the session unusable. */
  end(): void {
    this.ended = true;
    this.turnToken++;
    this.abortStream();
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.stt.stop();
    this.stt.abort();
    this.tts.stop();
    this.vad?.close();
    this.vad = null;
    this.vadStream?.getTracks().forEach((track) => track.stop());
    this.vadStream = null;
    this.setState("idle");
  }

  private setState(state: VoiceModeState): void {
    this.state = state;
    this.options.callbacks.onState(state);
  }
}