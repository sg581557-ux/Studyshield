import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { cn } from "../lib/utils";

type Variant = "primary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; children?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };
  const variants: Record<Variant, string> = {
    primary: "btn-primary bg-accent-600 text-white hover:bg-accent-500",
    ghost: "bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10",
    danger: "btn-danger bg-danger-600 text-white hover:bg-danger-500",
    outline: "border border-white/10 text-slate-200 hover:bg-white/5 hover:border-white/20",
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>{loading && <Loader2 className="w-4 h-4 animate-spin" />}{children}</button>;
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-ink-900 border border-white/10", className)} {...rest}>{children}</div>;
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-white", className)}>{children}</h3>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      {icon && <div className="text-slate-600 mb-3">{icon}</div>}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-600 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open, restore focus on close, close on Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="relative w-full max-w-md rounded-2xl bg-ink-900 border border-white/10 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-base font-semibold text-white">{title}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close dialog" className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 rounded-full bg-white/5 overflow-hidden", className)}>
      <motion.div className="h-full bg-accent-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.5 }} />
    </div>
  );
}

export function Chip({ children, active = false, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return <button type="button" onClick={onClick} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10", className)}>{children}</button>;
}

export function ProgressRing({ value, size = 64, strokeWidth = 6, label, className }: { value: number; size?: number; strokeWidth?: number; label?: ReactNode; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - v / 100);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
          className="text-accent-600 dark:text-accent-400" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      {label && <div className="absolute inset-0 flex items-center justify-center">{label}</div>}
    </div>
  );
}

export function StatBadge({ label, value, icon, color }: { label: string; value: string; icon?: ReactNode; color?: string }) {
  return (
    <Card><CardBody className="flex items-center gap-3">
      {icon && <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>{icon}</div>}
      <div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-white">{value}</p></div>
    </CardBody></Card>
  );
}
