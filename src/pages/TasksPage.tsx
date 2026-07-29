import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Todo } from "../lib/supabase";
import { cn, priorityColor } from "../lib/utils";
import { CheckSquare, Plus, Trash2, Check, Loader2 } from "lucide-react";

export default function TasksPage() {
  const { session } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const load = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", session.user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setTodos((data ?? []) as Todo[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleAdd = async () => {
    if (!session?.user?.id || !newTitle.trim()) return;
    const { data } = await supabase
      .from("todos")
      .insert({
        user_id: session.user.id,
        title: newTitle,
        priority: newPriority,
        completed: false,
        sort_order: todos.length,
      })
      .select()
      .single();
    if (data) {
      setTodos((prev) => [...prev, data as Todo]);
      setNewTitle("");
    }
  };

  const handleToggle = async (todo: Todo) => {
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, completed: !t.completed } : t));
    await supabase.from("todos").update({ completed: !todo.completed }).eq("id", todo.id);
  };

  const handleDelete = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const active = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-brand-600" /> Tasks
        </h1>
        <p className="text-slate-500 mt-1">{active.length} active · {done.length} completed</p>
      </div>

      {/* Add task */}
      <div className="card p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="input flex-1"
            placeholder="Add a task..."
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="input w-32"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button onClick={handleAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active tasks */}
      <div className="space-y-2">
        {active.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckSquare className="w-10 h-10 text-accent-300 mx-auto mb-3" />
            <p className="text-slate-500">All caught up! No active tasks.</p>
          </div>
        ) : (
          active.map((todo) => (
            <div key={todo.id} className="card p-4 flex items-center gap-3 group">
              <button
                onClick={() => handleToggle(todo)}
                className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-accent-400 transition-colors flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{todo.title}</p>
                <span className={cn("badge mt-1", priorityColor(todo.priority))}>{todo.priority}</span>
              </div>
              <button
                onClick={() => handleDelete(todo.id)}
                className="text-slate-300 hover:text-error-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Completed</h2>
          <div className="space-y-2">
            {done.map((todo) => (
              <div key={todo.id} className="card p-4 flex items-center gap-3 group opacity-60">
                <button
                  onClick={() => handleToggle(todo)}
                  className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
                <p className="flex-1 text-sm font-medium text-slate-500 line-through">{todo.title}</p>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="text-slate-300 hover:text-error-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
