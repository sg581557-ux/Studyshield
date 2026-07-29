import type { ChapterResource } from '../../types';

const resourceDatabase: ChapterResource[] = [
  { exam: 'JEE', subject: 'Physics', chapter: 'Units & Dimensions' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Motion in a Straight Line' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Motion in a Plane' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Laws of Motion' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Work, Energy & Power' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Circular Motion' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Centre of Mass' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Rotational Motion' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Gravitation' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Electrostatics' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Current Electricity' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Magnetism' },
  { exam: 'JEE', subject: 'Physics', chapter: 'Ray Optics' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Mole Concept' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Atomic Structure' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Chemical Bonding' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Thermodynamics' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Equilibrium' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Electrochemistry' },
  { exam: 'JEE', subject: 'Chemistry', chapter: 'Chemical Kinetics' },
  { exam: 'JEE', subject: 'Mathematics', chapter: 'Trigonometric Functions' },
  { exam: 'JEE', subject: 'Mathematics', chapter: 'Complex Numbers' },
  { exam: 'JEE', subject: 'Mathematics', chapter: 'Limits & Derivatives' },
  { exam: 'JEE', subject: 'Mathematics', chapter: 'Integration' },
];

export default resourceDatabase;

export function getResourceForChapter(subject: string, chapter: string, exam?: string): ChapterResource | undefined {
  return resourceDatabase.find((r) => r.subject === subject && r.chapter === chapter && (!exam || r.exam === exam));
}
