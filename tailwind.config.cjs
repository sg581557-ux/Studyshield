/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        ink: { 50: "#f6f7f9", 100: "#eceef2", 200: "#d5d9e2", 300: "#b1b8c8", 400: "#878fa6", 500: "#67708a", 600: "#525a70", 700: "#43495b", 800: "#3a3f4d", 900: "#252833", 950: "#191b22" },
        accent: { 50: "#eff6ff", 100: "#dbe8fe", 200: "#bfd7fe", 300: "#93bbfd", 400: "#6094fa", 500: "#3b76f6", 600: "#2559eb", 700: "#1d47d8", 800: "#1e3caf", 900: "#1e3792" },
        success: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a6f4d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b" },
        warning: { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f" },
        danger: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d" },
      },
    },
  },
  plugins: [],
};
