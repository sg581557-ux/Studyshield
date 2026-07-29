import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserData, Task, TaskStatus, PlannerEvent, Goal, StudySession, Note, FormulaSheetDoc, UserSettings, StreakData, OnboardingData, ChapterProgress } from '../types';
import { loadJSON, saveJSON, userDataKey, defaultUserData, defaultChapterProgress, loadOnboarding, loadLastGenerated, saveLastGenerated, computeChapterCompletion } from '../lib/storage';
import { useAuth } from './AuthContext';
import { uid, todayISO } from '../lib/utils';
import { generateDailyTasks, shouldRegenerate, updateChapterProgressFromTask } from '../lib/taskGenerator';

interface UserDataCtx extends UserData {
  onboarding: OnboardingData | null;
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, d: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  skipTask: (id: string) => void;
  deleteTask: (id: string) => void;
  regenerateTasks: () => void;
  addPlannerEvent: (e: Omit<PlannerEvent, 'id'>) => void;
  deletePlannerEvent: (id: string) => void;
  updateGoal: (id: string, d: Partial<Goal>) => void;
  addSession: (s: Omit<StudySession, 'id'>) => void;
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, d: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addFormulaSheet: (s: Omit<FormulaSheetDoc, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFormulaSheet: (id: string, d: Partial<FormulaSheetDoc>) => void;
  deleteFormulaSheet: (id: string) => void;
  updateSettings: (d: Partial<UserSettings>) => void;
  updateStreak: () => void;
  updateChapterProgress: (subject: string, chapter: string, d: Partial<ChapterProgress>) => void;
  resetChapterProgress: (subject: string, chapter: string) => void;
  getChapterProgress: (subject: string, chapter: string) => ChapterProgress;
}

const UserDataContext = createContext<UserDataCtx | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>(defaultUserData);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  useEffect(() => {
    if (!user) { setData(defaultUserData); setOnboarding(null); return; }
    const stored = loadJSON<UserData>(userDataKey(user.id), defaultUserData);
    if (!stored.chapterProgress) stored.chapterProgress = {};
    setData(stored);
    const ob = loadOnboarding(user.id);
    setOnboarding(ob);
    if (ob && user.onboardingComplete && ob.subjects) {
      const lastGen = loadLastGenerated(user.id);
      if (shouldRegenerate(lastGen)) {
        const newTasks = generateDailyTasks(ob, stored);
        const updated = { ...stored, tasks: [...newTasks, ...stored.tasks.filter((t) => t.source === 'manual')] };
        setData(updated); saveJSON(userDataKey(user.id), updated); saveLastGenerated(user.id, todayISO());
      }
    }
  }, [user]);

  const persist = useCallback((nd: UserData) => { setData(nd); if (user) saveJSON(userDataKey(user.id), nd); }, [user]);

  const getChapterProgress = useCallback((subject: string, chapter: string): ChapterProgress => {
    return data.chapterProgress?.[subject]?.[chapter] ?? defaultChapterProgress;
  }, [data.chapterProgress]);

  const updateChapterProgress = useCallback((subject: string, chapter: string, d: Partial<ChapterProgress>) => {
    const existing = data.chapterProgress?.[subject]?.[chapter] ?? defaultChapterProgress;
    const updated = { ...existing, ...d };
    updated.completionPercentage = computeChapterCompletion(updated);
    const newCp = { ...data.chapterProgress, [subject]: { ...data.chapterProgress?.[subject], [chapter]: updated } };
    persist({ ...data, chapterProgress: newCp });
  }, [data, persist]);

  const resetChapterProgress = useCallback((subject: string, chapter: string) => {
    const newCp = { ...data.chapterProgress };
    if (newCp[subject]) { delete newCp[subject][chapter]; }
    persist({ ...data, chapterProgress: newCp });
  }, [data, persist]);

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) =>
    persist({ ...data, tasks: [{ ...task, id: uid(), createdAt: new Date().toISOString() }, ...data.tasks] });
  const updateTask = (id: string, td: Partial<Task>) =>
    persist({ ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...td } : t)) });

  const toggleTask = (id: string) => {
    const task = data.tasks.find((t) => t.id === id); if (!task) return;
    const isCompleting = task.status !== 'completed';
    const newTasks = data.tasks.map((t) => t.id === id ? { ...t, status: (t.status === 'completed' ? 'pending' : 'completed') as TaskStatus, completedAt: isCompleting ? new Date().toISOString() : undefined } : t);
    let newSessions = data.sessions; let newStreak = data.streak; let newCp = data.chapterProgress;
    if (isCompleting) {
      newSessions = [...data.sessions, { id: uid(), subject: task.subject, duration: task.estimatedMinutes / 60, date: todayISO(), type: (task.taskType === 'revision' ? 'revision' : task.taskType === 'mock-test' ? 'mock-test' : 'study') as StudySession['type'] }];
      const today = todayISO(); const sd = { ...newStreak };
      if (sd.lastStudyDate !== today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        sd.currentStreak = sd.lastStudyDate === y.toISOString().split('T')[0] ? sd.currentStreak + 1 : 1;
        sd.longestStreak = Math.max(sd.longestStreak, sd.currentStreak); sd.lastStudyDate = today;
        const wh = [...sd.weekHistory]; wh[new Date().getDay()] = true; sd.weekHistory = wh; newStreak = sd;
      }
      if (task.chapter && task.subject) {
        const existing = data.chapterProgress?.[task.subject]?.[task.chapter] ?? defaultChapterProgress;
        const updatedCp = updateChapterProgressFromTask(existing, task.taskType);
        newCp = { ...newCp, [task.subject]: { ...newCp?.[task.subject], [task.chapter]: updatedCp } };
      }
    }
    const th = newSessions.filter((s) => s.date === todayISO()).reduce((s, x) => s + x.duration, 0);
    persist({ ...data, tasks: newTasks, sessions: newSessions, streak: newStreak, goals: data.goals.map((g) => ({ ...g, dailyProgress: th })), chapterProgress: newCp });
  };

  const skipTask = (id: string) => persist({ ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, status: 'skipped' as TaskStatus } : t)) });
  const deleteTask = (id: string) => persist({ ...data, tasks: data.tasks.filter((t) => t.id !== id) });
  const regenerateTasks = () => { if (!user || !onboarding) return; persist({ ...data, tasks: [...generateDailyTasks(onboarding, data), ...data.tasks.filter((t) => t.source === 'manual')] }); saveLastGenerated(user.id, todayISO()); };
  const addPlannerEvent = (e: Omit<PlannerEvent, 'id'>) => persist({ ...data, plannerEvents: [...data.plannerEvents, { ...e, id: uid() }] });
  const deletePlannerEvent = (id: string) => persist({ ...data, plannerEvents: data.plannerEvents.filter((e) => e.id !== id) });
  const updateGoal = (id: string, gd: Partial<Goal>) => persist({ ...data, goals: data.goals.map((g) => (g.id === id ? { ...g, ...gd } : g)) });
  const addSession = (s: Omit<StudySession, 'id'>) => { const ns = [...data.sessions, { ...s, id: uid() }]; const th = ns.filter((x) => x.date === todayISO()).reduce((sum, x) => sum + x.duration, 0); persist({ ...data, sessions: ns, goals: data.goals.map((g) => ({ ...g, dailyProgress: th })) }); };
  const addNote = (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => { const now = new Date().toISOString(); persist({ ...data, notes: [{ ...n, id: uid(), createdAt: now, updatedAt: now }, ...data.notes] }); };
  const updateNote = (id: string, nd: Partial<Note>) => persist({ ...data, notes: data.notes.map((n) => (n.id === id ? { ...n, ...nd, updatedAt: new Date().toISOString() } : n)) });
  const deleteNote = (id: string) => persist({ ...data, notes: data.notes.filter((n) => n.id !== id) });
  const addFormulaSheet = (s: Omit<FormulaSheetDoc, 'id' | 'createdAt' | 'updatedAt'>) => { const now = new Date().toISOString(); persist({ ...data, formulaSheets: [{ ...s, id: uid(), createdAt: now, updatedAt: now }, ...data.formulaSheets] }); };
  const updateFormulaSheet = (id: string, sd: Partial<FormulaSheetDoc>) => persist({ ...data, formulaSheets: data.formulaSheets.map((s) => (s.id === id ? { ...s, ...sd, updatedAt: new Date().toISOString() } : s)) });
  const deleteFormulaSheet = (id: string) => persist({ ...data, formulaSheets: data.formulaSheets.filter((s) => s.id !== id) });
  const updateSettings = (sd: Partial<UserSettings>) => persist({ ...data, settings: { ...data.settings, ...sd } });
  const updateStreak = () => {
    const today = todayISO(); const streak: StreakData = { ...data.streak };
    if (streak.lastStudyDate === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    streak.currentStreak = streak.lastStudyDate === y.toISOString().split('T')[0] ? streak.currentStreak + 1 : 1;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak); streak.lastStudyDate = today;
    const wh = [...streak.weekHistory]; wh[new Date().getDay()] = true; streak.weekHistory = wh;
    persist({ ...data, streak });
  };

  return (
    <UserDataContext.Provider value={{ ...data, onboarding, addTask, updateTask, toggleTask, skipTask, deleteTask, regenerateTasks, addPlannerEvent, deletePlannerEvent, updateGoal, addSession, addNote, updateNote, deleteNote, addFormulaSheet, updateFormulaSheet, deleteFormulaSheet, updateSettings, updateStreak, updateChapterProgress, resetChapterProgress, getChapterProgress }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used within UserDataProvider');
  return ctx;
}
