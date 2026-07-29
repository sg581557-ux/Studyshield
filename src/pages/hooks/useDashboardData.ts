import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Task, Subject, Chapter, FocusSession, Formula, FormulaView,
  PYQAttempt, MockTest, Achievement,
} from "../../lib/types";
import { storage } from "../../lib/storage";
import { uid, XP_PER_TASK, XP_PER_FOCUS_MIN } from "../../lib/constants";
import { computeStats, checkAchievements } from "../../lib/gamification";
import { useAuth } from "../../context/AuthContext";

export function useDashboardData() {
  const { user, updateUser } = useAuth();
  const [tasks, setTasksState] = useState<Task[]>(() => storage.getTasks());
  const [subjects, setSubjectsState] = useState<Subject[]>(() => storage.getSubjects());
  const [chapters, setChaptersState] = useState<Chapter[]>(() => storage.getChapters());
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => storage.getFocusSessions());
  const [formulas, setFormulasState] = useState<Formula[]>(() => storage.getFormulas());
  const [formulaViews, setFormulaViews] = useState<FormulaView[]>(() => storage.getFormulaViews());
  const [pyqAttempts, setPyqAttempts] = useState<PYQAttempt[]>(() => storage.getPYQAttempts());
  const [mockTests, setMockTests] = useState<MockTest[]>(() => storage.getMockTests());
  const [achievements, setAchievements] = useState<Achievement[]>(() => storage.getAchievements());

  useEffect(() => { storage.setTasks(tasks); }, [tasks]);
  useEffect(() => { storage.setSubjects(subjects); }, [subjects]);
  useEffect(() => { storage.setChapters(chapters); }, [chapters]);
  useEffect(() => { storage.setFocusSessions(focusSessions); }, [focusSessions]);
  useEffect(() => { storage.setFormulas(formulas); }, [formulas]);
  useEffect(() => { storage.setFormulaViews(formulaViews); }, [formulaViews]);
  useEffect(() => { storage.setPYQAttempts(pyqAttempts); }, [pyqAttempts]);
  useEffect(() => { storage.setMockTests(mockTests); }, [mockTests]);
  useEffect(() => { storage.setAchievements(achievements); }, [achievements]);

  const awardXP = useCallback((delta: number) => {
    if (delta <= 0) return;
    updateUser({ xp: (user?.xp || 0) + delta });
  }, [user?.xp, updateUser]);

  const recheckAchievements = useCallback((fs: FocusSession[], ts: Task[], subs: Subject[], fms: Formula[], pyqs: PYQAttempt[], mts: MockTest[]) => {
    const stats = computeStats(ts, fs, user);
    const updated = checkAchievements(achievements, stats, subs, fms, pyqs, mts);
    const newlyUnlocked = updated.filter((a) => a.unlockedAt && !achievements.find((b) => b.id === a.id)?.unlockedAt);
    setAchievements(updated);
    return newlyUnlocked;
  }, [achievements, user]);

  const addTask = useCallback((t: Omit<Task, "id" | "order"> & Partial<Pick<Task, "order">>) => {
    setTasksState((prev) => {
      const next: Task = { ...t, id: uid("task"), order: t.order ?? prev.length, status: t.status || "pending" } as Task;
      return [...prev, next];
    });
  }, []);
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasksState((prev) => {
      let xpDelta = 0;
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const wasCompleted = t.status === "completed";
        const willComplete = patch.status === "completed" && !wasCompleted;
        if (willComplete) xpDelta = XP_PER_TASK;
        if (patch.status === "pending" && wasCompleted) xpDelta = -XP_PER_TASK;
        return { ...t, ...patch, completedAt: patch.status === "completed" ? (patch.completedAt || new Date().toISOString()) : (patch.status === "pending" ? null : t.completedAt) };
      });
      if (xpDelta !== 0) setTimeout(() => awardXP(xpDelta), 0);
      return next;
    });
  }, [awardXP]);
  const deleteTask = useCallback((id: string) => setTasksState((prev) => prev.filter((t) => t.id !== id)), []);
  const reorderTasks = useCallback((ordered: Task[]) => {
    setTasksState((prev) => {
      const map = new Map(ordered.map((t, i) => [t.id, i]));
      return prev.map((t) => ({ ...t, order: map.has(t.id) ? (map.get(t.id) as number) : t.order }));
    });
  }, []);
  const setTasks = useCallback((next: Task[]) => setTasksState(next), []);

  const addSubject = useCallback((s: Omit<Subject, "id">) => {
    setSubjectsState((prev) => [...prev, { ...s, id: uid("subj") }]);
  }, []);
  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setSubjectsState((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const deleteSubject = useCallback((id: string) => {
    setSubjectsState((prev) => prev.filter((s) => s.id !== id));
    setChaptersState((prev) => prev.filter((c) => c.subjectId !== id));
  }, []);

  const addChapter = useCallback((c: Omit<Chapter, "id">) => {
    setChaptersState((prev) => [...prev, { ...c, id: uid("chap") }]);
  }, []);
  const updateChapter = useCallback((id: string, patch: Partial<Chapter>) => {
    setChaptersState((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const deleteChapter = useCallback((id: string) => setChaptersState((prev) => prev.filter((c) => c.id !== id)), []);

  const addFocusSession = useCallback((minutes: number, taskId: string | null, mode: FocusSession["mode"] = "pomodoro_25", subjectId: string | null = null, label = "Focus") => {
    const session: FocusSession = { id: uid("focus"), date: new Date().toISOString(), minutes, taskId, subjectId, mode, label };
    setFocusSessions((prev) => {
      const next = [...prev, session];
      recheckAchievements(next, tasks, subjects, formulas, pyqAttempts, mockTests);
      return next;
    });
    if (minutes > 0) awardXP(minutes * XP_PER_FOCUS_MIN);
  }, [tasks, subjects, formulas, pyqAttempts, mockTests, awardXP, recheckAchievements]);

  const toggleBookmark = useCallback((id: string) => {
    setFormulasState((prev) => prev.map((f) => (f.id === id ? { ...f, isBookmarked: !f.isBookmarked } : f)));
  }, []);
  const recordFormulaView = useCallback((id: string) => {
    setFormulasState((prev) => prev.map((f) => (f.id === id ? { ...f, viewCount: f.viewCount + 1, lastViewedAt: new Date().toISOString() } : f)));
    setFormulaViews((prev) => [...prev, { id: uid("fv"), formulaId: id, viewedAt: new Date().toISOString() }].slice(-200));
  }, []);
  const incrementFormulaUse = useCallback((id: string) => {
    setFormulasState((prev) => prev.map((f) => (f.id === id ? { ...f, useCount: f.useCount + 1 } : f)));
  }, []);
  const setFormulas = useCallback((next: Formula[]) => setFormulasState(next), []);

  const addPYQAttempt = useCallback((a: Omit<PYQAttempt, "id" | "date">) => {
    const att: PYQAttempt = { ...a, id: uid("pyq"), date: new Date().toISOString() };
    setPyqAttempts((prev) => {
      const next = [att, ...prev];
      recheckAchievements(focusSessions, tasks, subjects, formulas, next, mockTests);
      return next;
    });
  }, [focusSessions, tasks, subjects, formulas, mockTests, recheckAchievements]);
  const deletePYQAttempt = useCallback((id: string) => setPyqAttempts((prev) => prev.filter((a) => a.id !== id)), []);

  const addMockTest = useCallback((m: Omit<MockTest, "id" | "date">) => {
    const mt: MockTest = { ...m, id: uid("mock"), date: new Date().toISOString() };
    setMockTests((prev) => {
      const next = [mt, ...prev];
      recheckAchievements(focusSessions, tasks, subjects, formulas, pyqAttempts, next);
      return next;
    });
  }, [focusSessions, tasks, subjects, formulas, pyqAttempts, recheckAchievements]);
  const deleteMockTest = useCallback((id: string) => setMockTests((prev) => prev.filter((m) => m.id !== id)), []);

  const stats = useMemo(() => computeStats(tasks, focusSessions, user), [tasks, focusSessions, user]);

  return {
    user, tasks, subjects, chapters, focusSessions, formulas, formulaViews,
    pyqAttempts, mockTests, achievements, stats,
    addTask, updateTask, deleteTask, reorderTasks, setTasks,
    addSubject, updateSubject, deleteSubject,
    addChapter, updateChapter, deleteChapter,
    addFocusSession,
    toggleBookmark, recordFormulaView, incrementFormulaUse, setFormulas,
    addPYQAttempt, deletePYQAttempt,
    addMockTest, deleteMockTest,
    awardXP,
  };
}
