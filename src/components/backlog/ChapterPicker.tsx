import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Check, CornerDownLeft, BookOpen } from "lucide-react";
import { cn } from "../../lib/utils";
import { searchChapters } from "../../lib/backlogMeta";

interface ChapterPickerProps {
  chapters: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export function ChapterPicker({ chapters, value, onChange, placeholder = "Search chapter…", allowCustom = true }: ChapterPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => searchChapters(query, chapters, 8), [query, chapters]);
  const isExact = suggestions[0]?.toLowerCase() === query.trim().toLowerCase();
  const showCustom = allowCustom && query.trim().length > 0 && !isExact;

  useEffect(() => {
    setQuery(value);
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [value]);

  function pick(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length + (showCustom ? 1 : 0) - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = showCustom && highlight === suggestions.length ? query.trim() : suggestions[highlight];
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 focus:bg-white/[0.07]"
        />
        {value && (
          <button type="button" onClick={() => pick("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300">
            Clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (query.trim().length > 0 || suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1.5 w-full rounded-xl bg-ink-800 border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {suggestions.length === 0 && !showCustom && (
                <p className="px-3 py-2.5 text-sm text-slate-500 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> No matching chapters
                </p>
              )}
              {suggestions.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => pick(name)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    i === highlight ? "bg-accent-600/15 text-accent-300" : "text-slate-300",
                  )}
                >
                  <span className="truncate">{name}</span>
                  {name === value && <Check className="w-4 h-4 shrink-0 text-accent-400" />}
                </button>
              ))}
              {showCustom && (
                <button
                  type="button"
                  onClick={() => pick(query.trim())}
                  onMouseEnter={() => setHighlight(suggestions.length)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm border-t border-white/5 transition-colors",
                    highlight === suggestions.length ? "bg-white/10 text-white" : "text-slate-400",
                  )}
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  Use <span className="text-slate-200 font-medium truncate">"{query.trim()}"</span> as chapter
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
