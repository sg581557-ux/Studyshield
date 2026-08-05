import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production domain. Must match the site the reset email links to — the email
// is sent by the hosted Supabase Auth server, so a dev-origin (localhost) link
// would never resolve for real users. Never derive this from window.location.
// Note: studyshield.study / www.studyshield.study are legacy domains that do
// NOT resolve to the app — the live site is the Cloudflare worker URL.
export const PRODUCTION_SITE_URL = "https://studyshield.sg581557.workers.dev";

// Environment-aware site URL: development uses the local origin (localhost),
// production uses the live domain. Overridable via VITE_SITE_URL if needed.
export const SITE_URL: string = import.meta.env.PROD
  ? (import.meta.env.VITE_SITE_URL ?? PRODUCTION_SITE_URL)
  : window.location.origin;

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
// environment-aware: http://localhost:5173 in dev, https://www.studyshield.study
// in production (see SITE_URL above).
export const OAUTH_REDIRECT_URL = `${SITE_URL}/auth/callback`;

export const supabase = url && anon
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// Raw credentials for the direct mentor-chat fetch path (supabase.functions.invoke
// doesn't expose response streams).
export const supabaseUrl: string = url ?? "";
export const supabaseAnonKey: string = anon ?? "";
