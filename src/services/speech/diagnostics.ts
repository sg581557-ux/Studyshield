// ============================================================
// Voice support diagnostics.
//
// Voice Mode never reports "unsupported" without proving it.
// These helpers collect everything needed to answer "why did
// start fail?" — recognition API presence, mic API presence,
// secure-context state and permission state — and log it to the
// console with the EXACT values that were checked.
// ============================================================

export type MicPermissionState = "granted" | "denied" | "prompt" | "unknown";

/**
 * Why the microphone can't be used — every reason maps to a specific,
 * user-friendly message via micFailureMessage().
 */
export type MicFailureReason =
  | "unsupported" // no navigator.mediaDevices.getUserMedia at all
  | "permission-denied" // NotAllowedError — the user blocked the mic
  | "no-device" // NotFoundError — no microphone present
  | "in-use" // NotReadableError — another app holds the mic
  | "not-secure" // SecurityError — http:// (not https/localhost)
  | "unknown";

export interface VoiceDiagnostics {
  /** Parsed browser name + version, e.g. "Edge 118". */
  browser: string;
  userAgent: string;
  /** true on https AND localhost (localhost counts as a secure context). */
  secureContext: boolean;
  isLocalhost: boolean;
  /** The raw values as seen on window. */
  speechRecognition: unknown;
  webkitSpeechRecognition: unknown;
  hasSpeechRecognition: boolean;
  hasWebkitSpeechRecognition: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
  permissionState: MicPermissionState;
}

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location?.hostname ?? "";
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const match = ua.match(/(Edg|OPR|Vivaldi|Brave|SamsungBrowser|Firefox|Safari|Chrome)[/ ](\d+(?:\.\d+)?)/i);
  if (!match) return "unknown";
  return `${match[1]} ${match[2]}`;
}

export function collectVoiceDiagnostics(): VoiceDiagnostics {
  if (typeof window === "undefined") {
    return {
      browser: "unknown",
      userAgent: "unknown",
      secureContext: false,
      isLocalhost: false,
      speechRecognition: undefined,
      webkitSpeechRecognition: undefined,
      hasSpeechRecognition: false,
      hasWebkitSpeechRecognition: false,
      mediaDevices: false,
      getUserMedia: false,
      permissionState: "unknown",
    };
  }
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  const sr = w.SpeechRecognition;
  const wsr = w.webkitSpeechRecognition;
  return {
    browser: detectBrowser(),
    userAgent: navigator.userAgent,
    secureContext: secureContextAvailable(),
    isLocalhost: isLocalhost(),
    speechRecognition: sr,
    webkitSpeechRecognition: wsr,
    hasSpeechRecognition: sr !== undefined && sr !== null,
    hasWebkitSpeechRecognition: wsr !== undefined && wsr !== null,
    mediaDevices: typeof navigator.mediaDevices !== "undefined",
    getUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
    permissionState: "unknown",
  };
}

/**
 * True only when the browser exposes at least one recognition
 * constructor — SpeechRecognition OR webkitSpeechRecognition.
 */
export function speechRecognitionSupported(): boolean {
  const d = collectVoiceDiagnostics();
  return d.hasSpeechRecognition || d.hasWebkitSpeechRecognition;
}

export async function queryMicrophonePermission(): Promise<MicPermissionState> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    // e.g. Firefox and Safari don't support querying "microphone"
    return "unknown";
  }
}

export interface MicProbeResult {
  granted: boolean;
  reason: MicFailureReason;
  error?: DOMException | Error;
}

/** True when the page runs in a secure context (https OR localhost). */
export function secureContextAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.isSecureContext === "boolean") return window.isSecureContext;
  return isLocalhost();
}

/**
 * Map a getUserMedia failure to a MicFailureReason. Every browser uses a
 * slightly different error name, so several spellings map to one reason.
 */
export function classifyGetUserMediaError(err: unknown): MicFailureReason {
  const name = (err as DOMException)?.name ?? "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "permission-denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "no-device";
  if (name === "NotReadableError" || name === "TrackStartError") return "in-use";
  if (name === "SecurityError") return "not-secure";
  return "unknown";
}

/** The user-facing message for a mic failure — no generic strings. */
export function micFailureMessage(reason: MicFailureReason): string {
  switch (reason) {
    case "permission-denied":
      return "Please allow microphone permission. Click the lock icon in the address bar, then tap the mic again.";
    case "no-device":
      return "No microphone detected. Plug one in or check your Bluetooth earphones.";
    case "in-use":
      return "Another app is using your microphone. Close it, then tap the mic again.";
    case "not-secure":
      return "Microphone requires HTTPS or localhost.";
    case "unsupported":
      return "This browser has no microphone API (navigator.mediaDevices.getUserMedia is missing). Use the text chat instead.";
    default:
      return "The microphone could not be started. Tap the mic to try again.";
  }
}

/**
 * Cheap device check — no permission prompt is ever shown by
 * enumerateDevices. Returns true when the check can't be performed so
 * the caller falls through to the real getUserMedia probe.
 */
export async function hasAudioInputDevices(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return true;
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === "audioinput");
  } catch {
    return true;
  }
}

/**
 * Actually request the microphone. This is what proves the mic works —
 * it also surfaces the browser's permission prompt on first use.
 * The stream is released immediately after the probe.
 */
export async function requestMicrophonePermission(): Promise<MicProbeResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    return { granted: false, reason: "unsupported" };
  }
  if (!secureContextAvailable()) {
    return { granted: false, reason: "not-secure" };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true, reason: "unknown" };
  } catch (err) {
    return { granted: false, reason: classifyGetUserMediaError(err), error: err as DOMException };
  }
}

function describeApi(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  return String(value);
}

/** Console group with the exact values checked — run on every Voice Mode start. */
export function logVoiceDiagnostics(d: VoiceDiagnostics): void {
  if (typeof console === "undefined") return;
  const recognitionAvailable = d.hasSpeechRecognition || d.hasWebkitSpeechRecognition;
  console.groupCollapsed(`[Voice Mentor] diagnostics — recognition ${recognitionAvailable ? "OK" : "UNAVAILABLE"}`);
  console.log("Browser:", d.browser);
  console.log("User agent:", d.userAgent);
  console.log("Secure context:", d.secureContext, d.secureContext ? "(localhost and https count as secure)" : "(speech recognition requires https or localhost)");
  console.log("window.SpeechRecognition:", describeApi(d.speechRecognition));
  console.log("window.webkitSpeechRecognition:", describeApi(d.webkitSpeechRecognition));
  console.log("Recognition available (either one):", recognitionAvailable);
  console.log("navigator.mediaDevices:", d.mediaDevices ? "exists" : "MISSING");
  console.log("navigator.mediaDevices.getUserMedia:", d.getUserMedia ? "exists" : "MISSING");
  console.log("Microphone permission state:", d.permissionState);
  console.groupEnd();
}
