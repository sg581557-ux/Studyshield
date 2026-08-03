import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Eye, ArrowRight, X, Lightbulb, Filter, Target, Play, Settings2 } from 'lucide-react';
import type { Formula, FormulaSubject } from '../../types';
import { getExamById } from '../../data/exams';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Select, Label } from '../ui/Input';
import { FormulaDisplay } from './LaTeXRenderer';

type RevisionScope = 'all' | 'subject' | 'chapter' | 'subject-chapter';
type Phase = 'setup' | 'revision';

interface QuickRevisionModeProps {
  formulas: Formula[];
  onExit: () => void;
  onView: (id: string) => void;
  initialSubject?: FormulaSubject | 'All';
  initialChapter?: string | 'All';
  /** User's target exam id from the profile — used as the default revision scope. */
  userExamId?: string | null;
}

const SCOPE_OPTIONS: { value: RevisionScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'subject', label: 'Subject only' },
  { value: 'chapter', label: 'Chapter only' },
  { value: 'subject-chapter', label: 'Subject + Chapter' },
];

function initialScope(subject: FormulaSubject | 'All', chapter: string | 'All'): RevisionScope {
  if (subject !== 'All' && chapter !== 'All') return 'subject-chapter';
  if (subject !== 'All') return 'subject';
  if (chapter !== 'All') return 'chapter';
  return 'all';
}

export function QuickRevisionMode({
  formulas,
  onExit,
  onView,
  initialSubject = 'All',
  initialChapter = 'All',
  userExamId = null,
}: QuickRevisionModeProps) {
  // Exam context: defaults to the user's target exam; "All Exams" opt-out.
  const [allExams, setAllExams] = useState(false);
  const [scope, setScope] = useState<RevisionScope>(() => initialScope(initialSubject, initialChapter));
  const [subject, setSubject] = useState<FormulaSubject | 'All'>(initialSubject);
  const [chapter, setChapter] = useState<string | 'All'>(initialChapter);
  const [phase, setPhase] = useState<Phase>('setup');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const examId = allExams ? null : userExamId;
  const examName = examId ? getExamById(examId)?.name ?? examId : null;

  // Base deck = formulas relevant to the user's exam (unless All Exams).
  const examPool = useMemo(
    () => (examId ? formulas.filter((f) => (f.exams || []).includes(examId)) : formulas),
    [formulas, examId],
  );

  const subjects = useMemo(
    () => [...new Set(examPool.map((f) => f.subject))].sort(),
    [examPool],
  );

  const chapters = useMemo(() => {
    const source = subject !== 'All' ? examPool.filter((f) => f.subject === subject) : examPool;
    return [...new Set(source.map((f) => f.chapter))].sort((a, b) => a.localeCompare(b));
  }, [examPool, subject]);

  // Revision deck — recomputed live whenever exam/subject/chapter filters change.
  const pool = useMemo(() => {
    let list = examPool;
    if ((scope === 'subject' || scope === 'subject-chapter') && subject !== 'All') {
      list = list.filter((f) => f.subject === subject);
    }
    if ((scope === 'chapter' || scope === 'subject-chapter') && chapter !== 'All') {
      list = list.filter((f) => f.chapter === chapter);
    }
    return list;
  }, [examPool, scope, subject, chapter]);

  // Keep the deck position valid whenever the pool changes.
  useEffect(() => {
    setCurrentIndex(pool.length > 0 ? Math.min(currentIndex, pool.length - 1) : 0);
    setShowAnswer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const handleScopeChange = (s: RevisionScope) => {
    setScope(s);
    if (s === 'all') {
      setSubject('All');
      setChapter('All');
    } else if (s === 'subject') {
      setChapter('All');
    } else if (s === 'chapter') {
      setSubject('All');
    }
  };

  // Generate the revision session from the current exam + subject + chapter.
  const startRevision = () => {
    if (pool.length === 0) return;
    setCurrentIndex(Math.floor(Math.random() * pool.length));
    setShowAnswer(false);
    setPhase('revision');
  };

  const next = useCallback(() => {
    if (pool.length <= 1) {
      setShowAnswer(false);
      return;
    }
    let nextIndex = Math.floor(Math.random() * pool.length);
    if (nextIndex === currentIndex) nextIndex = (nextIndex + 1) % pool.length;
    setCurrentIndex(nextIndex);
    setShowAnswer(false);
  }, [pool.length, currentIndex]);

  const activeChips: string[] = [];
  if (examId && examName) activeChips.push(`Exam: ${examName}`);
  if (!examId) activeChips.push('Exam: All Exams');
  if ((scope === 'subject' || scope === 'subject-chapter') && subject !== 'All') {
    activeChips.push(`Subject: ${subject}`);
  }
  if ((scope === 'chapter' || scope === 'subject-chapter') && chapter !== 'All') {
    activeChips.push(`Chapter: ${chapter}`);
  }

  // Clamp so a pool shrink can never index out of bounds on the intermediate frame.
  const safeIndex = pool.length > 0 ? Math.min(currentIndex, pool.length - 1) : 0;
  const current = pool[safeIndex];

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

        {/* Filter panel */}
        <div className="flex flex-col gap-3 rounded-xl bg-base-950/40 border border-white/[0.06] p-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter size={14} className="text-accent-light" />
            <span className="font-medium">Revision deck filters</span>
          </div>

          {/* Exam context — follows the profile exam, no need to re-select it */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Target size={14} className={examId ? 'text-accent-light' : 'text-gray-600'} />
              {examId ? (
                <span className="text-gray-300">
                  Your exam: <span className="font-medium text-accent-light">{examName}</span>
                </span>
              ) : (
                <span className="text-gray-500">
                  {allExams ? 'All Exams selected' : 'No exam set in your profile — using all formulas'}
                </span>
              )}
            </div>
            <Button
              variant={allExams ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setAllExams((v) => !v)}
              title="Switch between your target exam and all formulas"
            >
              {allExams ? 'Using: All Exams' : 'Switch to All Exams'}
            </Button>
          </div>

          {/* Scope selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCOPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={scope === opt.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleScopeChange(opt.value)}
                className="w-full"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <Label>Subject</Label>
              <Select
                value={subject}
                disabled={scope === 'all' || scope === 'chapter' || subjects.length === 0}
                onChange={(e) => setSubject(e.target.value as FormulaSubject | 'All')}
              >
                <option value="All">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Chapter</Label>
              <Select
                value={chapter}
                disabled={scope === 'all' || scope === 'subject' || chapters.length === 0}
                onChange={(e) => setChapter(e.target.value)}
              >
                <option value="All">All Chapters</option>
                {chapters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          <div className="flex flex-wrap items-center gap-2 min-h-[1.5rem]">
            {activeChips.length === 0 ? (
              <span className="text-xs text-gray-600">All formulas</span>
            ) : (
              activeChips.map((chip) => (
                <span
                  key={chip}
                  className="text-xs font-medium text-accent-light bg-accent/10 border border-accent/20 rounded-full px-3 py-1"
                >
                  {chip}
                </span>
              ))
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {pool.length} formula{pool.length !== 1 ? 's' : ''} in deck
            </span>
          </div>
        </div>

        {phase === 'setup' ? (
          /* ===== Setup: pick filters, then generate the session ===== */
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            {pool.length === 0 ? (
              <>
                <p className="text-gray-400">No formulas match the selected filters.</p>
                <Button variant="secondary" onClick={() => { setAllExams(true); handleScopeChange('all'); }}>
                  Show all formulas
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 max-w-md">
                  Your session will be generated from your target exam{examId ? ` (${examName})` : ''}
                  {scope !== 'all' ? ' and the filters above' : ''}.
                </p>
                <Button variant="primary" size="md" onClick={startRevision} className="min-w-[200px]">
                  <Play size={16} />
                  Start Revision
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Counter */}
            <div className="text-center">
              <span className="text-sm font-mono text-gray-400">
                {safeIndex + 1} / {pool.length}
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

                    {/* Formula expression with LaTeX */}
                    <div className="rounded-xl bg-base-950/40 border border-white/[0.06] py-6 px-4 text-center">
                      <FormulaDisplay formula={current} className="text-2xl" displayMode={true} />
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
              <Button variant="ghost" size="md" onClick={() => setPhase('setup')} className="sm:w-auto" title="Adjust filters and restart">
                <Settings2 size={16} />
                Filters
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    </motion.div>
  );
}
