import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Eye, ArrowRight, X, Lightbulb } from 'lucide-react';
import type { Formula } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

interface QuickRevisionModeProps {
  formulas: Formula[];
  onExit: () => void;
  onView: (id: string) => void;
}

export function QuickRevisionMode({ formulas, onExit, onView }: QuickRevisionModeProps) {
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * formulas.length));
  const [showAnswer, setShowAnswer] = useState(false);

  const next = useCallback(() => {
    if (formulas.length <= 1) {
      setShowAnswer(false);
      return;
    }
    let nextIndex = Math.floor(Math.random() * formulas.length);
    if (nextIndex === currentIndex) nextIndex = (nextIndex + 1) % formulas.length;
    setCurrentIndex(nextIndex);
    setShowAnswer(false);
  }, [formulas.length, currentIndex]);

  if (formulas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <GlassCard className="p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
          <p className="text-gray-400">No formulas available for revision.</p>
          <Button variant="secondary" onClick={onExit}>
            <X size={16} /> Close
          </Button>
        </GlassCard>
      </motion.div>
    );
  }

  const current = formulas[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <GlassCard className="w-full max-w-2xl p-6 sm:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shuffle size={20} className="text-accent-light" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Revision</h2>
              <p className="text-xs text-gray-500">Random formula practice</p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
            aria-label="Exit quick revision"
          >
            <X size={20} />
          </button>
        </div>

        {/* Counter */}
        <div className="text-center">
          <span className="text-sm font-mono text-gray-400">
            {currentIndex + 1} / {formulas.length}
          </span>
        </div>

        {/* Card body with flip/slide animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 50, rotateY: 15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -50, rotateY: -15 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex flex-col gap-4"
          >
            {/* Subject badge */}
            <div className="flex justify-center">
              <span className="text-xs font-medium text-accent-light bg-accent/10 border border-accent/20 rounded-full px-3 py-1">
                {current.subject}
              </span>
            </div>

            {/* Question prompt or name */}
            {!showAnswer ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-2">Can you recall this formula?</p>
                <h3 className="text-xl font-semibold text-white">{current.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{current.chapter}</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4"
              >
                {/* Name */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white">{current.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{current.chapter}</p>
                </div>

                {/* Formula expression */}
                <div className="rounded-xl bg-base-950/40 border border-white/[0.06] py-6 px-4 text-center">
                  <p className="font-mono text-2xl text-accent-light tracking-wide break-words">
                    {current.formula}
                  </p>
                </div>

                {/* Variables */}
                {current.variables.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variables</p>
                    <ul className="flex flex-col gap-1">
                      {current.variables.map((v, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="font-mono text-accent-light font-semibold min-w-[2.5rem]">{v.symbol}</span>
                          <span className="text-gray-400">{v.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* JEE Tip */}
                {current.jeeTip && (
                  <div className="flex items-start gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3">
                    <Lightbulb size={15} className="text-accent-light shrink-0 mt-0.5" />
                    <p className="text-xs text-accent-light leading-relaxed">{current.jeeTip}</p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!showAnswer ? (
            <Button variant="primary" size="md" onClick={() => setShowAnswer(true)} className="flex-1">
              <Eye size={16} />
              Show Answer
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="md"
              onClick={() => onView(current.id)}
              className="flex-1"
            >
              View Full Details
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={next} className="flex-1">
            <ArrowRight size={16} />
            Next Formula
          </Button>
          <Button variant="ghost" size="md" onClick={onExit} className="sm:w-auto">
            <X size={16} />
            Exit
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
