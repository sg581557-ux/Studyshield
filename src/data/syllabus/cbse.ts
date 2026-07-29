import type { SyllabusSubject } from '../../types';

const cbseMaths: Record<string, string[]> = {
  '5': ['Shapes', 'Numbers', 'Addition & Subtraction', 'Multiplication & Division', 'Fractions', 'Measurement'],
  '6': ['Knowing Our Numbers', 'Whole Numbers', 'Playing with Numbers', 'Basic Geometrical Ideas', 'Integers', 'Fractions', 'Decimals', 'Data Handling', 'Mensuration', 'Algebra'],
  '7': ['Integers', 'Fractions & Decimals', 'Data Handling', 'Simple Equations', 'Lines & Angles', 'Triangles', 'Comparing Quantities', 'Rational Numbers', 'Perimeter & Area', 'Algebraic Expressions'],
  '8': ['Rational Numbers', 'Linear Equations', 'Understanding Quadrilaterals', 'Data Handling', 'Squares & Square Roots', 'Cubes & Cube Roots', 'Comparing Quantities', 'Algebraic Expressions', 'Mensuration', 'Factorisation'],
  '9': ['Number Systems', 'Polynomials', 'Coordinate Geometry', 'Linear Equations', 'Euclid\'s Geometry', 'Lines & Angles', 'Triangles', 'Circles', 'Heron\'s Formula', 'Surface Areas & Volumes', 'Statistics'],
  '10': ['Real Numbers', 'Polynomials', 'Pair of Linear Equations', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas & Volumes', 'Statistics', 'Probability'],
};
const cbseScience: Record<string, string[]> = {
  '5': ['Living Things', 'Human Body', 'Plants', 'Environment', 'Materials', 'Earth & Universe'],
  '6': ['Food', 'Materials', 'Living World', 'Motion & Measurement', 'Light', 'Electricity', 'Water', 'Air'],
  '7': ['Nutrition in Plants', 'Nutrition in Animals', 'Heat', 'Acids, Bases & Salts', 'Physical Changes', 'Weather & Climate', 'Wind & Storms', 'Soil', 'Respiration', 'Reproduction in Plants', 'Water'],
  '8': ['Crop Production', 'Microorganisms', 'Synthetic Fibres', 'Metals & Non-Metals', 'Coal & Petroleum', 'Combustion', 'Conservation', 'Cell', 'Reproduction', 'Adolescence', 'Force & Pressure', 'Friction', 'Sound', 'Chemical Effects', 'Light', 'Solar System'],
  '9': ['Matter', 'Is Matter Around Us Pure', 'Atoms & Molecules', 'Structure of Atom', 'Cell', 'Tissues', 'Diversity in Living Organisms', 'Motion', 'Force & Laws of Motion', 'Gravitation', 'Work & Energy', 'Sound', 'Natural Resources'],
  '10': ['Chemical Reactions', 'Acids, Bases & Salts', 'Metals & Non-Metals', 'Carbon & Its Compounds', 'Life Processes', 'Control & Coordination', 'Reproduction', 'Heredity & Evolution', 'Light Reflection & Refraction', 'Human Eye', 'Electricity', 'Magnetic Effects', 'Sources of Energy', 'Environment', 'Management of Natural Resources'],
};

export function getCbseSyllabus(cls: string): SyllabusSubject[] {
  const subjects: SyllabusSubject[] = [];
  if (cbseMaths[cls]) subjects.push({ name: 'Mathematics', chapters: cbseMaths[cls] });
  if (cbseScience[cls]) subjects.push({ name: 'Science', chapters: cbseScience[cls] });
  return subjects.length > 0 ? subjects : [{ name: 'General Studies', chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3'] }];
}
