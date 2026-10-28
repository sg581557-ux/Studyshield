import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { FullPageLoader } from "./States";

// Route guards. Rules:
// - While the session/profile is still restoring, render a loader — never
//   flash a redirect (prevents auth loops and blank pages).
// - Authentication and onboarding are SEPARATE concerns:
//   * PublicOnly         — renders public pages for visitors; signed-in users
//                          are routed to onboarding or the dashboard based on
//                          profile completion (returning-user behavior).
//   * ProtectedRoute     — auth only. Unauthenticated → /login. Onboarding is
//                          intentionally NOT evaluated here.
//   * RequireOnboarded   — onboarding only. Must be composed INSIDE
//                          <ProtectedRoute> so the profile/onboarding check
//                          never runs before authentication succeeds.
//   * RequireNotOnboarded— onboarding only, for the /onboarding wizard itself.
//                          Also composed inside <ProtectedRoute>.
// - A missing profile row is treated as "not onboarded" so onboarding can
//   never be skipped silently.

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();
  if (loading) return <FullPageLoader message="Loading your workspace…" />;
  // Only block on profileLoading when we don't yet have a profile — background
  // refreshes (profile already present) should not flash a full-page loader.
  if (profileLoading && !profile) return <FullPageLoader message="Loading your workspace…" />;
  if (user) {
    if (profile && profile.onboarding_completed) return <Navigate to="/dashboard" replace />;
    if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
    if (!profile && profileLoading) return <FullPageLoader message="Loading your workspace…" />;
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

// Authentication guard — checks the session only. Onboarding status is
// handled separately by RequireOnboarded / RequireNotOnboarded.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader message="Loading your workspace…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Onboarding guard for protected pages that need a completed profile
// (e.g. the dashboard). Sends unfinished onboarding users to the wizard.
// Must be nested inside <ProtectedRoute>.
// Background refreshes (profile already loaded) do NOT show loader to avoid 3-4x flicker.
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { profile, profileLoading } = useAuth();
  if (!profile) {
    if (profileLoading) return <FullPageLoader message="Loading your workspace…" />;
    return <Navigate to="/onboarding" replace />;
  }
  if (!profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Onboarding guard for the /onboarding route itself. Sends users who already
// finished onboarding straight to the dashboard instead of showing the wizard
// again. Must be nested inside <ProtectedRoute>.
export function RequireNotOnboarded({ children }: { children: ReactNode }) {
  const { profile, profileLoading } = useAuth();
  if (!profile && profileLoading) return <FullPageLoader message="Loading your workspace…" />;
  if (profile && profile.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
