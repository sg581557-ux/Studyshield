import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { forceReleaseAllScrollLocks } from "../hooks/useScrollLock";

interface State { hasError: boolean; message?: string; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : "Unknown error" };
  }
  componentDidCatch(err: unknown) {
    console.error("[ErrorBoundary]", err);
    // Heal scroll-lock + inert leaks that would otherwise freeze the page after a render error
    try {
      forceReleaseAllScrollLocks();
    } catch {
      // ignore
    }
    try {
      const live =
        document.querySelector<HTMLElement>("[data-keep-dark] > div.relative.flex") ??
        document.querySelector<HTMLElement>("main");
      if (live?.hasAttribute("inert")) live.removeAttribute("inert");
      if (live?.getAttribute("aria-hidden") === "true") live.removeAttribute("aria-hidden");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    } catch {
      // ignore
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-warning-400 mb-3" />
          <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">{this.state.message}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-accent-600 text-white px-4 py-2 text-sm hover:bg-accent-500">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
