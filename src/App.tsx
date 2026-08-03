import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FullPageLoader } from "./components/States";
import { RequireOnboarded, RequireNotOnboarded, ProtectedRoute, PublicOnly } from "./components/Guards";

const LandingPage = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const Layout = lazy(() => import("./pages/dashboard/Layout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const AIPlanner = lazy(() => import("./pages/dashboard/AIPlanner"));
const Mentor = lazy(() => import("./pages/dashboard/Mentor"));
const VoiceMode = lazy(() => import("./pages/dashboard/VoiceMode"));
const BacklogPlanner = lazy(() => import("./pages/dashboard/BacklogPlanner"));
const RecoveryBucket = lazy(() => import("./pages/dashboard/RecoveryBucket"));
const SubjectManager = lazy(() => import("./pages/dashboard/SubjectManager"));
const FormulaVault = lazy(() => import("./pages/dashboard/FormulaVault"));
const FocusTimer = lazy(() => import("./pages/dashboard/FocusTimer"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const Profile = lazy(() => import("./pages/dashboard/Profile"));

export default function App() {
  const { loading } = useAuth();
  if (loading) return <FullPageLoader message="Loading your workspace…" />;
  return (
    <Suspense fallback={<FullPageLoader message="Loading…" />}>
      <Routes>
        {/* ── Public routes ────────────────────────────────────────────────
            `/` always renders the Landing Page — no guard, no redirect, even
            for signed-in users (the onboarding check happens only after a
            successful login). The remaining public pages use PublicOnly to
            keep signed-in users out of the auth forms. */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        {/* Not PublicOnly: Supabase auto-signs the user in via the reset link
            (detectSessionInUrl), so the page must render while signed in. */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* ── Auth-only routes ─────────────────────────────────────────────
            ProtectedRoute (auth) → RequireNotOnboarded (onboarding status).
            Onboarding is only evaluated after authentication succeeds. */}
        {/* /auth/callback is deliberately UNGUARDED — AuthCallback restores
            the session itself (getSession / PKCE exchange) and routes to
            /onboarding, /dashboard or /login. Route guards would race with
            that restore and bounce users to /login before the OAuth tokens
            are exchanged. */}
        <Route
  path="/auth/callback"
  element={<AuthCallback />}
/>
        <Route path="/onboarding" element={<ProtectedRoute><RequireNotOnboarded><Onboarding /></RequireNotOnboarded></ProtectedRoute>} />

        {/* ── Protected dashboard (auth → onboarding → layout) ───────────── */}
        <Route element={<ProtectedRoute><RequireOnboarded><Layout /></RequireOnboarded></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/planner" element={<AIPlanner />} />
          <Route path="/mentor" element={<Mentor />} />
          <Route path="/voice" element={<VoiceMode />} />
          <Route path="/backlogs" element={<BacklogPlanner />} />
          <Route path="/recovery" element={<RecoveryBucket />} />
          <Route path="/subjects" element={<SubjectManager />} />
          <Route path="/vault" element={<FormulaVault />} />
          <Route path="/timer" element={<FocusTimer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* ── Legacy /app URLs → canonical dashboard paths ───────────────── */}
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/app/planner" element={<Navigate to="/planner" replace />} />
        <Route path="/app/mentor" element={<Navigate to="/mentor" replace />} />
        <Route path="/app/voice" element={<Navigate to="/voice" replace />} />
        <Route path="/app/backlog" element={<Navigate to="/backlogs" replace />} />
        <Route path="/app/recovery" element={<Navigate to="/recovery" replace />} />
        <Route path="/app/subjects" element={<Navigate to="/subjects" replace />} />
        <Route path="/app/formulas" element={<Navigate to="/vault" replace />} />
        <Route path="/app/timer" element={<Navigate to="/timer" replace />} />
        <Route path="/app/analytics" element={<Navigate to="/analytics" replace />} />
        <Route path="/app/settings" element={<Navigate to="/settings" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
