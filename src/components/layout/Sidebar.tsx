import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Sparkles, BookOpen, Timer, TrendingUp, Layers,
  FolderOpen, Settings, Shield, LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn, initials } from "../../lib/utils";

const NAV = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "AI Planner", to: "/app/planner", icon: Sparkles },
  { label: "Chapters", to: "/app/chapters", icon: BookOpen },
  { label: "Focus Mode", to: "/app/focus", icon: Timer },
  { label: "Progress", to: "/app/progress", icon: TrendingUp },
  { label: "Backlog", to: "/app/backlog", icon: Layers },
  { label: "Resources", to: "/app/resources", icon: FolderOpen },
  { label: "Settings", to: "/app/settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-ink-900 border-r border-white/5 w-64">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-accent-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white leading-none">StudyShield</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">{user?.exam || "Exam Prep"}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <NavLink
                to={item.to}
                end={item.to === "/app"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-accent-600/10 text-accent-300 border border-accent-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  )
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white text-sm font-semibold">
            {initials(user?.name || "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-danger-400 transition-colors p-1.5"
            title="Sign out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
