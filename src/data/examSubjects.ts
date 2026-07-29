import type { SyllabusSubject } from '../types';

export interface ExamSubjectConfig {
  examId: string;
  subjects: SyllabusSubject[];
}

const defaultChapters = (subject: string, count = 10): string[] =>
  Array.from({ length: count }, (_, i) => `${subject} Chapter ${i + 1}`);

export const examSubjectMap: Record<string, SyllabusSubject[]> = {
  // Engineering
  'jee-main': [
    { name: 'Physics', chapters: ['Units & Dimensions', 'Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Oscillations', 'Waves', 'Electrostatics', 'Current Electricity', 'Magnetism', 'EMI', 'AC', 'Optics', 'Modern Physics', 'Semiconductors'] },
    { name: 'Chemistry', chapters: ['Mole Concept', 'Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 'Redox', 'p-Block', 's-Block', 'Hydrocarbons', 'GOC', 'Electrochemistry', 'Kinetics', 'Coordination', 'd & f Block', 'Haloalkanes', 'Alcohols', 'Aldehydes', 'Amines', 'Biomolecules'] },
    { name: 'Mathematics', chapters: ['Sets', 'Relations & Functions', 'Trigonometry', 'Complex Numbers', 'Quadratic Equations', 'Sequences & Series', 'Permutations', 'Binomial Theorem', 'Straight Lines', 'Conic Sections', '3D Geometry', 'Limits & Derivatives', 'Statistics', 'Probability', 'Matrices', 'Determinants', 'Continuity', 'Integration', 'Differential Equations', 'Vectors'] },
  ],
  'jee-advanced': [
    { name: 'Physics', chapters: ['Units & Dimensions', 'Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Oscillations', 'Waves', 'Electrostatics', 'Current Electricity', 'Magnetism', 'EMI', 'AC', 'Optics', 'Modern Physics', 'Semiconductors'] },
    { name: 'Chemistry', chapters: ['Mole Concept', 'Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 'Redox', 'p-Block', 's-Block', 'Hydrocarbons', 'GOC', 'Electrochemistry', 'Kinetics', 'Coordination', 'd & f Block', 'Haloalkanes', 'Alcohols', 'Aldehydes', 'Amines', 'Biomolecules'] },
    { name: 'Mathematics', chapters: ['Sets', 'Relations & Functions', 'Trigonometry', 'Complex Numbers', 'Quadratic Equations', 'Sequences & Series', 'Permutations', 'Binomial Theorem', 'Straight Lines', 'Conic Sections', '3D Geometry', 'Limits & Derivatives', 'Statistics', 'Probability', 'Matrices', 'Determinants', 'Continuity', 'Integration', 'Differential Equations', 'Vectors'] },
  ],
  'bitsat': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
    { name: 'English', chapters: ['Grammar', 'Vocabulary', 'Reading Comprehension'] },
    { name: 'Logical Reasoning', chapters: ['Verbal', 'Non-Verbal', 'Analytical'] },
  ],
  'viteee': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
    { name: 'English', chapters: ['Grammar', 'Comprehension'] },
  ],
  'wbjee': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
  ],
  'mht-cet': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
  ],
  'comedk': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
  ],
  'kcet': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
  ],
  // Medical
  'neet-ug': [
    { name: 'Physics', chapters: ['Units & Dimensions', 'Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Oscillations', 'Waves', 'Electrostatics', 'Current Electricity', 'Magnetism', 'EMI', 'AC', 'Optics', 'Modern Physics', 'Semiconductors'] },
    { name: 'Chemistry', chapters: ['Mole Concept', 'Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 'Redox', 'p-Block', 's-Block', 'Hydrocarbons', 'GOC', 'Electrochemistry', 'Kinetics', 'Coordination', 'd & f Block', 'Haloalkanes', 'Alcohols', 'Aldehydes', 'Amines', 'Biomolecules'] },
    { name: 'Biology', chapters: ['The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom', 'Morphology of Plants', 'Anatomy of Plants', 'Cell Biology', 'Biomolecules', 'Cell Cycle', 'Photosynthesis', 'Respiration', 'Plant Growth', 'Digestion', 'Breathing', 'Circulation', 'Excretion', 'Locomotion', 'Neural Control', 'Chemical Coordination', 'Reproduction', 'Genetics', 'Evolution', 'Human Health', 'Microbes', 'Biotechnology', 'Ecology', 'Biodiversity'] },
  ],
  'aiims': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Biology', chapters: defaultChapters('Biology', 15) },
    { name: 'General Knowledge', chapters: ['Current Affairs', 'General Awareness'] },
  ],
  'jipmer': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Biology', chapters: defaultChapters('Biology', 15) },
    { name: 'English', chapters: ['Grammar', 'Comprehension'] },
  ],
  // Commerce
  'ca-foundation': [
    { name: 'Principles and Practice of Accounting', chapters: ['Theoretical Framework', 'Accounting Process', 'Bank Reconciliation', 'Depreciation', 'Bills of Exchange', 'Final Accounts', 'Partnership', 'Company Accounts'] },
    { name: 'Business Laws', chapters: ['Indian Contract Act', 'Sale of Goods Act', 'Indian Partnership Act', 'Limited Liability Partnership', 'Companies Act', 'Negotiable Instruments Act'] },
    { name: 'Quantitative Aptitude', chapters: ['Ratio & Proportion', 'Time Value of Money', 'Sequence & Series', 'Sets & Functions', 'Calculus', 'Statistics', 'Probability'] },
    { name: 'Business Economics', chapters: ['Demand & Supply', 'Production', 'Cost', 'Market Structure', 'National Income', 'Public Finance', 'International Trade'] },
  ],
  'ca-intermediate': [
    { name: 'Accounting', chapters: defaultChapters('Accounting') },
    { name: 'Corporate Laws', chapters: defaultChapters('Corporate Laws') },
    { name: 'Cost & Management Accounting', chapters: defaultChapters('Cost Accounting') },
    { name: 'Taxation', chapters: defaultChapters('Taxation') },
    { name: 'Auditing', chapters: defaultChapters('Auditing') },
    { name: 'Financial Management', chapters: defaultChapters('Financial Management') },
  ],
  'ca-final': [
    { name: 'Financial Reporting', chapters: defaultChapters('Financial Reporting') },
    { name: 'Strategic Financial Management', chapters: defaultChapters('Strategic FM') },
    { name: 'Advanced Auditing', chapters: defaultChapters('Advanced Auditing') },
    { name: 'Corporate Laws', chapters: defaultChapters('Corporate Laws') },
    { name: 'Direct Tax', chapters: defaultChapters('Direct Tax') },
    { name: 'Indirect Tax', chapters: defaultChapters('Indirect Tax') },
  ],
  'cs-executive': [
    { name: 'Jurisprudence', chapters: defaultChapters('Jurisprudence') },
    { name: 'Company Law', chapters: defaultChapters('Company Law') },
    { name: 'Tax Laws', chapters: defaultChapters('Tax Laws') },
    { name: 'Corporate Accounting', chapters: defaultChapters('Corporate Accounting') },
  ],
  'cs-professional': [
    { name: 'Corporate Law', chapters: defaultChapters('Corporate Law') },
    { name: 'Securities Laws', chapters: defaultChapters('Securities Laws') },
    { name: 'Corporate Governance', chapters: defaultChapters('Corporate Governance') },
    { name: 'Strategic Management', chapters: defaultChapters('Strategic Management') },
  ],
  'cma-foundation': [
    { name: 'Fundamentals of Economics', chapters: defaultChapters('Economics') },
    { name: 'Fundamentals of Accounting', chapters: defaultChapters('Accounting') },
    { name: 'Fundamentals of Laws', chapters: defaultChapters('Laws') },
    { name: 'Fundamentals of Business Mathematics', chapters: defaultChapters('Business Maths') },
  ],
  'cma-intermediate': [
    { name: 'Cost Accounting', chapters: defaultChapters('Cost Accounting') },
    { name: 'Financial Accounting', chapters: defaultChapters('Financial Accounting') },
    { name: 'Direct Taxation', chapters: defaultChapters('Direct Tax') },
    { name: 'Operations Management', chapters: defaultChapters('Operations') },
  ],
  // Government
  'upsc-cse': [
    { name: 'GS', chapters: ['History', 'Geography', 'Polity', 'Economy', 'Science & Tech', 'Environment', 'Art & Culture'] },
    { name: 'CSAT', chapters: ['Comprehension', 'Logical Reasoning', 'Data Interpretation', 'Decision Making'] },
    { name: 'Current Affairs', chapters: ['National', 'International', 'Economy', 'Science', 'Environment', 'Social Issues'] },
    { name: 'Optional Subject', chapters: ['Choose your optional'] },
  ],
  'ssc-cgl': [
    { name: 'Quantitative Aptitude', chapters: ['Number System', 'Percentage', 'Profit & Loss', 'Time & Work', 'Geometry', 'Trigonometry', 'Algebra', 'Data Interpretation'] },
    { name: 'English', chapters: ['Grammar', 'Vocabulary', 'Comprehension', 'Cloze Test'] },
    { name: 'General Intelligence', chapters: ['Verbal', 'Non-Verbal', 'Logical'] },
    { name: 'General Awareness', chapters: ['History', 'Geography', 'Polity', 'Economy', 'Science', 'Current Affairs'] },
  ],
  'ssc-chsl': [
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'General Intelligence', chapters: defaultChapters('Reasoning') },
    { name: 'General Awareness', chapters: defaultChapters('GK') },
  ],
  'ssc-gd': [
    { name: 'General Intelligence', chapters: defaultChapters('Reasoning') },
    { name: 'General Awareness', chapters: defaultChapters('GK') },
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'English', chapters: defaultChapters('English') },
  ],
  'ibps-po-clerk': [
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'Banking Awareness', chapters: defaultChapters('Banking') },
    { name: 'Computer Knowledge', chapters: defaultChapters('Computer') },
  ],
  'sbi-po': [
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'Banking Awareness', chapters: defaultChapters('Banking') },
  ],
  'rbi-grade-b': [
    { name: 'Economics', chapters: defaultChapters('Economics') },
    { name: 'Finance', chapters: defaultChapters('Finance') },
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
  ],
  'railway-exams': [
    { name: 'Mathematics', chapters: defaultChapters('Maths') },
    { name: 'Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'General Science', chapters: defaultChapters('Science') },
    { name: 'General Awareness', chapters: defaultChapters('GK') },
  ],
  'state-psc': [
    { name: 'General Studies', chapters: defaultChapters('GS') },
    { name: 'CSAT', chapters: defaultChapters('CSAT') },
    { name: 'Current Affairs', chapters: defaultChapters('Current Affairs') },
  ],
  // Defence
  'nda': [
    { name: 'Mathematics', chapters: ['Algebra', 'Trigonometry', 'Calculus', 'Vectors', 'Probability', 'Geometry', 'Statistics'] },
    { name: 'General Studies', chapters: ['Physics', 'Chemistry', 'History', 'Geography', 'Polity', 'Current Affairs'] },
    { name: 'English', chapters: ['Grammar', 'Vocabulary', 'Comprehension'] },
  ],
  'cds': [
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'General Knowledge', chapters: defaultChapters('GK') },
    { name: 'Mathematics', chapters: defaultChapters('Maths') },
  ],
  'afcat': [
    { name: 'General Awareness', chapters: defaultChapters('GK') },
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'Numerical Ability', chapters: defaultChapters('Quant') },
    { name: 'Reasoning', chapters: defaultChapters('Reasoning') },
  ],
  'agniveer': [
    { name: 'General Knowledge', chapters: defaultChapters('GK') },
    { name: 'Mathematics', chapters: defaultChapters('Maths') },
    { name: 'Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'Science', chapters: defaultChapters('Science') },
  ],
  // Law
  'clat': [
    { name: 'English Language', chapters: ['Reading Comprehension', 'Grammar', 'Vocabulary'] },
    { name: 'Legal Reasoning', chapters: ['Constitutional Law', 'Torts', 'Contracts', 'Criminal Law'] },
    { name: 'Logical Reasoning', chapters: ['Analytical', 'Critical'] },
    { name: 'Quantitative Techniques', chapters: ['Data Interpretation', 'Percentages', 'Ratio'] },
    { name: 'Current Affairs', chapters: ['National', 'International', 'Legal Current Affairs'] },
  ],
  'ailet': [
    { name: 'English', chapters: defaultChapters('English') },
    { name: 'Legal Reasoning', chapters: defaultChapters('Legal Reasoning') },
    { name: 'Logical Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'Current Affairs', chapters: defaultChapters('Current Affairs') },
  ],
  // MBA
  'cat': [
    { name: 'VARC', chapters: ['Reading Comprehension', 'Verbal Ability', 'Para Jumbles', 'Vocabulary'] },
    { name: 'DILR', chapters: ['Data Interpretation', 'Logical Reasoning', 'Puzzles', 'Syllogisms'] },
    { name: 'Quantitative Aptitude', chapters: ['Number System', 'Algebra', 'Geometry', 'Arithmetic', 'Probability'] },
  ],
  'xat': [
    { name: 'Verbal Ability', chapters: defaultChapters('Verbal') },
    { name: 'Decision Making', chapters: defaultChapters('Decision Making') },
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'General Knowledge', chapters: defaultChapters('GK') },
  ],
  'snap': [
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'Logical Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'English', chapters: defaultChapters('English') },
  ],
  'nmat': [
    { name: 'Quantitative Aptitude', chapters: defaultChapters('Quant') },
    { name: 'Logical Reasoning', chapters: defaultChapters('Reasoning') },
    { name: 'Language Skills', chapters: defaultChapters('English') },
  ],
  // School
  'cbse-10': [
    { name: 'Mathematics', chapters: ['Real Numbers', 'Polynomials', 'Linear Equations', 'Quadratic Equations', 'AP', 'Triangles', 'Coordinate Geometry', 'Trigonometry', 'Circles', 'Areas', 'Volumes', 'Statistics', 'Probability'] },
    { name: 'Science', chapters: ['Chemical Reactions', 'Acids Bases Salts', 'Metals & Non-Metals', 'Carbon Compounds', 'Life Processes', 'Control & Coordination', 'Reproduction', 'Heredity & Evolution', 'Light', 'Human Eye', 'Electricity', 'Magnetic Effects', 'Environment', 'Natural Resources'] },
    { name: 'Social Science', chapters: ['Nationalism in India', 'Globalization', 'Power Sharing', 'Federalism', 'Democracy', 'Economic Development', 'Sectors of Economy', 'Money & Credit', 'Globalization'] },
    { name: 'English', chapters: ['Prose', 'Poetry', 'Grammar', 'Writing'] },
  ],
  'cbse-12': [
    { name: 'Physics', chapters: ['Electrostatics', 'Current Electricity', 'Magnetism', 'EMI', 'AC', 'Optics', 'Dual Nature', 'Atoms', 'Nuclei', 'Semiconductors'] },
    { name: 'Chemistry', chapters: ['Solutions', 'Electrochemistry', 'Kinetics', 'Coordination', 'Haloalkanes', 'Alcohols', 'Aldehydes', 'Amines', 'Biomolecules'] },
    { name: 'Mathematics', chapters: ['Matrices', 'Determinants', 'Continuity', 'Integration', 'Differential Equations', 'Vectors', '3D Geometry', 'Probability'] },
    { name: 'English', chapters: ['Prose', 'Poetry', 'Grammar', 'Writing'] },
  ],
  'isc': [
    { name: 'Physics', chapters: defaultChapters('Physics') },
    { name: 'Chemistry', chapters: defaultChapters('Chemistry') },
    { name: 'Mathematics', chapters: defaultChapters('Mathematics') },
    { name: 'English', chapters: defaultChapters('English') },
  ],
  'icse': [
    { name: 'Mathematics', chapters: defaultChapters('Maths') },
    { name: 'Science', chapters: defaultChapters('Science') },
    { name: 'Social Science', chapters: defaultChapters('Social Science') },
    { name: 'English', chapters: defaultChapters('English') },
  ],
  'state-boards': [
    { name: 'Mathematics', chapters: defaultChapters('Maths') },
    { name: 'Science', chapters: defaultChapters('Science') },
    { name: 'Social Science', chapters: defaultChapters('Social Science') },
    { name: 'English', chapters: defaultChapters('English') },
  ],
  // International
  'sat': [
    { name: 'Reading', chapters: ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English'] },
    { name: 'Writing', chapters: ['Essay', 'Grammar', 'Usage'] },
    { name: 'Mathematics', chapters: ['Algebra', 'Problem Solving', 'Advanced Math', 'Geometry', 'Trigonometry'] },
  ],
  'act': [
    { name: 'English', chapters: ['Grammar', 'Usage', 'Rhetoric'] },
    { name: 'Mathematics', chapters: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'] },
    { name: 'Reading', chapters: ['Prose', 'Social Science', 'Humanities'] },
    { name: 'Science', chapters: ['Data Analysis', 'Research Summary', 'Conflicting Viewpoints'] },
  ],
  'gre': [
    { name: 'Verbal Reasoning', chapters: ['Reading Comprehension', 'Text Completion', 'Sentence Equivalence'] },
    { name: 'Quantitative Reasoning', chapters: ['Arithmetic', 'Algebra', 'Geometry', 'Data Analysis'] },
    { name: 'Analytical Writing', chapters: ['Issue Essay', 'Argument Essay'] },
  ],
  'gmat': [
    { name: 'Quantitative', chapters: ['Problem Solving', 'Data Sufficiency'] },
    { name: 'Verbal', chapters: ['Reading Comprehension', 'Critical Reasoning', 'Sentence Correction'] },
    { name: 'Data Insights', chapters: ['Data Analysis', 'Multi-Source Reasoning'] },
  ],
  'ielts': [
    { name: 'Listening', chapters: ['Conversations', 'Monologues', 'Academic Discussions'] },
    { name: 'Reading', chapters: ['Academic Reading', 'General Reading'] },
    { name: 'Writing', chapters: ['Task 1', 'Task 2'] },
    { name: 'Speaking', chapters: ['Introduction', 'Cue Card', 'Discussion'] },
  ],
  'toefl': [
    { name: 'Reading', chapters: defaultChapters('Reading') },
    { name: 'Listening', chapters: defaultChapters('Listening') },
    { name: 'Speaking', chapters: defaultChapters('Speaking') },
    { name: 'Writing', chapters: defaultChapters('Writing') },
  ],
  // Other
  'gate': [
    { name: 'General Aptitude', chapters: ['Verbal', 'Numerical', 'Spatial', 'Analytical'] },
    { name: 'Engineering Mathematics', chapters: ['Linear Algebra', 'Calculus', 'Differential Equations', 'Probability'] },
    { name: 'Core Subject', chapters: ['Choose your specialization'] },
  ],
  'ugc-net': [
    { name: 'General Paper', chapters: ['Reasoning', 'Data Interpretation', 'Higher Education', 'Research Aptitude'] },
    { name: 'Subject Paper', chapters: ['Choose your subject'] },
  ],
  'cuet-ug': [
    { name: 'Language', chapters: defaultChapters('Language') },
    { name: 'Domain Subject', chapters: defaultChapters('Domain') },
    { name: 'General Test', chapters: ['Reasoning', 'Quantitative', 'General Knowledge'] },
  ],
  'cuet-pg': [
    { name: 'Core Subject', chapters: defaultChapters('Core Subject') },
    { name: 'General Aptitude', chapters: defaultChapters('Aptitude') },
  ],
  'nift': [
    { name: 'Creative Ability', chapters: ['Design', 'Drawing', 'Innovation'] },
    { name: 'General Ability', chapters: ['Quantitative', 'Analytical', 'Communication', 'English'] },
  ],
  'nid': [
    { name: 'Design Aptitude', chapters: ['Drawing', 'Visual Design', 'Creativity'] },
    { name: 'General Knowledge', chapters: ['Current Affairs', 'Design History'] },
  ],
};

export function getExamSubjects(examId: string): SyllabusSubject[] {
  return examSubjectMap[examId] ?? [{ name: 'General Studies', chapters: defaultChapters('General Studies') }];
}
