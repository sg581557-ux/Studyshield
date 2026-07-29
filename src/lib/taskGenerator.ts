import type { OnboardingData, Task, Priority, TaskStatus, TaskSource, ChapterProgress, UserData } from '../types';
import { getSyllabus } from '../data/syllabus';
import { uid, todayISO } from './utils';
import { computeChapterCompletion } from './storage';

interface TTask { title: string; taskType: Task['taskType']; estimatedMinutes: number; priority: Priority; chapter?: string; }

function t(title: string, taskType: Task['taskType'], estimatedMinutes: number, priority: Priority, chapter?: string): TTask {
  return { title, taskType, estimatedMinutes, priority, chapter };
}

function getChapterTasks(_subject: string, chapter: string, cp: ChapterProgress | undefined, sessionLen: number): TTask[] {
  const tasks: TTask[] = [];
  if (!cp || cp.chapterStatus === 'not-started') {
    tasks.push(t(`Start Lecture: ${chapter}`, 'lecture', sessionLen, 'high', chapter));
    return tasks;
  }
  if (cp.lectureStatus === 'watching') tasks.push(t(`Continue Lecture: ${chapter}`, 'lecture', sessionLen, 'high', chapter));
  if (cp.lectureStatus !== 'completed') tasks.push(t(`Complete Lecture: ${chapter}`, 'lecture', sessionLen, 'high', chapter));
  if (cp.theoryStatus === 'not-started') tasks.push(t(`Read Theory: ${chapter}`, 'study', Math.min(45, sessionLen), 'high', chapter));
  if (cp.moduleProgress === 'not-started') tasks.push(t(`Start Module Exercise 1: ${chapter}`, 'module', sessionLen, 'high', chapter));
  if (cp.moduleProgress === 'ex1-done') tasks.push(t(`Complete Module Exercise 2: ${chapter}`, 'module', sessionLen, 'high', chapter));
  if (cp.moduleProgress === 'ex2-done') tasks.push(t(`Complete Module Exercise 3: ${chapter}`, 'module', sessionLen, 'high', chapter));
  if (cp.dppStatus === 'not-started') tasks.push(t(`Complete DPP: ${chapter}`, 'dpp', Math.min(45, sessionLen), 'medium', chapter));
  if (cp.pyqStatus === 'not-started') tasks.push(t(`Solve 30 PYQs: ${chapter}`, 'pyq', Math.min(60, sessionLen), 'medium', chapter));
  if (cp.notesStatus === 'not-started') tasks.push(t(`Revise Notes: ${chapter}`, 'revision', 20, 'medium', chapter));
  if (cp.formulaSheetStatus === 'not-started') tasks.push(t(`Revise Formula Sheet: ${chapter}`, 'revision', 20, 'medium', chapter));
  if (cp.revisionStatus === 'never' && cp.lectureStatus === 'completed') tasks.push(t(`Revise: ${chapter}`, 'revision', Math.min(45, sessionLen), 'medium', chapter));
  return tasks;
}

export function generateDailyTasks(onboarding: OnboardingData, userData?: UserData): Task[] {
  const today = todayISO();
  const sessionLen = onboarding.preferredSessionLength;
  const maxTasks = onboarding.maxTasksPerDay;
  const todayDay = new Date().getDay();
  const isMockTestDay = todayDay === onboarding.weeklyMockTestDay;
  const chapterProgressMap = userData?.chapterProgress ?? {};

  const syllabus = getSyllabus(onboarding.board, onboarding.classLevel, onboarding.examGoal);
  const subjectMap = new Map(syllabus.subjects.map((s) => [s.name, s.chapters]));
  const subjects = onboarding.preferredSubjectOrder?.length > 0 ? onboarding.preferredSubjectOrder : Array.from(subjectMap.keys());
  const isCompetitive = ['JEE Main', 'JEE Advanced', 'NEET'].includes(onboarding.examGoal);
  const shouldRevise = onboarding.revisionFrequency === 'daily' ||
    (onboarding.revisionFrequency === 'every-2-days' && new Date().getDate() % 2 === 0) ||
    (onboarding.revisionFrequency === 'weekly' && todayDay === 0);

  type Candidate = { subject: string; template: TTask; weight: number };
  const candidates: Candidate[] = [];
  const onboardingSubjects = onboarding.subjects ?? {};

  for (const subject of subjects) {
    const allChapters = subjectMap.get(subject) || [];
    const subjProgress = chapterProgressMap[subject] || {};
    const obProgress = onboardingSubjects[subject];
    const parseWeakTopics = (s: string) => s ? s.split(/[,;]/).map((x) => x.trim()).filter(Boolean) : [];

    const notStarted = allChapters.filter((c) => !subjProgress[c] || subjProgress[c].chapterStatus === 'not-started');
    const inProgress = allChapters.filter((c) => subjProgress[c]?.chapterStatus === 'in-progress');
    const needsRevision = allChapters.filter((c) => subjProgress[c]?.chapterStatus === 'needs-revision');
    const weakTopics = obProgress ? parseWeakTopics(obProgress.weakTopics) : [];
    const backlog = obProgress?.backlogChapters ?? [];

    for (const ch of backlog.slice(0, 2)) {
      const cp = subjProgress[ch];
      for (const tt of getChapterTasks(subject, ch, cp, sessionLen).slice(0, 2)) candidates.push({ subject, template: tt, weight: 1 });
    }
    for (const ch of inProgress.slice(0, 2)) {
      const cp = subjProgress[ch];
      for (const tt of getChapterTasks(subject, ch, cp, sessionLen).slice(0, 2)) candidates.push({ subject, template: tt, weight: 2 });
    }
    if (notStarted.length > 0) {
      const ch = notStarted[0];
      candidates.push({ subject, template: t(`Start Lecture: ${ch}`, 'lecture', sessionLen, 'high', ch), weight: 3 });
    }
    for (const topic of weakTopics.slice(0, 2)) {
      candidates.push({ subject, template: t(`Practice ${subject}: ${topic} (Weak Area)`, 'practice', sessionLen, 'high'), weight: 4 });
    }
    for (const ch of inProgress.slice(0, 2)) {
      const cp = subjProgress[ch];
      if (cp?.moduleProgress !== 'fully-done') candidates.push({ subject, template: t(`Complete Module: ${ch}`, 'module', sessionLen, 'medium', ch), weight: 5 });
      if (cp?.dppStatus === 'not-started') candidates.push({ subject, template: t(`Complete DPP: ${ch}`, 'dpp', Math.min(45, sessionLen), 'medium', ch), weight: 5 });
    }
    if (isCompetitive) {
      const target = Math.ceil(onboarding.dailyQuestionTarget / subjects.length);
      candidates.push({ subject, template: t(`Solve ${target} ${subject} PYQs`, 'pyq', 45, 'medium'), weight: 6 });
    }
    if (shouldRevise) {
      for (const ch of needsRevision.slice(0, 1)) {
        candidates.push({ subject, template: t(`Revise ${subject}: ${ch}`, 'revision', Math.min(45, sessionLen), 'medium', ch), weight: 7 });
      }
    }
  }

  if (isMockTestDay && isCompetitive) {
    candidates.push({ subject: 'Mock Test', template: t('Give Full Mock Test', 'mock-test', 180, 'high'), weight: 10 });
    candidates.push({ subject: 'Mock Test', template: t('Analyze Mock Test — Review mistakes', 'analysis', 60, 'high'), weight: 10 });
  }

  candidates.sort((a, b) => a.weight - b.weight);
  const selected = candidates.slice(0, maxTasks);

  return selected.map(({ subject, template }) => ({
    id: uid(), title: template.title, subject,
    chapter: template.chapter, priority: template.priority,
    status: 'pending' as TaskStatus, source: 'ai' as TaskSource,
    taskType: template.taskType, estimatedMinutes: template.estimatedMinutes,
    dueDate: today, createdAt: new Date().toISOString(),
  }));
}

export function shouldRegenerate(lastGenerated: string): boolean { return lastGenerated !== todayISO(); }

export function createEmptyChapterProgress(): ChapterProgress {
  return {
    chapterStatus: 'not-started', lectureStatus: 'not-started', theoryStatus: 'not-started',
    moduleProgress: 'not-started', dppStatus: 'not-started', pyqStatus: 'not-started',
    notesStatus: 'not-started', formulaSheetStatus: 'not-started', revisionStatus: 'never',
    confidenceLevel: 5, difficultyLevel: 'medium', estimatedStudyHours: 4,
    lastStudiedDate: '', nextRevisionDate: '', studySessions: 0, completionPercentage: 0,
    weakTopics: '', strongTopics: '', notes: '',
  };
}

export function updateChapterProgressFromTask(cp: ChapterProgress, taskType: Task['taskType']): ChapterProgress {
  const updated = { ...cp };
  const today = todayISO();
  switch (taskType) {
    case 'lecture':
      if (updated.lectureStatus === 'not-started') updated.lectureStatus = 'watching';
      else if (updated.lectureStatus === 'watching') updated.lectureStatus = 'completed';
      break;
    case 'module':
      if (updated.moduleProgress === 'not-started') updated.moduleProgress = 'ex1-done';
      else if (updated.moduleProgress === 'ex1-done') updated.moduleProgress = 'ex2-done';
      else if (updated.moduleProgress === 'ex2-done') updated.moduleProgress = 'ex3-done';
      else if (updated.moduleProgress === 'ex3-done') updated.moduleProgress = 'fully-done';
      break;
    case 'dpp': updated.dppStatus = 'completed'; break;
    case 'pyq': updated.pyqStatus = 'completed'; break;
    case 'revision':
      if (updated.revisionStatus === 'never') updated.revisionStatus = 'once';
      else if (updated.revisionStatus === 'once') updated.revisionStatus = 'multiple';
      break;
    case 'study': updated.theoryStatus = 'completed'; break;
  }
  updated.lastStudiedDate = today;
  updated.studySessions += 1;
  updated.completionPercentage = computeChapterCompletion(updated);
  const allComplete = updated.lectureStatus === 'completed' && updated.theoryStatus === 'completed'
    && updated.moduleProgress === 'fully-done' && updated.dppStatus === 'completed'
    && updated.pyqStatus === 'completed';
  if (allComplete && updated.chapterStatus !== 'completed') updated.chapterStatus = 'completed';
  else if (updated.completionPercentage > 0 && updated.chapterStatus === 'not-started') updated.chapterStatus = 'in-progress';
  return updated;
}
