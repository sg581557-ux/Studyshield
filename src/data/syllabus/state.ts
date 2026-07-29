import type { SyllabusSubject, ClassLevel } from '../../types';

export function getStateBoardSyllabus(_classLevel: ClassLevel): SyllabusSubject[] {
  return [
    { name: 'Mathematics', chapters: ['Number System','Algebra','Geometry','Coordinate Geometry','Trigonometry','Mensuration','Statistics','Probability'] },
    { name: 'Science', chapters: ['Physics: Motion and Force','Physics: Work and Energy','Physics: Light and Sound','Physics: Electricity','Chemistry: Matter','Chemistry: Atoms and Molecules','Chemistry: Chemical Reactions','Biology: Life Processes','Biology: Heredity and Evolution','Biology: Our Environment'] },
    { name: 'Social Science', chapters: ['History','Geography','Civics','Economics'] },
    { name: 'First Language', chapters: ['Prose','Poetry','Grammar','Composition','Comprehension'] },
    { name: 'English', chapters: ['Prose','Poetry','Grammar','Composition','Comprehension'] },
  ];
}

export function getOtherSyllabus(_classLevel: ClassLevel): SyllabusSubject[] {
  return [
    { name: 'Mathematics', chapters: ['Algebra','Geometry','Trigonometry','Statistics','Calculus'] },
    { name: 'Science', chapters: ['Physics','Chemistry','Biology'] },
    { name: 'English', chapters: ['Literature','Grammar','Writing'] },
    { name: 'Social Studies', chapters: ['History','Geography','Civics','Economics'] },
  ];
}
