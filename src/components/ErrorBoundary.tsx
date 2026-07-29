import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface State { hasError: boolean; message?: string; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : "Unknown error" };
  }
  componentDidCatch(err: unknown) { console.error("[ErrorBoundary]", err); }
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
