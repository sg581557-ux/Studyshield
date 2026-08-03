-- Correct CA Foundation formula subject/chapter mappings to the official
-- ICAI CA Foundation syllabus. Syllabus subjects are "Accounting",
-- "Business Laws", "Business Economics", "Mathematics" — the stored
-- "Accounts", "Business Studies", "Economics" do not exist in the syllabus.
-- Only classification metadata is corrected; formula expressions unchanged.
--
-- Idempotency guard (recovery-script validated with pglite double-run):
-- a plain UPDATE violates idx_formula_library_exam_subject_name on re-run
-- (the seed migrations re-insert the pre-correction rows after a previous
-- run moved them). Each formula is therefore: (1) DELETE the stale
-- pre-correction row ONLY when the corrected target already exists, then
-- (2) run the classification UPDATE unconditionally. On a fresh database
-- the DELETE matches nothing and behavior is identical to before.

-- Net Profit Ratio & Current Ratio -> Accounting / Preparation of Final Accounts
DELETE FROM formula_library
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Net Profit Ratio'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'ca-foundation' AND f2.subject = 'Accounting' AND f2.name = 'Net Profit Ratio');

UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Net Profit Ratio';

DELETE FROM formula_library
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Current Ratio'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'ca-foundation' AND f2.subject = 'Accounting' AND f2.name = 'Current Ratio');

UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Current Ratio';

-- Depreciation SLM -> Accounting / Depreciation Accounting
DELETE FROM formula_library
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Depreciation' AND name = 'Depreciation SLM'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'ca-foundation' AND f2.subject = 'Accounting' AND f2.name = 'Depreciation SLM');

UPDATE formula_library SET subject = 'Accounting', chapter = 'Depreciation Accounting', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Depreciation' AND name = 'Depreciation SLM';

-- Break-even Point -> Accounting / Preparation of Final Accounts (cost-volume-profit in final accounts)
DELETE FROM formula_library
WHERE exam_id = 'ca-foundation' AND subject = 'Business Studies' AND chapter = 'Financial Management' AND name = 'Break-even Point'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'ca-foundation' AND f2.subject = 'Accounting' AND f2.name = 'Break-even Point');

UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'medium'
WHERE exam_id = 'ca-foundation' AND subject = 'Business Studies' AND chapter = 'Financial Management' AND name = 'Break-even Point';

-- Elasticity of Demand -> Business Economics / Demand and Supply
DELETE FROM formula_library
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Demand' AND name = 'Elasticity of Demand'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'ca-foundation' AND f2.subject = 'Business Economics' AND f2.name = 'Elasticity of Demand');

UPDATE formula_library SET subject = 'Business Economics', chapter = 'Demand and Supply', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Demand' AND name = 'Elasticity of Demand';

-- Marginal Cost -> Business Economics / Theory of Production and Cost
DELETE FROM formula_library
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Theory of Cost' AND name = 'Marginal Cost'
  AND EXISTS (SELECT 1 FROM formula_library f2 WHERE f2.exam_id = 'ca-foundation' AND f2.subject = 'Business Economics' AND f2.name = 'Marginal Cost');

UPDATE formula_library SET subject = 'Business Economics', chapter = 'Theory of Production and Cost', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Theory of Cost' AND name = 'Marginal Cost';
