-- Correct CA Foundation formula subject/chapter mappings to the official
-- ICAI CA Foundation syllabus. Syllabus subjects are "Accounting",
-- "Business Laws", "Business Economics", "Mathematics" — the stored
-- "Accounts", "Business Studies", "Economics" do not exist in the syllabus.
-- Only classification metadata is corrected; formula expressions unchanged.

-- Net Profit Ratio & Current Ratio -> Accounting / Preparation of Final Accounts
UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Net Profit Ratio';

UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Financial Statements' AND name = 'Current Ratio';

-- Depreciation SLM -> Accounting / Depreciation Accounting
UPDATE formula_library SET subject = 'Accounting', chapter = 'Depreciation Accounting', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Accounts' AND chapter = 'Depreciation' AND name = 'Depreciation SLM';

-- Break-even Point -> Accounting / Preparation of Final Accounts (cost-volume-profit in final accounts)
UPDATE formula_library SET subject = 'Accounting', chapter = 'Preparation of Final Accounts', pyq_importance = 'medium'
WHERE exam_id = 'ca-foundation' AND subject = 'Business Studies' AND chapter = 'Financial Management' AND name = 'Break-even Point';

-- Elasticity of Demand -> Business Economics / Demand and Supply
UPDATE formula_library SET subject = 'Business Economics', chapter = 'Demand and Supply', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Demand' AND name = 'Elasticity of Demand';

-- Marginal Cost -> Business Economics / Theory of Production and Cost
UPDATE formula_library SET subject = 'Business Economics', chapter = 'Theory of Production and Cost', pyq_importance = 'high'
WHERE exam_id = 'ca-foundation' AND subject = 'Economics' AND chapter = 'Theory of Cost' AND name = 'Marginal Cost';
