import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MultiSelectProps { options: string[]; values: string[]; onChange: (v: string[]) => void; placeholder?: string; }
export function MultiSelect({ options, values, onChange, placeholder = 'Select...' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); } }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className={cn('w-full px-4 py-2.5 rounded-xl bg-base-800/60 border text-left text-sm transition-all flex items-center justify-between min-h-[44px]', open ? 'border-accent/50 bg-base-800' : 'border-white/[0.06] hover:border-white/[0.1]')}>
        <div className="flex flex-wrap gap-1 flex-1">
          {values.length === 0 ? <span className="text-gray-500">{placeholder}</span> : values.slice(0, 3).map((v) => <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent-light text-xs border border-accent/20">{v}<span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); toggle(v); }} className="hover:text-white"><X size={10} /></span></span>)}
          {values.length > 3 && <span className="text-xs text-gray-500 self-center">+{values.length - 3}</span>}
        </div>
        <ChevronDown size={16} className={cn('text-gray-500 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute z-50 mt-1 w-full glass p-2 max-h-60 overflow-hidden flex flex-col">
            <div className="relative mb-2"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-base-800/60 border border-white/[0.06] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent/40" /></div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
              {filtered.length === 0 ? <p className="text-sm text-gray-500 text-center py-3">No results</p> : filtered.map((opt) => {
                const sel = values.includes(opt);
                return <button key={opt} type="button" onClick={() => toggle(opt)} className={cn('flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors', sel ? 'bg-accent/10 text-accent-light' : 'text-gray-300 hover:bg-white/[0.04]')}>{opt}{sel && <Check size={14} />}</button>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
