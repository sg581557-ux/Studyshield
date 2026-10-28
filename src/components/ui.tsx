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
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const sizes: Record<Size, string> = { sm: "text-xs px-3.5 py-1.5", md: "text-sm px-5 py-2.5", lg: "text-sm px-6 py-3" };
  const variants: Record<Variant, string> = {
    primary: "btn-primary bg-accent-600 text-white hover:bg-accent-500 shadow-lg shadow-accent-600/20 border border-accent-500/20",
    ghost: "rounded-xl bg-white/[0.06] text-zinc-100 hover:bg-white/10 border border-white/10 backdrop-blur",
    danger: "btn-danger bg-danger-600 text-white hover:bg-danger-500 shadow-lg shadow-danger-600/20",
    outline: "rounded-xl border border-white/10 text-zinc-200 hover:bg-white/[0.06] hover:border-white/20 backdrop-blur",
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>{loading && <span className="relative flex h-4 w-4 items-center justify-center"><span className="absolute inset-0 rounded-full border-2 border-white/20" /><span className="absolute inset-0 rounded-full border-2 border-t-white animate-spin" style={{animationDuration:"0.7s"}} /></span>}{children}</button>;
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[22px] bg-[#0f0f10] border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl", className)} {...rest}>{children}</div>;
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-5 md:p-6", className)}>{children}</div>;
}
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold tracking-tight text-white", className)}>{children}</h3>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      {icon && <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-sm mb-4">{icon}</div>}
      {!icon && <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 mb-4" />}
      <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
      {description && <p className="text-sm text-zinc-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="relative w-full max-w-md rounded-[24px] bg-[#0f0f10] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-white">{title}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close dialog" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5", className)}>
      <motion.div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
    </div>
  );
}

export function Chip({ children, active = false, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return <button type="button" onClick={onClick} className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-all border", active ? "bg-white text-zinc-900 border-white shadow-sm" : "bg-white/[0.06] text-zinc-400 border-white/10 hover:text-white hover:bg-white/10 backdrop-blur", className)}>{children}</button>;
}

export function ProgressRing({ value, size = 64, strokeWidth = 6, label, className }: { value: number; size?: number; strokeWidth?: number; label?: ReactNode; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - v / 100);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-white/10" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--accent-500))" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      {label && <div className="absolute inset-0 flex items-center justify-center">{label}</div>}
    </div>
  );
}

export function StatBadge({ label, value, icon, color }: { label: string; value: string; icon?: ReactNode; color?: string }) {
  return (
    <Card><CardBody className="flex items-center gap-3.5">
      {icon && <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border border-white/10 bg-white text-zinc-900 shadow-sm", color)}>{icon}</div>}
      <div><p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p><p className="text-lg font-bold tracking-tight text-white">{value}</p></div>
    </CardBody></Card>
  );
}
