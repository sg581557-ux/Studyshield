import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Lightbulb, Variable, BookOpen, ChevronDown, Copy, Download, Maximize2, X, CheckCircle, CircleHelp } from 'lucide-react';
import type { Formula, FormulaSubject } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FormulaDisplay } from './LaTeXRenderer';
import { getExamById } from '../../data/exams';

interface FormulaCardProps {
  formula: Formula;
  isFavorite: boolean;
  isRevised: boolean;
  isFrequentlyUsed: boolean;
  onToggleFavorite: (id: string) => void;
  onView: (id: string) => void;
  onMarkRevised: (id: string) => void;
  onAddToFrequentlyUsed: (id: string) => void;
}

const subjectVariant: Record<FormulaSubject, 'blue' | 'accent' | 'purple' | 'warning' | 'success'> = {
  Physics: 'blue',
  Chemistry: 'accent',
  Mathematics: 'purple',
  Biology: 'success',
  'Quantitative Aptitude': 'warning',
  Accounts: 'blue',
  Economics: 'accent',
  'Business Studies': 'purple',
  'Engineering Mathematics': 'warning',
  Geography: 'success',
};

function examBadgeLabel(exams: string[] | undefined): string {
  if (!exams || exams.length === 0) return 'General';
  const firstTwo = exams.slice(0, 2).map((id) => {
    const exam = getExamById(id);
    return exam?.shortName || exam?.name || id;
  });
  return exams.length > 2 ? `${firstTwo.join(', ')} +${exams.length - 2}` : firstTwo.join(', ');
}

const difficultyVariant: Record<string, 'warning' | 'success' | 'error'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'error',
};

const importanceVariant: Record<string, 'default' | 'warning' | 'error' | 'accent'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
  critical: 'accent',
};

export function FormulaCard({
  formula,
  isFavorite,
  isRevised,
  isFrequentlyUsed,
  onToggleFavorite,
  onView,
  onMarkRevised,
  onAddToFrequentlyUsed,
}: FormulaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = formula.latex || formula.formula;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [formula]);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const card = document.getElementById(`formula-card-${formula.id}`);
      if (card) {
        const canvas = await html2canvas(card, { scale: 2, backgroundColor: '#1e293b' });
        const link = document.createElement('a');
        link.download = `${formula.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch {
      // fallback: copy formula text
      await navigator.clipboard.writeText(formula.latex || formula.formula);
    }
  }, [formula]);

  const handleFullScreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFullScreen(true);
  }, []);

  const handleCloseFullScreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFullScreen(false);
  }, []);

  const fullScreenCloseRef = useRef<HTMLButtonElement>(null);

  // Dialog semantics + focus management + Escape for the full-screen view.
  useEffect(() => {
    if (!fullScreen) return;
    const previous = document.activeElement as HTMLElement | null;
    fullScreenCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullScreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [fullScreen]);

  // Keyboard access for the card itself (Enter/Space opens the full view).
  const onCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFullScreen(true);
    }
  }, []);

  const handleAddToFrequentlyUsed = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToFrequentlyUsed(formula.id);
  }, [formula, onAddToFrequentlyUsed]);

  const cardContent = (
    <>
      {/* Top row: subject badge + favorite + revised */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={subjectVariant[formula.subject]}>{formula.subject}</Badge>
          <Badge variant={difficultyVariant[formula.difficulty]}>{formula.difficulty}</Badge>
          <Badge variant={importanceVariant[formula.importance]}>{formula.importance}</Badge>
          <Badge variant="default" className="text-xs">{examBadgeLabel(formula.exams)}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {formula.frequentlyUsed && (
            <Badge variant="warning" className="text-xs">★ Popular</Badge>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRevised(formula.id);
            }}
            className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label={isRevised ? 'Mark as not revised' : 'Mark as revised'}
            title={isRevised ? 'Mark as not revised' : 'Mark as revised'}
          >
            {isRevised ? (
              <CheckCircle size={16} className="text-success-light" />
            ) : (
              <CircleHelp size={16} className="text-gray-500 hover:text-gray-300" />
            )}
          </button>
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
      </div>

      {/* Formula name */}
      <h3 className="text-base font-semibold text-white leading-snug">{formula.name}</h3>

      {/* Topic */}
      {formula.topic && (
        <p className="text-xs text-gray-500">{formula.topic}</p>
      )}

      {/* Formula expression with LaTeX */}
      <div
        id={`formula-card-${formula.id}`}
        className="rounded-xl bg-base-950/40 border border-white/[0.06] py-4 px-3 text-center"
      >
        <FormulaDisplay formula={formula} className="text-center" displayMode={true} />
      </div>

      {/* Chapter */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <BookOpen size={13} />
        <span>{formula.chapter}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
          aria-label="Copy formula"
          title="Copy formula"
        >
          {copied ? <span className="text-success-light">✓ Copied</span> : <Copy size={13} />}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
          aria-label="Download as PNG"
          title="Download as PNG"
        >
          <Download size={13} />
        </button>
        <button
          onClick={handleFullScreen}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
          aria-label="Full screen"
          title="Full screen"
        >
          <Maximize2 size={13} />
        </button>
        <button
          onClick={handleAddToFrequentlyUsed}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
          aria-label="Add to frequently used"
          title="Add to frequently used"
        >
          <Star size={13} className={isFrequentlyUsed ? 'text-warning fill-warning' : ''} />
        </button>
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
                      {v.unit && <span className="text-gray-600">({v.unit})</span>}
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

      {/* Conditions */}
      {formula.conditions && (
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-400">Conditions:</span> {formula.conditions}
        </p>
      )}

      {/* Units */}
      {formula.units && (
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-400">Units:</span> {formula.units}
        </p>
      )}

      {/* JEE Tip */}
      {formula.jeeTip && (
        <div className="flex items-start gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3">
          <Lightbulb size={15} className="text-accent-light shrink-0 mt-0.5" />
          <p className="text-xs text-accent-light leading-relaxed">{formula.jeeTip}</p>
        </div>
      )}

      {/* Common Mistakes */}
      {formula.commonMistakes && formula.commonMistakes.length > 0 && (
        <div className="rounded-xl bg-error/10 border border-error/20 p-3">
          <p className="text-xs font-medium text-error-light mb-1.5">Common Mistakes:</p>
          <ul className="flex flex-col gap-1">
            {formula.commonMistakes.map((m, i) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="text-error-light">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Memory Trick */}
      {formula.memoryTrick && (
        <div className="rounded-xl bg-purple/10 border border-purple/20 p-3">
          <p className="text-xs font-medium text-purple-light mb-1">Memory Trick:</p>
          <p className="text-xs text-gray-300">{formula.memoryTrick}</p>
        </div>
      )}

      {/* Tags */}
      {formula.tags && formula.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {formula.tags.slice(0, 6).map((tag) => (
            <Badge key={tag} variant="default" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <GlassCard
        hover
        className="p-5 flex flex-col gap-3 cursor-pointer relative group"
        onClick={() => onView(formula.id)}
        onKeyDown={onCardKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View ${formula.name}`}
        layout
      >
        {cardContent}
      </GlassCard>

      {/* Full-screen overlay */}
      <AnimatePresence>
        {fullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={handleCloseFullScreen}
            role="dialog"
            aria-modal="true"
            aria-label={`${formula.name} details`}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassCard className="p-8 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{formula.name}</h2>
                  <button
                    ref={fullScreenCloseRef}
                    onClick={handleCloseFullScreen}
                    aria-label="Close formula details"
                    className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="text-center py-6">
                  <FormulaDisplay formula={formula} className="text-3xl" displayMode={true} />
                </div>

                {formula.variables.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {formula.variables.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="font-mono text-accent-light font-semibold min-w-[3rem]">{v.symbol}</span>
                        <span className="text-gray-300">{v.description}</span>
                        {v.unit && <span className="text-gray-500">({v.unit})</span>}
                      </div>
                    ))}
                  </div>
                )}

                {formula.description && (
                  <p className="text-sm text-gray-300">{formula.description}</p>
                )}

                {formula.conditions && (
                  <p className="text-sm text-gray-400">
                    <span className="font-medium text-gray-300">Conditions:</span> {formula.conditions}
                  </p>
                )}

                {formula.notes && (
                  <p className="text-sm text-gray-400">{formula.notes}</p>
                )}

                {formula.jeeTip && (
                  <div className="flex items-start gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3">
                    <Lightbulb size={15} className="text-accent-light shrink-0 mt-0.5" />
                    <p className="text-sm text-accent-light">{formula.jeeTip}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="primary" size="sm" onClick={handleCopy}>
                    <Copy size={14} /> Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    <Download size={14} /> Download PNG
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
