import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production domain — workers.dev is the LIVE host that actually serves the SPA
// (studyshield.study zone is still initializing). OAuth must use a host with
// not_found_handling=single-page-application or /auth/callback 404s.
export const PRODUCTION_SITE_URL = "https://studyshield.sg581557.workers.dev";
export const WORKER_SITE_URL = "https://studyshield.sg581557.workers.dev";

// Environment-aware site URL — PROD is now workers.dev per user request.
export const SITE_URL: string = import.meta.env.PROD
  ? (import.meta.env.VITE_SITE_URL ?? PRODUCTION_SITE_URL)
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

// All auth callbacks MUST be https://studyshield.sg581557.workers.dev/auth/callback
// (see user request). Hard-coded to workers.dev so Supabase redirect always lands on
// a host with SPA fallback.
export function getOAuthCallbackUrl(): string {
  return "https://studyshield.sg581557.workers.dev/auth/callback";
}

export function getSignupCallbackUrl(): string {
  return "https://studyshield.sg581557.workers.dev/auth/callback";
}

// Password-reset emails — also workers.dev (same SPA requirement).
export const RESET_PASSWORD_REDIRECT_URL =
  "https://studyshield.sg581557.workers.dev/reset-password";

// Kept for backwards compat — now hard-coded to workers.dev.
export const SIGNUP_REDIRECT_URL = "https://studyshield.sg581557.workers.dev/auth/callback";
export const OAUTH_REDIRECT_URL = "https://studyshield.sg581557.workers.dev/auth/callback";

export const supabase = url && anon
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// Raw credentials for the direct mentor-chat fetch path (supabase.functions.invoke
// doesn't expose response streams).
export const supabaseUrl: string = url ?? "";
export const supabaseAnonKey: string = anon ?? "";
