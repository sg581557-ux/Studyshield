import type { ReactNode, ButtonHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn("rounded-2xl bg-ink-900/80 backdrop-blur-sm border border-white/5", className)} onClick={onClick}>{children}</div>;
}
export function CardBody({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn("p-5", className)} onClick={onClick}>{children}</div>;
}
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-14 h-14 rounded-2xl bg-ink-850 border border-white/5 flex items-center justify-center text-slate-500 mb-4">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
type Variant = "primary" | "ghost" | "danger";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: "sm" | "md"; fullWidth?: boolean; }
export function Button({ variant = "primary", size = "md", fullWidth, className, children, ...rest }: BtnProps) {
  const variants: Record<Variant, string> = {
    primary: "bg-accent-600 hover:bg-accent-500 text-white shadow-lg shadow-accent-600/20",
    ghost: "bg-ink-850 hover:bg-ink-800 border border-white/5 text-slate-300 hover:text-white",
    danger: "bg-danger-600/90 hover:bg-danger-500 text-white",
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm" };
  return (
    <button className={cn("inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], fullWidth && "w-full", className)} {...rest}>
      {children}
    </button>
  );
}
export function ProgressRing({ progress, size = 80, strokeWidth = 7, color = "#3366ff", children }: { progress: number; size?: number; strokeWidth?: number; color?: string; children?: ReactNode }) {
  const radius = (size - strokeWidth) / 2, circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, progress)) / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1F2937" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.6 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
export function ProgressBar({ value, max, color = "#3366ff", className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-2 rounded-full bg-ink-800 overflow-hidden", className)}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
    </div>
  );
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div className={cn("relative w-full rounded-2xl bg-ink-900 border border-white/10 shadow-2xl", wide ? "max-w-3xl" : "max-w-md")} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}>
            <div className="flex items-center justify-between p-5 border-b border-white/5"><h2 className="font-semibold text-white">{title}</h2><button onClick={onClose} className="w-8 h-8 rounded-lg bg-ink-850 flex items-center justify-center text-slate-400 hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium", className)}>{children}</span>;
}
