import { createContext, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface Toast { id: string; type: ToastType; message: string; }
interface ToastContextValue {
  toast: { success: (msg: string) => void; error: (msg: string) => void; info: (msg: string) => void; };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function push(type: ToastType, message: string) {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((p) => [...p, { id, type, message }]);
    window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }
  const toast = {
    success: (m: string) => push("success", m),
    error: (m: string) => push("error", m),
    info: (m: string) => push("info", m),
  };
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-success-400" />,
    error: <AlertCircle className="w-5 h-5 text-danger-400" />,
    info: <Info className="w-5 h-5 text-accent-400" />,
  };
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto rounded-xl bg-ink-900 border border-white/10 px-4 py-3 flex items-start gap-3 shadow-lg">
              {icons[t.type]}
              <p className="text-sm text-slate-200 flex-1 break-words">{t.message}</p>
              <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-slate-500 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
