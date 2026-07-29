import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, HelpCircle, Clock, TrendingUp } from 'lucide-react';
import { useModuleTracker } from '../../context/ModuleTrackerContext';
import type { StudyModule } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { ProgressCircle } from './ProgressCircle';
import { ModuleCard } from './ModuleCard';
import { AddModuleModal } from './AddModuleModal';
import { BacklogSection } from './BacklogSection';

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'];

const subjectColors: Record<string, string> = {
  Physics: '#6366f1',
  Chemistry: '#22c55e',
  Mathematics: '#a855f7',
};

export function ModuleDashboard() {
  const {
    modules,
    addModule,
    updateModule,
    deleteModule,
    getModuleCompletion,
    getModuleAccuracy,
    getModulesBySubject,
    getBacklogModules,
    getQuestionsSolvedToday,
    getTotalQuestions,
    getOverallCompletion,
    getSubjectCompletion,
  } = useModuleTracker();

  const [modalOpen, setModalOpen] = useState(false);

  const overallCompletion = getOverallCompletion();
  const questionsToday = getQuestionsSolvedToday();
  const totalQuestions = getTotalQuestions();
  const backlogCount = getBacklogModules().length;

  const chapters = Array.from(new Set(modules.map((m) => m.chapter)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Package size={22} className="text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Module Tracker</h1>
            <p className="text-sm text-gray-500">Track exercises, questions & backlog across modules</p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          Add Module
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="flex items-center gap-4 p-5" hover>
          <ProgressCircle percentage={overallCompletion} size={80} stroke={6} label="Overall" />
          <div>
            <p className="text-sm text-gray-500">Overall Completion</p>
            <p className="text-lg font-semibold text-white">{overallCompletion}%</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 p-5" hover>
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <TrendingUp size={24} className="text-accent-light" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Solved Today</p>
            <p className="text-2xl font-bold text-white">{questionsToday}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 p-5" hover>
          <div className="w-14 h-14 rounded-2xl bg-purple/10 border border-purple/20 flex items-center justify-center shrink-0">
            <HelpCircle size={24} className="text-purple-light" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Questions</p>
            <p className="text-2xl font-bold text-white">{totalQuestions}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 p-5" hover>
          <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
            <Clock size={24} className="text-warning-light" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Backlog</p>
            <p className="text-2xl font-bold text-white">{backlogCount}</p>
          </div>
        </GlassCard>
      </div>

      {/* Subject-wise progress */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Subject-wise Progress</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SUBJECTS.map((subject) => {
            const completion = getSubjectCompletion(subject);
            const subjectModules = getModulesBySubject(subject);
            return (
              <GlassCard key={subject} className="flex flex-col items-center p-5" hover>
                <ProgressCircle
                  percentage={completion}
                  size={120}
                  stroke={8}
                  color={subjectColors[subject]}
                  label={subject}
                  sublabel={`${subjectModules.length} modules`}
                />
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Chapter-wise progress */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Chapter-wise Progress</h2>
        {modules.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center py-12 text-center p-6">
            <Package size={32} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">No modules yet. Click "Add Module" to get started.</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {SUBJECTS.map((subject) => {
              const subjectModules = getModulesBySubject(subject);
              if (subjectModules.length === 0) return null;
              return (
                <div key={subject}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="accent">{subject}</Badge>
                    <span className="text-xs text-gray-500">{subjectModules.length} modules</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subjectModules.map((m: StudyModule) => {
                      const completion = getModuleCompletion(m.id);
                      return (
                        <GlassCard key={m.id} className="p-4" hover>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-white truncate">{m.moduleName}</h3>
                              <p className="text-xs text-gray-500 truncate">{m.chapter}</p>
                            </div>
                            <span className="text-xs font-semibold text-gray-400 shrink-0">{completion}%</span>
                          </div>
                          <ProgressBar percentage={completion} />
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Module cards */}
      {modules.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">All Modules</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {modules.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <ModuleCard
                  module={m}
                  onUpdate={updateModule}
                  onDelete={deleteModule}
                  completion={getModuleCompletion(m.id)}
                  accuracy={getModuleAccuracy(m.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Backlog section */}
      <BacklogSection modules={modules} onUpdate={updateModule} />

      {/* Add module modal */}
      <AddModuleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addModule}
        subjects={SUBJECTS}
        chapters={chapters}
      />
    </div>
  );
}
