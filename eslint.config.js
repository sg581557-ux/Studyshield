import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.tsbuildinfo", "wrangler.toml"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React 18 data-loading idioms (setState after async fetch / syncing
      // form state from a profile) are legitimate here; keep the rules on as
      // warnings so they stay visible without blocking the build.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          // Context/hook files legitimately export both a provider component
          // and consumer hooks (standard React context pattern). Fast refresh
          // still works — editing the provider remounts the subtree anyway.
          allowExportNames: [
            "useAuth",
            "authErrorMessage",
            "useToast",
            "useFormulaVault",
            "useTheme",
            "ACCENTS",
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.deno },
    },
    rules: {
      // Deno edge runtime with loose supabase-js generics — pragmatic `any`
      // usage is intentional and reviewable.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
