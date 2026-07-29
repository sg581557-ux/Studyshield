import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Resource } from "../lib/supabase";
import { cn } from "../lib/utils";
import { FolderOpen, Plus, Trash2, FileText, Link as LinkIcon, Search, Loader2 } from "lucide-react";

export default function ResourceVault() {
  const { session } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({ name: "", type: "pdf", subject: "", chapter: "", url: "" });

  const load = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("resources")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setResources((data ?? []) as Resource[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleAdd = async () => {
    if (!session?.user?.id || !form.name.trim() || !form.url.trim()) return;
    const { data } = await supabase
      .from("resources")
      .insert({ ...form, user_id: session.user.id })
      .select()
      .single();
    if (data) {
      setResources((prev) => [data as Resource, ...prev]);
      setForm({ name: "", type: "pdf", subject: "", chapter: "", url: "" });
      setShowAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("resources").delete().eq("id", id);
  };

  const filtered = resources.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !(r.subject || "").toLowerCase().includes(search.toLowerCase())) return false;
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-brand-600" /> Resource Vault
          </h1>
          <p className="text-slate-500 mt-1">{resources.length} resources saved</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Resource name" />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" placeholder="e.g., Physics" />
            </div>
            <div>
              <label className="label">Chapter</label>
              <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} className="input" placeholder="e.g., Mechanics" />
            </div>
          </div>
          <div>
            <label className="label">URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input" placeholder="https://..." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary">Save Resource</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="flex gap-2">
          {["all", "pdf", "video", "link", "notes"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
                typeFilter === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No resources found. Add one to get started!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="card p-5 group hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
                  r.type === "video" ? "bg-error-50 text-error-600" :
                  r.type === "pdf" ? "bg-brand-50 text-brand-600" :
                  r.type === "link" ? "bg-accent-50 text-accent-600" :
                  "bg-warning-50 text-warning-600"
                )}>
                  {r.type === "link" ? <LinkIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-900 hover:text-brand-600 transition-colors line-clamp-2"
                  >
                    {r.name}
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span className="badge bg-slate-100 text-slate-600 capitalize">{r.type}</span>
                    {r.subject && <span>{r.subject}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-slate-300 hover:text-error-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {r.chapter && <p className="text-xs text-slate-400 mt-3">{r.chapter}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
