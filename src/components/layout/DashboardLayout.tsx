import { useState } from "react";
import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Search, Bell } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

export function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <aside className="hidden lg:block sticky top-0 h-screen flex-shrink-0">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-screen z-50 lg:hidden"
            >
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 glass border-b border-white/5 sticky top-0 z-30 flex items-center gap-4 px-5 lg:px-8">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden text-slate-300 hover:text-white p-1"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search chapters, tasks, resources..."
                className="w-full bg-ink-850 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button className="relative w-9 h-9 rounded-lg bg-ink-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white text-sm font-semibold">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
