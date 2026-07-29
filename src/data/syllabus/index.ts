import type { SyllabusConfig, EducationBoard, ClassLevel, ExamGoal } from '../../types';
import { jeePhysics, jeeChemistry, jeeMaths } from './jee';
import { neetPhysics, neetChemistry, neetBiology } from './neet';
import { getCbseSyllabus } from './cbse';
import { getIcseSyllabus, getStateBoardSyllabus, getOtherSyllabus } from './icse';
import { getExamSubjects } from '../examSubjects';

export function isCompetitiveClass(cls: ClassLevel): boolean {
  return cls === '11' || cls === '12' || cls === 'Dropper';
}
export function shouldAskGoal(cls: ClassLevel): boolean {
  return isCompetitiveClass(cls);
}
export function getSyllabus(board: EducationBoard, cls: ClassLevel, goal: ExamGoal): SyllabusConfig {
  if (isCompetitiveClass(cls)) {
    if (goal === 'JEE Main' || goal === 'JEE Advanced') return { subjects: [{ name: 'Physics', chapters: jeePhysics }, { name: 'Chemistry', chapters: jeeChemistry }, { name: 'Mathematics', chapters: jeeMaths }] };
    if (goal === 'NEET') return { subjects: [{ name: 'Physics', chapters: neetPhysics }, { name: 'Chemistry', chapters: neetChemistry }, { name: 'Biology', chapters: neetBiology }] };
    if (goal === 'School Only' || goal === 'Custom') {
      if (board === 'ICSE') return { subjects: getIcseSyllabus('10') };
      return { subjects: getCbseSyllabus('10') };
    }
  }
  switch (board) {
    case 'CBSE': return { subjects: getCbseSyllabus(cls) };
    case 'ICSE': return { subjects: getIcseSyllabus(cls) };
    case 'State Board': return { subjects: getStateBoardSyllabus(cls) };
    case 'Other': return { subjects: getOtherSyllabus(cls) };
    default: return { subjects: getCbseSyllabus(cls) };
  }
}

export function getSyllabusByExamId(examId: string): SyllabusConfig {
  return { subjects: getExamSubjects(examId) };
}

