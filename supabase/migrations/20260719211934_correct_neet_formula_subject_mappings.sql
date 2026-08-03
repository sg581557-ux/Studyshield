-- Correct NEET formula subject/chapter mappings to the official NCERT NEET
-- syllabus. The NEET syllabus uses "Botany" and "Zoology" (not "Biology"),
-- and chapter names must match the syllabus_chapters table exactly.
--
-- These are standard, verified NEET formulas — only their subject/chapter
-- classification was wrong. No formulas are invented, deleted, or replaced.
-- Formula content (expression) is unchanged; only classification metadata
-- and the enrichment fields (variables, explanation, pyq_importance) are set.
--
-- Idempotency guard (recovery-script validated with pglite double-run):
-- a plain UPDATE violates idx_formula_library_exam_subject_name on re-run
-- (the seed migrations re-insert the pre-correction rows after a previous
-- run moved them). Each formula is therefore: (1) DELETE the stale
-- pre-correction row ONLY when the corrected target already exists, then
-- (2) run the classification UPDATE unconditionally. On a fresh database
-- the DELETE matches nothing and behavior is identical to before.

-- 1. Hardy-Weinberg Equilibrium — Evolution is a Zoology chapter in NEET
DELETE FROM formula_library
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Evolution' AND name = 'Hardy-Weinberg Equilibrium'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'neet-ug' AND f2.subject = 'Zoology' AND f2.name = 'Hardy-Weinberg Equilibrium');

UPDATE formula_library SET
  subject = 'Zoology',
  chapter = 'Evolution',
  variables = '[{"symbol":"p","meaning":"frequency of dominant allele"},{"symbol":"q","meaning":"frequency of recessive allele"},{"symbol":"p²","meaning":"frequency of homozygous dominant genotype"},{"symbol":"2pq","meaning":"frequency of heterozygous genotype"},{"symbol":"q²","meaning":"frequency of homozygous recessive genotype"}]'::jsonb,
  explanation = 'Describes allele and genotype frequencies in a non-evolving, ideal population. Sum of genotype frequencies equals 1.',
  pyq_importance = 'high',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Evolution' AND name = 'Hardy-Weinberg Equilibrium';

-- 2. Hardy-Weinberg (Genetics) — Mendelian genetics maps to Botany/Principles of Inheritance and Variation in NEET
DELETE FROM formula_library
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Genetics' AND name = 'Hardy-Weinberg'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'neet-ug' AND f2.subject = 'Botany' AND f2.name = 'Hardy-Weinberg');

UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Principles of Inheritance and Variation',
  variables = '[{"symbol":"p","meaning":"frequency of dominant allele"},{"symbol":"q","meaning":"frequency of recessive allele"}]'::jsonb,
  explanation = 'Allele frequencies remain constant in an ideal population (no mutation, migration, selection, drift, or non-random mating).',
  pyq_importance = 'high',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Genetics' AND name = 'Hardy-Weinberg';

-- 3. Punnett Square Ratio — Mendelian ratios, Botany/Principles of Inheritance and Variation
DELETE FROM formula_library
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Genetics' AND name = 'Punnett Square Ratio'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'neet-ug' AND f2.subject = 'Botany' AND f2.name = 'Punnett Square Ratio');

UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Principles of Inheritance and Variation',
  variables = '[{"symbol":"Monohybrid","meaning":"single trait cross ratio 3:1"},{"symbol":"Dihybrid","meaning":"two trait cross ratio 9:3:3:1"},{"symbol":"Test cross","meaning":"cross with recessive parent, ratio 1:1"}]'::jsonb,
  explanation = 'Standard phenotypic ratios from Mendelian crosses assuming complete dominance and independent assortment.',
  pyq_importance = 'high',
  unit = 'ratio'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Genetics' AND name = 'Punnett Square Ratio';

-- 4 & 5. Photosynthesis equations — Botany/Photosynthesis in Higher Plants
DELETE FROM formula_library
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Photosynthesis' AND name = 'Photosynthesis Equation'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'neet-ug' AND f2.subject = 'Botany' AND f2.name = 'Photosynthesis Equation');

UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Photosynthesis in Higher Plants',
  variables = '[{"symbol":"CO₂","meaning":"carbon dioxide"},{"symbol":"H₂O","meaning":"water"},{"symbol":"C₆H₁₂O₆","meaning":"glucose"},{"symbol":"O₂","meaning":"oxygen"}]'::jsonb,
  explanation = 'Overall balanced equation of photosynthesis; light energy converts CO₂ and H₂O into glucose and O₂.',
  pyq_importance = 'high',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Photosynthesis' AND name = 'Photosynthesis Equation';

DELETE FROM formula_library
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Photosynthesis' AND name = 'Net Photosynthesis'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'neet-ug' AND f2.subject = 'Botany' AND f2.name = 'Net Photosynthesis');

UPDATE formula_library SET
  subject = 'Botany',
  chapter = 'Photosynthesis in Higher Plants',
  variables = '[{"symbol":"Gross P","meaning":"total photosynthesis"},{"symbol":"Respiration","meaning":"CO₂ released by plant respiration"},{"symbol":"Net P","meaning":"photosynthesis available for growth/storage"}]'::jsonb,
  explanation = 'Net photosynthesis is the carbon fixed after subtracting respiratory losses; what actually contributes to plant biomass.',
  pyq_importance = 'medium',
  unit = '-'
WHERE exam_id = 'neet-ug' AND subject = 'Biology' AND chapter = 'Photosynthesis' AND name = 'Net Photosynthesis';
