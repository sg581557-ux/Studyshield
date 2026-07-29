import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, Target, HelpCircle, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StudyModule, ModuleStatus, ModuleDifficulty } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Input, Select, Label } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

interface ModuleCardProps {
  module: StudyModule;
  onUpdate: (id: string, d: Partial<StudyModule>) => void;
  onDelete: (id: string) => void;
  completion: number;
  accuracy: number;
}

const statusConfig: Record<ModuleStatus, { variant: 'default' | 'accent' | 'success' | 'warning'; label: string }> = {
  'not-started': { variant: 'default', label: 'Not Started' },
  'in-progress': { variant: 'accent', label: 'In Progress' },
  'completed': { variant: 'success', label: 'Completed' },
  'revision-needed': { variant: 'warning', label: 'Revision Needed' },
};

const difficultyConfig: Record<ModuleDifficulty, { variant: 'success' | 'warning' | 'error'; label: string }> = {
  easy: { variant: 'success', label: 'Easy' },
  medium: { variant: 'warning', label: 'Medium' },
  advanced: { variant: 'error', label: 'Advanced' },
};

export function ModuleCard({ module, onUpdate, onDelete, completion, accuracy }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pending = module.totalQuestions - module.solvedQuestions;
  const statusCfg = statusConfig[module.status];
  const diffCfg = difficultyConfig[module.difficulty];

  const num = (v: number) => (v < 0 ? 0 : v);

  const field = (label: string, Icon: LucideIcon, key: keyof StudyModule, type: 'number' | 'date' = 'number') => (
    <div>
      <Label className="flex items-center gap-1.5">
        <Icon size={13} className="text-gray-500" />
        {label}
      </Label>
      <Input
        type={type}
        value={type === 'date' ? (module[key] as string) ?? '' : module[key] as number}
        onChange={(e) => {
          const val = type === 'date' ? e.target.value : num(parseInt(e.target.value, 10) || 0);
          onUpdate(module.id, { [key]: val } as Partial<StudyModule>);
        }}
      />
    </div>
  );

  return (
    <GlassCard className="p-4" hover>
      {/* Collapsed view */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{module.moduleName}</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{module.chapter}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="accent">{module.subject}</Badge>
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              <Badge variant={diffCfg.variant}>{diffCfg.label}</Badge>
            </div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-500 mt-1">
            <ChevronDown size={20} />
          </motion.div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Completion</span>
            <span>{completion}%</span>
          </div>
          <ProgressBar percentage={completion} />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <HelpCircle size={13} />
            {pending} pending
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle size={13} />
            {module.solvedQuestions} solved
          </span>
        </div>
      </button>

      {/* Expanded view */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-white/[0.06]">
              <div className="grid grid-cols-2 gap-3">
                {field('Solved Questions', CheckCircle, 'solvedQuestions')}
                {field('Wrong Questions', AlertCircle, 'wrongQuestions')}
                {field('Revision Questions', RotateCcw, 'revisionQuestions')}
                {field('Completed Exercises', CheckCircle, 'completedExercises')}
                {field('Target Date', Target, 'targetDate', 'date')}
                {field('Daily Question Target', Target, 'dailyQuestionTarget')}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={module.status}
                    onChange={(e) => onUpdate(module.id, { status: e.target.value as ModuleStatus })}
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="revision-needed">Revision Needed</option>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={module.difficulty}
                    onChange={(e) => onUpdate(module.id, { difficulty: e.target.value as ModuleDifficulty })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>
              </div>

              {/* Computed stats */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-xs text-gray-500">Accuracy</p>
                  <p className="text-lg font-semibold text-white mt-0.5">{accuracy}%</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-xs text-gray-500">Completion</p>
                  <p className="text-lg font-semibold text-white mt-0.5">{completion}%</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-semibold text-white mt-0.5">{pending}</p>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(module.id)}
                >
                  <Trash2 size={14} />
                  Delete Module
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
