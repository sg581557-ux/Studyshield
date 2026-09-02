import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production domain — canonical URL for the public site. Must match the
// custom domain that Google indexes. Never derive this from window.location.
// Cloudflare Workers URL (studyshield.sg581557.workers.dev) is NOT canonical.
export const PRODUCTION_SITE_URL = "https://studyshield.study";

// Environment-aware site URL: development uses the local origin (localhost),
// production uses the live domain. Overridable via VITE_SITE_URL if needed.
// Guard `window` for SSR/prerender/vitest where `window` is undefined.
export const SITE_URL: string = import.meta.env.PROD
  ? (import.meta.env.VITE_SITE_URL ?? PRODUCTION_SITE_URL)
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

// Password-reset emails must ALWAYS link to the live reset page (PRODUCTION_SITE_URL):
// GoTrue sends the email from Supabase's servers, so a localhost link would
// never resolve for real users.
export const RESET_PASSWORD_REDIRECT_URL =
  `${import.meta.env.VITE_SITE_URL ?? PRODUCTION_SITE_URL}/reset-password`;

// Email-confirmation links return here; the page auto-logs the user in and
// routes them to onboarding (or the dashboard for existing users).
export const SIGNUP_REDIRECT_URL = `${SITE_URL}/auth/callback`;

// OAuth (Google) providers return here after the user picks an account. Same
// callback as email confirmation — the page exchanges the tokens, creates the
// profile for new users, and routes by onboarding state. The origin is
// environment-aware: http://localhost:5173 in dev, https://studyshield.study
// in production (see SITE_URL above).
export const OAUTH_REDIRECT_URL = `${SITE_URL}/auth/callback`;

export const supabase = url && anon
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// Raw credentials for the direct mentor-chat fetch path (supabase.functions.invoke
// doesn't expose response streams).
export const supabaseUrl: string = url ?? "";
export const supabaseAnonKey: string = anon ?? "";
