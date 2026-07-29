/*
# Seed formula library — JEE, NEET, Commerce

## Summary
Populates the `formula_library` table with curated formulas containing the full
metadata requested: variables (with units), unit, explanation, shortcut trick,
common mistakes, PYQ importance, difficulty, chapter, subject.

## Coverage
- JEE Main (exam_id='jee-main'): Physics, Chemistry, Mathematics — 16 formulas
- NEET UG (exam_id='neet-ug'): Physics, Chemistry, Biology — 8 formulas
- Commerce: mapped to 'ca-foundation' exam_id (Accounts, Economics, Business Studies) — 6 formulas

## Idempotency
Uses ON CONFLICT DO NOTHING keyed on (exam_id, subject, name) so re-running the
seed does not create duplicates. A unique index is added to enforce this.

## Security
No policy changes — formula_library remains public read. This is a data-only
seed migration.
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_formula_library_exam_subject_name
  ON formula_library(exam_id, subject, name);

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
-- ========== JEE PHYSICS ==========
('jee-main','Physics','Kinematics','Equations of Motion','v = u + at; s = ut + ½at²; v² = u² + 2as',
  '[{"symbol":"v","meaning":"final velocity","unit":"m/s"},{"symbol":"u","meaning":"initial velocity","unit":"m/s"},{"symbol":"a","meaning":"acceleration","unit":"m/s²"},{"symbol":"t","meaning":"time","unit":"s"},{"symbol":"s","meaning":"displacement","unit":"m"}]',
  'm/s, m',
  'Three kinematic equations describe motion under constant acceleration. The first gives velocity-time, the second displacement-time, the third velocity-displacement (no time).',
  'For free fall, replace a with g and take downward as positive to avoid sign confusion.',
  '["Using v² = u² + 2as when acceleration is not constant","Forgetting that s is displacement not distance","Mixing sign conventions for upward/downward motion"]',
  'Appears in ~2 questions every JEE Main. High frequency in kinematics and projectile problems.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Kinematics','Projectile Range','R = (u² sin 2θ) / g',
  '[{"symbol":"R","meaning":"horizontal range","unit":"m"},{"symbol":"u","meaning":"initial speed","unit":"m/s"},{"symbol":"θ","meaning":"launch angle","unit":"rad"},{"symbol":"g","meaning":"acceleration due to gravity","unit":"m/s²"}]',
  'm','Maximum range occurs at θ = 45°. Complementary angles (θ and 90°−θ) give the same range.',
  'Rmax = u²/g at θ = 45°. For complementary angles R is identical — saves calculation.',
  '["Using sin θ instead of sin 2θ","Forgetting that Rmax needs θ = 45° not 90°"]',
  'Projectile motion is a JEE staple; range formula appears every year.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Laws of Motion','Newton Second Law','F = ma = dp/dt',
  '[{"symbol":"F","meaning":"net force","unit":"N"},{"symbol":"m","meaning":"mass","unit":"kg"},{"symbol":"a","meaning":"acceleration","unit":"m/s²"},{"symbol":"p","meaning":"momentum","unit":"kg·m/s"}]',
  'N','Force equals rate of change of momentum. For constant mass this reduces to F = ma.',
  'Impulse-momentum: F·Δt = Δp. Use this for collision problems instead of computing a.',
  '["Using F = ma when mass changes (rocket problem)","Not taking the net force — summing only some forces"]',
  'Foundational; appears in friction, pulley, and collision problems.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Work Energy and Power','Work-Energy Theorem','W = ΔKE = ½m(v² − u²)',
  '[{"symbol":"W","meaning":"net work done","unit":"J"},{"symbol":"m","meaning":"mass","unit":"kg"},{"symbol":"v","meaning":"final velocity","unit":"m/s"},{"symbol":"u","meaning":"initial velocity","unit":"m/s"}]',
  'J','Net work done on a body equals its change in kinetic energy. Sign of W tells you if energy is added or removed.',
  'When friction is involved, W_friction = −f·d directly gives energy lost — skip computing intermediate velocities.',
  '["Using distance instead of displacement for W","Forgetting that W is the net work not work by one force"]',
  'Frequent in combined mechanics-energy problems.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Gravitation','Gravitational Force','F = G·m₁m₂ / r²',
  '[{"symbol":"F","meaning":"gravitational force","unit":"N"},{"symbol":"G","meaning":"gravitational constant","unit":"N·m²/kg²"},{"symbol":"m₁, m₂","meaning":"masses","unit":"kg"},{"symbol":"r","meaning":"distance between centers","unit":"m"}]',
  'N','Inverse-square law. Field g = GM/r². Potential energy U = −GMm/r (negative, zero at infinity).',
  'g at height h: g'' = g(R/(R+h))². For h << R, g'' ≈ g(1 − 2h/R).',
  '["Using r as altitude instead of distance from center","Forgetting the negative sign in potential energy"]',
  'Orbital mechanics and escape velocity questions appear regularly.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Current Electricity','Ohms Law','V = IR',
  '[{"symbol":"V","meaning":"voltage","unit":"V"},{"symbol":"I","meaning":"current","unit":"A"},{"symbol":"R","meaning":"resistance","unit":"Ω"}]',
  'V','Voltage across a resistor equals current times resistance. Power P = VI = I²R = V²/R.',
  'Series: R = ΣRᵢ. Parallel: 1/R = Σ(1/Rᵢ). Two parallel: R = R₁R₂/(R₁+R₂).',
  '["Adding resistances in parallel instead of taking reciprocals","Forgetting P = I²R is for resistors only"]',
  'Circuit analysis questions in nearly every paper.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Physics','Moving Charges and Magnetism','Lorentz Force','F = q(E + v × B)',
  '[{"symbol":"F","meaning":"Lorentz force","unit":"N"},{"symbol":"q","meaning":"charge","unit":"C"},{"symbol":"E","meaning":"electric field","unit":"V/m"},{"symbol":"v","meaning":"velocity","unit":"m/s"},{"symbol":"B","meaning":"magnetic field","unit":"T"}]',
  'N','Total electromagnetic force on a charge. Magnetic part is always perpendicular to v so does no work.',
  'Cyclotron radius r = mv/(qB). Period T = 2πm/(qB) — independent of speed.',
  '["Forgetting the cross product (v × B not v·B)","Using scalar addition instead of vector addition"]',
  'High frequency in electromagnetism sections.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== JEE CHEMISTRY ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Mole Concept and Stoichiometry','Mole Concept','n = m / M = N / Nₐ',
  '[{"symbol":"n","meaning":"number of moles","unit":"mol"},{"symbol":"m","meaning":"mass","unit":"g"},{"symbol":"M","meaning":"molar mass","unit":"g/mol"},{"symbol":"N","meaning":"number of particles","unit":"—"},{"symbol":"Nₐ","meaning":"Avogadro number","unit":"6.022×10²³/mol"}]',
  'mol','A mole contains Avogadro number of particles. Converts between mass, moles, and particle count.',
  'At STP, 1 mole of any gas occupies 22.4 L. Use this to skip mass-to-volume conversions.',
  '["Confusing molar mass with molecular mass (units)","Using Nₐ for mass calculations directly"]',
  'Foundation of stoichiometry; appears in almost every physical chemistry question.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Gaseous State','Ideal Gas Equation','PV = nRT',
  '[{"symbol":"P","meaning":"pressure","unit":"Pa or atm"},{"symbol":"V","meaning":"volume","unit":"L or m³"},{"symbol":"n","meaning":"moles","unit":"mol"},{"symbol":"R","meaning":"gas constant","unit":"0.0821 L·atm/(mol·K)"},{"symbol":"T","meaning":"temperature","unit":"K"}]',
  'varies','Combines Boyle, Charles, and Avogadro laws. R = 0.0821 L·atm/(mol·K) or 8.314 J/(mol·K).',
  'For fixed mass: P₁V₁/T₁ = P₂V₂/T₂. Saves computing n and R.',
  '["Using Celsius instead of Kelvin","Mixing R units (L·atm vs J)"]',
  'Standard in gaseous state questions.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Ionic Equilibrium','pH Definition','pH = −log₁₀[H⁺]',
  '[{"symbol":"pH","meaning":"acidity scale","unit":"0–14"},{"symbol":"[H⁺]","meaning":"hydrogen ion concentration","unit":"mol/L"}]',
  'dimensionless','pH < 7 acidic, > 7 basic, = 7 neutral (at 25°C). pOH = 14 − pH. pKw = 14 at 25°C.',
  'For strong acids [H⁺] = normality. For weak acids [H⁺] = √(Ka·C) — saves solving the full quadratic.',
  '["Forgetting pKw changes with temperature","Using pH + pOH = 14 at temperatures other than 25°C"]',
  'Appears in ionic equilibrium and buffer questions every year.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Ionic Equilibrium','Henderson-Hasselbalch','pH = pKa + log([A⁻]/[HA])',
  '[{"symbol":"pH","meaning":"buffer pH","unit":"—"},{"symbol":"pKa","meaning":"acid dissociation constant","unit":"—"},{"symbol":"[A⁻]","meaning":"conjugate base","unit":"mol/L"},{"symbol":"[HA]","meaning":"weak acid","unit":"mol/L"}]',
  'dimensionless','Calculates pH of buffer solutions. Best when [A⁻]/[HA] is between 0.1 and 10.',
  'When [A⁻] = [HA], pH = pKa directly. Useful for identifying buffer capacity maxima.',
  '["Swapping [A⁻] and [HA]","Applying to non-buffer solutions"]',
  'Buffer problems are JEE favorites.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Chemistry','Thermodynamics','First Law of Thermodynamics','ΔU = q + w',
  '[{"symbol":"ΔU","meaning":"internal energy change","unit":"J"},{"symbol":"q","meaning":"heat transferred","unit":"J"},{"symbol":"w","meaning":"work done on system","unit":"J"}]',
  'J','Energy conservation for chemical systems. w = −PΔV for expansion work (work done BY system is negative).',
  'For isothermal ideal gas: ΔU = 0, so q = −w. For adiabatic: q = 0, so ΔU = w.',
  '["Sign convention confusion (w on vs by system)","Using ΔH when the question asks for ΔU at constant volume"]',
  'Thermochemistry calculations appear in nearly every paper.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== JEE MATHEMATICS ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Quadratic Equations','Quadratic Formula','x = (−b ± √(b² − 4ac)) / 2a',
  '[{"symbol":"x","meaning":"roots","unit":"—"},{"symbol":"a, b, c","meaning":"coefficients of ax² + bx + c","unit":"—"}]',
  'dimensionless','Discriminant D = b² − 4ac: D > 0 two real roots, D = 0 one repeated root, D < 0 complex conjugate roots.',
  'Sum of roots = −b/a, product = c/a. Use these when only symmetric functions of roots are needed.',
  '["Forgetting 2a in denominator","Misreading the sign of b"]',
  'Foundational; underpins many algebra problems.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Differential Calculus','Derivative Power Rule','d/dx [xⁿ] = n·xⁿ⁻¹',
  '[{"symbol":"n","meaning":"exponent","unit":"—"},{"symbol":"x","meaning":"variable","unit":"—"}]',
  'dimensionless','Basic differentiation rule. Chain rule: d/dx[f(g(x))] = f''(g(x))·g''(x).',
  'Product rule: (uv)'' = u''v + uv''. Quotient: (u/v)'' = (u''v − uv'')/v².',
  '["Applying power rule to e^x (use e^x itself)","Forgetting chain rule in composite functions"]',
  'Calculus is the most heavily weighted JEE math topic.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Integral Calculus','Integration by Parts','∫u dv = uv − ∫v du',
  '[{"symbol":"u, v","meaning":"functions of x","unit":"—"}]',
  'varies','LIATE rule for choosing u: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.',
  '∫eˣ(sin x + cos x) dx = eˣ sin x + C. Memorize such direct forms to save time.',
  '["Choosing u and dv wrong (violates LIATE)","Forgetting the constant of integration"]',
  'Definite integrals using parts appear every year.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('jee-main','Mathematics','Trigonometry','Sine Rule','a/sin A = b/sin B = c/sin C = 2R',
  '[{"symbol":"a, b, c","meaning":"side lengths","unit":"—"},{"symbol":"A, B, C","meaning":"opposite angles","unit":"rad"},{"symbol":"R","meaning":"circumradius","unit":"—"}]',
  'dimensionless','Relates sides to opposite angles in any triangle. R is the circumradius.',
  'Cosine rule: c² = a² + b² − 2ab·cos C. Use when all three sides or two sides + included angle are known.',
  '["Using sine rule for SAS configuration","Forgetting R is circumradius not inradius"]',
  'Properties of triangles is a standard JEE topic.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== NEET PHYSICS ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Physics','Kinematics','Equations of Motion','v = u + at; s = ut + ½at²; v² = u² + 2as',
  '[{"symbol":"v","meaning":"final velocity","unit":"m/s"},{"symbol":"u","meaning":"initial velocity","unit":"m/s"},{"symbol":"a","meaning":"acceleration","unit":"m/s²"}]',
  'm/s, m','Motion under constant acceleration. Fundamental for NEET mechanics.',
  'For free fall use a = g = 9.8 m/s² and consistent sign convention.',
  '["Confusing displacement with distance","Wrong sign for retardation"]',
  'NEET physics almost always has 1–2 kinematics questions.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Physics','Current Electricity','Ohms Law','V = IR',
  '[{"symbol":"V","meaning":"voltage","unit":"V"},{"symbol":"I","meaning":"current","unit":"A"},{"symbol":"R","meaning":"resistance","unit":"Ω"}]',
  'V','Foundation of circuit analysis. Power dissipated P = I²R.',
  'Two resistors in parallel: R = R₁R₂/(R₁+R₂).',
  '["Adding parallel resistances directly"]',
  'NEET circuit questions are common.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Physics','Ray Optics','Lens Formula','1/v − 1/u = 1/f',
  '[{"symbol":"v","meaning":"image distance","unit":"cm"},{"symbol":"u","meaning":"object distance","unit":"cm"},{"symbol":"f","meaning":"focal length","unit":"cm"}]',
  'cm⁻¹','Sign convention: distances measured from optical center. Convex lens f > 0, concave f < 0.',
  'Magnification m = v/u = h''/h. Power P = 1/f (in meters) — unit is dioptre.',
  '["Wrong sign convention for virtual images","Using f in cm when computing power"]',
  'Optics is heavily tested in NEET.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== NEET CHEMISTRY ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Chemistry','Mole Concept and Stoichiometry','Mole Concept','n = m / M = N / Nₐ',
  '[{"symbol":"n","meaning":"moles","unit":"mol"},{"symbol":"m","meaning":"mass","unit":"g"},{"symbol":"M","meaning":"molar mass","unit":"g/mol"},{"symbol":"Nₐ","meaning":"Avogadro number","unit":"6.022×10²³"}]',
  'mol','Central to stoichiometry. At STP, 1 mole gas = 22.4 L.',
  'Number of atoms = moles × Nₐ × atomicity.',
  '["Forgetting atomicity for diatomic gases"]',
  'NEET physical chemistry foundation.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Chemistry','Ionic Equilibrium','pH Definition','pH = −log₁₀[H⁺]',
  '[{"symbol":"pH","meaning":"acidity","unit":"0–14"},{"symbol":"[H⁺]","meaning":"H⁺ concentration","unit":"mol/L"}]',
  'dimensionless','pH scale. Blood pH ~7.4. Stomach pH ~1.5–2.',
  'pOH = 14 − pH at 25°C.',
  '["Forgetting temperature dependence of pKw"]',
  'NEET frequently tests pH of biological fluids.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== NEET BIOLOGY ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Biology','Evolution','Hardy-Weinberg Equilibrium','p² + 2pq + q² = 1',
  '[{"symbol":"p","meaning":"frequency of dominant allele","unit":"—"},{"symbol":"q","meaning":"frequency of recessive allele","unit":"—"},{"symbol":"p²","meaning":"homozygous dominant frequency","unit":"—"},{"symbol":"2pq","meaning":"heterozygous frequency","unit":"—"},{"symbol":"q²","meaning":"homozygous recessive frequency","unit":"—"}]',
  'dimensionless','Allele frequencies remain constant in an ideal population (no selection, mutation, migration, drift).',
  'If q² is known (recessive phenotype), q = √(q²), p = 1 − q, carrier frequency = 2pq.',
  '["Calculating p from p² instead of taking sqrt","Assuming equilibrium when selection is acting"]',
  'NEET genetics questions frequently invoke Hardy-Weinberg.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Biology','Photosynthesis','Photosynthesis Equation','6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
  '[{"symbol":"CO₂","meaning":"carbon dioxide","unit":"—"},{"symbol":"H₂O","meaning":"water","unit":"—"},{"symbol":"C₆H₁₂O₆","meaning":"glucose","unit":"—"},{"symbol":"O₂","meaning":"oxygen","unit":"—"}]',
  '—','Light-dependent + Calvin cycle. ATP and NADPH carry energy from light to dark reactions.',
  'For 1 glucose: 6 CO₂, 12 H₂O (net 6), 6 O₂. 18 ATP and 12 NADPH per glucose in Calvin cycle.',
  '["Balancing water incorrectly","Forgetting O₂ comes from water not CO₂"]',
  'Direct questions on the equation and sites of reactions are NEET staples.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('neet-ug','Biology','Genetics','Punnett Square Ratio','Monohybrid 3:1; Dihybrid 9:3:3:1; Test cross 1:1',
  '[{"symbol":"—","meaning":"phenotypic ratios","unit":"—"}]',
  'ratio','Mendelian inheritance ratios for F2 generation under independent assortment.',
  'Test cross (with recessive parent) reveals genotype — 1:1 for heterozygote, 1:1:1:1 for dihybrid.',
  '["Confusing phenotypic with genotypic ratio (1:2:1 monohybrid genotypic)"]',
  'Genetics problems are a NEET certainty.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

-- ========== COMMERCE (CA Foundation) ==========
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Accounts','Financial Statements','Net Profit Ratio','Net Profit Ratio = (Net Profit / Revenue) × 100',
  '[{"symbol":"Net Profit","meaning":"profit after all expenses & tax","unit":"₹"},{"symbol":"Revenue","meaning":"net sales","unit":"₹"}]',
  '%','Profitability ratio showing net profit as a percentage of revenue. Higher is better.',
  'Net Profit = Gross Profit − Indirect Expenses + Indirect Income.',
  '["Using gross profit instead of net profit","Forgetting to deduct tax"]',
  'Ratio analysis is a Commerce board exam regular.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Accounts','Financial Statements','Current Ratio','Current Ratio = Current Assets / Current Liabilities',
  '[{"symbol":"Current Assets","meaning":"assets convertible within 1 year","unit":"₹"},{"symbol":"Current Liabilities","meaning":"obligations due within 1 year","unit":"₹"}]',
  'ratio (ideal 2:1)','Liquidity ratio. Ideal ratio is 2:1 — indicates ability to meet short-term obligations.',
  'Quick Ratio = (Current Assets − Stock) / Current Liabilities. Ideal 1:1.',
  '["Including stock in quick ratio","Misclassifying prepaid expenses"]',
  'Liquidity ratios appear in board exams and competitive tests.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Accounts','Depreciation','Depreciation SLM','Annual Depreciation = (Cost − Salvage Value) / Useful Life',
  '[{"symbol":"Cost","meaning":"purchase price + installation","unit":"₹"},{"symbol":"Salvage Value","meaning":"estimated residual value","unit":"₹"},{"symbol":"Useful Life","meaning":"years of expected use","unit":"years"}]',
  '₹/year','Straight-line method: equal depreciation each year. WDV method: depreciation on reducing balance.',
  'Rate under SLM = (Cost − Salvage) / (Cost × Life) × 100.',
  '["Forgetting to subtract salvage value","Applying WDV rate to original cost instead of book value"]',
  'Depreciation accounting is heavily tested.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Economics','Demand','Elasticity of Demand','Ed = (% change in quantity) / (% change in price)',
  '[{"symbol":"Ed","meaning":"price elasticity of demand","unit":"—"},{"symbol":"% ΔQ","meaning":"percentage change in quantity","unit":"%"},{"symbol":"% ΔP","meaning":"percentage change in price","unit":"%"}]',
  'dimensionless','Ed > 1 elastic, Ed < 1 inelastic, Ed = 1 unitary, Ed = 0 perfectly inelastic, Ed = ∞ perfectly elastic.',
  'Midpoint method: Ed = (ΔQ/ΔP) × ((P₁+P₂)/(Q₁+Q₂)) — more accurate for larger changes.',
  '["Forgetting Ed is negative (drop the sign by convention)","Using absolute changes instead of percentages"]',
  'Demand elasticity is a board exam staple.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Economics','Theory of Cost','Marginal Cost','MC = ΔTC / ΔQ',
  '[{"symbol":"MC","meaning":"marginal cost","unit":"₹/unit"},{"symbol":"ΔTC","meaning":"change in total cost","unit":"₹"},{"symbol":"ΔQ","meaning":"change in output","unit":"units"}]',
  '₹/unit','Cost of producing one additional unit. When MC = MR, profit is maximized.',
  'MC = TVC of n units − TVC of (n−1) units. Fixed costs do not affect MC.',
  '["Including fixed costs in MC computation","Confusing MC with AVC"]',
  'Cost curves and MC=MR equilibrium are exam favorites.','easy')
ON CONFLICT (exam_id, subject, name) DO NOTHING;

INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty) VALUES
('ca-foundation','Business Studies','Financial Management','Break-even Point','BEP (units) = Fixed Cost / (Price − Variable Cost per unit)',
  '[{"symbol":"Fixed Cost","meaning":"costs independent of output","unit":"₹"},{"symbol":"Price","meaning":"selling price per unit","unit":"₹/unit"},{"symbol":"Variable Cost","meaning":"cost per unit","unit":"₹/unit"}]',
  'units','Output level where total revenue equals total cost. Contribution per unit = Price − VC.',
  'BEP (sales value) = Fixed Cost / P/V ratio, where P/V = Contribution / Sales.',
  '["Using total variable cost instead of per-unit","Forgetting contribution margin must be positive"]',
  'Break-even analysis appears in Business Studies and Economics.','medium')
ON CONFLICT (exam_id, subject, name) DO NOTHING;
