import { useState, useMemo } from 'react';
import { AlertCircle, Calendar, ArrowUpDown, ListChecks } from 'lucide-react';
import type { StudyModule, ModuleStatus, ModuleDifficulty } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Input';

interface BacklogSectionProps {
  modules: StudyModule[];
  onUpdate: (id: string, d: Partial<StudyModule>) => void;
}

type SortOption = 'backlog' | 'deadline' | 'difficulty';

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

const difficultyRank: Record<ModuleDifficulty, number> = {
  advanced: 0,
  medium: 1,
  easy: 2,
};

export function BacklogSection({ modules }: BacklogSectionProps) {
  const [sortBy, setSortBy] = useState<SortOption>('backlog');

  const backlog = useMemo(() => {
    const list = modules.filter((m) => m.status !== 'completed');
    const pending = (m: StudyModule) => m.totalQuestions - m.solvedQuestions;

    return [...list].sort((a, b) => {
      if (sortBy === 'backlog') return pending(b) - pending(a);
      if (sortBy === 'deadline') {
        const ad = a.targetDate ?? '9999-12-31';
        const bd = b.targetDate ?? '9999-12-31';
        return ad.localeCompare(bd);
      }
      return difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
    });
  }, [modules, sortBy]);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks size={20} className="text-accent-light" />
          <h2 className="text-lg font-semibold text-white">Backlog</h2>
          <Badge variant="accent">{backlog.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={15} className="text-gray-500" />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-auto py-2 text-sm"
          >
            <option value="backlog">Highest Backlog</option>
            <option value="deadline">Closest Deadline</option>
            <option value="difficulty">Difficulty</option>
          </Select>
        </div>
      </div>

      {backlog.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle size={28} className="text-gray-600 mb-2" />
          <p className="text-sm text-gray-500">No backlog modules. You are all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {backlog.map((m) => {
            const pending = m.totalQuestions - m.solvedQuestions;
            const statusCfg = statusConfig[m.status];
            const diffCfg = difficultyConfig[m.difficulty];
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{m.moduleName}</h3>
                  <p className="text-xs text-gray-500 truncate">{m.chapter}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="accent">{m.subject}</Badge>
                    <Badge variant={diffCfg.variant}>{diffCfg.label}</Badge>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-warning-light">
                    <AlertCircle size={14} />
                    {pending}
                  </span>
                  <span className="text-xs text-gray-500">pending</span>
                  {m.targetDate && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Calendar size={12} />
                      {m.targetDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
