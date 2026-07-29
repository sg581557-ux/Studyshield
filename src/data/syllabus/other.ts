import type { SyllabusSubject, ClassLevel } from '../../types';

export function getOtherSyllabus(classLevel: ClassLevel): SyllabusSubject[] {
  const cls = classLevel;
  if (cls === '11' || cls === '12') return [];
  return [
    { name: 'Mathematics', chapters: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics', 'Calculus'] },
    { name: 'Science', chapters: ['Physics', 'Chemistry', 'Biology'] },
    { name: 'English', chapters: ['Literature', 'Grammar', 'Writing'] },
    { name: 'Social Studies', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
  ];
}
