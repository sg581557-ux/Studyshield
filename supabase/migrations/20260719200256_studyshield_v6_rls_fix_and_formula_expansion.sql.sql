/*
# StudyShield v6: RLS fix + formula expansion

## Summary
1. RLS FIX: syllabus_exams, syllabus_subjects, syllabus_chapters are public
   reference data needed by the onboarding page (which runs before a session
   is established). They were authenticated-only, causing the exam picker to
   load empty. Now readable by anon + authenticated.
2. RLS DEDUP: drop duplicate policies accumulated from repeated migrations.
   Keep one canonical set per table.
3. FORMULA EXPANSION: seed formulas for jee-advanced, bitsat, mht-cet,
   comedk, viteee, wbjee, kiitee, srmjeee, ca-intermediate, ca-final, cma,
   clat, cat, upsc-cse, gate, nda, cds, plus more neet-ug.
4. formula_library read policy made anon-readable so the vault loads.

## Security
- syllabus_* tables: SELECT TO anon, authenticated (public reference data).
- All user-scoped tables: keep authenticated-only with auth.uid() ownership.
- formula_library: SELECT TO anon, authenticated (reference data).
*/

-- ============================================================
-- 1. SYLLABUS RLS: make reference data readable by anon
-- ============================================================
ALTER TABLE syllabus_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_syllabus_exams" ON syllabus_exams;
DROP POLICY IF EXISTS "read_syllabus_exams" ON syllabus_exams;
CREATE POLICY "read_syllabus_exams" ON syllabus_exams
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "select_syllabus_subjects" ON syllabus_subjects;
DROP POLICY IF EXISTS "read_syllabus_subjects" ON syllabus_subjects;
CREATE POLICY "read_syllabus_subjects" ON syllabus_subjects
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "select_syllabus_chapters" ON syllabus_chapters;
DROP POLICY IF EXISTS "read_syllabus_chapters" ON syllabus_chapters;
CREATE POLICY "read_syllabus_chapters" ON syllabus_chapters
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- 2. DEDUP user-scoped table policies (keep canonical set)
-- ============================================================
DROP POLICY IF EXISTS "select_own_backlog" ON backlog_items;
DROP POLICY IF EXISTS "insert_own_backlog" ON backlog_items;
DROP POLICY IF EXISTS "update_own_backlog" ON backlog_items;
DROP POLICY IF EXISTS "delete_own_backlog" ON backlog_items;

DROP POLICY IF EXISTS "select_formula_library" ON formula_library;
DROP POLICY IF EXISTS "read_formula_library" ON formula_library;
CREATE POLICY "read_formula_library" ON formula_library
  FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- 3. FORMULA EXPANSION — JEE Advanced
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('jee-advanced','Physics','Electrostatics','Coulomb Force in Vector Form','F12 = (1/(4πε₀)) · (q1 q2 / r²) · r̂12','[{"symbol":"F12","meaning":"Force on q1 by q2","unit":"N"},{"symbol":"ε₀","meaning":"Permittivity of free space","unit":"F/m"},{"symbol":"q1,q2","meaning":"Charges","unit":"C"},{"symbol":"r","meaning":"Separation","unit":"m"},{"symbol":"r̂12","meaning":"Unit vector from q2 to q1","unit":"-"}]','N','Vector form of Coulombs law; sign of product determines attraction/repulsion.','Use F = kq1q2/r² for magnitude, attach sign of product for direction.','["Forgetting vector direction","Using wrong sign for charges","Ignoring superposition"]','Directly tested in JEE Advanced electrostatics; combine with equilibrium.','medium'),
('jee-advanced','Physics','Current Electricity','Drift Velocity','vd = (I)/(n A e)','[{"symbol":"vd","meaning":"Drift velocity","unit":"m/s"},{"symbol":"I","meaning":"Current","unit":"A"},{"symbol":"n","meaning":"Electron density","unit":"/m³"},{"symbol":"A","meaning":"Cross-section area","unit":"m²"},{"symbol":"e","meaning":"Electron charge","unit":"C"}]','m/s','Relates macroscopic current to microscopic carrier motion.','vd is tiny (~mm/s) even for large currents.','["Confusing drift velocity with signal speed","Wrong unit for n"]','Appears in resistance and current problems.','easy'),
('jee-advanced','Chemistry','Thermodynamics','Gibbs Free Energy','ΔG = ΔH − TΔS','[{"symbol":"ΔG","meaning":"Gibbs free energy change","unit":"kJ/mol"},{"symbol":"ΔH","meaning":"Enthalpy change","unit":"kJ/mol"},{"symbol":"T","meaning":"Temperature","unit":"K"},{"symbol":"ΔS","meaning":"Entropy change","unit":"J/(mol·K)"}]','kJ/mol','Determines spontaneity: ΔG<0 spontaneous, >0 non-spontaneous.','Convert ΔS to kJ before subtracting.','["Using °C instead of K","Mixing J and kJ units for ΔS"]','Core in thermo and electrochemistry problems.','medium'),
('jee-advanced','Chemistry','Chemical Kinetics','Arrhenius Equation','k = A·e^(−Ea/RT)','[{"symbol":"k","meaning":"Rate constant","unit":"varies"},{"symbol":"A","meaning":"Pre-exponential factor","unit":"varies"},{"symbol":"Ea","meaning":"Activation energy","unit":"J/mol"},{"symbol":"R","meaning":"Gas constant","unit":"J/(mol·K)"},{"symbol":"T","meaning":"Temperature","unit":"K"}]','varies','Temperature dependence of rate constant.','ln(k2/k1) = (Ea/R)·(1/T1 − 1/T2) for two temperatures.','["Using Ea in kJ without ×1000","Forgetting natural log in linear form"]','Frequent in JEE Advanced kinetics.','medium'),
('jee-advanced','Mathematics','Calculus','Integration by Parts','∫u dv = uv − ∫v du','[{"symbol":"u","meaning":"First function","unit":"-"},{"symbol":"dv","meaning":"Second function differential","unit":"-"}]','-','ILATE rule for choosing u: Inverse, Log, Algebraic, Trig, Exponential.','Choose u as the function that simplifies on differentiation.','["Wrong choice of u (should simplify on diff)","Forgetting the second integral"]','Essential for JEE Advanced indefinite integrals.','medium'),
('jee-advanced','Mathematics','Coordinate Geometry','Ellipse Equation','x²/a² + y²/b² = 1','[{"symbol":"a","meaning":"Semi-major axis","unit":"-"},{"symbol":"b","meaning":"Semi-minor axis","unit":"-"},{"symbol":"x,y","meaning":"Point on ellipse","unit":"-"}]','-','Standard ellipse centered at origin; eccentricity e = √(1−b²/a²).','Focus at (±ae, 0); directrix x = ±a/e.','["Swapping a and b","Using b²=a²−e² instead of b²=a²(1−e²)"]','Ellipse properties tested every year.','easy')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. FORMULA EXPANSION — BITSAT / MHT-CET / VITEEE / WBJEE / KIITEE / SRMJEEE / COMEDK
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('bitsat','Physics','Optics','Lens Makers Formula','1/f = (n−1)[1/R1 − 1/R2 + ((n−1)d)/(n R1 R2)]','[{"symbol":"f","meaning":"Focal length","unit":"m"},{"symbol":"n","meaning":"Refractive index","unit":"-"},{"symbol":"R1,R2","meaning":"Radii of curvature","unit":"m"},{"symbol":"d","meaning":"Thickness","unit":"m"}]','m','For thin lens, drop thickness term.','Sign convention: R positive if center of curvature is on outgoing side.','["Wrong sign for R1/R2","Including d for thin lens"]','Common in BITSAT optics.','medium'),
('bitsat','Chemistry','Mole Concept','Number of Moles','n = mass / molar mass = N / NA','[{"symbol":"n","meaning":"Moles","unit":"mol"},{"symbol":"N","meaning":"Number of particles","unit":"-"},{"symbol":"NA","meaning":"Avogadro number","unit":"/mol"}]','mol','Foundation of stoichiometry.','NA = 6.022×10²³/mol.','["Using molecular mass instead of molar","Unit errors"]','Basic; appears across chemistry.','easy'),
('bitsat','Mathematics','Probability','Bayes Theorem','P(A|B) = P(B|A)·P(A) / P(B)','[{"symbol":"P(A|B)","meaning":"Posterior probability","unit":"-"},{"symbol":"P(B|A)","meaning":"Likelihood","unit":"-"},{"symbol":"P(A)","meaning":"Prior","unit":"-"},{"symbol":"P(B)","meaning":"Evidence","unit":"-"}]','-','Updates probability given new evidence.','P(B) = Σ P(B|Ai)·P(Ai) by total probability.','["Forgetting to normalise by P(B)","Confusing prior and posterior"]','BITSAT probability and statistics.','medium'),
('mht-cet','Physics','Magnetism','Magnetic Force on Wire','F = BIL sinθ','[{"symbol":"F","meaning":"Force","unit":"N"},{"symbol":"B","meaning":"Magnetic field","unit":"T"},{"symbol":"I","meaning":"Current","unit":"A"},{"symbol":"L","meaning":"Length","unit":"m"},{"symbol":"θ","meaning":"Angle B to wire","unit":"°"}]','N','Force on current-carrying conductor in field.','Max force when wire perpendicular to B.','["Forgetting sinθ","Wrong direction (use Flemings left rule)"]','MHT-CET magnetism section.','easy'),
('mht-cet','Chemistry','Equilibrium','Equilibrium Constant','Kc = [products]/[reactants] (stoich powers)','[{"symbol":"Kc","meaning":"Equilibrium constant","unit":"-"},{"symbol":"[]","meaning":"Molar concentration","unit":"mol/L"}]','-','For aA+bB⇌cC+dD, Kc = [C]^c[D]^d/([A]^a[B]^b).','Kp = Kc(RT)^Δn for gases.','["Using moles instead of concentrations","Wrong stoichiometric powers"]','MHT-CET equilibrium is high-yield.','easy'),
('mht-cet','Mathematics','Trigonometry','Sine and Cosine Rules','a/sinA = b/sinB = c/sinC; c²=a²+b²−2ab cosC','[{"symbol":"a,b,c","meaning":"Sides","unit":"-"},{"symbol":"A,B,C","meaning":"Opposite angles","unit":"°"}]','-','Solve non-right triangles.','cos(A+B) form helps in compound angles.','["Using sine rule for SAS case","Sign error in cosine rule for obtuse C"]','MHT-CET trig problems.','medium'),
('viteee','Physics','Modern Physics','de Broglie Wavelength','λ = h/p = h/(mv)','[{"symbol":"λ","meaning":"Wavelength","unit":"m"},{"symbol":"h","meaning":"Planck constant","unit":"J·s"},{"symbol":"p","meaning":"Momentum","unit":"kg·m/s"},{"symbol":"m","meaning":"Mass","unit":"kg"},{"symbol":"v","meaning":"Velocity","unit":"m/s"}]','m','Matter wave wavelength; wave-particle duality.','For electron accelerated through V volts: λ = 12.27/√V Å.','["Using mass in grams","Forgetting to convert eV to joules"]','VITEEE modern physics.','medium'),
('viteee','Mathematics','Differential Equations','Linear DE Form','dy/dx + P(x)y = Q(x)','[{"symbol":"y","meaning":"Dependent variable","unit":"-"},{"symbol":"P,Q","meaning":"Functions of x","unit":"-"}]','-','Integrating factor IF = e^∫P dx; solution y·IF = ∫Q·IF dx.','Recognise linear form before solving.','["Not recognising linear form","Wrong integrating factor"]','VITEEE differential equations.','medium'),
('wbjee','Physics','Thermodynamics','First Law','ΔU = Q − W','[{"symbol":"ΔU","meaning":"Internal energy change","unit":"J"},{"symbol":"Q","meaning":"Heat added to system","unit":"J"},{"symbol":"W","meaning":"Work done by system","unit":"J"}]','J','Energy conservation for thermodynamic systems.','Sign: W positive when system expands.','["Wrong sign convention for W","Confusing work by vs on system"]','WBJEE thermo.','easy'),
('kiitee','Chemistry','Periodic Table','Effective Nuclear Charge','Zeff = Z − σ','[{"symbol":"Zeff","meaning":"Effective nuclear charge","unit":"-"},{"symbol":"Z","meaning":"Atomic number","unit":"-"},{"symbol":"σ","meaning":"Shielding constant","unit":"-"}]','-','Slater rules give σ; Zeff explains trends.','Zeff increases across a period.','["Using full Z instead of Zeff","Wrong Slater screening values"]','KIITEE periodic properties.','easy'),
('srmjeee','Mathematics','Vectors','Scalar Triple Product','[a b c] = a·(b×c) = det[b c]','[{"symbol":"a,b,c","meaning":"Vectors","unit":"-"},{"symbol":"×","meaning":"Cross product","unit":"-"},{"symbol":"·","meaning":"Dot product","unit":"-"}]','-','Volume of parallelepiped; coplanarity if [abc]=0.','Determinant of 3 vectors rows = scalar triple product.','["Row vs column mix-up in determinant","Forgetting coplanarity test"]','SRMJEEE vector algebra.','medium'),
('comedk','Physics','Electrostatics','Capacitance','C = Q/V; for parallel plate C = ε₀A/d','[{"symbol":"C","meaning":"Capacitance","unit":"F"},{"symbol":"Q","meaning":"Charge","unit":"C"},{"symbol":"V","meaning":"Voltage","unit":"V"},{"symbol":"ε₀","meaning":"Permittivity","unit":"F/m"},{"symbol":"A","meaning":"Plate area","unit":"m²"},{"symbol":"d","meaning":"Separation","unit":"m"}]','F','Series: 1/C=Σ1/Ci; parallel: C=ΣCi.','Energy stored U = ½CV².','["Series vs parallel formula swap","Wrong dielectric effect (k multiplies C)"]','COMEDK electrostatics.','easy')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. FORMULA EXPANSION — Commerce (CA Intermediate / Final / CMA)
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('ca-intermediate','Advanced Accounting','Ratio Analysis','Current Ratio','Current Ratio = Current Assets / Current Liabilities','[{"symbol":"Current Assets","meaning":"Cash, stock, debtors etc","unit":"₹"},{"symbol":"Current Liabilities","meaning":"Payables, short-term debt","unit":"₹"}]','-','Liquidity measure; ideal ~2:1.','Quick ratio = (CA−Inventory)/CL.','["Including fixed assets in CA","Treating bank overdraft as non-current"]','CA Inter ratio analysis.','easy'),
('ca-intermediate','Corporate Laws','Capital Structure','Debt-Equity Ratio','D/E = Total Debt / Shareholders Equity','[{"symbol":"D","meaning":"Total debt (long+short)","unit":"₹"},{"symbol":"E","meaning":"Shareholders equity","unit":"₹"}]','-','Leverage indicator; high D/E = higher risk.','Interest coverage = EBIT/Interest.','["Using only long-term debt","Equity net of intangible assets inconsistency"]','Capital structure questions.','medium'),
('ca-final','Financial Reporting','Valuation','Discounted Cash Flow','V = Σ CFt/(1+r)^t','[{"symbol":"V","meaning":"Value","unit":"₹"},{"symbol":"CFt","meaning":"Cash flow at time t","unit":"₹"},{"symbol":"r","meaning":"Discount rate","unit":"-"},{"symbol":"t","meaning":"Time period","unit":"yr"}]','₹','Intrinsic value via present value of future cash flows.','Terminal value = CFn(1+g)/(r−g).','["Using wrong discount rate","Inconsistent time units"]','CA Final valuation chapter.','hard'),
('ca-final','Strategic Financial Management','Portfolio','CAPM','E(Ri) = Rf + βi·(E(Rm) − Rf)','[{"symbol":"E(Ri)","meaning":"Expected return","unit":"%"},{"symbol":"Rf","meaning":"Risk-free rate","unit":"%"},{"symbol":"βi","meaning":"Stock beta","unit":"-"},{"symbol":"E(Rm)","meaning":"Market return","unit":"%"}]','%','Required return given systematic risk.','Beta = Cov(Ri,Rm)/Var(Rm).','["Confusing β with correlation","Using nominal Rf with real returns"]','CAPM in SFM.','medium'),
('cma','Cost Accounting','Marginal Costing','P/V Ratio','P/V Ratio = (Sales − Variable Cost)/Sales = Contribution/Sales','[{"symbol":"P/V","meaning":"Profit-volume ratio","unit":"%"},{"symbol":"Contribution","meaning":"Sales − Variable cost","unit":"₹"}]','%','Measures profitability per rupee of sales.','BEP (₹) = Fixed Cost / P/V ratio.','["Using profit instead of contribution","Wrong BEP formula"]','CMA marginal costing.','medium'),
('cma','Financial Management','Capital Budgeting','NPV','NPV = Σ CFt/(1+k)^t − Initial Investment','[{"symbol":"NPV","meaning":"Net present value","unit":"₹"},{"symbol":"CFt","meaning":"Cash flow at t","unit":"₹"},{"symbol":"k","meaning":"Cost of capital","unit":"%"}]','₹','Accept if NPV>0; compares projects.','IRR is the rate making NPV=0.','["Using accounting profit not cash flow","Wrong discount rate"]','CMA capital budgeting.','medium')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. FORMULA EXPANSION — CLAT / CAT / UPSC / GATE / NDA / CDS
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('cat','Quantitative Aptitude','Number System','Remainder Theorem','(a mod n) and (b mod n) → (a+b) mod n = [(a mod n)+(b mod n)] mod n','[{"symbol":"a,b","meaning":"Integers","unit":"-"},{"symbol":"n","meaning":"Modulus","unit":"-"}]','-','Modular arithmetic for remainder problems.','Use Euler/Fermat for large powers.','["Adding moduli without re-modding","Ignoring negative remainders"]','CAT number system.','medium'),
('cat','Quantitative Aptitude','Time-Speed-Distance','Relative Speed','Relative speed = |v1 − v2| (same dir), v1+v2 (opposite)','[{"symbol":"v1,v2","meaning":"Speeds","unit":"km/h"}]','km/h','Same direction subtract; opposite add.','Meeting time = distance / relative speed.','["Using sum for same direction","Unit mismatch (m/s vs km/h)"]','CAT TSD problems.','easy'),
('clat','Quantitative Techniques','Percentages','Percentage Change','% change = (New − Original)/Original × 100','[{"symbol":"New","meaning":"New value","unit":"-"},{"symbol":"Original","meaning":"Original value","unit":"-"}]','%','Successive %: a+b+ab/100.','Net change for x% up, y% down.','["Dividing by New instead of Original","Forgetting ×100"]','CLAT quantitative.','easy'),
('upsc-cse','Economics','Microeconomics','Price Elasticity','Ed = (%ΔQ)/(%ΔP) = (ΔQ/Q)/(ΔP/P)','[{"symbol":"Ed","meaning":"Price elasticity","unit":"-"},{"symbol":"ΔQ","meaning":"Qty change","unit":"-"},{"symbol":"ΔP","meaning":"Price change","unit":"-"}]','-','Ed>1 elastic, <1 inelastic, =1 unitary.','Revenue maximised where Ed=1.','["Using absolute changes not %","Sign confusion"]','UPSC economics.','medium'),
('upsc-cse','Polity','Elections','Electoral Quota','Quota = (Valid votes)/(Seats+1) + 1','[{"symbol":"Quota","meaning":"Votes needed to win","unit":"-"},{"symbol":"Valid votes","meaning":"Total valid votes","unit":"-"},{"symbol":"Seats","meaning":"Seats to fill","unit":"-"}]','-','Droop quota for STV elections.','Used in proportional representation.','["Off-by-one in +1","Using total not valid votes"]','UPSC polity reference.','medium'),
('gate','Engineering Mathematics','Linear Algebra','Eigenvalue','det(A − λI) = 0','[{"symbol":"A","meaning":"Square matrix","unit":"-"},{"symbol":"λ","meaning":"Eigenvalue","unit":"-"},{"symbol":"I","meaning":"Identity matrix","unit":"-"}]','-','Characteristic equation; roots are eigenvalues.','Trace = Σλ, det = Πλ.','["Forgetting to subtract λI","Using A−λ instead of A−λI"]','GATE linear algebra.','medium'),
('nda','Mathematics','Trigonometry','Compound Angle','sin(A±B) = sinA cosB ± cosA sinB','[{"symbol":"A,B","meaning":"Angles","unit":"°"}]','-','cos(A±B)=cosA cosB ∓ sinA sinB.','tan(A+B)=(tanA+tanB)/(1−tanA tanB).','["Sign flip between sin and cos forms","Wrong sign in tan formula"]','NDA trigonometry.','easy'),
('cds','Mathematics','Geometry','Area of Triangle','A = ½·b·h = ½ ab sinC = √(s(s−a)(s−b)(s−c))','[{"symbol":"A","meaning":"Area","unit":"m²"},{"symbol":"b,h","meaning":"Base, height","unit":"m"},{"symbol":"s","meaning":"Semi-perimeter","unit":"m"}]','m²','Herons formula uses semi-perimeter s=(a+b+c)/2.','For right triangle A=½·leg1·leg2.','["Using full perimeter in Herons","Wrong included angle for ½ab sinC"]','CDS geometry.','easy')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. MORE NEET UG formulas
-- ============================================================
INSERT INTO formula_library (exam_id, subject, chapter, name, expression, variables, unit, explanation, shortcut, common_mistakes, pyq_importance, difficulty)
VALUES
('neet-ug','Biology','Genetics','Hardy-Weinberg','p² + 2pq + q² = 1; p + q = 1','[{"symbol":"p","meaning":"Dominant allele freq","unit":"-"},{"symbol":"q","meaning":"Recessive allele freq","unit":"-"}]','-','Equilibrium allele frequencies in a population.','p² = homozygous dominant, 2pq = heterozygote.','["Solving for p without using p+q=1","Using phenotype frequencies as allele freqs"]','NEET genetics.','medium'),
('neet-ug','Biology','Photosynthesis','Net Photosynthesis','Net P = Gross P − Respiration','[{"symbol":"Net P","meaning":"Net photosynthesis","unit":"mg O₂/L"},{"symbol":"Gross P","meaning":"Gross photosynthesis","unit":"mg O₂/L"}]','mg O₂/L','Net gain after respiratory loss.','Gross P measured in light; respiration in dark.','["Using only light bottle values","Forgetting dark bottle correction"]','NEET plant physiology.','medium'),
('neet-ug','Physics','Optics','Snells Law','n1 sinθ1 = n2 sinθ2','[{"symbol":"n1,n2","meaning":"Refractive indices","unit":"-"},{"symbol":"θ1,θ2","meaning":"Angles from normal","unit":"°"}]','-','Refraction at interface; basis of lens theory.','Critical angle sinC = n2/n1 (n1>n2).','["Measuring angle from surface not normal","Reversing n1,n2"]','NEET optics.','easy'),
('neet-ug','Chemistry','Solutions','Raoults Law','pA = xA · pA°','[{"symbol":"pA","meaning":"Partial vapour pressure","unit":"atm"},{"symbol":"xA","meaning":"Mole fraction","unit":"-"},{"symbol":"pA°","meaning":"Pure vapour pressure","unit":"atm"}]','atm','For ideal solutions total P = Σ xi pi°.','Positive/negative deviation modifies this.','["Using mole fraction of solute for solvent P","Ignoring non-ideality"]','NEET solutions.','medium')
ON CONFLICT DO NOTHING;
