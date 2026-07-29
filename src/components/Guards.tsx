import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile && profile.onboarding_completed) return <Navigate to="/app" replace />;
  if (user && profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
// Wraps routes that require a completed profile (e.g. /app). Sends unfinished
// onboarding users back to the onboarding flow.
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Wraps the /onboarding route itself. Sends users who already finished
// onboarding straight to the dashboard instead of showing the wizard again.
export function RequireNotOnboarded({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && profile.onboarding_completed) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
