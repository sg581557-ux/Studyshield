// Maps raw Supabase/network errors to friendly, human-readable messages.
export function friendlyAuthError(err: unknown): string {
  // Supabase errors can be Error instances, plain objects ({ message, code,
  // status }) or strings — never assume a shape. Extract the message text
  // first, then classify it.
  let msg = "";
  if (err instanceof Error) msg = err.message ?? "";
  else if (typeof err === "string") msg = err;
  else if (err && typeof err === "object") {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") msg = m;
  }
  if (!msg) return "Something went wrong. Please try again.";
  const lower = msg.toLowerCase();

  if (msg === "Supabase client not initialized" || msg.includes("not initialized")) {
    return "Authentication is not configured. Please contact support.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email first — check your inbox for the confirmation link.";
  }
  if (lower.includes("password should be at least") || lower.includes("password must have")) {
    return "Password must be at least 8 characters.";
  }
  if (lower.includes("weak password")) {
    return "Password is too weak — use 8+ characters with upper and lower case letters and a number.";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "That email address doesn't look valid.";
  }
  if (lower.includes("rate limit") || lower.includes("security purposes") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("session expired") || lower.includes("refresh token") || lower.includes("jwt")) {
    return "Your session expired. Please sign in again.";
  }
  if (lower.includes("invalid or expired")) {
    return "This link is invalid or has expired. Please request a new one.";
  }
  if (lower.includes("provider is not enabled") || lower.includes("provider disabled") || lower.includes("provider not enabled")) {
    return "Google Sign-In isn't enabled on this project yet. Use email and password for now.";
  }
  if (lower.includes("popup closed")) {
    return "The sign-in window was closed before you finished. Tap the button again to retry.";
  }
  if (lower.includes("access_denied") || lower.includes("access denied") || lower.includes("user denied")) {
    return "You chose not to sign in with Google. You can use email and password instead.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network error") || lower.includes("load failed")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The request timed out. Please try again.";
  }
  return msg;
}

// --- Database (PostgREST) errors -------------------------------------------

export interface DatabaseErrorShape {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

export function isDatabaseError(err: unknown): err is DatabaseErrorShape {
  return !!err && typeof err === "object" && "code" in err && "message" in err;
}

const NETWORK_PATTERN = /failed to fetch|networkerror|network error|load failed|timed\s?out|aborted|fetch failed/i;

export function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && NETWORK_PATTERN.test(err.message))
  );
}

// Maps PostgREST error codes to real, actionable messages. Never masks the
// underlying cause: the raw error is still logged by the caller.
export function friendlyDatabaseError(err: unknown, table: string): string {
  if (!isDatabaseError(err)) return friendlyAuthError(err);
  const code = err.code ?? "";
  switch (code) {
    case "PGRST205":
    case "42P01":
      return `Database table "${table}" not found. The StudyShield database schema is missing — run the migrations with "supabase db push" (or apply them in the Supabase SQL editor), then try again.`;
    case "PGRST204":
      return `A field in the save doesn't exist in the "${table}" table. Your database is older than the app — apply the latest migrations ("supabase db push").`;
    case "42501":
    case "PGRST301":
    case "40001":
      return "Database permission denied. Your account is not allowed to modify this data.";
    case "23502":
      return "Missing required field — the database rejected the save.";
    case "23505":
      return "Duplicate record — this entry already exists.";
    case "23503":
      return "Foreign key violation — the record could not be linked to your account.";
    case "22P02":
      return "Invalid value type sent to the database.";
    case "28P01":
      return "Database authentication failed.";
    default:
      return err.message || `Database error (${code}).`;
  }
}

// One entry point for save flows: network vs database vs auth vs generic.
export function friendlySaveError(err: unknown, table: string): string {
  if (isNetworkError(err)) {
    return "Network error. Check your connection and try again.";
  }
  if (isDatabaseError(err)) {
    return friendlyDatabaseError(err, table);
  }
  return friendlyAuthError(err);
}

// --- Error logging ----------------------------------------------------------
// JSON.stringify(new Error("x")) returns "{}" — Error fields are non-enumerable,
// so naive serialization hides the real message. This flattens any error shape
// (Error instance, Supabase AuthError/AuthApiError, plain object, string) into
// a readable, loggable representation.
export function stringifyError(err: unknown): string {
  if (err === null || err === undefined) return String(err);
  if (typeof err === "string") return err;

  if (err instanceof Error) {
    const toJSON = (err as { toJSON?: () => unknown }).toJSON;
    const flattened: Record<string, unknown> = {
      name: err.name,
      message: err.message,
    };
    if (err.stack) flattened.stack = err.stack;
    if (typeof toJSON === "function") {
      // Supabase AuthError.toJSON() adds status/code (and details for some
      // subclasses) — merge it in so nothing is lost.
      const extra = toJSON.call(err);
      if (extra && typeof extra === "object") {
        Object.assign(flattened, extra as Record<string, unknown>);
      }
    }
    return JSON.stringify(flattened, null, 2);
  }

  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

