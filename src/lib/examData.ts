/**
 * StudyShield — Master Syllabus Database
 * =====================================
 * Single source of truth for all exams, subjects, and chapters.
 * Do NOT duplicate chapter lists elsewhere; import from this file instead.
 */

export interface Subject {
  name: string;
  chapters: string[];
}

export interface Exam {
  id: string;
  name: string;
  category: string;
  subjects: Subject[];
}

// ---------------------------------------------------------------------------
// 1. JEE Main
// ---------------------------------------------------------------------------
const JEE_MAIN_PHYSICS = [
  'Units and Measurements',
  'Kinematics',
  'Laws of Motion',
  'Work, Energy and Power',
  'Rotational Motion',
  'Gravitation',
  'Properties of Solids and Liquids',
  'Thermodynamics',
  'Kinetic Theory of Gases',
  'Oscillations and Waves',
  'Electrostatics',
  'Current Electricity',
  'Magnetic Effects of Current and Magnetism',
  'Electromagnetic Induction and Alternating Currents',
  'Electromagnetic Waves',
  'Optics',
  'Dual Nature of Matter and Radiation',
  'Atoms and Nuclei',
  'Electronic Devices',
  'Communication Systems',
];

const JEE_MAIN_CHEMISTRY = [
  'Some Basic Concepts of Chemistry',
  'Atomic Structure',
  'Classification of Elements and Periodicity',
  'Chemical Bonding and Molecular Structure',
  'States of Matter',
  'Thermodynamics',
  'Equilibrium',
  'Redox Reactions',
  'Hydrogen',
  'The s-Block Elements',
  'The p-Block Elements (Group 13 & 14)',
  'Organic Chemistry — Some Basic Principles',
  'Hydrocarbons',
  'Environmental Chemistry',
  'The Solid State',
  'Solutions',
  'Electrochemistry',
  'Chemical Kinetics',
  'Surface Chemistry',
  'The p-Block Elements (Group 15-18)',
  'The d- and f-Block Elements',
  'Coordination Compounds',
  'Haloalkanes and Haloarenes',
  'Alcohols, Phenols and Ethers',
  'Aldehydes, Ketones and Carboxylic Acids',
  'Amines',
  'Biomolecules',
  'Polymers',
  'Chemistry in Everyday Life',
];

const JEE_MAIN_MATHS = [
  'Sets, Relations and Functions',
  'Complex Numbers and Quadratic Equations',
  'Matrices and Determinants',
  'Permutations and Combinations',
  'Mathematical Induction',
  'Binomial Theorem and Its Simple Applications',
  'Sequences and Series',
  'Limit, Continuity and Differentiability',
  'Applications of Derivatives',
  'Integral Calculus',
  'Applications of Integrals',
  'Differential Equations',
  'Coordinate Geometry — Straight Lines',
  'Coordinate Geometry — Circles',
  'Coordinate Geometry — Conic Sections',
  'Three-Dimensional Geometry',
  'Vector Algebra',
  'Statistics and Probability',
  'Trigonometric Functions and Identities',
  'Inverse Trigonometric Functions',
  'Mathematical Reasoning',
];

// ---------------------------------------------------------------------------
// 2. JEE Advanced (slightly expanded)
// ---------------------------------------------------------------------------
const JEE_ADV_PHYSICS = [
  ...JEE_MAIN_PHYSICS,
  'General Physics (Units, Dimensions, Experimental Skills)',
  'Practical Physics (Error Analysis, Experiments)',
];

const JEE_ADV_CHEMISTRY = [
  ...JEE_MAIN_CHEMISTRY,
  'Practical Chemistry (Salt Analysis, Volumetric Analysis)',
  'Qualitative Organic Analysis',
];

const JEE_ADV_MATHS = [
  ...JEE_MAIN_MATHS,
  'Calculus of Several Variables',
  'Probability Distributions',
  'Numerical Methods',
];

// ---------------------------------------------------------------------------
// 3. NEET
// ---------------------------------------------------------------------------
const NEET_PHYSICS = [
  'Physical World and Measurement',
  'Kinematics',
  'Laws of Motion',
  'Work, Energy and Power',
  'Rotational Motion',
  'Gravitation',
  'Properties of Bulk Matter',
  'Thermodynamics',
  'Kinetic Theory of Gases',
  'Oscillations and Waves',
  'Electrostatics',
  'Current Electricity',
  'Magnetic Effects of Current and Magnetism',
  'Electromagnetic Induction and Alternating Currents',
  'Electromagnetic Waves',
  'Ray Optics and Optical Instruments',
  'Wave Optics',
  'Dual Nature of Matter and Radiation',
  'Atoms and Nuclei',
  'Semiconductor Electronics',
];

const NEET_CHEMISTRY = [
  'Some Basic Concepts of Chemistry',
  'Structure of Atom',
  'Classification of Elements and Periodicity',
  'Chemical Bonding and Molecular Structure',
  'States of Matter',
  'Thermodynamics',
  'Equilibrium',
  'Redox Reactions',
  'Hydrogen',
  's-Block Elements',
  'p-Block Elements',
  'Organic Chemistry — Basic Principles',
  'Hydrocarbons',
  'Environmental Chemistry',
  'Solid State',
  'Solutions',
  'Electrochemistry',
  'Chemical Kinetics',
  'Surface Chemistry',
  'p-Block Elements (Group 15-18)',
  'd- and f-Block Elements',
  'Coordination Compounds',
  'Haloalkanes and Haloarenes',
  'Alcohols, Phenols and Ethers',
  'Aldehydes, Ketones and Carboxylic Acids',
  'Amines',
  'Biomolecules',
  'Polymers',
  'Chemistry in Everyday Life',
];

const NEET_BOTANY = [
  'The Living World',
  'Biological Classification',
  'Plant Kingdom',
  'Morphology of Flowering Plants',
  'Anatomy of Flowering Plants',
  'Cell — The Unit of Life',
  'Cell Cycle and Cell Division',
  'Transport in Plants',
  'Mineral Nutrition',
  'Photosynthesis in Higher Plants',
  'Respiration in Plants',
  'Plant Growth and Development',
  'Reproduction in Organisms',
  'Sexual Reproduction in Flowering Plants',
  'Principles of Inheritance and Variation',
  'Molecular Basis of Inheritance',
  'Strategies for Enhancement in Food Production',
  'Microbes in Human Welfare',
  'Biotechnology — Principles and Processes',
  'Biotechnology and Its Applications',
  'Organisms and Populations',
  'Ecosystem',
  'Biodiversity and Conservation',
  'Environmental Issues',
];

const NEET_ZOOLOGY = [
  'Animal Kingdom',
  'Structural Organisation in Animals',
  'Digestion and Absorption',
  'Breathing and Exchange of Gases',
  'Body Fluids and Circulation',
  'Excretory Products and Their Elimination',
  'Locomotion and Movement',
  'Neural Control and Coordination',
  'Chemical Coordination and Integration',
  'Human Reproduction',
  'Reproductive Health',
  'Evolution',
  'Human Health and Disease',
  'Strategies for Enhancement in Food Production',
  'Microbes in Human Welfare',
  'Biotechnology and Its Applications',
  'Organisms and Populations',
  'Ecosystem',
  'Biodiversity and Conservation',
  'Environmental Issues',
];

// ---------------------------------------------------------------------------
// 4. UPSC CSE
// ---------------------------------------------------------------------------
const UPSC_HISTORY = [
  'Ancient Indian History',
  'Medieval Indian History',
  'Modern Indian History',
  'Indian National Movement',
  'World History',
  'Post-Independence Consolidation',
  'Art and Architecture',
  'Literature and Culture',
];

const UPSC_GEOGRAPHY = [
  'Geomorphology',
  'Climatology',
  'Oceanography',
  'Biogeography',
  'Indian Geography — Physical',
  'Indian Geography — Economic',
  'World Geography',
  'Agriculture and Irrigation',
  'Minerals and Industries',
  'Transport and Communication',
];

const UPSC_POLITY = [
  'Indian Constitution — Historical Underpinnings',
  'Union and State Executive',
  'Parliament and State Legislatures',
  'Judiciary',
  'Federalism and Local Government',
  'Constitutional Bodies',
  'Statutory and Non-Statutory Bodies',
  'Fundamental Rights and DPSP',
  'Electoral System and Political Parties',
  'Constitutional Amendments',
];

const UPSC_ECONOMICS = [
  'Basic Concepts of Economics',
  'National Income and Accounting',
  'Money and Banking',
  'Inflation',
  'Public Finance',
  'Fiscal Policy',
  'Monetary Policy',
  'Balance of Payments',
  'International Trade and Organisations',
  'Indian Economy — Planning and Reforms',
];

const UPSC_SCI_TECH = [
  'Space Technology',
  'Defence Technology',
  'Information Technology',
  'Biotechnology',
  'Nanotechnology',
  'Energy and Power',
  'Health and Medicine',
  'Robotics and AI',
];

const UPSC_ENVIRONMENT = [
  'Ecology and Ecosystem',
  'Biodiversity',
  'Conservation Issues',
  'Environmental Pollution',
  'Climate Change',
  'Environmental Laws and Policies',
  'Disaster Management',
];

const UPSC_CURRENT_AFFAIRS = [
  'National Affairs',
  'International Affairs',
  'Economic Survey and Budget',
  'Government Schemes and Programmes',
  'Awards and Honours',
  'Sports and Games',
  'Science and Tech Updates',
  'Persons and Places in News',
];

const UPSC_ETHICS = [
  'Ethics and Human Interface',
  'Attitude',
  'Aptitude and Foundational Values',
  'Emotional Intelligence',
  'Contributions of Moral Thinkers',
  'Ethics in Public Administration',
  'Ethics in Private Relationships',
  'Case Studies on Ethics',
];

// ---------------------------------------------------------------------------
// 5. CA Foundation
// ---------------------------------------------------------------------------
const CA_FOUND_ACCOUNTING = [
  'Theoretical Framework',
  'Accounting Process',
  'Bank Reconciliation Statement',
  'Depreciation Accounting',
  'Accounting for Special Transactions',
  'Preparation of Final Accounts',
  'Accounting for Partnership Firms',
  'Financial Statements of Not-for-Profit Organisations',
  'Introduction to Company Accounts',
];

const CA_FOUND_BUSINESS_LAWS = [
  'Indian Regulatory Framework',
  'The Indian Contract Act, 1872',
  'The Sale of Goods Act, 1930',
  'The Indian Partnership Act, 1932',
  'The Limited Liability Partnership Act, 2008',
  'The Companies Act, 2013',
  'The Negotiable Instruments Act, 1881',
  'The General Clauses Act, 1897',
  'Interpretation of Statutes',
];

const CA_FOUND_MATHEMATICS = [
  'Ratio and Proportion',
  'Time Value of Money',
  'Sequence and Series',
  'Sets, Relations and Functions',
  'Limits and Continuity',
  'Differentiation and Integration',
  'Permutations and Combinations',
  'Statistical Description of Data',
  'Measures of Central Tendency and Dispersion',
  'Probability',
  'Theoretical Distributions',
];

const CA_FOUND_BUSINESS_ECONOMICS = [
  'Nature and Scope of Economics',
  'Demand and Supply',
  'Theory of Consumer Behaviour',
  'Theory of Production and Cost',
  'Market Structures',
  'National Income',
  'Theory of Income Determination',
  'Business Cycles',
  'Public Finance',
  'International Trade',
];

// ---------------------------------------------------------------------------
// 6. CA Intermediate
// ---------------------------------------------------------------------------
const CA_INTER_ADV_ACCOUNTING = [
  'Framework for Preparation and Presentation of Financial Statements',
  'Accounting Standards',
  'Company Accounts',
  'Amalgamation of Companies',
  'Internal Reconstruction',
  'Consolidated Financial Statements',
  'Accounts of Banking Companies',
  'Accounts of Insurance Companies',
  'Branch Accounts',
  'Departmental Accounts',
  'Dissolution of Partnership Firms',
].filter(Boolean);

const CA_INTER_CORP_LAWS = [
  'Company Formation and Conversion',
  'Memorandum and Articles of Association',
  'Share Capital and Debentures',
  'Acceptance of Deposits',
  'Registration of Charges',
  'Management and Administration',
  'Declaration and Payment of Dividend',
  'Accounts and Audit',
  'Majority Rule and Minority Protection',
  'Oppression and Mismanagement',
  'Compromises, Arrangements and Amalgamations',
  'Winding Up',
];

const CA_INTER_COST_MGMT_ACCOUNTING = [
  'Cost Accounting Standards',
  'Introduction to Cost Accounting',
  'Elements of Cost',
  'Cost Book-keeping',
  'Costing Methods',
  'Cost System',
  'Standard Costing',
  'Variance Analysis',
  'Budgetary Control',
  'Marginal Costing and CVP Analysis',
  'Introduction to Management Accounting',
  'Ratio Analysis',
  'Cash Flow Statement',
  'Cost Management',
];

const CA_INTER_TAXATION = [
  'Basic Concepts of Income Tax',
  'Residential Status and Incidence of Tax',
  'Income under the Head Salaries',
  'Income from House Property',
  'Profits and Gains of Business or Profession',
  'Capital Gains',
  'Income from Other Sources',
  'Income of Other Persons Included in Assessee\'s Total Income',
  'Set Off and Carry Forward of Losses',
  'Deductions from Gross Total Income',
  'Computation of Total Income and Tax Payable',
  'Goods and Services Tax (GST) — Basics',
  'GST — Levy and Collection',
  'GST — Input Tax Credit',
  'GST — Returns and Payment',
];

// ---------------------------------------------------------------------------
// 7. CA Final
// ---------------------------------------------------------------------------
const CA_FINAL_FINANCIAL_REPORTING = [
  'Framework for Preparation and Presentation of Financial Statements',
  'Accounting Standards',
  'Indian Accounting Standards (Ind AS)',
  'Consolidated Financial Statements',
  'Business Combinations and Amalgamations',
  'Corporate Restructuring',
  'Consolidated Financial Statements of Holding and Subsidiary',
  'Associates and Joint Ventures',
  'Foreign Currency Transactions and Translations',
  'Financial Reporting under Government and Not-for-Profit Entities',
  'Accounting for Financial Instruments',
  'Share-Based Payments',
];

const CA_FINAL_SFM = [
  'Financial Management — An Introduction',
  'Financial Policy and Corporate Strategy',
  'Capital Budgeting',
  'Lease Financing',
  'Dividend Decisions',
  'Capital Structure Theories',
  'Cost of Capital',
  'Valuation of Bonds and Shares',
  'Working Capital Management',
  'Risk Management',
  'International Financial Management',
  'Portfolio Management',
  'Mutual Funds',
  'Securitisation',
];

const CA_FINAL_ADV_AUDITING = [
  'Auditing Concepts and Standards',
  'Audit Strategy, Planning and Execution',
  'Risk Assessment and Internal Control',
  'Audit of Financial Statements',
  'Audit of Consolidated Financial Statements',
  'Audit Reports',
  'Audit of Banks',
  'Audit of Insurance Companies',
  'Audit of Non-Banking Financial Companies',
  'Audit of Public Sector Undertakings',
  'Due Diligence',
  'Internal Audit',
  'Forensic Audit',
  'Quality Control and Peer Review',
];

const CA_FINAL_DIRECT_TAX = [
  'Basic Concepts of Income Tax',
  'Residential Status and Scope of Total Income',
  'Income Computation under Various Heads',
  'Special Provisions for Computation of Income',
  'Income of Other Persons Included in Assessee\'s Total Income',
  'Set Off and Carry Forward of Losses',
  'Deductions from Gross Total Income',
  'Computation of Total Income and Tax Liability',
  'Assessment of Companies',
  'Assessment of Trusts, Political Parties, etc.',
  'Minimum Alternate Tax (MAT)',
  'International Taxation',
  'Transfer Pricing',
  'Advance Rulings and Dispute Resolution',
  'Indirect Taxes — GST Overview',
];

// ---------------------------------------------------------------------------
// 8. SSC CGL
// ---------------------------------------------------------------------------
const SSC_CGL_QUANT = [
  'Number System',
  'Percentage',
  'Ratio and Proportion',
  'Average',
  'Profit, Loss and Discount',
  'Simple and Compound Interest',
  'Time and Work',
  'Time, Speed and Distance',
  'Algebra',
  'Geometry',
  'Mensuration',
  'Trigonometry',
  'Data Interpretation',
  'Statistics',
];

const SSC_CGL_REASONING = [
  'Analogy',
  'Classification',
  'Series',
  'Coding-Decoding',
  'Blood Relations',
  'Direction and Distance',
  'Ranking and Order',
  'Syllogism',
  'Venn Diagrams',
  'Paper Folding and Cutting',
  'Embedded Figures',
  'Cube and Dice',
  'Mirror and Water Images',
  'Non-Verbal Reasoning',
];

const SSC_CGL_ENGLISH = [
  'Reading Comprehension',
  'Cloze Test',
  'Spotting Errors',
  'Sentence Improvement',
  'Fill in the Blanks',
  'Synonyms and Antonyms',
  'One-Word Substitution',
  'Idioms and Phrases',
  'Spelling',
  'Active and Passive Voice',
  'Direct and Indirect Speech',
  'Sentence Rearrangement',
];

const SSC_CGL_GENERAL_AWARENESS = [
  'History of India',
  'Geography of India',
  'Indian Polity and Constitution',
  'Indian Economy',
  'General Science',
  'Environmental Science',
  'Current Affairs',
  'Awards and Honours',
  'Books and Authors',
  'Important Days',
  'Sports',
  'Scientific Research',
];

// ---------------------------------------------------------------------------
// 9. SSC CHSL (slightly reduced)
// ---------------------------------------------------------------------------
const SSC_CHSL_QUANT = [
  'Number System',
  'Percentage',
  'Ratio and Proportion',
  'Average',
  'Profit, Loss and Discount',
  'Simple and Compound Interest',
  'Time and Work',
  'Time, Speed and Distance',
  'Algebra',
  'Geometry',
  'Mensuration',
  'Trigonometry',
  'Data Interpretation',
];

const SSC_CHSL_REASONING = [
  'Analogy',
  'Classification',
  'Series',
  'Coding-Decoding',
  'Blood Relations',
  'Direction and Distance',
  'Ranking and Order',
  'Syllogism',
  'Venn Diagrams',
  'Non-Verbal Reasoning',
];

const SSC_CHSL_ENGLISH = [
  'Reading Comprehension',
  'Spotting Errors',
  'Sentence Improvement',
  'Fill in the Blanks',
  'Synonyms and Antonyms',
  'One-Word Substitution',
  'Idioms and Phrases',
  'Spelling',
  'Active and Passive Voice',
  'Direct and Indirect Speech',
];

const SSC_CHSL_GENERAL_AWARENESS = [
  'History of India',
  'Geography of India',
  'Indian Polity and Constitution',
  'Indian Economy',
  'General Science',
  'Current Affairs',
  'Awards and Honours',
  'Sports',
];

// ---------------------------------------------------------------------------
// 10. Banking Exams
// ---------------------------------------------------------------------------
const BANK_QUANT = [
  'Number Series',
  'Simplification and Approximation',
  'Percentage',
  'Ratio and Proportion',
  'Average',
  'Profit, Loss and Discount',
  'Simple and Compound Interest',
  'Time and Work',
  'Time, Speed and Distance',
  'Quadratic Equations',
  'Data Interpretation',
  'Data Sufficiency',
  'Permutation and Combination',
  'Probability',
  'Mensuration',
];

const BANK_REASONING = [
  'Inequalities',
  'Syllogism',
  'Coding-Decoding',
  'Blood Relations',
  'Direction and Distance',
  'Seating Arrangement',
  'Puzzles',
  'Input-Output',
  'Series',
  'Analogy',
  'Classification',
  'Statement and Assumptions',
  'Statement and Conclusions',
  'Course of Action',
  'Non-Verbal Reasoning',
];

const BANK_ENGLISH = [
  'Reading Comprehension',
  'Cloze Test',
  'Spotting Errors',
  'Sentence Improvement',
  'Fill in the Blanks',
  'Para Jumbles',
  'Synonyms and Antonyms',
  'Idioms and Phrases',
  'Spelling',
  'Active and Passive Voice',
  'Direct and Indirect Speech',
  'Vocabulary',
];

const BANK_BANKING_AWARENESS = [
  'History of Banking in India',
  'Structure of Indian Banking System',
  'Reserve Bank of India',
  'Monetary Policy',
  'Banking Products and Services',
  'Types of Accounts',
  'Cheques and Drafts',
  'Loans and Advances',
  'Non-Performing Assets',
  'Financial Inclusion',
  'Banking Reforms',
  'Digital Banking',
  'Payment Systems',
  'Insurance Sector',
  'Financial Markets',
];

const BANK_COMPUTER_AWARENESS = [
  'Computer Fundamentals',
  'Operating Systems',
  'MS Office',
  'Computer Networks',
  'Internet and Email',
  'Database Management Systems',
  'Computer Security and Viruses',
  'E-Banking',
  'Programming Basics',
  'Hardware and Software',
];

// ---------------------------------------------------------------------------
// 11. CAT
// ---------------------------------------------------------------------------
const CAT_QUANT = [
  'Number Systems',
  'Percentage',
  'Profit, Loss and Discount',
  'Ratio and Proportion',
  'Averages',
  'Time and Work',
  'Time, Speed and Distance',
  'Simple and Compound Interest',
  'Algebra',
  'Geometry',
  'Mensuration',
  'Trigonometry',
  'Permutation and Combination',
  'Probability',
  'Set Theory',
  'Logarithms',
  'Progressions and Series',
];

const CAT_LRDI = [
  'Tables',
  'Bar Graphs',
  'Line Charts',
  'Pie Charts',
  'Caselets',
  'Logical Puzzles',
  'Seating Arrangement',
  'Blood Relations',
  'Syllogisms',
  'Venn Diagrams',
  'Games and Tournaments',
  'Selections and Distributions',
  'Routes and Networks',
  'Cubes and Dice',
  'Binary Logic',
];

const CAT_VARC = [
  'Reading Comprehension',
  'Para Jumbles',
  'Para Summary',
  'Sentence Completion',
  'Vocabulary',
  'Grammar',
  'Critical Reasoning',
  'Inferences and Assumptions',
  'Fact, Inference and Judgement',
  'Odd Sentence Out',
];

// ---------------------------------------------------------------------------
// 12. CLAT
// ---------------------------------------------------------------------------
const CLAT_LEGAL_REASONING = [
  'Constitutional Law',
  'Jurisprudence',
  'Law of Torts',
  'Criminal Law',
  'Contract Law',
  'Family Law',
  'Public International Law',
  'Property Law',
  'Intellectual Property Law',
  'Legal Maxims',
  'Legal Current Affairs',
];

const CLAT_ENGLISH = [
  'Reading Comprehension',
  'Vocabulary',
  'Grammar',
  'Sentence Correction',
  'Fill in the Blanks',
  'Synonyms and Antonyms',
  'Idioms and Phrases',
  'Spelling',
  'Inference and Conclusion',
];

const CLAT_CURRENT_AFFAIRS_GK = [
  'Indian History',
  'World History',
  'Indian Polity and Governance',
  'Indian Economy',
  'Geography',
  'General Science',
  'Static General Knowledge',
  'Current Affairs — National',
  'Current Affairs — International',
  'Awards and Honours',
  'Sports',
];

const CLAT_QUANT_TECHNIQUES = [
  'Percentage',
  'Ratio and Proportion',
  'Average',
  'Profit, Loss and Discount',
  'Time and Work',
  'Time, Speed and Distance',
  'Simple and Compound Interest',
  'Data Interpretation',
  'Mensuration',
  'Algebra',
];

const CLAT_LOGICAL_REASONING = [
  'Analytical Reasoning',
  'Logical Reasoning',
  'Series',
  'Analogy',
  'Classification',
  'Coding-Decoding',
  'Blood Relations',
  'Direction and Distance',
  'Syllogism',
  'Critical Reasoning',
];

// ---------------------------------------------------------------------------
// 13. NDA
// ---------------------------------------------------------------------------
const NDA_MATHS = [
  'Algebra',
  'Matrices and Determinants',
  'Trigonometry',
  'Analytical Geometry — 2D',
  'Analytical Geometry — 3D',
  'Differential Calculus',
  'Integral Calculus and Differential Equations',
  'Vector Algebra',
  'Statistics and Probability',
];

const NDA_PHYSICS = [
  'Physical Properties and Measurements',
  'Motion, Forces and Energy',
  'Work, Power and Energy',
  'Gravitation',
  'Properties of Matter',
  'Heat',
  'Sound and Wave Motion',
  'Light',
  'Magnetism and Electricity',
  'Modern Physics',
];

const NDA_CHEMISTRY = [
  'Atomic Structure',
  'Chemical Bonding',
  'States of Matter',
  'Periodic Table',
  'Acids, Bases and Salts',
  'Carbon and Its Compounds',
  'Metals and Non-Metals',
  'Oxidation and Reduction',
  'Organic Chemistry Basics',
];

const NDA_GENERAL_STUDIES = [
  'History of India',
  'Geography of India',
  'Indian Polity',
  'Indian Economy',
  'General Science',
  'Current Affairs',
  'World Affairs',
  'Environmental Science',
];

const NDA_ENGLISH = [
  'Grammar and Usage',
  'Vocabulary',
  'Comprehension',
  'Synonyms and Antonyms',
  'Sentence Improvement',
  'Spotting Errors',
  'Idioms and Phrases',
];

// ---------------------------------------------------------------------------
// 14. CDS
// ---------------------------------------------------------------------------
const CDS_ENGLISH = [
  'Reading Comprehension',
  'Grammar and Usage',
  'Vocabulary',
  'Synonyms and Antonyms',
  'Sentence Improvement',
  'Spotting Errors',
  'Fill in the Blanks',
  'Idioms and Phrases',
];

const CDS_GENERAL_KNOWLEDGE = [
  'History of India',
  'Geography of India',
  'Indian Polity',
  'Indian Economy',
  'General Science',
  'Current Affairs',
  'Defence and Military Affairs',
  'Environmental Science',
];

const CDS_MATHS = [
  'Arithmetic',
  'Algebra',
  'Trigonometry',
  'Geometry',
  'Mensuration',
  'Statistics',
];

// ---------------------------------------------------------------------------
// 15. GATE
// ---------------------------------------------------------------------------
const GATE_ENG_MATHS = [
  'Linear Algebra',
  'Calculus',
  'Differential Equations',
  'Complex Variables',
  'Probability and Statistics',
  'Numerical Methods',
  'Transform Theory',
];

const GATE_GENERAL_APTITUDE = [
  'Verbal Aptitude',
  'Quantitative Aptitude',
  'Analytical Aptitude',
  'Spatial Aptitude',
];

const GATE_CORE_TECHNICAL = [
  'Engineering Mathematics',
  'Core Discipline — Part I',
  'Core Discipline — Part II',
  'Core Discipline — Part III',
  'Core Discipline — Part IV',
  'Engineering Practices',
];

// ---------------------------------------------------------------------------
// 16. CUET UG
// ---------------------------------------------------------------------------
const CUET_UG_MATHS = [
  'Algebra',
  'Calculus',
  'Vectors and 3D Geometry',
  'Probability',
  'Linear Programming',
  'Statistics',
];

const CUET_UG_PHYSICS = [
  'Electrostatics',
  'Current Electricity',
  'Magnetic Effects of Current',
  'Electromagnetic Induction',
  'Optics',
  'Modern Physics',
];

const CUET_UG_CHEMISTRY = [
  'Atomic Structure',
  'Chemical Bonding',
  'States of Matter',
  'Thermodynamics',
  'Equilibrium',
  'Organic Chemistry Basics',
  'Coordination Compounds',
];

const CUET_UG_BIOLOGY = [
  'Cell Biology',
  'Genetics and Evolution',
  'Human Physiology',
  'Plant Physiology',
  'Ecology and Environment',
  'Biotechnology',
];

const CUET_UG_ENGLISH = [
  'Reading Comprehension',
  'Grammar',
  'Vocabulary',
  'Verbal Ability',
  'Literary Aptitude',
];

const CUET_UG_GENERAL_AWARENESS = [
  'Current Affairs',
  'General Knowledge',
  'Indian Polity',
  'Indian Economy',
  'Geography',
  'History',
  'General Science',
];

// ---------------------------------------------------------------------------
// 17. CUET PG
// ---------------------------------------------------------------------------
const CUET_PG_DOMAIN_KNOWLEDGE = [
  'Domain Core — Part I',
  'Domain Core — Part II',
  'Domain Core — Part III',
  'Domain Electives',
  'Domain Applications',
];

const CUET_PG_GENERAL_APTITUDE = [
  'Verbal Ability',
  'Quantitative Reasoning',
  'Logical Reasoning',
  'Data Interpretation',
  'General Knowledge',
];

// ---------------------------------------------------------------------------
// 18. Olympiads
// ---------------------------------------------------------------------------
const OLYMPIAD_MATHS = [
  'Algebra',
  'Geometry',
  'Number Theory',
  'Combinatorics',
  'Trigonometry',
  'Calculus',
  'Probability',
];

const OLYMPIAD_PHYSICS = [
  'Mechanics',
  'Thermodynamics',
  'Electromagnetism',
  'Optics',
  'Modern Physics',
  'Waves and Oscillations',
];

const OLYMPIAD_CHEMISTRY = [
  'Physical Chemistry',
  'Inorganic Chemistry',
  'Organic Chemistry',
  'Analytical Chemistry',
];

const OLYMPIAD_BIOLOGY = [
  'Cell Biology',
  'Genetics',
  'Physiology',
  'Ecology',
  'Evolution',
  'Plant and Animal Anatomy',
];

// ---------------------------------------------------------------------------
// 19. Railway Exams
// ---------------------------------------------------------------------------
const RAILWAY_MATHS = [
  'Number System',
  'Percentage',
  'Ratio and Proportion',
  'Average',
  'Profit, Loss and Discount',
  'Simple and Compound Interest',
  'Time and Work',
  'Time, Speed and Distance',
  'Algebra',
  'Geometry',
  'Mensuration',
  'Trigonometry',
  'Data Interpretation',
];

const RAILWAY_REASONING = [
  'Analogy',
  'Classification',
  'Series',
  'Coding-Decoding',
  'Blood Relations',
  'Direction and Distance',
  'Syllogism',
  'Venn Diagrams',
  'Non-Verbal Reasoning',
];

const RAILWAY_GENERAL_SCIENCE = [
  'Physics',
  'Chemistry',
  'Biology',
  'Environmental Science',
];

const RAILWAY_GENERAL_AWARENESS = [
  'History of India',
  'Geography of India',
  'Indian Polity',
  'Indian Economy',
  'Current Affairs',
  'Railway Budget and Policies',
  'Sports and Culture',
  'Books and Authors',
];

// ---------------------------------------------------------------------------
// 20. State PSC
// ---------------------------------------------------------------------------
const STATE_PSC_HISTORY = [
  'Ancient Indian History',
  'Medieval Indian History',
  'Modern Indian History',
  'State History',
  'Indian National Movement',
];

const STATE_PSC_GEOGRAPHY = [
  'Physical Geography',
  'Indian Geography',
  'State Geography',
  'World Geography',
  'Economic Geography',
];

const STATE_PSC_POLITY = [
  'Indian Constitution',
  'Union and State Government',
  'Local Self Government',
  'Constitutional Bodies',
  'State Legislature and Administration',
];

const STATE_PSC_ECONOMICS = [
  'Basic Economics',
  'Indian Economy',
  'State Economy',
  'Public Finance',
  'Banking and Monetary Policy',
];

const STATE_PSC_SCIENCE = [
  'Physics',
  'Chemistry',
  'Biology',
  'Science and Technology',
];

const STATE_PSC_CURRENT_AFFAIRS = [
  'National Affairs',
  'State Affairs',
  'International Affairs',
  'Government Schemes',
  'Sports and Awards',
];

// ---------------------------------------------------------------------------
// 21. Other (General Studies)
// ---------------------------------------------------------------------------
const OTHER_GENERAL_STUDIES = [
  'Indian History',
  'Geography',
  'Indian Polity',
  'Indian Economy',
  'General Science',
  'Current Affairs',
  'Environmental Studies',
  'Quantitative Aptitude',
  'Logical Reasoning',
  'English Language',
];

// ===========================================================================
// EXAM_DATA — the master array
// ===========================================================================
export const EXAM_DATA: Exam[] = [
  {
    id: 'jee-main',
    name: 'JEE Main',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: JEE_MAIN_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
    ],
  },
  {
    id: 'jee-advanced',
    name: 'JEE Advanced',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_ADV_PHYSICS },
      { name: 'Chemistry', chapters: JEE_ADV_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_ADV_MATHS },
    ],
  },
  {
    id: 'upsc-cse',
    name: 'UPSC CSE',
    category: 'Civil Services',
    subjects: [
      { name: 'History', chapters: UPSC_HISTORY },
      { name: 'Geography', chapters: UPSC_GEOGRAPHY },
      { name: 'Polity', chapters: UPSC_POLITY },
      { name: 'Economics', chapters: UPSC_ECONOMICS },
      { name: 'Science & Technology', chapters: UPSC_SCI_TECH },
      { name: 'Environment', chapters: UPSC_ENVIRONMENT },
      { name: 'Current Affairs', chapters: UPSC_CURRENT_AFFAIRS },
      { name: 'Ethics', chapters: UPSC_ETHICS },
    ],
  },
  {
    id: 'ca-foundation',
    name: 'CA Foundation',
    category: 'Commerce',
    subjects: [
      { name: 'Accounting', chapters: CA_FOUND_ACCOUNTING },
      { name: 'Business Laws', chapters: CA_FOUND_BUSINESS_LAWS },
      { name: 'Mathematics', chapters: CA_FOUND_MATHEMATICS },
      { name: 'Business Economics', chapters: CA_FOUND_BUSINESS_ECONOMICS },
    ],
  },
  {
    id: 'ca-intermediate',
    name: 'CA Intermediate',
    category: 'Commerce',
    subjects: [
      { name: 'Advanced Accounting', chapters: CA_INTER_ADV_ACCOUNTING },
      { name: 'Corporate Laws', chapters: CA_INTER_CORP_LAWS },
      { name: 'Cost & Management Accounting', chapters: CA_INTER_COST_MGMT_ACCOUNTING },
      { name: 'Taxation', chapters: CA_INTER_TAXATION },
    ],
  },
  {
    id: 'ca-final',
    name: 'CA Final',
    category: 'Commerce',
    subjects: [
      { name: 'Financial Reporting', chapters: CA_FINAL_FINANCIAL_REPORTING },
      { name: 'Strategic Financial Management', chapters: CA_FINAL_SFM },
      { name: 'Advanced Auditing', chapters: CA_FINAL_ADV_AUDITING },
      { name: 'Direct Tax Laws', chapters: CA_FINAL_DIRECT_TAX },
    ],
  },
  {
    id: 'ssc-cgl',
    name: 'SSC CGL',
    category: 'Government Jobs',
    subjects: [
      { name: 'Quantitative Aptitude', chapters: SSC_CGL_QUANT },
      { name: 'General Intelligence & Reasoning', chapters: SSC_CGL_REASONING },
      { name: 'English Language', chapters: SSC_CGL_ENGLISH },
      { name: 'General Awareness', chapters: SSC_CGL_GENERAL_AWARENESS },
    ],
  },
  {
    id: 'ssc-chsl',
    name: 'SSC CHSL',
    category: 'Government Jobs',
    subjects: [
      { name: 'Quantitative Aptitude', chapters: SSC_CHSL_QUANT },
      { name: 'General Intelligence & Reasoning', chapters: SSC_CHSL_REASONING },
      { name: 'English Language', chapters: SSC_CHSL_ENGLISH },
      { name: 'General Awareness', chapters: SSC_CHSL_GENERAL_AWARENESS },
    ],
  },
  {
    id: 'banking-exams',
    name: 'Banking Exams',
    category: 'Banking',
    subjects: [
      { name: 'Quantitative Aptitude', chapters: BANK_QUANT },
      { name: 'Reasoning Ability', chapters: BANK_REASONING },
      { name: 'English Language', chapters: BANK_ENGLISH },
      { name: 'Banking Awareness', chapters: BANK_BANKING_AWARENESS },
      { name: 'Computer Awareness', chapters: BANK_COMPUTER_AWARENESS },
    ],
  },
  {
    id: 'cat',
    name: 'CAT',
    category: 'Management',
    subjects: [
      { name: 'Quantitative Aptitude', chapters: CAT_QUANT },
      { name: 'Logical Reasoning & Data Interpretation', chapters: CAT_LRDI },
      { name: 'Verbal Ability & Reading Comprehension', chapters: CAT_VARC },
    ],
  },
  {
    id: 'clat',
    name: 'CLAT',
    category: 'Law',
    subjects: [
      { name: 'Legal Reasoning', chapters: CLAT_LEGAL_REASONING },
      { name: 'English Language', chapters: CLAT_ENGLISH },
      { name: 'Current Affairs & General Knowledge', chapters: CLAT_CURRENT_AFFAIRS_GK },
      { name: 'Quantitative Techniques', chapters: CLAT_QUANT_TECHNIQUES },
      { name: 'Logical Reasoning', chapters: CLAT_LOGICAL_REASONING },
    ],
  },
  {
    id: 'nda',
    name: 'NDA',
    category: 'Defence',
    subjects: [
      { name: 'Mathematics', chapters: NDA_MATHS },
      { name: 'Physics', chapters: NDA_PHYSICS },
      { name: 'Chemistry', chapters: NDA_CHEMISTRY },
      { name: 'General Studies', chapters: NDA_GENERAL_STUDIES },
      { name: 'English', chapters: NDA_ENGLISH },
    ],
  },
  {
    id: 'cds',
    name: 'CDS',
    category: 'Defence',
    subjects: [
      { name: 'English', chapters: CDS_ENGLISH },
      { name: 'General Knowledge', chapters: CDS_GENERAL_KNOWLEDGE },
      { name: 'Mathematics', chapters: CDS_MATHS },
    ],
  },
  {
    id: 'gate',
    name: 'GATE',
    category: 'Engineering',
    subjects: [
      { name: 'Engineering Mathematics', chapters: GATE_ENG_MATHS },
      { name: 'General Aptitude', chapters: GATE_GENERAL_APTITUDE },
      { name: 'Core Technical', chapters: GATE_CORE_TECHNICAL },
    ],
  },
  {
    id: 'cuet-ug',
    name: 'CUET UG',
    category: 'Entrance',
    subjects: [
      { name: 'Mathematics', chapters: CUET_UG_MATHS },
      { name: 'Physics', chapters: CUET_UG_PHYSICS },
      { name: 'Chemistry', chapters: CUET_UG_CHEMISTRY },
      { name: 'Biology', chapters: CUET_UG_BIOLOGY },
      { name: 'English', chapters: CUET_UG_ENGLISH },
      { name: 'General Awareness', chapters: CUET_UG_GENERAL_AWARENESS },
    ],
  },
  {
    id: 'cuet-pg',
    name: 'CUET PG',
    category: 'Entrance',
    subjects: [
      { name: 'Domain Knowledge', chapters: CUET_PG_DOMAIN_KNOWLEDGE },
      { name: 'General Aptitude', chapters: CUET_PG_GENERAL_APTITUDE },
    ],
  },
  {
    id: 'olympiads',
    name: 'Olympiads',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: OLYMPIAD_MATHS },
      { name: 'Physics', chapters: OLYMPIAD_PHYSICS },
      { name: 'Chemistry', chapters: OLYMPIAD_CHEMISTRY },
      { name: 'Biology', chapters: OLYMPIAD_BIOLOGY },
    ],
  },
  {
    id: 'railway-exams',
    name: 'Railway Exams',
    category: 'Government Jobs',
    subjects: [
      { name: 'Mathematics', chapters: RAILWAY_MATHS },
      { name: 'Reasoning', chapters: RAILWAY_REASONING },
      { name: 'General Science', chapters: RAILWAY_GENERAL_SCIENCE },
      { name: 'General Awareness', chapters: RAILWAY_GENERAL_AWARENESS },
    ],
  },
  {
    id: 'state-psc',
    name: 'State PSC',
    category: 'Civil Services',
    subjects: [
      { name: 'History', chapters: STATE_PSC_HISTORY },
      { name: 'Geography', chapters: STATE_PSC_GEOGRAPHY },
      { name: 'Polity', chapters: STATE_PSC_POLITY },
      { name: 'Economics', chapters: STATE_PSC_ECONOMICS },
      { name: 'Science', chapters: STATE_PSC_SCIENCE },
      { name: 'Current Affairs', chapters: STATE_PSC_CURRENT_AFFAIRS },
    ],
  },
  {
    id: 'other',
    name: 'Other',
    category: 'General',
    subjects: [
      { name: 'General Studies', chapters: OTHER_GENERAL_STUDIES },
    ],
  },
  // ─── School Exams ───────────────────────────────────────────────
  {
    id: 'school-general',
    name: 'School Exams (General)',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Science', chapters: [...JEE_MAIN_PHYSICS.slice(0, 10), ...NEET_CHEMISTRY.slice(0, 10), ...NEET_BOTANY.slice(0, 10)] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature'] },
      { name: 'Social Studies', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
    ],
  },
  {
    id: 'cbse-board',
    name: 'CBSE Board Exams',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Biology', chapters: [...NEET_BOTANY, ...NEET_ZOOLOGY] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature - Prose', 'Literature - Poetry', 'Supplementary Reader'] },
      { name: 'Social Science', chapters: ['History - Nationalism', 'History - Globalisation', 'Geography - Resources', 'Geography - Agriculture', 'Civics - Federalism', 'Civics - Political Parties', 'Economics - Development', 'Economics - Sectors'] },
    ],
  },
  {
    id: 'icse-board',
    name: 'ICSE Board Exams',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Biology', chapters: [...NEET_BOTANY, ...NEET_ZOOLOGY] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature - Prose', 'Literature - Poetry', 'Drama'] },
      { name: 'History & Civics', chapters: ['The Indian Renaissance', 'The American War of Independence', 'The French Revolution', 'The American Civil War'] },
      { name: 'Geography', chapters: ['Map Work', 'Topographical Maps', 'Climate', 'Natural Vegetation', 'Population', 'Minerals'] },
    ],
  },
  {
    id: 'isc-board',
    name: 'ISC Board Exams',
    category: 'School',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Biology', chapters: [...NEET_BOTANY, ...NEET_ZOOLOGY] },
      { name: 'English', chapters: ['Reading Comprehension', 'Essay Writing', 'Grammar', 'Literature'] },
    ],
  },
  {
    id: 'state-board',
    name: 'State Board Exams',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Science', chapters: [...JEE_MAIN_PHYSICS.slice(0, 12), ...NEET_CHEMISTRY.slice(0, 12), ...NEET_BOTANY.slice(0, 12)] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature'] },
      { name: 'Social Science', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
    ],
  },
  {
    id: 'half-yearly',
    name: 'Half-Yearly Exams',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS.slice(0, 10) },
      { name: 'Science', chapters: [...JEE_MAIN_PHYSICS.slice(0, 6), ...NEET_CHEMISTRY.slice(0, 6), ...NEET_BOTANY.slice(0, 6)] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature'] },
      { name: 'Social Science', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
    ],
  },
  {
    id: 'annual-exams',
    name: 'Annual Exams',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Science', chapters: [...JEE_MAIN_PHYSICS.slice(0, 10), ...NEET_CHEMISTRY.slice(0, 10), ...NEET_BOTANY.slice(0, 10)] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature'] },
      { name: 'Social Science', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
    ],
  },
  {
    id: 'unit-tests',
    name: 'Unit Tests',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS.slice(0, 8) },
      { name: 'Science', chapters: [...JEE_MAIN_PHYSICS.slice(0, 5), ...NEET_CHEMISTRY.slice(0, 5), ...NEET_BOTANY.slice(0, 5)] },
      { name: 'English', chapters: ['Reading Comprehension', 'Grammar', 'Literature'] },
    ],
  },
  {
    id: 'pre-boards',
    name: 'Pre-Boards',
    category: 'School',
    subjects: [
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Biology', chapters: [...NEET_BOTANY, ...NEET_ZOOLOGY] },
      { name: 'English', chapters: ['Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature'] },
      { name: 'Social Science', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
    ],
  },
  // ─── Engineering ────────────────────────────────────────────────
  {
    id: 'bitsat',
    name: 'BITSAT',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'English', chapters: ['Reading Comprehension', 'Grammar', 'Vocabulary'] },
      { name: 'Logical Reasoning', chapters: ['Series', 'Analogy', 'Classification', 'Coding-Decoding', 'Blood Relations', 'Direction Sense'] },
    ],
  },
  {
    id: 'viteee',
    name: 'VITEEE',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'English', chapters: ['Reading Comprehension', 'Grammar'] },
    ],
  },
  {
    id: 'wbjee',
    name: 'WBJEE',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
    ],
  },
  {
    id: 'mht-cet',
    name: 'MHT CET',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
    ],
  },
  {
    id: 'comedk',
    name: 'COMEDK',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
    ],
  },
  {
    id: 'srmjeee',
    name: 'SRMJEEE',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'English', chapters: ['Reading Comprehension', 'Grammar'] },
    ],
  },
  {
    id: 'kiitee',
    name: 'KIITEE',
    category: 'Engineering',
    subjects: [
      { name: 'Physics', chapters: JEE_MAIN_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Mathematics', chapters: JEE_MAIN_MATHS },
    ],
  },
  // ─── Medical (legacy/renamed) ───────────────────────────────────
  {
    id: 'neet-ug',
    name: 'NEET UG',
    category: 'Medical',
    subjects: [
      { name: 'Physics', chapters: NEET_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Botany', chapters: NEET_BOTANY },
      { name: 'Zoology', chapters: NEET_ZOOLOGY },
    ],
  },
  {
    id: 'aiims-legacy',
    name: 'AIIMS (legacy)',
    category: 'Medical',
    subjects: [
      { name: 'Physics', chapters: NEET_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Biology', chapters: [...NEET_BOTANY, ...NEET_ZOOLOGY] },
      { name: 'General Knowledge', chapters: ['Current Affairs', 'General Science', 'Static GK'] },
    ],
  },
  {
    id: 'jipmer-legacy',
    name: 'JIPMER (legacy)',
    category: 'Medical',
    subjects: [
      { name: 'Physics', chapters: NEET_PHYSICS },
      { name: 'Chemistry', chapters: NEET_CHEMISTRY },
      { name: 'Biology', chapters: [...NEET_BOTANY, ...NEET_ZOOLOGY] },
      { name: 'English', chapters: ['Reading Comprehension', 'Grammar'] },
    ],
  },
  // ─── Commerce ───────────────────────────────────────────────────
  {
    id: 'cs',
    name: 'CS',
    category: 'Commerce',
    subjects: [
      { name: 'Computer Science', chapters: ['C Programming', 'Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks', 'Theory of Computation', 'Digital Logic'] },
      { name: 'Engineering Mathematics', chapters: JEE_MAIN_MATHS },
      { name: 'General Aptitude', chapters: ['Verbal Reasoning', 'Numerical Ability', 'Analytical Reasoning', 'Spatial Reasoning'] },
    ],
  },
  {
    id: 'cma',
    name: 'CMA',
    category: 'Commerce',
    subjects: [
      { name: 'Cost Accounting', chapters: CA_FOUND_ACCOUNTING },
      { name: 'Financial Management', chapters: ['Capital Budgeting', 'Cost of Capital', 'Working Capital Management', 'Capital Structure', 'Dividend Decisions'] },
      { name: 'Strategic Management', chapters: ['Strategic Analysis', 'Strategic Planning', 'Strategic Implementation', 'Strategic Control'] },
      { name: 'Taxation', chapters: ['Direct Tax', 'Indirect Tax', 'GST'] },
    ],
  },
  // ─── Other (Custom) ─────────────────────────────────────────────
  {
    id: 'other-custom',
    name: 'Other (Custom)',
    category: 'General',
    subjects: [
      { name: 'Subject 1', chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6', 'Chapter 7', 'Chapter 8', 'Chapter 9', 'Chapter 10'] },
      { name: 'Subject 2', chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6', 'Chapter 7', 'Chapter 8', 'Chapter 9', 'Chapter 10'] },
      { name: 'Subject 3', chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5', 'Chapter 6', 'Chapter 7', 'Chapter 8', 'Chapter 9', 'Chapter 10'] },
    ],
  },
];

// ===========================================================================
// Derived exports
// ===========================================================================
export const ALL_EXAMS: string[] = EXAM_DATA.map((e) => e.name);

export interface ExamCategoryGroup { name: string; exams: string[] }

export const EXAM_CATEGORIES: ExamCategoryGroup[] = [
  { name: 'School Exams', exams: ['School Exams (General)', 'CBSE Board Exams', 'ICSE Board Exams', 'ISC Board Exams', 'State Board Exams', 'Half-Yearly Exams', 'Annual Exams', 'Unit Tests', 'Pre-Boards'] },
  { name: 'Engineering', exams: ['JEE Main', 'JEE Advanced', 'BITSAT', 'VITEEE', 'WBJEE', 'MHT CET', 'COMEDK', 'SRMJEEE', 'KIITEE', 'CUET UG'] },
  { name: 'Medical', exams: ['NEET UG', 'AIIMS (legacy)', 'JIPMER (legacy)'] },
  { name: 'Commerce', exams: ['CA Foundation', 'CA Intermediate', 'CA Final', 'CS', 'CMA'] },
  { name: 'Government Exams', exams: ['UPSC CSE', 'SSC CGL', 'SSC CHSL', 'Banking Exams', 'Railway Exams', 'NDA', 'CDS', 'State PSC'] },
  { name: 'Higher Education', exams: ['CAT', 'CLAT', 'GATE', 'CUET PG'] },
  { name: 'Other', exams: ['Olympiads', 'Other (Custom)'] },
];

export const EXAM_YEARS: string[] = (() => {
  const yr = new Date().getFullYear();
  return [String(yr), String(yr + 1), String(yr + 2), String(yr + 3), String(yr + 4), String(yr + 5), String(yr + 6), 'Custom Year'];
})();

export const BOARDS: string[] = [
  'CBSE',
  'ICSE',
  'State Board',
  'IB',
  'IGCSE',
  'NIOS',
];

export const COACHING_TYPES: string[] = [
  'Self Study',
  'Online Coaching',
  'Offline Coaching',
  'Hybrid',
  'Test Series Only',
];

export const STUDY_SESSIONS: string[] = [
  'Morning (6-10 AM)',
  'Afternoon (12-3 PM)',
  'Evening (4-7 PM)',
  'Night (8-11 PM)',
  'Late Night (11 PM-2 AM)',
];

export const CLASSES: string[] = [
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'Dropper/Repeat',
  'Undergraduate',
  'Postgraduate',
  'Working Professional',
];

export const DISTRACTIONS: string[] = [
  'Social Media',
  'Gaming',
  'Mobile/Smartphone',
  'Friends/Socializing',
  'Sleep/Fatigue',
  'Family/Home',
  'Lack of Motivation',
  'Procrastination',
  'Other',
];

// ===========================================================================
// Helper functions
// ===========================================================================

/** Returns the Exam object matching the given name, or undefined if not found. */
export function getExamByName(name: string): Exam | undefined {
  return EXAM_DATA.find((e) => e.name === name);
}

/** Returns the array of Subject objects for the given exam name (empty if not found). */
export function getSubjectsForExam(examName: string): Subject[] {
  return getExamByName(examName)?.subjects ?? [];
}

/** Returns the chapters for a given (examName, subjectName) pair (empty if not found). */
export function getChaptersForSubject(examName: string, subjectName: string): string[] {
  const exam = getExamByName(examName);
  if (!exam) return [];
  const subject = exam.subjects.find((s) => s.name === subjectName);
  return subject?.chapters ?? [];
}

/** Returns the unique subject names for a single exam (empty if not found). */
export function getAllUniqueSubjects(examName: string): string[] {
  const exam = getExamByName(examName);
  if (!exam) return [];
  return Array.from(new Set(exam.subjects.map((s) => s.name)));
}

/** Returns the total number of chapters across all subjects of a given exam. */
export function getChapterCountForExam(examName: string): number {
  const exam = getExamByName(examName);
  if (!exam) return 0;
  return exam.subjects.reduce((total, s) => total + s.chapters.length, 0);
}
