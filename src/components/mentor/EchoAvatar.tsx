import { Sparkles, Zap } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "header" | "message" | "hero" | "typing" | "inline";

interface Props {
  variant?: Variant;
  size?: number;
  pulse?: boolean;
  className?: string;
}

export function EchoAvatar({ variant = "header", size, pulse = false, className }: Props) {
  const sizes: Record<Variant, { box: string; icon: string; sparkle: string }> = {
    header: { box: "h-9 w-9", icon: "h-[18px] w-[18px]", sparkle: "h-3 w-3" },
    message: { box: "h-8 w-8 sm:h-9 sm:w-9", icon: "h-4 w-4 sm:h-4.5 sm:w-4.5", sparkle: "h-2 w-2 sm:h-2.5 sm:w-2.5" },
    hero: { box: "h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]", icon: "h-7 w-7 sm:h-9 sm:w-9", sparkle: "h-4 w-4 sm:h-5 sm:w-5" },
    typing: { box: "h-9 w-9", icon: "h-4 w-4", sparkle: "h-2 w-2" },
    inline: { box: "h-8 w-8", icon: "h-4 w-4", sparkle: "h-2 w-2" },
  };
  const s = sizes[variant];
  const boxCls = size ? undefined : s.box;

  return (
    <div className={cn("relative flex shrink-0 items-center justify-center select-none", boxCls, className)} style={size ? { width: size, height: size } : undefined}>
      {/* ambient glow */}
      <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-accent-500 opacity-30 blur-[10px]" />
      {variant === "hero" && <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-violet-600/30 via-fuchsia-500/20 to-accent-500/30 blur-xl" />}
      {/* main orb */}
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center rounded-xl border border-white/10 shadow-[0_8px_20px_rgba(124,58,237,0.35),0_1px_0_rgba(255,255,255,0.12)_inset]",
          variant === "hero" ? "rounded-[22px]" : "rounded-xl",
          "bg-gradient-to-br from-violet-600 via-fuchsia-500 to-accent-500",
        )}
      >
        {/* inner highlight */}
        <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-gradient-to-br from-white/[0.18] via-white/[0.06] to-transparent" />
        <div className="pointer-events-none absolute -right-[18%] -top-[18%] h-[55%] w-[55%] rounded-full bg-white/15 blur-[10px]" />
        {/* icon stack — sparkles + bolt for AI vibe */}
        <div className="relative flex items-center justify-center">
          <Sparkles className={cn("text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]", s.icon)} strokeWidth={2.1} />
          <Zap className={cn("absolute -right-1 -top-1 text-white/90 drop-shadow", variant === "hero" ? "h-3.5 w-3.5" : "h-2.5 w-2.5")} strokeWidth={2.5} />
        </div>
        {/* live dot for header/typing */}
        {pulse && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-violet-600" />
          </span>
        )}
      </div>
      {/* floating sparkle for hero */}
      {variant === "hero" && (
        <>
          <span className="absolute -right-2 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-violet-100">
            <Sparkles className="h-3 w-3 text-violet-600" />
          </span>
          <span className="absolute -left-3 bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0f0f10] border border-white/10 shadow-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          </span>
        </>
      )}
    </div>
  );
}

// Tiny inline badge avatar for chips / inline mentions
export function EchoAvatarInline({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm border border-white/10", className)}>
      <Sparkles className="h-3 w-3" />
    </span>
  );
}
