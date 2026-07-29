import type { SyllabusSubject } from '../../types';
import { getCbseSyllabus } from './cbse';

const icseMaths: Record<string, string[]> = {
  '5': ['Numbers', 'Operations', 'Fractions', 'Geometry', 'Measurement'],
  '6': ['Number System', 'Integers', 'Fractions', 'Decimals', 'Ratio & Proportion', 'Algebra', 'Geometry'],
  '7': ['Integers', 'Rational Numbers', 'Exponents', 'Algebraic Expressions', 'Linear Equations', 'Geometry', 'Mensuration'],
  '8': ['Rational Numbers', 'Exponents', 'Squares & Square Roots', 'Cubes & Cube Roots', 'Algebraic Expressions', 'Linear Equations', 'Geometry', 'Mensuration', 'Data Handling'],
  '9': ['Rational & Irrational Numbers', 'Compound Interest', 'Expansions', 'Factorisation', 'Simultaneous Equations', 'Indices', 'Logarithms', 'Triangles', 'Mid-Point Theorem', 'Pythagoras Theorem', 'Trigonometry', 'Statistics'],
  '10': ['Commercial Mathematics', 'Algebra', 'Geometry', 'Trigonometry', 'Mensuration', 'Statistics', 'Probability'],
};
const icseScience: Record<string, string[]> = {
  '5': ['Living Things', 'Human Body', 'Plants', 'Environment'],
  '6': ['Matter', 'Living World', 'Motion & Measurement', 'Light', 'Electricity'],
  '7': ['Basic Biology', 'Basic Chemistry', 'Basic Physics', 'Heat', 'Environment'],
  '8': ['Transport in Plants & Animals', 'Reproduction', 'Ecosystem', 'Human Body', 'Atomic Structure', 'Chemical Bonding', 'Metals & Non-Metals', 'Motion', 'Energy', 'Light', 'Sound', 'Electricity'],
  '9': ['Biology: Cell, Tissues, Vegetative Propagation', 'Chemistry: Matter, Atomic Structure, Periodic Table, Chemical Bonding', 'Physics: Measurements, Motion, Laws of Motion, Energy, Machines'],
  '10': ['Biology: Cell Biology, Genetics, Plant Physiology, Human Anatomy', 'Chemistry: Periodic Table, Chemical Bonding, Acids Bases Salts, Mole Concept, Electrolysis', 'Physics: Force, Work Energy Power, Machines, Light, Sound, Electricity, Heat'],
};

export function getIcseSyllabus(cls: string): SyllabusSubject[] {
  const subjects: SyllabusSubject[] = [];
  if (icseMaths[cls]) subjects.push({ name: 'Mathematics', chapters: icseMaths[cls] });
  if (icseScience[cls]) subjects.push({ name: 'Science', chapters: icseScience[cls] });
  return subjects.length > 0 ? subjects : [{ name: 'General Studies', chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3'] }];
}

export function getStateBoardSyllabus(cls: string): SyllabusSubject[] {
  return getCbseSyllabus(cls);
}

export function getOtherSyllabus(cls: string): SyllabusSubject[] {
  return getCbseSyllabus(cls);
}
