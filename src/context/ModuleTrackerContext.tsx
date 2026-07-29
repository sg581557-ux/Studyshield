import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { StudyModule, ModuleTrackerData, ModuleStatus, ModuleDifficulty } from '../types';
import { loadModuleTracker, saveModuleTracker, computeModuleCompletion, computeModuleAccuracy } from '../lib/storage';
import { useAuth } from './AuthContext';
import { uid, todayISO } from '../lib/utils';

interface ModuleTrackerCtx extends ModuleTrackerData {
  modules: StudyModule[];
  addModule: (m: Omit<StudyModule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateModule: (id: string, d: Partial<StudyModule>) => void;
  deleteModule: (id: string) => void;
  getModuleCompletion: (id: string) => number;
  getModuleAccuracy: (id: string) => number;
  getModulesBySubject: (subject: string) => StudyModule[];
  getBacklogModules: () => StudyModule[];
  getQuestionsSolvedToday: () => number;
  getTotalQuestions: () => number;
  getTotalSolved: () => number;
  getOverallCompletion: () => number;
  getSubjectCompletion: (subject: string) => number;
}

const ModuleTrackerContext = createContext<ModuleTrackerCtx | undefined>(undefined);

export function ModuleTrackerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<ModuleTrackerData>({ modules: [] });

  useEffect(() => {
    if (!user) { setData({ modules: [] }); return; }
    setData(loadModuleTracker(user.id));
  }, [user]);

  const persist = useCallback((nd: ModuleTrackerData) => {
    setData(nd);
    if (user) saveModuleTracker(user.id, nd);
  }, [user]);

  const addModule = (m: Omit<StudyModule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const nm: StudyModule = { ...m, id: uid(), createdAt: now, updatedAt: now };
    persist({ modules: [...data.modules, nm] });
  };

  const updateModule = (id: string, d: Partial<StudyModule>) => {
    persist({ modules: data.modules.map((m) => m.id === id ? { ...m, ...d, updatedAt: new Date().toISOString() } : m) });
  };

  const deleteModule = (id: string) => {
    persist({ modules: data.modules.filter((m) => m.id !== id) });
  };

  const getModuleCompletion = (id: string) => {
    const m = data.modules.find((x) => x.id === id);
    return m ? computeModuleCompletion(m) : 0;
  };
  const getModuleAccuracy = (id: string) => {
    const m = data.modules.find((x) => x.id === id);
    return m ? computeModuleAccuracy(m) : 0;
  };
  const getModulesBySubject = (subject: string) => data.modules.filter((m) => m.subject === subject);
  const getBacklogModules = () => data.modules.filter((m) => m.status === 'not-started' || m.status === 'in-progress' || m.status === 'revision-needed');
  const getQuestionsSolvedToday = () => {
    const today = todayISO();
    return data.modules.filter((m) => m.updatedAt.startsWith(today)).reduce((sum, m) => sum + m.solvedQuestions, 0);
  };
  const getTotalQuestions = () => data.modules.reduce((sum, m) => sum + m.totalQuestions, 0);
  const getTotalSolved = () => data.modules.reduce((sum, m) => sum + m.solvedQuestions, 0);
  const getOverallCompletion = () => {
    const total = getTotalQuestions();
    return total === 0 ? 0 : Math.round((getTotalSolved() / total) * 100);
  };
  const getSubjectCompletion = (subject: string) => {
    const mods = getModulesBySubject(subject);
    const total = mods.reduce((s, m) => s + m.totalQuestions, 0);
    const solved = mods.reduce((s, m) => s + m.solvedQuestions, 0);
    return total === 0 ? 0 : Math.round((solved / total) * 100);
  };

  return (
    <ModuleTrackerContext.Provider value={{
      ...data,
      addModule, updateModule, deleteModule,
      getModuleCompletion, getModuleAccuracy,
      getModulesBySubject, getBacklogModules,
      getQuestionsSolvedToday, getTotalQuestions, getTotalSolved,
      getOverallCompletion, getSubjectCompletion,
    }}>
      {children}
    </ModuleTrackerContext.Provider>
  );
}

export function useModuleTracker() {
  const ctx = useContext(ModuleTrackerContext);
  if (!ctx) throw new Error('useModuleTracker must be used within ModuleTrackerProvider');
  return ctx;
}

export type { ModuleStatus, ModuleDifficulty };
