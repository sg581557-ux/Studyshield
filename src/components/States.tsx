import { Loader2 } from "lucide-react";

export function FullPageLoader({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ink-950">
      <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Loader2 className="w-5 h-5 text-accent-500 animate-spin" />
      {message && <span className="text-sm text-slate-500">{message}</span>}
    </div>
  );
}
