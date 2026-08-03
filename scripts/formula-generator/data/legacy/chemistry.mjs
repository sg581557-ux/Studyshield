// AUTO-CONVERTED from legacy tuple format by scripts/migrate-legacy.mjs — DO NOT EDIT MANUALLY.
// These seeds feed the new declarative formula generator.
export const seeds = [
  {
    "id": "chm-001",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Mole Concept",
    "topic": "Mole Concept",
    "name": "Mole Concept",
    "expression": "n=m/M=N/Nₐ",
    "latex": "n=\\frac{m}{M}=\\frac{N}{N_A}",
    "description": "Moles = mass/molar mass.",
    "variables": [
      {
        "symbol": "n",
        "description": "Moles",
        "unit": "mol"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "g"
      },
      {
        "symbol": "M",
        "description": "Molar mass",
        "unit": "g/mol"
      },
      {
        "symbol": "N",
        "description": "Particles"
      },
      {
        "symbol": "Nₐ",
        "description": "Avogadro number"
      }
    ],
    "units": "mol",
    "conditions": "—",
    "notes": "At STP: 1 mol gas = 22.4 L.",
    "mistakes": [
      "Confusing molar mass with molecular mass"
    ],
    "tags": [
      "mole concept",
      "stoichiometry"
    ],
    "synonyms": [
      "mole",
      "stoichiometry",
      "avogadro"
    ],
    "importance": "critical",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-002",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Gaseous State",
    "topic": "Ideal Gas Equation",
    "name": "Ideal Gas Equation",
    "expression": "PV=nRT",
    "latex": "PV=nRT",
    "description": "Ideal gas law.",
    "variables": [
      {
        "symbol": "P",
        "description": "Pressure",
        "unit": "Pa"
      },
      {
        "symbol": "V",
        "description": "Volume",
        "unit": "m³"
      },
      {
        "symbol": "n",
        "description": "Moles",
        "unit": "mol"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "varies",
    "conditions": "Ideal gas.",
    "notes": "R=0.0821 L·atm/(mol·K) or 8.314 J/(mol·K).",
    "mistakes": [
      "Using Celsius"
    ],
    "tags": [
      "gaseous state",
      "ideal gas"
    ],
    "synonyms": [
      "ideal gas",
      "gas law"
    ],
    "importance": "critical",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-003",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Gaseous State",
    "topic": "Combined Gas Law",
    "name": "Combined Gas Law",
    "expression": "P₁V₁/T₁=P₂V₂/T₂",
    "latex": "\\frac{P_1V_1}{T_1}=\\frac{P_2V_2}{T_2}",
    "description": "Combined gas law.",
    "variables": [
      {
        "symbol": "P",
        "description": "Pressure"
      },
      {
        "symbol": "V",
        "description": "Volume"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "varies",
    "conditions": "Fixed mass.",
    "notes": "Saves computing n and R.",
    "mistakes": [
      "Using Celsius"
    ],
    "tags": [
      "gaseous state",
      "gas law"
    ],
    "synonyms": [
      "combined gas law"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-004",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Gaseous State",
    "topic": "Boyles Law",
    "name": "Boyle's Law",
    "expression": "PV=const (T const)",
    "latex": "PV=\\text{const}",
    "description": "Pressure inversely proportional to volume.",
    "variables": [
      {
        "symbol": "P",
        "description": "Pressure"
      },
      {
        "symbol": "V",
        "description": "Volume"
      }
    ],
    "units": "varies",
    "conditions": "Constant T.",
    "notes": "P₁V₁=P₂V₂.",
    "mistakes": [
      "Not keeping T constant"
    ],
    "tags": [
      "gaseous state",
      "boyle"
    ],
    "synonyms": [
      "boyle law"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-005",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Gaseous State",
    "topic": "Charles Law",
    "name": "Charles's Law",
    "expression": "V/T=const (P const)",
    "latex": "\\frac{V}{T}=\\text{const}",
    "description": "Volume proportional to temperature.",
    "variables": [
      {
        "symbol": "V",
        "description": "Volume"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "varies",
    "conditions": "Constant P.",
    "notes": "V₁/T₁=V₂/T₂.",
    "mistakes": [
      "Using Celsius"
    ],
    "tags": [
      "gaseous state",
      "charles"
    ],
    "synonyms": [
      "charles law"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-010",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Thermochemistry",
    "topic": "Enthalpy",
    "name": "Enthalpy Change",
    "expression": "ΔH=ΔU+ΔnRT",
    "latex": "\\Delta H=\\Delta U+\\Delta n_g RT",
    "description": "Enthalpy from internal energy.",
    "variables": [
      {
        "symbol": "ΔH",
        "description": "Enthalpy change",
        "unit": "J"
      },
      {
        "symbol": "ΔU",
        "description": "Internal energy change",
        "unit": "J"
      },
      {
        "symbol": "Δn_g",
        "description": "Moles of gas change"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "J",
    "conditions": "Ideal gas.",
    "notes": "Δn_g = moles product gas - moles reactant gas.",
    "mistakes": [
      "Wrong Δn_g sign"
    ],
    "tags": [
      "thermochemistry",
      "enthalpy"
    ],
    "synonyms": [
      "enthalpy change"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-011",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Thermodynamics",
    "topic": "First Law",
    "name": "First Law of Thermodynamics",
    "expression": "ΔU=q+w",
    "latex": "\\Delta U=q+w",
    "description": "Energy conservation.",
    "variables": [
      {
        "symbol": "ΔU",
        "description": "Internal energy change",
        "unit": "J"
      },
      {
        "symbol": "q",
        "description": "Heat",
        "unit": "J"
      },
      {
        "symbol": "w",
        "description": "Work",
        "unit": "J"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "w=-PΔV for expansion.",
    "mistakes": [
      "Sign convention confusion"
    ],
    "tags": [
      "thermodynamics",
      "first law"
    ],
    "synonyms": [
      "first law",
      "thermodynamics"
    ],
    "importance": "critical",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-012",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Thermodynamics",
    "topic": "Gibbs Energy",
    "name": "Gibbs Free Energy",
    "expression": "ΔG=ΔH-TΔS",
    "latex": "\\Delta G=\\Delta H-T\\Delta S",
    "description": "Spontaneity criterion.",
    "variables": [
      {
        "symbol": "ΔG",
        "description": "Gibbs energy",
        "unit": "J"
      },
      {
        "symbol": "ΔH",
        "description": "Enthalpy",
        "unit": "J"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      },
      {
        "symbol": "ΔS",
        "description": "Entropy",
        "unit": "J/K"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "ΔG<0 spontaneous, ΔG>0 non-spontaneous.",
    "mistakes": [
      "Wrong sign of TΔS"
    ],
    "tags": [
      "thermodynamics",
      "gibbs"
    ],
    "synonyms": [
      "gibbs energy",
      "free energy"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-013",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Thermodynamics",
    "topic": "Entropy",
    "name": "Entropy Change",
    "expression": "ΔS=q_rev/T",
    "latex": "\\Delta S=\\frac{q_{rev}}{T}",
    "description": "Entropy change.",
    "variables": [
      {
        "symbol": "ΔS",
        "description": "Entropy change",
        "unit": "J/K"
      },
      {
        "symbol": "q_rev",
        "description": "Reversible heat",
        "unit": "J"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "J/K",
    "conditions": "Reversible process.",
    "notes": "ΔS≥0 for isolated system.",
    "mistakes": [
      "Using irreversible heat"
    ],
    "tags": [
      "thermodynamics",
      "entropy"
    ],
    "synonyms": [
      "entropy change"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-020",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Equilibrium",
    "topic": "Equilibrium Constant",
    "name": "Equilibrium Constant (Kc)",
    "expression": "Kc=[products]/[reactants]",
    "latex": "K_c=\\frac{[C]^c[D]^d}{[A]^a[B]^b}",
    "description": "Equilibrium constant.",
    "variables": [
      {
        "symbol": "Kc",
        "description": "Equilibrium constant"
      },
      {
        "symbol": "A,B",
        "description": "Reactants"
      },
      {
        "symbol": "C,D",
        "description": "Products"
      }
    ],
    "units": "dimensionless",
    "conditions": "Equilibrium.",
    "notes": "Kc depends only on temperature.",
    "mistakes": [
      "Including solids/liquids"
    ],
    "tags": [
      "chemical equilibrium",
      "kc"
    ],
    "synonyms": [
      "equilibrium constant",
      "kc"
    ],
    "importance": "critical",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-021",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Equilibrium",
    "topic": "Kp and Kc",
    "name": "Kp-Kc Relation",
    "expression": "Kp=Kc(RT)^Δn",
    "latex": "K_p=K_c(RT)^{\\Delta n}",
    "description": "Relation between Kp and Kc.",
    "variables": [
      {
        "symbol": "Kp",
        "description": "Kp"
      },
      {
        "symbol": "Kc",
        "description": "Kc"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      },
      {
        "symbol": "Δn",
        "description": "Moles gas change"
      }
    ],
    "units": "dimensionless",
    "conditions": "Gas phase.",
    "notes": "Δn=moles product gas - moles reactant gas.",
    "mistakes": [
      "Wrong Δn sign"
    ],
    "tags": [
      "chemical equilibrium",
      "kp"
    ],
    "synonyms": [
      "kp kc relation"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-022",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Equilibrium",
    "topic": "Reaction Quotient",
    "name": "Reaction Quotient (Q)",
    "expression": "Q=[products]/[reactants]",
    "latex": "Q=\\frac{[C]^c[D]^d}{[A]^a[B]^b}",
    "description": "Reaction quotient.",
    "variables": [
      {
        "symbol": "Q",
        "description": "Reaction quotient"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Q<Kc forward, Q>Kc backward, Q=Kc equilibrium.",
    "mistakes": [
      "Confusing Q with Kc"
    ],
    "tags": [
      "chemical equilibrium",
      "reaction quotient"
    ],
    "synonyms": [
      "reaction quotient",
      "q"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-023",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Equilibrium",
    "topic": "Le Chatelier",
    "name": "Le Chatelier's Principle",
    "expression": "Shift opposes change",
    "latex": "—",
    "description": "System shifts to oppose change.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "Applies to equilibrium.",
    "mistakes": [
      "Wrong direction of shift",
      "Pressure: shift to fewer gas moles."
    ],
    "tags": [
      "chemical equilibrium",
      "le chatelier"
    ],
    "synonyms": [
      "le chatelier principle"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-030",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "pH",
    "name": "pH Definition",
    "expression": "pH=-log[H⁺]",
    "latex": "pH=-\\log[H^+]",
    "description": "pH of solution.",
    "variables": [
      {
        "symbol": "pH",
        "description": "pH"
      },
      {
        "symbol": "[H⁺]",
        "description": "H+ concentration",
        "unit": "mol/L"
      }
    ],
    "units": "dimensionless",
    "conditions": "25°C.",
    "notes": "pH<7 acidic, >7 basic, =7 neutral. pOH=14-pH.",
    "mistakes": [
      "Using pKw=14 at other temps"
    ],
    "tags": [
      "ionic equilibrium",
      "ph"
    ],
    "synonyms": [
      "ph",
      "acidity"
    ],
    "importance": "critical",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-031",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "pOH",
    "name": "pOH Definition",
    "expression": "pOH=-log[OH⁻]",
    "latex": "pOH=-\\log[OH^-]",
    "description": "pOH of solution.",
    "variables": [
      {
        "symbol": "pOH",
        "description": "pOH"
      },
      {
        "symbol": "[OH⁻]",
        "description": "OH- concentration",
        "unit": "mol/L"
      }
    ],
    "units": "dimensionless",
    "conditions": "25°C.",
    "notes": "pH+pOH=14 at 25°C.",
    "mistakes": [
      "Forgetting temperature dependence"
    ],
    "tags": [
      "ionic equilibrium",
      "poh"
    ],
    "synonyms": [
      "poh",
      "basicity"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-032",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "Henderson-Hasselbalch",
    "name": "Henderson-Hasselbalch",
    "expression": "pH=pKa+log([A⁻]/[HA])",
    "latex": "pH=pK_a+\\log\\frac{[A^-]}{[HA]}",
    "description": "Buffer pH.",
    "variables": [
      {
        "symbol": "pH",
        "description": "Buffer pH"
      },
      {
        "symbol": "pKa",
        "description": "Acid dissociation"
      },
      {
        "symbol": "[A⁻]",
        "description": "Conjugate base",
        "unit": "mol/L"
      },
      {
        "symbol": "[HA]",
        "description": "Weak acid",
        "unit": "mol/L"
      }
    ],
    "units": "dimensionless",
    "conditions": "Buffer solution.",
    "notes": "When [A⁻]=[HA], pH=pKa.",
    "mistakes": [
      "Swapping A⁻ and HA"
    ],
    "tags": [
      "ionic equilibrium",
      "buffer"
    ],
    "synonyms": [
      "henderson hasselbalch",
      "buffer"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-033",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "Ka",
    "name": "Acid Dissociation Constant",
    "expression": "Ka=[H⁺][A⁻]/[HA]",
    "latex": "K_a=\\frac{[H^+][A^-]}{[HA]}",
    "description": "Acid dissociation.",
    "variables": [
      {
        "symbol": "Ka",
        "description": "Acid dissociation const"
      },
      {
        "symbol": "[H⁺]",
        "description": "H+ conc"
      },
      {
        "symbol": "[A⁻]",
        "description": "Conjugate base"
      },
      {
        "symbol": "[HA]",
        "description": "Acid"
      }
    ],
    "units": "dimensionless",
    "conditions": "Weak acid.",
    "notes": "pKa=-log Ka.",
    "mistakes": [
      "Including water"
    ],
    "tags": [
      "ionic equilibrium",
      "ka"
    ],
    "synonyms": [
      "acid dissociation",
      "ka"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-034",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "Weak Acid pH",
    "name": "Weak Acid pH",
    "expression": "[H⁺]=√(Ka·C)",
    "latex": "[H^+]=\\sqrt{K_a C}",
    "description": "H+ in weak acid.",
    "variables": [
      {
        "symbol": "[H⁺]",
        "description": "H+ conc",
        "unit": "mol/L"
      },
      {
        "symbol": "Ka",
        "description": "Dissociation const"
      },
      {
        "symbol": "C",
        "description": "Concentration",
        "unit": "mol/L"
      }
    ],
    "units": "mol/L",
    "conditions": "Weak acid, Ka<<C.",
    "notes": "Saves solving quadratic.",
    "mistakes": [
      "Using for strong acid"
    ],
    "tags": [
      "ionic equilibrium",
      "weak acid"
    ],
    "synonyms": [
      "weak acid ph"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-035",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "Kw",
    "name": "Water Dissociation",
    "expression": "Kw=[H⁺][OH⁻]=10⁻¹⁴",
    "latex": "K_w=[H^+][OH^-]=10^{-14}",
    "description": "Water dissociation constant.",
    "variables": [
      {
        "symbol": "Kw",
        "description": "Water dissociation"
      },
      {
        "symbol": "[H⁺]",
        "description": "H+ conc"
      },
      {
        "symbol": "[OH⁻]",
        "description": "OH- conc"
      }
    ],
    "units": "dimensionless",
    "conditions": "25°C.",
    "notes": "pKw=14 at 25°C. Changes with T.",
    "mistakes": [
      "Using 10⁻¹⁴ at other temps"
    ],
    "tags": [
      "ionic equilibrium",
      "kw"
    ],
    "synonyms": [
      "water dissociation",
      "kw"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-036",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Ionic Equilibrium",
    "topic": "Solubility Product",
    "name": "Solubility Product (Ksp)",
    "expression": "Ksp=[cation]^a[anion]^b",
    "latex": "K_{sp}=[\\text{cation}]^a[\\text{anion}]^b",
    "description": "Solubility product.",
    "variables": [
      {
        "symbol": "Ksp",
        "description": "Solubility product"
      },
      {
        "symbol": "a,b",
        "description": "Stoichiometric coefficients"
      }
    ],
    "units": "dimensionless",
    "conditions": "Saturated solution.",
    "notes": "Ksp>salt precipitates.",
    "mistakes": [
      "Wrong exponents"
    ],
    "tags": [
      "ionic equilibrium",
      "ksp"
    ],
    "synonyms": [
      "solubility product",
      "ksp"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-040",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Electrochemistry",
    "topic": "Nernst Equation",
    "name": "Nernst Equation",
    "expression": "E=E°-(0.059/n)log Q",
    "latex": "E=E^0-\\frac{0.059}{n}\\log Q",
    "description": "Cell potential under non-standard.",
    "variables": [
      {
        "symbol": "E",
        "description": "Cell potential",
        "unit": "V"
      },
      {
        "symbol": "E°",
        "description": "Standard potential",
        "unit": "V"
      },
      {
        "symbol": "n",
        "description": "Electrons transferred"
      },
      {
        "symbol": "Q",
        "description": "Reaction quotient"
      }
    ],
    "units": "V",
    "conditions": "25°C.",
    "notes": "0.059 at 25°C. At equilibrium E=0, Q=K.",
    "mistakes": [
      "Wrong n value"
    ],
    "tags": [
      "electrochemistry",
      "nernst"
    ],
    "synonyms": [
      "nernst equation"
    ],
    "importance": "critical",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-041",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Electrochemistry",
    "topic": "Cell EMF",
    "name": "Cell EMF",
    "expression": "E_cell=E_cathode-E_anode",
    "latex": "E_{cell}=E_{cathode}-E_{anode}",
    "description": "Cell EMF.",
    "variables": [
      {
        "symbol": "E_cell",
        "description": "Cell EMF",
        "unit": "V"
      },
      {
        "symbol": "E_cathode",
        "description": "Cathode potential",
        "unit": "V"
      },
      {
        "symbol": "E_anode",
        "description": "Anode potential",
        "unit": "V"
      }
    ],
    "units": "V",
    "conditions": "—",
    "notes": "E°cell=E°cathode-E°anode.",
    "mistakes": [
      "Reversing cathode/anode"
    ],
    "tags": [
      "electrochemistry",
      "emf"
    ],
    "synonyms": [
      "cell emf",
      "cell potential"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-042",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Electrochemistry",
    "topic": "Faradays Law",
    "name": "Faraday's First Law",
    "expression": "m=ZIt",
    "latex": "m=ZIt",
    "description": "Mass deposited at electrode.",
    "variables": [
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "g"
      },
      {
        "symbol": "Z",
        "description": "Electrochemical equiv"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "g",
    "conditions": "—",
    "notes": "Z=M/(nF). 1 Faraday=96500 C.",
    "mistakes": [
      "Wrong n value"
    ],
    "tags": [
      "electrochemistry",
      "faraday"
    ],
    "synonyms": [
      "faraday law",
      "electrolysis"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-043",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Electrochemistry",
    "topic": "Gibbs Energy",
    "name": "Gibbs Energy and EMF",
    "expression": "ΔG=-nFE",
    "latex": "\\Delta G=-nFE",
    "description": "Gibbs energy from cell potential.",
    "variables": [
      {
        "symbol": "ΔG",
        "description": "Gibbs energy",
        "unit": "J"
      },
      {
        "symbol": "n",
        "description": "Electrons"
      },
      {
        "symbol": "F",
        "description": "Faraday const",
        "unit": "96500 C"
      },
      {
        "symbol": "E",
        "description": "Cell potential",
        "unit": "V"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "ΔG°=-nFE°. Negative ΔG = spontaneous.",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "electrochemistry",
      "gibbs"
    ],
    "synonyms": [
      "gibbs energy emf"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-050",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Kinetics",
    "topic": "Rate Law",
    "name": "Rate Law",
    "expression": "Rate=k[A]^m[B]^n",
    "latex": "\\text{Rate}=k[A]^m[B]^n",
    "description": "Rate of reaction.",
    "variables": [
      {
        "symbol": "Rate",
        "description": "Rate",
        "unit": "mol/(L·s)"
      },
      {
        "symbol": "k",
        "description": "Rate const"
      },
      {
        "symbol": "A,B",
        "description": "Reactants"
      },
      {
        "symbol": "m,n",
        "description": "Orders"
      }
    ],
    "units": "mol/(L·s)",
    "conditions": "—",
    "notes": "Order is experimental, not from stoichiometry.",
    "mistakes": [
      "Using stoichiometry for order"
    ],
    "tags": [
      "chemical kinetics",
      "rate law"
    ],
    "synonyms": [
      "rate law",
      "rate equation"
    ],
    "importance": "critical",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-051",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Kinetics",
    "topic": "First Order",
    "name": "First Order Integrated Rate",
    "expression": "ln[A]=ln[A₀]-kt",
    "latex": "\\ln[A]=\\ln[A_0]-kt",
    "description": "First order rate law.",
    "variables": [
      {
        "symbol": "[A]",
        "description": "Concentration",
        "unit": "mol/L"
      },
      {
        "symbol": "[A₀]",
        "description": "Initial conc",
        "unit": "mol/L"
      },
      {
        "symbol": "k",
        "description": "Rate const",
        "unit": "s⁻¹"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "mol/L",
    "conditions": "First order.",
    "notes": "t₁/₂=0.693/k. Independent of concentration.",
    "mistakes": [
      "Using for zero order"
    ],
    "tags": [
      "chemical kinetics",
      "first order"
    ],
    "synonyms": [
      "first order kinetics",
      "rate law"
    ],
    "importance": "critical",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-052",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Kinetics",
    "topic": "Half Life",
    "name": "First Order Half Life",
    "expression": "t₁/₂=0.693/k",
    "latex": "t_{1/2}=\\frac{0.693}{k}",
    "description": "Half life of first order.",
    "variables": [
      {
        "symbol": "t₁/₂",
        "description": "Half life",
        "unit": "s"
      },
      {
        "symbol": "k",
        "description": "Rate const",
        "unit": "s⁻¹"
      }
    ],
    "units": "s",
    "conditions": "First order.",
    "notes": "Independent of concentration.",
    "mistakes": [
      "Using for zero order"
    ],
    "tags": [
      "chemical kinetics",
      "half life"
    ],
    "synonyms": [
      "half life",
      "first order"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-053",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Kinetics",
    "topic": "Arrhenius",
    "name": "Arrhenius Equation",
    "expression": "k=Ae^(-Ea/RT)",
    "latex": "k=Ae^{-Ea/RT}",
    "description": "Temperature dependence of rate.",
    "variables": [
      {
        "symbol": "k",
        "description": "Rate const"
      },
      {
        "symbol": "A",
        "description": "Pre-exponential factor"
      },
      {
        "symbol": "Ea",
        "description": "Activation energy",
        "unit": "J/mol"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "varies",
    "conditions": "—",
    "notes": "ln k = ln A - Ea/(RT). Plot ln k vs 1/T.",
    "mistakes": [
      "Wrong sign of Ea"
    ],
    "tags": [
      "chemical kinetics",
      "arrhenius"
    ],
    "synonyms": [
      "arrhenius equation",
      "activation energy"
    ],
    "importance": "high",
    "difficulty": "hard",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-054",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Chemical Kinetics",
    "topic": "Arrhenius Plot",
    "name": "Arrhenius Two-Point",
    "expression": "ln(k₂/k₁)=Ea/R(1/T₁-1/T₂)",
    "latex": "\\ln\\frac{k_2}{k_1}=\\frac{Ea}{R}(\\frac{1}{T_1}-\\frac{1}{T_2})",
    "description": "Two-temperature Arrhenius.",
    "variables": [
      {
        "symbol": "k₁,k₂",
        "description": "Rate constants"
      },
      {
        "symbol": "Ea",
        "description": "Activation energy",
        "unit": "J/mol"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "T₁,T₂",
        "description": "Temperatures",
        "unit": "K"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Use to find Ea from two k values.",
    "mistakes": [
      "Reversing T₁,T₂"
    ],
    "tags": [
      "chemical kinetics",
      "arrhenius"
    ],
    "synonyms": [
      "arrhenius plot"
    ],
    "importance": "medium",
    "difficulty": "hard",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-060",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Molarity",
    "name": "Molarity",
    "expression": "M=n/V",
    "latex": "M=\\frac{n}{V}",
    "description": "Moles per liter.",
    "variables": [
      {
        "symbol": "M",
        "description": "Molarity",
        "unit": "mol/L"
      },
      {
        "symbol": "n",
        "description": "Moles",
        "unit": "mol"
      },
      {
        "symbol": "V",
        "description": "Volume",
        "unit": "L"
      }
    ],
    "units": "mol/L",
    "conditions": "—",
    "notes": "Changes with temperature.",
    "mistakes": [
      "Using mL not L"
    ],
    "tags": [
      "solutions",
      "molarity"
    ],
    "synonyms": [
      "molarity",
      "concentration"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-061",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Molality",
    "name": "Molality",
    "expression": "m=n/solvent",
    "latex": "m=\\frac{n}{\\text{solvent}}",
    "description": "Moles per kg solvent.",
    "variables": [
      {
        "symbol": "m",
        "description": "Molality",
        "unit": "mol/kg"
      },
      {
        "symbol": "n",
        "description": "Moles",
        "unit": "mol"
      }
    ],
    "units": "mol/kg",
    "conditions": "—",
    "notes": "Independent of temperature.",
    "mistakes": [
      "Using solution mass not solvent"
    ],
    "tags": [
      "solutions",
      "molality"
    ],
    "synonyms": [
      "molality",
      "concentration"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-062",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Raoults Law",
    "name": "Raoult's Law",
    "expression": "p_A=x_A·p_A°",
    "latex": "p_A=x_A p_A^0",
    "description": "Partial pressure of component.",
    "variables": [
      {
        "symbol": "p_A",
        "description": "Partial pressure"
      },
      {
        "symbol": "x_A",
        "description": "Mole fraction"
      },
      {
        "symbol": "p_A°",
        "description": "Vapor pressure pure"
      }
    ],
    "units": "Pa",
    "conditions": "Ideal solution.",
    "notes": "Total P=Σxᵢpᵢ°.",
    "mistakes": [
      "Using for non-ideal"
    ],
    "tags": [
      "solutions",
      "raoult"
    ],
    "synonyms": [
      "raoult law",
      "vapor pressure"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-063",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Relative Lowering",
    "name": "Relative Lowering of VP",
    "expression": "(p°-p)/p°=x_solute",
    "latex": "\\frac{p^0-p}{p^0}=x_{solute}",
    "description": "Relative lowering of vapor pressure.",
    "variables": [
      {
        "symbol": "p°",
        "description": "Pure VP"
      },
      {
        "symbol": "p",
        "description": "Solution VP"
      },
      {
        "symbol": "x_solute",
        "description": "Mole fraction solute"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Equals mole fraction of solute.",
    "mistakes": [
      "Using mole fraction of solvent"
    ],
    "tags": [
      "solutions",
      "raoult"
    ],
    "synonyms": [
      "relative lowering",
      "vapor pressure"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-064",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Elevation BP",
    "name": "Elevation of Boiling Point",
    "expression": "ΔT_b=K_b·m",
    "latex": "\\Delta T_b=K_b m",
    "description": "Boiling point elevation.",
    "variables": [
      {
        "symbol": "ΔT_b",
        "description": "BP elevation",
        "unit": "K"
      },
      {
        "symbol": "K_b",
        "description": "Ebullioscopic const"
      },
      {
        "symbol": "m",
        "description": "Molality",
        "unit": "mol/kg"
      }
    ],
    "units": "K",
    "conditions": "—",
    "notes": "ΔT_b∝m.",
    "mistakes": [
      "Using molarity"
    ],
    "tags": [
      "solutions",
      "colligative"
    ],
    "synonyms": [
      "elevation boiling point",
      "colligative"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-065",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Depression FP",
    "name": "Depression of Freezing Point",
    "expression": "ΔT_f=K_f·m",
    "latex": "\\Delta T_f=K_f m",
    "description": "Freezing point depression.",
    "variables": [
      {
        "symbol": "ΔT_f",
        "description": "FP depression",
        "unit": "K"
      },
      {
        "symbol": "K_f",
        "description": "Cryoscopic const"
      },
      {
        "symbol": "m",
        "description": "Molality",
        "unit": "mol/kg"
      }
    ],
    "units": "K",
    "conditions": "—",
    "notes": "ΔT_f∝m.",
    "mistakes": [
      "Using molarity"
    ],
    "tags": [
      "solutions",
      "colligative"
    ],
    "synonyms": [
      "depression freezing point",
      "colligative"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-066",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Osmotic Pressure",
    "name": "Osmotic Pressure",
    "expression": "π=CRT",
    "latex": "\\pi=CRT",
    "description": "Osmotic pressure.",
    "variables": [
      {
        "symbol": "π",
        "description": "Osmotic pressure",
        "unit": "Pa"
      },
      {
        "symbol": "C",
        "description": "Concentration",
        "unit": "mol/L"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "Pa",
    "conditions": "—",
    "notes": "π=MRT for molarity.",
    "mistakes": [
      "Using molality"
    ],
    "tags": [
      "solutions",
      "colligative"
    ],
    "synonyms": [
      "osmotic pressure",
      "colligative"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-067",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solutions",
    "topic": "Vant Hoff",
    "name": "van't Hoff Factor",
    "expression": "i=observed/normal",
    "latex": "i=\\frac{\\text{observed}}{\\text{normal}}",
    "description": "van't Hoff factor.",
    "variables": [
      {
        "symbol": "i",
        "description": "van't Hoff factor"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "i>1 for dissociation, i<1 for association.",
    "mistakes": [
      "Using i=1 always"
    ],
    "tags": [
      "solutions",
      "vant hoff"
    ],
    "synonyms": [
      "vant hoff factor",
      "dissociation"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-070",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solid State",
    "topic": "Packing Efficiency",
    "name": "Packing Efficiency",
    "expression": "FCC:74%, BCC:68%, Simple:52%",
    "latex": "—",
    "description": "Packing efficiency of unit cells.",
    "variables": [],
    "units": "%",
    "conditions": "—",
    "notes": "FCC and HCP: 74%. BCC: 68%. Simple cubic: 52%.",
    "mistakes": [
      "Confusing BCC and FCC"
    ],
    "tags": [
      "solid state",
      "packing"
    ],
    "synonyms": [
      "packing efficiency",
      "unit cell"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-071",
    "subject": "Chemistry",
    "branch": "Physical Chemistry",
    "chapter": "Solid State",
    "topic": "Coordination Number",
    "name": "Coordination Number",
    "expression": "SC:6, BCC:8, FCC:12",
    "latex": "—",
    "description": "Coordination numbers.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "Simple:6, BCC:8, FCC:12, HCP:12.",
    "mistakes": [
      "Wrong CN for BCC"
    ],
    "tags": [
      "solid state",
      "coordination"
    ],
    "synonyms": [
      "coordination number"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-080",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Atomic Structure",
    "topic": "Bohr Model",
    "name": "Bohr Energy",
    "expression": "E_n=-13.6/n² eV",
    "latex": "E_n=-\\frac{13.6}{n^2}\\text{ eV}",
    "description": "Energy of electron in nth orbit.",
    "variables": [
      {
        "symbol": "E_n",
        "description": "Energy",
        "unit": "eV"
      },
      {
        "symbol": "n",
        "description": "Principal quantum number"
      }
    ],
    "units": "eV",
    "conditions": "Hydrogen atom.",
    "notes": "Ground state: -13.6 eV.",
    "mistakes": [
      "Using positive sign"
    ],
    "tags": [
      "atomic structure",
      "bohr"
    ],
    "synonyms": [
      "bohr energy",
      "energy levels"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-081",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Atomic Structure",
    "topic": "Bohr Radius",
    "name": "Bohr Radius",
    "expression": "r_n=0.529n² Å",
    "latex": "r_n=0.529n^2\\text{ Å}",
    "description": "Radius of nth orbit.",
    "variables": [
      {
        "symbol": "r_n",
        "description": "Radius",
        "unit": "Å"
      },
      {
        "symbol": "n",
        "description": "Quantum number"
      }
    ],
    "units": "Å",
    "conditions": "Hydrogen atom.",
    "notes": "r₁=0.529 Å. r_n=n²r₁.",
    "mistakes": [
      "Using n not n²"
    ],
    "tags": [
      "atomic structure",
      "bohr"
    ],
    "synonyms": [
      "bohr radius"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-082",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Atomic Structure",
    "topic": "Number of Electrons",
    "name": "Max Electrons in Shell",
    "expression": "2n²",
    "latex": "2n^2",
    "description": "Max electrons in shell.",
    "variables": [
      {
        "symbol": "n",
        "description": "Principal quantum number"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "K(n=1):2, L(n=2):8, M(n=3):18.",
    "mistakes": [
      "Using 2n"
    ],
    "tags": [
      "atomic structure",
      "electrons"
    ],
    "synonyms": [
      "max electrons",
      "shell"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-083",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Atomic Structure",
    "topic": "Quantum Numbers",
    "name": "Quantum Numbers",
    "expression": "n,l,m,s",
    "latex": "—",
    "description": "Four quantum numbers.",
    "variables": [
      {
        "symbol": "n",
        "description": "Principal"
      },
      {
        "symbol": "l",
        "description": "Azimuthal"
      },
      {
        "symbol": "m",
        "description": "Magnetic"
      },
      {
        "symbol": "s",
        "description": "Spin"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "l: 0 to n-1. m: -l to +l. s: ±½.",
    "mistakes": [
      "Wrong range for l or m"
    ],
    "tags": [
      "atomic structure",
      "quantum numbers"
    ],
    "synonyms": [
      "quantum numbers",
      "atomic structure"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-090",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Chemical Bonding",
    "topic": "Formal Charge",
    "name": "Formal Charge",
    "expression": "FC=V-(L+B/2)",
    "latex": "FC=V-(L+\\frac{B}{2})",
    "description": "Formal charge on atom.",
    "variables": [
      {
        "symbol": "FC",
        "description": "Formal charge"
      },
      {
        "symbol": "V",
        "description": "Valence electrons"
      },
      {
        "symbol": "L",
        "description": "Lone pair electrons"
      },
      {
        "symbol": "B",
        "description": "Bonding electrons"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Sum of FC = charge on molecule.",
    "mistakes": [
      "Wrong electron count"
    ],
    "tags": [
      "chemical bonding",
      "formal charge"
    ],
    "synonyms": [
      "formal charge"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-091",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Chemical Bonding",
    "topic": "Bond Order",
    "name": "Bond Order",
    "expression": "BO=(N_b-N_a)/2",
    "latex": "BO=\\frac{N_b-N_a}{2}",
    "description": "Bond order from MO theory.",
    "variables": [
      {
        "symbol": "BO",
        "description": "Bond order"
      },
      {
        "symbol": "N_b",
        "description": "Bonding electrons"
      },
      {
        "symbol": "N_a",
        "description": "Antibonding electrons"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Higher BO = stronger, shorter bond.",
    "mistakes": [
      "Forgetting to divide by 2"
    ],
    "tags": [
      "chemical bonding",
      "bond order"
    ],
    "synonyms": [
      "bond order",
      "molecular orbital"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-092",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Chemical Bonding",
    "topic": "Hybridization",
    "name": "Hybridization",
    "expression": "H=½(V+M-C+A)",
    "latex": "H=\\frac{1}{2}(V+M-C+A)",
    "description": "Steric number for hybridization.",
    "variables": [
      {
        "symbol": "H",
        "description": "Steric number"
      },
      {
        "symbol": "V",
        "description": "Valence electrons"
      },
      {
        "symbol": "M",
        "description": "Monovalent atoms"
      },
      {
        "symbol": "C",
        "description": "Cationic charge"
      },
      {
        "symbol": "A",
        "description": "Anionic charge"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "H=2:sp, 3:sp², 4:sp³, 5:sp³d, 6:sp³d².",
    "mistakes": [
      "Wrong monovalent count"
    ],
    "tags": [
      "chemical bonding",
      "hybridization"
    ],
    "synonyms": [
      "hybridization",
      "steric number"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-100",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Periodic Table",
    "topic": "Effective Nuclear Charge",
    "name": "Effective Nuclear Charge",
    "expression": "Z_eff=Z-σ",
    "latex": "Z_{eff}=Z-\\sigma",
    "description": "Effective nuclear charge.",
    "variables": [
      {
        "symbol": "Z_eff",
        "description": "Effective nuclear charge"
      },
      {
        "symbol": "Z",
        "description": "Atomic number"
      },
      {
        "symbol": "σ",
        "description": "Shielding constant"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Increases across period, decreases down group.",
    "mistakes": [
      "Wrong shielding value"
    ],
    "tags": [
      "periodic table",
      "nuclear charge"
    ],
    "synonyms": [
      "effective nuclear charge",
      "slater"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-110",
    "subject": "Chemistry",
    "branch": "Inorganic Chemistry",
    "chapter": "Coordination Compounds",
    "topic": "EAN",
    "name": "Effective Atomic Number",
    "expression": "EAN=Z-OS+2×CN",
    "latex": "EAN=Z-OS+2\\times CN",
    "description": "Effective atomic number.",
    "variables": [
      {
        "symbol": "EAN",
        "description": "EAN"
      },
      {
        "symbol": "Z",
        "description": "Atomic number"
      },
      {
        "symbol": "OS",
        "description": "Oxidation state"
      },
      {
        "symbol": "CN",
        "description": "Coordination number"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Stable if EAN=atomic number of noble gas.",
    "mistakes": [
      "Wrong CN count"
    ],
    "tags": [
      "coordination compounds",
      "ean"
    ],
    "synonyms": [
      "ean",
      "effective atomic number"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-120",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "GOC",
    "topic": "Inductive Effect",
    "name": "Inductive Effect",
    "expression": "—",
    "latex": "—",
    "description": "Polarization through sigma bonds.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "Permanent effect.",
    "mistakes": [
      "Order: -NO₂>-CN>-F>-Cl>-Br>-I>-OH>-NH₂.",
      "Wrong order of groups"
    ],
    "tags": [
      "goc",
      "inductive effect"
    ],
    "synonyms": [
      "inductive effect",
      "polarization"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-121",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "GOC",
    "topic": "Resonance",
    "name": "Resonance Effect",
    "expression": "—",
    "latex": "—",
    "description": "Delocalization through pi bonds.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "More stable resonance = more contributing structures.",
    "mistakes": [
      "Confusing with inductive"
    ],
    "tags": [
      "goc",
      "resonance"
    ],
    "synonyms": [
      "resonance effect",
      "mesomeric"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-122",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "GOC",
    "topic": "Hyperconjugation",
    "name": "Hyperconjugation",
    "expression": "—",
    "latex": "—",
    "description": "Delocalization of sigma electrons.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "More α-H = more hyperconjugation = more stable.",
    "mistakes": [
      "Confusing with resonance"
    ],
    "tags": [
      "goc",
      "hyperconjugation"
    ],
    "synonyms": [
      "hyperconjugation",
      "no bond resonance"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-130",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Hydrocarbons",
    "topic": "Markovnikov",
    "name": "Markovnikov Rule",
    "expression": "—",
    "latex": "—",
    "description": "H adds to C with more H.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "Rich get richer.",
    "mistakes": [
      "Reversing the rule"
    ],
    "tags": [
      "hydrocarbons",
      "markovnikov"
    ],
    "synonyms": [
      "markovnikov rule",
      "addition"
    ],
    "importance": "high",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": true
  },
  {
    "id": "chm-131",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Hydrocarbons",
    "topic": "Anti-Markovnikov",
    "name": "Anti-Markovnikov Rule",
    "expression": "—",
    "latex": "—",
    "description": "H adds to C with fewer H (peroxide effect).",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "Peroxide present.",
    "examTip": "Kharasch effect. Only for HBr.",
    "mistakes": [
      "Applying to HCl/HI"
    ],
    "tags": [
      "hydrocarbons",
      "anti markovnikov"
    ],
    "synonyms": [
      "anti markovnikov",
      "peroxide effect"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-132",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Hydrocarbons",
    "topic": "Saytzeff",
    "name": "Saytzeff Rule",
    "expression": "—",
    "latex": "—",
    "description": "More substituted alkene preferred.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "Elimination.",
    "examTip": "Zaitsev product = more substituted.",
    "mistakes": [
      "Confusing with Hofmann"
    ],
    "tags": [
      "hydrocarbons",
      "saytzeff"
    ],
    "synonyms": [
      "saytzeff rule",
      "zaitsev"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-140",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Isomerism",
    "topic": "Chirality",
    "name": "Chirality",
    "expression": "—",
    "latex": "—",
    "description": "Non-superimposable mirror images.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "Needs chiral center (usually sp³ C with 4 different groups).",
    "mistakes": [
      "Missing chiral center"
    ],
    "tags": [
      "isomerism",
      "chirality"
    ],
    "synonyms": [
      "chirality",
      "optical isomerism"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-150",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Aldehydes Ketones",
    "topic": "Tollens Test",
    "name": "Tollens Test",
    "expression": "—",
    "latex": "—",
    "description": "Silver mirror for aldehydes.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "Aldehydes give silver mirror, ketones do not.",
    "mistakes": [
      "Applying to ketones"
    ],
    "tags": [
      "aldehydes",
      "tollens"
    ],
    "synonyms": [
      "tollens test",
      "silver mirror"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-160",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Amines",
    "topic": "Hinsberg Test",
    "name": "Hinsberg Test",
    "expression": "—",
    "latex": "—",
    "description": "Distinguish 1°, 2°, 3° amines.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "1°: soluble, 2°: insoluble, 3°: no reaction.",
    "mistakes": [
      "Wrong classification"
    ],
    "tags": [
      "amines",
      "hinsberg"
    ],
    "synonyms": [
      "hinsberg test",
      "amine test"
    ],
    "importance": "medium",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-170",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Biomolecules",
    "topic": "Glucose",
    "name": "Glucose Structure",
    "expression": "C₆H₁₂O₆",
    "latex": "C_6H_{12}O_6",
    "description": "Glucose formula.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "Aldohexose. α and β forms.",
    "mistakes": [
      "Wrong formula"
    ],
    "tags": [
      "biomolecules",
      "glucose"
    ],
    "synonyms": [
      "glucose",
      "carbohydrate"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-171",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Biomolecules",
    "topic": "Peptide Bond",
    "name": "Peptide Bond",
    "expression": "—",
    "latex": "—",
    "description": "Amide bond between amino acids.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "examTip": "C-N bond linking amino acids.",
    "mistakes": [
      "Confusing with glycosidic"
    ],
    "tags": [
      "biomolecules",
      "peptide"
    ],
    "synonyms": [
      "peptide bond",
      "protein"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "chm-180",
    "subject": "Chemistry",
    "branch": "Organic Chemistry",
    "chapter": "Polymers",
    "topic": "Degree of Polymerization",
    "name": "Degree of Polymerization",
    "expression": "DP=n",
    "latex": "DP=n",
    "description": "Number of monomer units.",
    "variables": [
      {
        "symbol": "DP",
        "description": "Degree of polymerization"
      },
      {
        "symbol": "n",
        "description": "Monomer units"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Mn=DP×M₀.",
    "mistakes": [
      "Confusing with molecular weight"
    ],
    "tags": [
      "polymers",
      "dp"
    ],
    "synonyms": [
      "degree of polymerization",
      "polymer"
    ],
    "importance": "medium",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  }
];
