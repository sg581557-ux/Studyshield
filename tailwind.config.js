/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0a0a0b", 900: "#101012", 800: "#18181b", 700: "#27272a" },
        accent: {
          50: "#eef9ff", 100: "#d9f1ff", 200: "#bae7ff", 300: "#8ad8ff", 400: "#5bc4ff",
          500: "#38b1ff", 600: "#1d96f5", 700: "#1678d8", 800: "#1a619f", 900: "#1b5280",
        },
        success: {
          50: "#edfcf3", 100: "#d3f8e0", 200: "#aaf0c5", 400: "#3ee07c", 500: "#22c55e",
          600: "#16a34a", 700: "#15803d",
        },
        warning: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 400: "#fbbf24", 500: "#f59e0b",
          600: "#d97706", 700: "#b45309",
        },
        danger: {
          50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 400: "#f87171", 500: "#ef4444",
          600: "#dc2626", 700: "#b91c1c",
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
