import { cn } from "../../lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-ink-800 via-ink-700 to-ink-800 bg-[length:200%_100%] animate-shimmer",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-3">
      <LoadingSkeleton className="h-10 w-10 rounded-xl" />
      <LoadingSkeleton className="h-4 w-2/3" />
      <LoadingSkeleton className="h-3 w-full" />
      <LoadingSkeleton className="h-3 w-4/5" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ink-850 border border-white/5">
          <LoadingSkeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-3 w-1/2" />
            <LoadingSkeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
