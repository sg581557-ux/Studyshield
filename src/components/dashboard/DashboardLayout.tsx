import { useState, useMemo, type ReactNode } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CheckSquare, Calendar, StickyNote, TrendingUp, Settings, Search, Bell, Flame, LogOut, Menu, X, BookMarked, Package, Sigma, Globe } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useUserData } from '../../context/UserDataContext';
import { cn, todayISO } from '../../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/chapters', label: 'Chapter Manager', icon: BookMarked },
  { to: '/modules', label: 'Module Tracker', icon: Package },
  { to: '/formulas', label: 'Formula Vault', icon: Sigma },
  { to: '/extension', label: 'Chrome Extension', icon: Globe },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { tasks, streak } = useUserData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notifications = useMemo(() => {
    const today = todayISO();
    const pendingToday = tasks.filter((t) => t.dueDate === today && t.status === 'pending');
    const list: { icon: typeof Bell; text: string; color: string }[] = [];
    if (pendingToday.length > 0) list.push({ icon: Bell, text: `${pendingToday.length} task${pendingToday.length > 1 ? 's' : ''} pending today`, color: 'text-warning' });
    if (streak.currentStreak > 0) list.push({ icon: Flame, text: `${streak.currentStreak}-day streak — keep it going!`, color: 'text-orange-400' });
    if (list.length === 0) list.push({ icon: Bell, text: 'No notifications. You are all caught up!', color: 'text-gray-500' });
    return list;
  }, [tasks, streak]);

  return (
    <div className="min-h-screen flex">
      <AnimatePresence>
        {sidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      </AnimatePresence>
      <aside className={cn('fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col p-4 border-r border-white/[0.06] bg-base-900/80 backdrop-blur-xl transition-transform duration-300', sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex items-center justify-between mb-4 px-2"><Logo /><button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button></div>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border', isActive ? 'bg-accent/10 text-accent-light border-accent/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border-transparent')}>
              <item.icon size={18} />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-sm font-semibold">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p><p className="text-xs text-gray-500 truncate">{user?.email}</p></div>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors" title="Logout"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-4 px-6 py-4 border-b border-white/[0.06] bg-base-950/60 backdrop-blur-xl">
          <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) navigate(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`); }} className="flex-1 max-w-md">
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-base-800/60 border border-white/[0.06] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent/40 transition-all" /></div>
          </form>
          <div className="hidden md:block text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors"><Bell size={20} />{notifications.length > 1 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-warning" />}</button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-2 w-72 glass p-3 z-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notifications</p>
                  <div className="flex flex-col gap-2">{notifications.map((n, i) => <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04]"><n.icon size={16} className={n.color} /><span className="text-sm text-gray-300">{n.text}</span></div>)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {streak.currentStreak > 0 && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20"><Flame size={16} className="text-orange-400" /><span className="text-sm font-medium text-orange-400">{streak.currentStreak}</span></div>}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-sm font-semibold">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
        </header>
        <main className="flex-1 p-6"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>{children}</motion.div></main>
      </div>
    </div>
  );
}
