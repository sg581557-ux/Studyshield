import { useId, useState } from "react";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: React.ReactNode;
}

export function PasswordInput({ label, error, hint, id, className, ...props }: PasswordInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="input-label">{label}</span>}
      <div className="relative">
        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={`input-base pl-9 pr-10 ${error ? "border-red-500/60" : ""} ${className ?? ""}`}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
      {hint && <div className="mt-1">{hint}</div>}
    </label>
  );
}

export const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: "length", label: "Minimum 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /\d/.test(p) },
];

export function passwordMeetsRequirements(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="space-y-1 rounded-xl bg-white/5 border border-white/10 p-2.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className="flex items-center gap-2 text-xs">
            {ok ? (
              <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={ok ? "text-green-400" : "text-slate-400"}>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
