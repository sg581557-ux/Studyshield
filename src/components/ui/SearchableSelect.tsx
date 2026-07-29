import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchableSelectProps { options: string[]; value: string; onChange: (v: string) => void; placeholder?: string; exclude?: string[]; }
export function SearchableSelect({ options, value, onChange, placeholder = 'Select...', exclude = [] }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const filtered = options.filter((o) => !exclude.includes(o) && o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className={cn('w-full px-4 py-2.5 rounded-xl bg-base-800/60 border text-left text-sm transition-all flex items-center justify-between', open ? 'border-accent/50 bg-base-800' : 'border-white/[0.06] hover:border-white/[0.1]')}>
        <span className={value ? 'text-gray-200' : 'text-gray-500'}>{value || placeholder}</span>
        <ChevronDown size={16} className={cn('text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute z-50 mt-1 w-full glass p-2 max-h-60 overflow-hidden flex flex-col">
            <div className="relative mb-2"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-base-800/60 border border-white/[0.06] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent/40" /></div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
              {filtered.length === 0 ? <p className="text-sm text-gray-500 text-center py-3">No results</p> : filtered.map((opt) => (
                <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); setSearch(''); }} className={cn('flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors', value === opt ? 'bg-accent/10 text-accent-light' : 'text-gray-300 hover:bg-white/[0.04]')}>
                  {opt}{value === opt && <Check size={14} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
