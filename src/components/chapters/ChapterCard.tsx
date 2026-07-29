import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, RotateCcw, ExternalLink } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Textarea, Label, Select } from '../ui/Input';
import { getResourceForChapter } from '../../data/resources';
import type { ChapterProgress, LectureStatus, TheoryStatus, ModuleProgress, DppStatus, PyqStatus, NotesStatus, FormulaSheetStatus, RevisionStatus, DifficultyLevel, ChapterResource } from '../../types';

interface ChapterCardProps {
  subject: string;
  chapter: string;
  progress: ChapterProgress;
  examGoal: string;
  onUpdate: (patch: Partial<ChapterProgress>) => void;
  onReset: () => void;
}



const LECTURE_OPTIONS: { value: LectureStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
];

const THEORY_OPTIONS: { value: TheoryStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
];

const MODULE_OPTIONS: { value: ModuleProgress; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'ex1-done', label: 'Exercise 1 Done' },
  { value: 'ex2-done', label: 'Exercise 2 Done' },
  { value: 'ex3-done', label: 'Exercise 3 Done' },
  { value: 'fully-done', label: 'Fully Done' },
];

const DPP_OPTIONS: { value: DppStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
];

const PYQ_OPTIONS: { value: PyqStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
];

const NOTES_OPTIONS: { value: NotesStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
];

const FORMULA_OPTIONS: { value: FormulaSheetStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
];

const REVISION_OPTIONS: { value: RevisionStatus; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'once', label: 'Once' },
  { value: 'multiple', label: 'Multiple Times' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

function StatusSelect<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

export function ChapterCard({ subject, chapter, progress, examGoal, onUpdate, onReset }: ChapterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const resource: ChapterResource | undefined = getResourceForChapter(subject, chapter, examGoal);

  const trackingFields = [
    { label: 'Lecture', key: 'lectureStatus' as const, options: LECTURE_OPTIONS, value: progress.lectureStatus },
    { label: 'Theory', key: 'theoryStatus' as const, options: THEORY_OPTIONS, value: progress.theoryStatus },
    { label: 'Module', key: 'moduleProgress' as const, options: MODULE_OPTIONS, value: progress.moduleProgress },
    { label: 'DPP', key: 'dppStatus' as const, options: DPP_OPTIONS, value: progress.dppStatus },
    { label: 'PYQ', key: 'pyqStatus' as const, options: PYQ_OPTIONS, value: progress.pyqStatus },
    { label: 'Notes', key: 'notesStatus' as const, options: NOTES_OPTIONS, value: progress.notesStatus },
    { label: 'Formula Sheet', key: 'formulaSheetStatus' as const, options: FORMULA_OPTIONS, value: progress.formulaSheetStatus },
    { label: 'Revision', key: 'revisionStatus' as const, options: REVISION_OPTIONS, value: progress.revisionStatus },
  ];

  const statusVariant = progress.chapterStatus === 'completed' ? 'success' : progress.chapterStatus === 'in-progress' ? 'accent' : progress.chapterStatus === 'needs-revision' ? 'warning' : 'default';

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.div animate={{ rotate: expanded ? 0 : -90 }} className="text-gray-500">
              <ChevronDown size={18} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{chapter}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusVariant}>{progress.chapterStatus.replace('-', ' ')}</Badge>
                <span className="text-xs text-gray-500">{progress.completionPercentage}% complete</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-20">
              <ProgressBar percentage={progress.completionPercentage} height="h-1.5" />
            </div>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="p-4 pt-0 space-y-4">
              {/* Tracking fields */}
              <div className="grid grid-cols-2 gap-3">
                {trackingFields.map((field) => (
                  <div key={field.key}>
                    <Label className="text-xs">{field.label}</Label>
                    <StatusSelect value={field.value} options={field.options} onChange={(v) => onUpdate({ [field.key]: v })} />
                  </div>
                ))}
              </div>

              {/* Confidence slider */}
              <div>
                <Label className="text-xs">Confidence: {progress.confidenceLevel}/10</Label>
                <input type="range" min={1} max={10} value={progress.confidenceLevel} onChange={(e) => onUpdate({ confidenceLevel: Number(e.target.value) })} className="w-full accent-accent" />
              </div>

              {/* Difficulty + Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Difficulty</Label>
                  <StatusSelect value={progress.difficultyLevel} options={DIFFICULTY_OPTIONS} onChange={(v) => onUpdate({ difficultyLevel: v })} />
                </div>
                <div>
                  <Label className="text-xs">Last Studied</Label>
                  <input type="date" value={progress.lastStudiedDate} onChange={(e) => onUpdate({ lastStudiedDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-base-800/60 border border-white/[0.06] text-sm text-gray-200 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <Label className="text-xs">Next Revision</Label>
                  <input type="date" value={progress.nextRevisionDate} onChange={(e) => onUpdate({ nextRevisionDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-base-800/60 border border-white/[0.06] text-sm text-gray-200 focus:outline-none focus:border-accent/50" />
                </div>
              </div>

              {/* Weak / Strong Topics */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Weak Topics</Label>
                  <Textarea rows={2} value={progress.weakTopics} onChange={(e) => onUpdate({ weakTopics: e.target.value })} placeholder="Weak areas..." />
                </div>
                <div>
                  <Label className="text-xs">Strong Topics</Label>
                  <Textarea rows={2} value={progress.strongTopics} onChange={(e) => onUpdate({ strongTopics: e.target.value })} placeholder="Strong areas..." />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Chapter Notes</Label>
                <Textarea rows={2} value={progress.notes} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="Personal notes about this chapter..." />
              </div>

              {/* Resource links */}
              {resource && (resource.lectureLink || resource.moduleLink || resource.dppLink || resource.notesLink || resource.formulaLink || resource.pyqLink) && (
                <div>
                  <Label className="text-xs">Resources</Label>
                  <div className="flex flex-wrap gap-2">
                    {resource.lectureLink && <a href={resource.lectureLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink size={12} />Lecture</a>}
                    {resource.moduleLink && <a href={resource.moduleLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink size={12} />Module</a>}
                    {resource.dppLink && <a href={resource.dppLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink size={12} />DPP</a>}
                    {resource.notesLink && <a href={resource.notesLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink size={12} />Notes</a>}
                    {resource.formulaLink && <a href={resource.formulaLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink size={12} />Formula</a>}
                    {resource.pyqLink && <a href={resource.pyqLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent-light text-xs border border-accent/20 hover:bg-accent/20 transition-colors"><ExternalLink size={12} />PYQ</a>}
                  </div>
                </div>
              )}

              {/* Reset */}
              <div className="flex justify-end pt-2 border-t border-white/[0.06]">
                <Button variant="danger" size="sm" onClick={onReset}>
                  <RotateCcw size={14} />
                  Reset Progress
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
