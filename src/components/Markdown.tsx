import { Component, memo, useMemo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "../lib/utils";

// remark-math only treats `$$...$$` as a DISPLAY equation when the
// delimiters sit on their own lines. Models often emit `$$v^2=u^2+2as$$`
// inside a paragraph, which would silently render as inline math (no
// wrapping, cramped fractions). Normalize those into proper blocks.
function normalizeMathDelimiters(text: string): string {
  return text.replace(/\$\$\s*([^$\n]+?)\s*\$\$/g, (_m, inner: string) => `$$\n${inner.trim()}\n$$`);
}

// KaTeX never throws when `throwOnError` is false — malformed math renders
// as raw source in the error color instead. This boundary is a second
// safety net: if react-markdown or rehype-katex itself ever throws, we
// fall back to plain-text output so the conversation never breaks.
class MarkdownBoundary extends Component<{ children: ReactNode; raw: string }, { failed: boolean }> {
  state: { failed: boolean } = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[Markdown] parse failed, falling back to raw text", err);
  }
  render() {
    if (this.state.failed) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{this.props.raw}</p>;
    }
    return this.props.children;
  }
}

const components: Components = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-white mt-4 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-white mt-3 mb-1.5 first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  a: ({ href, children }) => {
    const safeHref = href && /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(href) ? href : '#';
    const isExternal = /^https?:\/\//i.test(safeHref);
    return (
      <a
        href={safeHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-accent-400 underline decoration-accent-400/40 underline-offset-2 break-all"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5 marker:text-accent-400/70">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5 marker:text-accent-400/70">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent-500/50 pl-3 my-2 text-slate-400 italic">{children}</blockquote>
  ),
  hr: () => <hr className="border-white/10 my-3" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
  tr: ({ children }) => <tr className="odd:bg-transparent">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap border-b border-white/10">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-1.5 border-b border-white/5 align-top">{children}</td>,
  code: ({ children }) => (
    <code className="font-mono text-[0.85em] bg-white/10 rounded px-1.5 py-0.5 text-accent-light break-all">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-ink-950 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto whitespace-pre leading-relaxed text-xs text-slate-300">
      {children}
    </pre>
  ),
  input: ({ checked, disabled }) =>
    disabled ? (
      <input type="checkbox" checked={checked} readOnly disabled className="accent-accent-500 mr-1.5 align-middle" />
    ) : null,
};

export interface MarkdownProps {
  text: string;
  className?: string;
}

/**
 * Renders Echo responses as polished Markdown + LaTeX.
 *
 * - `remark-gfm` — tables, task lists, strikethrough, autolinks.
 * - `remark-math` + `rehype-katex` — `$...$` inline and `$$...$$` display
 *   math rendered by KaTeX (CSS overrides in index.css handle theming,
 *   wrapping and dark mode).
 * - Invalid LaTeX renders as raw text in the error color (`throwOnError:
 *   false`), and any parser crash falls back to plain text — never a crash.
 */
export const Markdown = memo(function Markdown({ text, className }: MarkdownProps) {
  const normalized = useMemo(() => normalizeMathDelimiters(text), [text]);
  return (
    <MarkdownBoundary raw={text}>
      <div className={cn("markdown-body min-w-0 text-sm leading-relaxed break-words", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: "htmlAndMathml", errorColor: "#ef4444" }]]}
          components={components}
        >
          {normalized}
        </ReactMarkdown>
      </div>
    </MarkdownBoundary>
  );
});
