/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0a0a0b", 900: "#101012", 800: "#18181b", 700: "#27272a" },
        base: { 800: "#18181b", 900: "#101012" },
        accent: {
          DEFAULT: "rgb(var(--accent-500) / <alpha-value>)",
          light: "rgb(var(--accent-300) / <alpha-value>)",
          50: "rgb(var(--accent-50) / <alpha-value>)",
          100: "rgb(var(--accent-100) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          700: "rgb(var(--accent-700) / <alpha-value>)",
          800: "rgb(var(--accent-800) / <alpha-value>)",
          900: "rgb(var(--accent-900) / <alpha-value>)",
        },
        success: {
          DEFAULT: "#22c55e", light: "#aaf0c5",
          50: "#edfcf3", 100: "#d3f8e0", 200: "#aaf0c5", 400: "#3ee07c", 500: "#22c55e",
          600: "#16a34a", 700: "#15803d",
        },
        warning: {
          DEFAULT: "#f59e0b", light: "#fde68a",
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 400: "#fbbf24", 500: "#f59e0b",
          600: "#d97706", 700: "#b45309",
        },
        danger: {
          DEFAULT: "#ef4444", light: "#fecaca",
          50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 400: "#f87171", 500: "#ef4444",
          600: "#dc2626", 700: "#b91c1c",
        },
        error: {
          DEFAULT: "#ef4444", light: "#fecaca",
        },
        purple: {
          DEFAULT: "#a855f7", light: "#d8b4fe",
        },
        slate: { 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
