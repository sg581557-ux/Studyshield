import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { BacklogItem } from "../lib/supabase";
import { cn, priorityColor, formatDate } from "../lib/utils";
import { ListTodo, Plus, Trash2, Loader2 } from "lucide-react";

export default function BacklogTracker() {
  const { session } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const load = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("backlog_items")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as BacklogItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleAdd = async () => {
    if (!session?.user?.id || !newTitle.trim()) return;
    const { data } = await supabase
      .from("backlog_items")
      .insert({
        user_id: session.user.id,
        title: newTitle,
        subject: newSubject || null,
        priority: newPriority,
        status: "todo",
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [data as BacklogItem, ...prev]);
      setNewTitle("");
      setNewSubject("");
      setShowAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("backlog_items").delete().eq("id", id);
  };

  const handleStatusChange = async (item: BacklogItem, status: string) => {
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status } : i));
    await supabase.from("backlog_items").update({ status }).eq("id", item.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const stats = {
    todo: items.filter((i) => i.status === "todo").length,
    inProgress: items.filter((i) => i.status === "in_progress").length,
    done: items.filter((i) => i.status === "done").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-brand-600" /> Backlog Tracker
          </h1>
          <p className="text-slate-500 mt-1">
            {stats.todo} to do · {stats.inProgress} in progress · {stats.done} done
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4 animate-slide-up">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="input"
              placeholder="What needs to be done?"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subject (optional)</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="input"
                placeholder="e.g., Physics"
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="input"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary">Add to Backlog</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No backlog items. Add one to get started!</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card p-4 flex items-center gap-4 group">
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium text-slate-900", item.status === "done" && "line-through text-slate-400")}>
                  {item.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  {item.subject && <span>{item.subject}</span>}
                  <span className={cn("badge capitalize", priorityColor(item.priority))}>{item.priority}</span>
                  <span>Added {formatDate(item.created_at)}</span>
                </div>
              </div>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item, e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-slate-300 hover:text-error-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
