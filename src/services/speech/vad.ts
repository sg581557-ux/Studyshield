// ============================================================
// Voice Activity Detection (VAD) — fully independent of STT.
//
// Computes live mic levels from an AudioContext analyser and
// detects speech start/end from energy. Powers two things:
//   1. The UI's voice-level meter (listening state).
//   2. Barge-in: while the AI is speaking, a VAD speech-start
//      cancels TTS and hands the mic back to recognition.
//
// Because it's decoupled from speech-to-text, a future OpenAI
// Realtime / Gemini Live provider can replace or disable this
// module (those APIs report speech events natively).
// ============================================================

import {
  classifyGetUserMediaError,
  secureContextAvailable,
  type MicProbeResult,
} from "./diagnostics";

export interface VadOptions {
  /** RMS threshold for "speaking" (0..1). */
  threshold?: number;
  /** ms of sustained energy before speech-start fires. */
  startHoldMs?: number;
  /** ms of sustained silence before speech-end fires. */
  endHoldMs?: number;
  /** analyser poll interval in ms (default 25 — keeps barge-in under ~100ms). */
  pollMs?: number;
}

export interface VadEvents {
  /** Smoothed mic level 0..1 (UI meter), every poll tick. */
  onLevel?: (level: number, speaking: boolean) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface VoiceActivityDetector {
  readonly running: boolean;
  start(): void;
  stop(): void;
  /** stop + release the AudioContext. */
  close(): void;
}

export interface MicConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface MicOpenResult {
  /** Live mic stream — null when the mic could not be opened. */
  stream: MediaStream | null;
  /** Why the open failed (null when it succeeded). */
  error: MicProbeResult | null;
}

/**
 * Open the mic with echo cancellation — essential for barge-in.
 * Failures are classified (permission-denied / no-device / in-use /
 * not-secure) instead of being swallowed, so callers can react.
 */
export async function openMicStream(constraints?: MicConstraints): Promise<MicOpenResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: { granted: false, reason: "unsupported" } };
  }
  if (!secureContextAvailable()) {
    return { stream: null, error: { granted: false, reason: "not-secure" } };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: constraints?.echoCancellation ?? true,
        noiseSuppression: constraints?.noiseSuppression ?? true,
        autoGainControl: constraints?.autoGainControl ?? true,
      },
    });
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: { granted: false, reason: classifyGetUserMediaError(err), error: err as DOMException } };
  }
}

const DEFAULT_OPTIONS: Required<VadOptions> = {
  threshold: 0.035,
  startHoldMs: 70,
  endHoldMs: 650,
  pollMs: 25,
};

export function createVoiceActivityDetector(
  stream: MediaStream,
  events: VadEvents,
  opts?: VadOptions,
): VoiceActivityDetector {
  const o: Required<VadOptions> = { ...DEFAULT_OPTIONS, ...opts };

  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let speaking = false;
  let smoothed = 0;
  let energySince = 0;
  let silenceSince = 0;
  /** Slow-tracking ambient noise floor (scaled units) — raises the
   *  threshold in noisy rooms and lowers it in quiet ones. */
  let noiseFloor = 0.02;

  const buf = new Uint8Array(1024);

  function rmsLevel(): number {
    if (!analyser) return 0;
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  function poll(): void {
    const raw = rmsLevel();
    // Scale so quiet speech ≈ 0.3, loud speech → 1.
    const scaled = Math.min(1, raw * 14);
    smoothed = smoothed * 0.55 + scaled * 0.45;
    const now = Date.now();

    if (!speaking) {
      // Adaptive noise floor: track the quietest levels (fan hum,
      // room tone), and let it drift back up so a sudden silence
      // doesn't freeze the threshold too low.
      if (scaled < noiseFloor) noiseFloor = scaled;
      else noiseFloor = Math.min(0.05, noiseFloor + 0.00005);
    }

    // Background-noise aware threshold: configured minimum, or the
    // ambient floor with headroom, whichever is higher. Short spikes
    // (keyboard clicks, bumps) never sustain the startHold window.
    const effectiveThreshold = Math.max(o.threshold, noiseFloor * 1.8 + 0.008);

    if (!speaking) {
      if (smoothed >= effectiveThreshold) {
        if (!energySince) energySince = now;
        if (now - energySince >= o.startHoldMs) {
          speaking = true;
          silenceSince = 0;
          events.onSpeechStart?.();
        }
      } else {
        energySince = 0;
      }
    } else {
      if (smoothed < effectiveThreshold) {
        if (!silenceSince) silenceSince = now;
        if (now - silenceSince >= o.endHoldMs) {
          speaking = false;
          silenceSince = 0;
          events.onSpeechEnd?.();
        }
      } else {
        silenceSince = 0;
      }
    }

    events.onLevel?.(smoothed, speaking);
  }

  return {
    get running() {
      return running;
    },
    start(): void {
      if (running) return;
      running = true;
      if (!ctx) {
        ctx = new AudioContext();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.5;
        ctx.createMediaStreamSource(stream).connect(analyser);
      }
      if (ctx.state === "suspended") void ctx.resume();
      timer = setInterval(poll, o.pollMs);
    },
    stop(): void {
      if (!running) return;
      running = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    close(): void {
      this.stop();
      if (ctx) {
        void ctx.close();
        ctx = null;
        analyser = null;
      }
    },
  };
}
