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
const Layout = lazy(() => import("./pages/dashboard/Layout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const AIPlanner = lazy(() => import("./pages/dashboard/AIPlanner"));
const BacklogPlanner = lazy(() => import("./pages/dashboard/BacklogPlanner"));
const RecoveryBucket = lazy(() => import("./pages/dashboard/RecoveryBucket"));
const SubjectManager = lazy(() => import("./pages/dashboard/SubjectManager"));
const FormulaVault = lazy(() => import("./pages/dashboard/FormulaVault"));
const FocusTimer = lazy(() => import("./pages/dashboard/FocusTimer"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));

export default function App() {
  const { loading } = useAuth();
  if (loading) return <FullPageLoader message="Loading your workspace…" />;
  return (
    <Suspense fallback={<FullPageLoader message="Loading…" />}>
      <Routes>
        <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
        <Route path="/onboarding" element={<ProtectedRoute><RequireNotOnboarded><Onboarding /></RequireNotOnboarded></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute><RequireOnboarded><Layout /></RequireOnboarded></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="planner" element={<AIPlanner />} />
          <Route path="backlog" element={<BacklogPlanner />} />
          <Route path="recovery" element={<RecoveryBucket />} />
          <Route path="subjects" element={<SubjectManager />} />
          <Route path="formulas" element={<FormulaVault />} />
          <Route path="timer" element={<FocusTimer />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
