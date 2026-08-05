import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../services/db";

export type Theme = "light" | "dark" | "system";
export type Accent = "blue" | "violet" | "emerald" | "rose" | "amber";

export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: "blue", label: "Blue", swatch: "#1d96f5" },
  { value: "violet", label: "Violet", swatch: "#7c3aed" },
  { value: "emerald", label: "Emerald", swatch: "#059669" },
  { value: "rose", label: "Rose", swatch: "#e11d48" },
  { value: "amber", label: "Amber", swatch: "#d97706" },
];

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "studyshield-theme";
const ACCENT_KEY = "studyshield-accent";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

function isAccent(value: string | null | undefined): value is Accent {
  return value === "blue" || value === "violet" || value === "emerald" || value === "rose" || value === "amber";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? profile?.theme ?? "dark";
  });
  const [accent, setAccentState] = useState<Accent>(() => {
    if (typeof window === "undefined") return "blue";
    const stored = localStorage.getItem(ACCENT_KEY);
    if (isAccent(stored)) return stored;
    return isAccent(profile?.accent_color) ? profile.accent_color : "blue";
  });
  // OS preference, tracked reactively while in "system" mode.
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme);
  // Fully derived — no state to keep in sync with `theme`.
  const resolvedTheme: "light" | "dark" = theme === "system" ? systemTheme : theme;

  // Apply theme to <html> whenever it changes.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  // Apply accent palette to <html data-accent="…">.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  // Listen to OS preference changes when in "system" mode.
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Sync from profile when it loads (only if no local override yet).
  // Render-phase adjustment keyed on the mirrored fields — it commits with
  // the profile, and the useState initializers already seeded the first pass.
  const profileSyncKey = `${profile?.theme ?? ""}|${profile?.accent_color ?? ""}`;
  const [prevProfileSync, setPrevProfileSync] = useState(profileSyncKey);
  if (profileSyncKey !== prevProfileSync) {
    setPrevProfileSync(profileSyncKey);
    if (profile?.theme && !localStorage.getItem(STORAGE_KEY)) {
      setThemeState(profile.theme as Theme);
    }
    if (isAccent(profile?.accent_color) && !localStorage.getItem(ACCENT_KEY)) {
      setAccentState(profile.accent_color);
    }
  }

  const setTheme = useCallback(
    async (t: Theme) => {
      setThemeState(t);
      localStorage.setItem(STORAGE_KEY, t);
      // Persist to Supabase profile so it survives across devices/logins.
      if (user?.id) {
        try {
          await db.updateAcademicSettings(user.id, { theme: t } as Record<string, unknown> as never);
        } catch (e) {
          console.error("[theme] failed to persist to profile", e);
        }
      }
    },
    [user],
  );

  const setAccent = useCallback(
    async (a: Accent) => {
      setAccentState(a);
      localStorage.setItem(ACCENT_KEY, a);
      if (user?.id) {
        try {
          await db.updateAcademicSettings(user.id, { accent_color: a } as Record<string, unknown> as never);
        } catch (e) {
          console.error("[theme] failed to persist accent to profile", e);
        }
      }
    },
    [user],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}