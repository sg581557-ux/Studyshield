import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/supabase";
import { cn, relativeTime } from "../lib/utils";
import { Shield, Users, BarChart3, Loader2, Search } from "lucide-react";

export default function AdminPanel() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, premium: 0, admins: 0 });

  useEffect(() => {
    if (!profile?.is_admin) return;
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      const allUsers = (data ?? []) as Profile[];
      setUsers(allUsers);
      setStats({
        total: allUsers.length,
        active: allUsers.filter((u) => u.last_active && Date.now() - new Date(u.last_active).getTime() < 86400000).length,
        premium: allUsers.filter((u) => u.is_premium).length,
        admins: allUsers.filter((u) => u.is_admin).length,
      });
      setLoading(false);
    });
  }, [profile]);

  const filtered = users.filter((u) => {
    if (search && !(u.email || "").toLowerCase().includes(search.toLowerCase()) && !(u.display_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-brand-600" /> Admin Panel
        </h1>
        <p className="text-slate-500 mt-1">Manage users and platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <Users className="w-8 h-8 text-brand-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-sm text-slate-500">Total Users</p>
        </div>
        <div className="card p-5">
          <div className="w-8 h-8 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center mb-3">
            <span className="text-sm font-bold">●</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
          <p className="text-sm text-slate-500">Active (24h)</p>
        </div>
        <div className="card p-5">
          <div className="w-8 h-8 rounded-xl bg-warning-50 text-warning-600 flex items-center justify-center mb-3">
            <span className="text-sm font-bold">★</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.premium}</p>
          <p className="text-sm text-slate-500">Premium</p>
        </div>
        <div className="card p-5">
          <Shield className="w-8 h-8 text-error-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900">{stats.admins}</p>
          <p className="text-sm text-slate-500">Admins</p>
        </div>
      </div>

      {/* User table */}
      <div className="card p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Exam</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                        {(u.display_name || u.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.display_name || u.name || "Unknown"}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-slate-600">{u.target_exam || "—"}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {u.is_admin && <span className="badge bg-brand-100 text-brand-700">Admin</span>}
                      {u.is_premium && <span className="badge bg-warning-100 text-warning-700">Premium</span>}
                      {u.is_banned && <span className="badge bg-error-100 text-error-700">Banned</span>}
                      {!u.is_admin && !u.is_premium && !u.is_banned && <span className="badge bg-slate-100 text-slate-500">User</span>}
                    </div>
                  </td>
                  <td className="py-3 text-xs text-slate-400">{relativeTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
