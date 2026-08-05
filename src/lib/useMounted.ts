import { useEffect, useState } from "react";

/**
 * Returns `true` after the component has mounted (first commit done).
 *
 * Animation flags ("fade in after mount") must start `false` and flip after
 * paint. The flip happens in a macrotask, so there is no synchronous setState
 * inside the effect — no cascading re-render, and it survives StrictMode.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(t);
  }, []);
  return mounted;
}
