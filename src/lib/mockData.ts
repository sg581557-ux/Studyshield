import type { PlanTask, Chapter, FocusSession, BacklogItem, Resource, MockTest } from "./types";
import { storage } from "./storage";

export const mockChapters: Chapter[] = [
  { id: "c1", subject: "Physics", name: "Kinematics", status: "completed", progress: 100, lecturesRemaining: 0, questionsRemaining: 0, confidence: 5 },
  { id: "c2", subject: "Physics", name: "Laws of Motion", status: "completed", progress: 100, lecturesRemaining: 0, questionsRemaining: 0, confidence: 4 },
  { id: "c3", subject: "Physics", name: "Rotational Dynamics", status: "in_progress", progress: 60, lecturesRemaining: 3, questionsRemaining: 45, confidence: 3 },
  { id: "c4", subject: "Physics", name: "Gravitation", status: "in_progress", progress: 35, lecturesRemaining: 5, questionsRemaining: 60, confidence: 2 },
  { id: "c5", subject: "Physics", name: "Thermodynamics", status: "not_started", progress: 0, lecturesRemaining: 8, questionsRemaining: 80, confidence: 1 },
  { id: "c6", subject: "Chemistry", name: "Atomic Structure", status: "completed", progress: 100, lecturesRemaining: 0, questionsRemaining: 0, confidence: 5 },
  { id: "c7", subject: "Chemistry", name: "Chemical Bonding", status: "in_progress", progress: 70, lecturesRemaining: 2, questionsRemaining: 30, confidence: 4 },
  { id: "c8", subject: "Chemistry", name: "Thermodynamics", status: "in_progress", progress: 45, lecturesRemaining: 4, questionsRemaining: 50, confidence: 2 },
  { id: "c9", subject: "Chemistry", name: "Equilibrium", status: "not_started", progress: 0, lecturesRemaining: 6, questionsRemaining: 70, confidence: 1 },
  { id: "c10", subject: "Mathematics", name: "Sets & Relations", status: "completed", progress: 100, lecturesRemaining: 0, questionsRemaining: 0, confidence: 5 },
  { id: "c11", subject: "Mathematics", name: "Complex Numbers", status: "completed", progress: 100, lecturesRemaining: 0, questionsRemaining: 0, confidence: 4 },
  { id: "c12", subject: "Mathematics", name: "Quadratic Equations", status: "in_progress", progress: 80, lecturesRemaining: 1, questionsRemaining: 20, confidence: 4 },
  { id: "c13", subject: "Mathematics", name: "Sequences & Series", status: "in_progress", progress: 25, lecturesRemaining: 6, questionsRemaining: 65, confidence: 2 },
  { id: "c14", subject: "Mathematics", name: "Permutations & Combinations", status: "not_started", progress: 0, lecturesRemaining: 5, questionsRemaining: 55, confidence: 1 },
];

const today = new Date().toISOString().split("T")[0];

export const mockTasks: PlanTask[] = [
  { id: "t1", title: "Rotational Dynamics — Lecture 4", subject: "Physics", type: "study", estimatedMinutes: 75, priority: "high", completed: true, startTime: "08:00", endTime: "09:15", chapter: "Rotational Dynamics" },
  { id: "t2", title: "Break", subject: "", type: "break", estimatedMinutes: 15, priority: "low", completed: true, startTime: "09:15", endTime: "09:30", chapter: null },
  { id: "t3", title: "Chemical Bonding — Module Exercise", subject: "Chemistry", type: "practice", estimatedMinutes: 60, priority: "medium", completed: true, startTime: "09:30", endTime: "10:30", chapter: "Chemical Bonding" },
  { id: "t4", title: "Break", subject: "", type: "break", estimatedMinutes: 10, priority: "low", completed: false, startTime: "10:30", endTime: "10:40", chapter: null },
  { id: "t5", title: "Quadratic Equations — PYQs (2019-2023)", subject: "Mathematics", type: "practice", estimatedMinutes: 45, priority: "high", completed: false, startTime: "10:40", endTime: "11:25", chapter: "Quadratic Equations" },
  { id: "t6", title: "Break", subject: "", type: "break", estimatedMinutes: 15, priority: "low", completed: false, startTime: "11:25", endTime: "11:40", chapter: null },
  { id: "t7", title: "Rotational Dynamics — Revision (Round 2)", subject: "Physics", type: "revision", estimatedMinutes: 30, priority: "medium", completed: false, startTime: "11:40", endTime: "12:10", chapter: "Rotational Dynamics" },
  { id: "t8", title: "Sequences & Series — Lecture 1", subject: "Mathematics", type: "study", estimatedMinutes: 75, priority: "medium", completed: false, startTime: "17:00", endTime: "18:15", chapter: "Sequences & Series" },
];

export const mockFocusSessions: FocusSession[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  return {
    id: `f${i}`,
    durationMinutes: 25 + (i % 3) * 25,
    completed: true,
    startedAt: d.toISOString(),
  };
});

export const mockBacklog: BacklogItem[] = [
  { id: "b1", title: "Gravitation — Kepler's Laws lecture", subject: "Physics", priority: "high", status: "todo", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "b2", title: "Equilibrium — Le Chatelier's principle notes", subject: "Chemistry", priority: "medium", status: "todo", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "b3", title: "Permutations — DPP set 3", subject: "Mathematics", priority: "medium", status: "in_progress", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "b4", title: "Thermodynamics — first law revision", subject: "Physics", priority: "low", status: "todo", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
];

export const mockResources: Resource[] = [
  { id: "r1", name: "Rotational Dynamics — Complete Notes PDF", type: "pdf", subject: "Physics", url: "https://example.com/rot-dyn-notes.pdf", createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "r2", name: "Chemical Bonding — Video Lecture (Unacademy)", type: "video", subject: "Chemistry", url: "https://example.com/bonding-video", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "r3", name: "Quadratic Equations — PYQ Sheet (2015-2023)", type: "pdf", subject: "Mathematics", url: "https://example.com/quadratic-pyq.pdf", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "r4", name: "JEE Main Formula Booklet — All Subjects", type: "pdf", subject: "Physics", url: "https://example.com/formula-book.pdf", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];

export const mockMocks: MockTest[] = [
  { id: "m1", testName: "JEE Main Mock Test 7", subject: "Full Syllabus", totalMarks: 300, obtainedMarks: 218, date: today },
  { id: "m2", testName: "Physics Chapter Test — Rotational", subject: "Physics", totalMarks: 80, obtainedMarks: 58, date: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0] },
  { id: "m3", testName: "JEE Main Mock Test 6", subject: "Full Syllabus", totalMarks: 300, obtainedMarks: 201, date: new Date(Date.now() - 86400000 * 7).toISOString().split("T")[0] },
  { id: "m4", testName: "Chemistry Chapter Test — Bonding", subject: "Chemistry", totalMarks: 80, obtainedMarks: 64, date: new Date(Date.now() - 86400000 * 10).toISOString().split("T")[0] },
];

export function seedDemoData() {
  if (storage.getChapters().length === 0) storage.setChapters(mockChapters);
  if (storage.getTasks().length === 0) storage.setTasks(mockTasks);
  if (storage.getFocusSessions().length === 0) storage.setFocusSessions(mockFocusSessions);
  if (storage.getBacklog().length === 0) storage.setBacklog(mockBacklog);
  if (storage.getResources().length === 0) storage.setResources(mockResources);
  if (storage.getMocks().length === 0) storage.setMocks(mockMocks);
}
