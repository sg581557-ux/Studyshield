import { memo, useMemo } from 'react';
import katex from 'katex';

/**
 * Heuristic: a string is likely LaTeX if it contains backslash commands
 * (`\frac`), sub/superscripts (`^`, `_`), or brace groups (`{...}`) —
 * markers that plain-text formulas (e.g. "F = ma") rarely contain.
 * Used to decide whether user-entered formula-sheet strings should be
 * rendered by KaTeX or shown as plain text.
 */
function isLatexString(value: string): boolean {
  return /\\[a-zA-Z]+|\^|_|\{[^{}]*\}/.test(value);
}

/**
 * KaTeX options.
 *
 * - `throwOnError: false` — invalid LaTeX renders in the error color
 *   instead of throwing, so a malformed formula never crashes the UI.
 * - `strict: false` — tolerates common LaTeX input habits.
 * - `output: 'htmlAndMathml'` — emits both HTML and MathML for
 *   accessibility and screen readers.
 *
 * NOTE: do NOT add self-referencing macros here (e.g.
 * `'\text': '\text'`). KaTeX expands macros recursively, so a macro that
 * expands to itself fails on every formula that uses it (which surfaces
 * as raw LaTeX rendered in the error color).
 */
const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false,
  output: 'htmlAndMathml',
  trust: false,
  errorColor: '#ef4444', // overridden by `.katex-error` rules in index.css
} as const;

/**
 * Bounded HTML cache so thousands of formula cards don't re-run KaTeX's
 * parser on every re-render (filtering, tab switches, re-mounts, …).
 */
const CACHE_LIMIT = 2000;
const htmlCache = new Map<string, string>();

function renderLatex(latex: string, displayMode: boolean): string {
  const key = `${displayMode ? 'D' : 'I'}\u0000${latex}`;
  const cached = htmlCache.get(key);
  if (cached !== undefined) return cached;

  let html: string;
  try {
    html = katex.renderToString(latex, { ...KATEX_OPTIONS, displayMode });
  } catch {
    html = ''; // fall back to raw text below — never crash the UI
  }

  if (htmlCache.size >= CACHE_LIMIT) {
    const oldest = htmlCache.keys().next().value;
    if (oldest !== undefined) htmlCache.delete(oldest);
  }
  htmlCache.set(key, html);
  return html;
}

interface LaTeXRendererProps {
  latex: string;
  className?: string;
  displayMode?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Renders a LaTeX math string using KaTeX.
 *
 * Parsing is cached (bounded LRU-style map) and the component is memoized
 * on `latex`/`displayMode`, so thousands of formulas stay fast. Invalid or
 * unparseable LaTeX renders as plain text instead of crashing.
 */
export const LaTeXRenderer = memo(function LaTeXRenderer({
  latex,
  className = '',
  displayMode = true,
}: LaTeXRendererProps) {
  const html = useMemo(() => renderLatex(latex, displayMode), [latex, displayMode]);

  if (!html) {
    // Safety net: KaTeX itself threw (or produced nothing) — show the
    // source as readable text rather than crashing the UI.
    return <span className={`${className} font-mono break-words`}>{latex}</span>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});

interface FormulaDisplayProps {
  formula: { latex?: string; formula: string };
  className?: string;
  displayMode?: boolean;
}

/**
 * Memoized formula display.
 * Prefers the `latex` field rendered by KaTeX; falls back to the
 * plain-text `formula` field only when no LaTeX source exists. If the
 * plain-text field itself looks like LaTeX (e.g. user-created formulas
 * stored directly in `formula`), it is rendered through KaTeX too.
 */
export const FormulaDisplay = memo(function FormulaDisplay({
  formula,
  className,
  displayMode = true,
}: FormulaDisplayProps) {
  const latexSource = formula.latex || (isLatexString(formula.formula) ? formula.formula : '');

  if (latexSource) {
    return <LaTeXRenderer latex={latexSource} className={className} displayMode={displayMode} />;
  }
  // No LaTeX source — render plain text in a styled span.
  return (
    <span className={`font-mono text-lg text-accent-light tracking-wide break-words ${className || ''}`}>
      {formula.formula}
    </span>
  );
});

interface SmartFormulaProps {
  value: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * Auto-detecting renderer for free-form user-entered formula strings.
 *
 * User-created sheets (and legacy pages) store formulas as plain strings
 * that may or may not be LaTeX. If the string looks like LaTeX (contains
 * `\`, `^`, `_`, or brace groups), render it through KaTeX. Otherwise
 * fall back to plain styled text so "F = ma" is never mangled by KaTeX.
 */
export const SmartFormula = memo(function SmartFormula({
  value,
  className,
  displayMode = false,
}: SmartFormulaProps) {
  if (isLatexString(value)) {
    return <LaTeXRenderer latex={value} className={className} displayMode={displayMode} />;
  }
  return (
    <span className={`font-mono text-sm text-accent-light tracking-wide break-words ${className || ''}`}>
      {value}
    </span>
  );
});
