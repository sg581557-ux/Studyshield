import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Formula } from "../lib/supabase";
import { cn } from "../lib/utils";
import { StickyNote, Plus, Trash2, Search, Bookmark, Loader2 } from "lucide-react";

export default function NotesPage() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", subject: "", chapter: "", content: "" });

  const load = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("formulas")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as Formula[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleAdd = async () => {
    if (!session?.user?.id || !form.title.trim()) return;
    const { data } = await supabase
      .from("formulas")
      .insert({ ...form, user_id: session.user.id })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data as Formula, ...prev]);
      setForm({ title: "", subject: "", chapter: "", content: "" });
      setShowAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("formulas").delete().eq("id", id);
  };

  const toggleBookmark = async (note: Formula) => {
    const updated = { ...note, bookmarked: !note.bookmarked };
    setNotes((prev) => prev.map((n) => n.id === note.id ? updated : n));
    await supabase.from("formulas").update({ bookmarked: !note.bookmarked }).eq("id", note.id);
  };

  const filtered = notes.filter((n) => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !(n.content || "").toLowerCase().includes(search.toLowerCase())) return false;
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
            <StickyNote className="w-6 h-6 text-brand-600" /> Notes & Formulas
          </h1>
          <p className="text-slate-500 mt-1">{notes.length} notes saved</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Note
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g., Newton's Second Law" />
            </div>
            <div>
              <label className="label">Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" placeholder="e.g., Physics" />
            </div>
          </div>
          <div>
            <label className="label">Chapter</label>
            <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} className="input" placeholder="e.g., Laws of Motion" />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input min-h-24 resize-y"
              placeholder="Write your formula or note..."
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary">Save Note</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <StickyNote className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No notes yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((note) => (
            <div key={note.id} className="card p-5 group hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-slate-900 line-clamp-2">{note.title}</h3>
                <button
                  onClick={() => toggleBookmark(note)}
                  className={cn("flex-shrink-0 transition-colors", note.bookmarked ? "text-warning-500" : "text-slate-300 hover:text-warning-400")}
                >
                  <Bookmark className={cn("w-5 h-5", note.bookmarked && "fill-current")} />
                </button>
              </div>
              {(note.subject || note.chapter) && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  {note.subject && <span className="badge bg-brand-50 text-brand-600">{note.subject}</span>}
                  {note.chapter && <span>{note.chapter}</span>}
                </div>
              )}
              {note.content && (
                <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap">{note.content}</p>
              )}
              <button
                onClick={() => handleDelete(note.id)}
                className="text-slate-300 hover:text-error-500 transition-colors mt-3 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
