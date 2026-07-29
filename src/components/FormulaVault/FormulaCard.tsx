import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Lightbulb, Variable, BookOpen, ChevronDown } from 'lucide-react';
import type { Formula, FormulaSubject } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface FormulaCardProps {
  formula: Formula;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onView: (id: string) => void;
}

const subjectVariant: Record<FormulaSubject, 'blue' | 'accent' | 'purple'> = {
  Physics: 'blue',
  Chemistry: 'accent',
  Mathematics: 'purple',
};

export function FormulaCard({ formula, isFavorite, onToggleFavorite, onView }: FormulaCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard
      hover
      className="p-5 flex flex-col gap-3 cursor-pointer relative group"
      onClick={() => onView(formula.id)}
      layout
    >
      {/* Top row: subject badge + favorite */}
      <div className="flex items-start justify-between gap-2">
        <Badge variant={subjectVariant[formula.subject]}>{formula.subject}</Badge>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(formula.id);
          }}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <motion.span animate={{ scale: isFavorite ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
            <Star
              size={18}
              className={isFavorite ? 'text-warning fill-warning' : 'text-gray-500 hover:text-gray-300'}
            />
          </motion.span>
        </button>
      </div>

      {/* Formula name */}
      <h3 className="text-base font-semibold text-white leading-snug">{formula.name}</h3>

      {/* Formula expression */}
      <div className="rounded-xl bg-base-950/40 border border-white/[0.06] py-4 px-3 text-center">
        <p className="font-mono text-lg text-accent-light tracking-wide break-words">{formula.formula}</p>
      </div>

      {/* Chapter */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <BookOpen size={13} />
        <span>{formula.chapter}</span>
      </div>

      {/* Variables toggle */}
      {formula.variables.length > 0 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((p) => !p);
            }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors w-fit"
          >
            <Variable size={14} className="text-accent-light" />
            <span>Variables ({formula.variables.length})</span>
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <ul className="flex flex-col gap-1.5 pt-1">
                  {formula.variables.map((v, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-mono text-accent-light font-semibold min-w-[2rem]">{v.symbol}</span>
                      <span className="text-gray-400">{v.description}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Notes */}
      {formula.notes && (
        <p className="text-xs text-gray-400 leading-relaxed border-l-2 border-white/[0.08] pl-3">{formula.notes}</p>
      )}

      {/* JEE Tip */}
      {formula.jeeTip && (
        <div className="flex items-start gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3">
          <Lightbulb size={15} className="text-accent-light shrink-0 mt-0.5" />
          <p className="text-xs text-accent-light leading-relaxed">{formula.jeeTip}</p>
        </div>
      )}

      {/* View button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onView(formula.id);
        }}
        className="self-start mt-1"
      >
        View Details
      </Button>
    </GlassCard>
  );
}
