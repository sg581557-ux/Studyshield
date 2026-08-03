// AUTO-CONVERTED from legacy tuple format by scripts/migrate-legacy.mjs — DO NOT EDIT MANUALLY.
// These seeds feed the new declarative formula generator.
export const seeds = [
  {
    "id": "phy-001",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Units and Dimensions",
    "topic": "Dimensional Formula",
    "name": "Dimensional Formula",
    "expression": "[M^a L^b T^c]",
    "latex": "[M^a L^b T^c]",
    "description": "Base dimensions M, L, T.",
    "variables": [
      {
        "symbol": "M",
        "description": "Mass"
      },
      {
        "symbol": "L",
        "description": "Length"
      },
      {
        "symbol": "T",
        "description": "Time"
      }
    ],
    "units": "varies",
    "conditions": "Base dimensions only.",
    "notes": "Check dimensional consistency.",
    "examTip": "Match dimensions both sides.",
    "mistakes": [
      "Treating dimensionless as dimensional"
    ],
    "tags": [
      "dimensions",
      "units",
      "dimensional analysis"
    ],
    "synonyms": [
      "dimensional analysis"
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
    "id": "phy-002",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Units and Dimensions",
    "topic": "Homogeneity",
    "name": "Principle of Homogeneity",
    "expression": "[LHS]=[RHS]",
    "latex": "[\\text{LHS}]=[\\text{RHS}]",
    "description": "Same dimensions to add/equate.",
    "variables": [
      {
        "symbol": "LHS",
        "description": "Left side"
      },
      {
        "symbol": "RHS",
        "description": "Right side"
      }
    ],
    "units": "—",
    "conditions": "Valid equations.",
    "notes": "sin/cos/log need dimensionless args.",
    "examTip": "Args of sin,cos,log dimensionless.",
    "mistakes": [
      "Adding different dimensions"
    ],
    "tags": [
      "dimensions",
      "homogeneity"
    ],
    "synonyms": [
      "homogeneity principle"
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
    "id": "phy-010",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Errors and Measurements",
    "topic": "Relative Error",
    "name": "Relative and Percentage Error",
    "expression": "Rel=Δx/x, Pct=(Δx/x)×100",
    "latex": "\\frac{\\Delta x}{x}\\times100",
    "description": "Relative error ratio.",
    "variables": [
      {
        "symbol": "Δx",
        "description": "Absolute error"
      },
      {
        "symbol": "x",
        "description": "True value"
      }
    ],
    "units": "dimensionless",
    "conditions": "x≠0.",
    "notes": "For products add relative errors.",
    "examTip": "Powers: multiply by exponent.",
    "mistakes": [
      "Adding absolute for products"
    ],
    "tags": [
      "errors",
      "relative error"
    ],
    "synonyms": [
      "error propagation"
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
    "id": "phy-020",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Vectors",
    "topic": "Resultant",
    "name": "Magnitude of Resultant",
    "expression": "R=√(A²+B²+2ABcosθ)",
    "latex": "R=\\sqrt{A^2+B^2+2AB\\cos\\theta}",
    "description": "Resultant of two vectors.",
    "variables": [
      {
        "symbol": "R",
        "description": "Resultant"
      },
      {
        "symbol": "A,B",
        "description": "Magnitudes"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "same",
    "conditions": "—",
    "notes": "Max at 0°, min at 180°.",
    "examTip": "Max parallel, min antiparallel.",
    "mistakes": [
      "Using sin instead of cos"
    ],
    "tags": [
      "vectors",
      "resultant"
    ],
    "synonyms": [
      "vector sum"
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
    "id": "phy-022",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Vectors",
    "topic": "Dot Product",
    "name": "Dot Product",
    "expression": "A·B=ABcosθ",
    "latex": "\\vec{A}\\cdot\\vec{B}=AB\\cos\\theta",
    "description": "Scalar product.",
    "variables": [
      {
        "symbol": "A·B",
        "description": "Dot product"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "product",
    "conditions": "—",
    "notes": "Zero when perpendicular.",
    "examTip": "Dot zero = perpendicular.",
    "mistakes": [
      "Confusing with cross"
    ],
    "tags": [
      "vectors",
      "dot product"
    ],
    "synonyms": [
      "scalar product"
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
    "id": "phy-023",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Vectors",
    "topic": "Cross Product",
    "name": "Cross Product",
    "expression": "A×B=ABsinθ n̂",
    "latex": "\\vec{A}\\times\\vec{B}=AB\\sin\\theta\\hat{n}",
    "description": "Vector product.",
    "variables": [
      {
        "symbol": "A×B",
        "description": "Cross product"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      },
      {
        "symbol": "n̂",
        "description": "Unit perp"
      }
    ],
    "units": "product",
    "conditions": "—",
    "notes": "Zero when parallel.",
    "examTip": "Cross zero = parallel.",
    "mistakes": [
      "Wrong direction"
    ],
    "tags": [
      "vectors",
      "cross product"
    ],
    "synonyms": [
      "vector product"
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
    "id": "phy-030",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Average Velocity",
    "name": "Average Velocity",
    "expression": "v=Δx/Δt",
    "latex": "\\bar{v}=\\frac{\\Delta x}{\\Delta t}",
    "description": "Displacement/time.",
    "variables": [
      {
        "symbol": "v",
        "description": "Avg velocity",
        "unit": "m/s"
      },
      {
        "symbol": "Δx",
        "description": "Displacement",
        "unit": "m"
      },
      {
        "symbol": "Δt",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "m/s",
    "conditions": "—",
    "notes": "Zero if returns to start.",
    "examTip": "Uses displacement not distance.",
    "mistakes": [
      "Using distance"
    ],
    "tags": [
      "kinematics",
      "velocity",
      "motion"
    ],
    "synonyms": [
      "velocity",
      "motion",
      "displacement"
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
    "id": "phy-032",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Equations of Motion",
    "name": "First Equation (v=u+at)",
    "expression": "v=u+at",
    "latex": "v=u+at",
    "description": "Velocity-time relation.",
    "variables": [
      {
        "symbol": "v",
        "description": "Final velocity",
        "unit": "m/s"
      },
      {
        "symbol": "u",
        "description": "Initial velocity",
        "unit": "m/s"
      },
      {
        "symbol": "a",
        "description": "Acceleration",
        "unit": "m/s²"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "m/s",
    "conditions": "Constant acceleration.",
    "notes": "Use when time known.",
    "mistakes": [
      "Using when a varies"
    ],
    "tags": [
      "kinematics",
      "equation of motion",
      "velocity"
    ],
    "synonyms": [
      "velocity",
      "v=u+at",
      "motion",
      "kinematics"
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
    "id": "phy-033",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Equations of Motion",
    "name": "Second Equation (s=ut+½at²)",
    "expression": "s=ut+½at²",
    "latex": "s=ut+\\frac{1}{2}at^2",
    "description": "Displacement-time relation.",
    "variables": [
      {
        "symbol": "s",
        "description": "Displacement",
        "unit": "m"
      },
      {
        "symbol": "u",
        "description": "Initial velocity",
        "unit": "m/s"
      },
      {
        "symbol": "a",
        "description": "Acceleration",
        "unit": "m/s²"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "m",
    "conditions": "Constant acceleration.",
    "notes": "Direct displacement formula.",
    "mistakes": [
      "Forgetting ½"
    ],
    "tags": [
      "kinematics",
      "equation of motion",
      "displacement"
    ],
    "synonyms": [
      "displacement",
      "motion",
      "kinematics"
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
    "id": "phy-034",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Equations of Motion",
    "name": "Third Equation (v²=u²+2as)",
    "expression": "v²=u²+2as",
    "latex": "v^2=u^2+2as",
    "description": "Velocity-displacement relation.",
    "variables": [
      {
        "symbol": "v",
        "description": "Final velocity",
        "unit": "m/s"
      },
      {
        "symbol": "u",
        "description": "Initial velocity",
        "unit": "m/s"
      },
      {
        "symbol": "a",
        "description": "Acceleration",
        "unit": "m/s²"
      },
      {
        "symbol": "s",
        "description": "Displacement",
        "unit": "m"
      }
    ],
    "units": "(m/s)²",
    "conditions": "Constant acceleration.",
    "notes": "Use when time not given.",
    "mistakes": [
      "Forgetting sqrt"
    ],
    "tags": [
      "kinematics",
      "equation of motion",
      "velocity"
    ],
    "synonyms": [
      "velocity",
      "motion",
      "kinematics"
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
    "id": "phy-036",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Projectile Motion",
    "name": "Projectile Range",
    "expression": "R=(u²sin2θ)/g",
    "latex": "R=\\frac{u^2\\sin2\\theta}{g}",
    "description": "Horizontal range.",
    "variables": [
      {
        "symbol": "R",
        "description": "Range",
        "unit": "m"
      },
      {
        "symbol": "u",
        "description": "Speed",
        "unit": "m/s"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      },
      {
        "symbol": "g",
        "description": "Gravity",
        "unit": "m/s²"
      }
    ],
    "units": "m",
    "conditions": "Level ground.",
    "notes": "Max at 45°. Complementary same R.",
    "mistakes": [
      "Using sinθ not sin2θ"
    ],
    "tags": [
      "kinematics",
      "projectile",
      "range"
    ],
    "synonyms": [
      "projectile",
      "range",
      "motion"
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
    "id": "phy-037",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Projectile Motion",
    "name": "Max Height",
    "expression": "H=(u²sin²θ)/(2g)",
    "latex": "H=\\frac{u^2\\sin^2\\theta}{2g}",
    "description": "Max height of projectile.",
    "variables": [
      {
        "symbol": "H",
        "description": "Max height",
        "unit": "m"
      },
      {
        "symbol": "u",
        "description": "Speed",
        "unit": "m/s"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "m",
    "conditions": "Level ground.",
    "notes": "Max for θ=90°.",
    "mistakes": [
      "Using sin2θ"
    ],
    "tags": [
      "kinematics",
      "projectile",
      "height"
    ],
    "synonyms": [
      "projectile",
      "height"
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
    "id": "phy-038",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinematics",
    "topic": "Projectile Motion",
    "name": "Time of Flight",
    "expression": "T=(2usinθ)/g",
    "latex": "T=\\frac{2u\\sin\\theta}{g}",
    "description": "Total time in air.",
    "variables": [
      {
        "symbol": "T",
        "description": "Time of flight",
        "unit": "s"
      },
      {
        "symbol": "u",
        "description": "Speed",
        "unit": "m/s"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "s",
    "conditions": "Level ground.",
    "notes": "T=2×time to max height.",
    "mistakes": [
      "Using u not usinθ"
    ],
    "tags": [
      "kinematics",
      "projectile",
      "time of flight"
    ],
    "synonyms": [
      "projectile",
      "flight time"
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
    "id": "phy-050",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Laws of Motion",
    "topic": "Newton's Second Law",
    "name": "Newton's Second Law",
    "expression": "F=ma=dp/dt",
    "latex": "F=ma=\\frac{dp}{dt}",
    "description": "Net force = rate of change of momentum.",
    "variables": [
      {
        "symbol": "F",
        "description": "Net force",
        "unit": "N"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "a",
        "description": "Acceleration",
        "unit": "m/s²"
      },
      {
        "symbol": "p",
        "description": "Momentum",
        "unit": "kg·m/s"
      }
    ],
    "units": "N",
    "conditions": "Inertial frame.",
    "notes": "F is NET force.",
    "mistakes": [
      "Not taking net force"
    ],
    "tags": [
      "laws of motion",
      "force",
      "newton"
    ],
    "synonyms": [
      "force",
      "newton",
      "F=ma",
      "motion"
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
    "id": "phy-051",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Laws of Motion",
    "topic": "Impulse",
    "name": "Impulse-Momentum Theorem",
    "expression": "J=FΔt=Δp",
    "latex": "J=F\\Delta t=\\Delta p",
    "description": "Impulse = change in momentum.",
    "variables": [
      {
        "symbol": "J",
        "description": "Impulse",
        "unit": "N·s"
      },
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "Δt",
        "description": "Time",
        "unit": "s"
      },
      {
        "symbol": "Δp",
        "description": "Momentum change",
        "unit": "kg·m/s"
      }
    ],
    "units": "N·s",
    "conditions": "—",
    "notes": "Area under F-t graph.",
    "mistakes": [
      "Forgetting vector nature"
    ],
    "tags": [
      "laws of motion",
      "impulse",
      "momentum"
    ],
    "synonyms": [
      "impulse",
      "momentum change"
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
    "id": "phy-060",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Friction",
    "topic": "Friction Force",
    "name": "Friction Force",
    "expression": "f=μN",
    "latex": "f=\\mu N",
    "description": "Friction = coefficient × normal.",
    "variables": [
      {
        "symbol": "f",
        "description": "Friction",
        "unit": "N"
      },
      {
        "symbol": "μ",
        "description": "Coefficient"
      },
      {
        "symbol": "N",
        "description": "Normal",
        "unit": "N"
      }
    ],
    "units": "N",
    "conditions": "Static max μs·N.",
    "notes": "Kinetic < max static.",
    "mistakes": [
      "Taking N=mg always"
    ],
    "tags": [
      "friction",
      "force"
    ],
    "synonyms": [
      "friction",
      "frictional force"
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
    "id": "phy-070",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Circular Motion",
    "topic": "Centripetal Force",
    "name": "Centripetal Force",
    "expression": "F=mv²/r=mω²r",
    "latex": "F=\\frac{mv^2}{r}=m\\omega^2 r",
    "description": "Force towards center.",
    "variables": [
      {
        "symbol": "F",
        "description": "Centripetal force",
        "unit": "N"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      },
      {
        "symbol": "r",
        "description": "Radius",
        "unit": "m"
      },
      {
        "symbol": "ω",
        "description": "Angular vel",
        "unit": "rad/s"
      }
    ],
    "units": "N",
    "conditions": "Uniform circular motion.",
    "notes": "Not a new force.",
    "mistakes": [
      "Treating as separate force"
    ],
    "tags": [
      "circular motion",
      "centripetal"
    ],
    "synonyms": [
      "centripetal",
      "circular"
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
    "id": "phy-071",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Circular Motion",
    "topic": "Centripetal Acceleration",
    "name": "Centripetal Acceleration",
    "expression": "a_c=v²/r=ω²r",
    "latex": "a_c=\\frac{v^2}{r}=\\omega^2 r",
    "description": "Acceleration towards center.",
    "variables": [
      {
        "symbol": "a_c",
        "description": "Centripetal accel",
        "unit": "m/s²"
      },
      {
        "symbol": "v",
        "description": "Speed",
        "unit": "m/s"
      },
      {
        "symbol": "r",
        "description": "Radius",
        "unit": "m"
      }
    ],
    "units": "m/s²",
    "conditions": "Uniform circular motion.",
    "notes": "Changes direction not speed.",
    "mistakes": [
      "Confusing with tangential"
    ],
    "tags": [
      "circular motion",
      "acceleration"
    ],
    "synonyms": [
      "radial acceleration"
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
    "id": "phy-073",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Circular Motion",
    "topic": "Vertical Circle",
    "name": "Min Velocity at Top",
    "expression": "v_top=√(gr)",
    "latex": "v_{\\text{top}}=\\sqrt{gr}",
    "description": "Min speed at top of loop.",
    "variables": [
      {
        "symbol": "v_top",
        "description": "Min velocity",
        "unit": "m/s"
      },
      {
        "symbol": "g",
        "description": "Gravity",
        "unit": "m/s²"
      },
      {
        "symbol": "r",
        "description": "Radius",
        "unit": "m"
      }
    ],
    "units": "m/s",
    "conditions": "String/rod.",
    "notes": "v_bottom=√(5gr).",
    "mistakes": [
      "Using √(gr) at bottom"
    ],
    "tags": [
      "circular motion",
      "vertical circle"
    ],
    "synonyms": [
      "vertical loop"
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
    "id": "phy-080",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Work Done",
    "name": "Work Done",
    "expression": "W=Fd cosθ",
    "latex": "W=Fd\\cos\\theta",
    "description": "Work by force over displacement.",
    "variables": [
      {
        "symbol": "W",
        "description": "Work",
        "unit": "J"
      },
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "d",
        "description": "Displacement",
        "unit": "m"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "J",
    "conditions": "Constant force.",
    "notes": "Perpendicular force → zero work.",
    "mistakes": [
      "Using distance"
    ],
    "tags": [
      "work",
      "energy",
      "power"
    ],
    "synonyms": [
      "work",
      "work done"
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
    "id": "phy-081",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Kinetic Energy",
    "name": "Kinetic Energy",
    "expression": "KE=½mv²",
    "latex": "KE=\\frac{1}{2}mv^2",
    "description": "Energy of motion.",
    "variables": [
      {
        "symbol": "KE",
        "description": "Kinetic energy",
        "unit": "J"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "v",
        "description": "Speed",
        "unit": "m/s"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "Always positive.",
    "mistakes": [
      "Forgetting ½"
    ],
    "tags": [
      "work",
      "energy",
      "kinetic energy"
    ],
    "synonyms": [
      "kinetic energy",
      "KE"
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
    "id": "phy-082",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Work-Energy Theorem",
    "name": "Work-Energy Theorem",
    "expression": "W_net=ΔKE=½m(v²-u²)",
    "latex": "W_{\\text{net}}=\\frac{1}{2}m(v^2-u^2)",
    "description": "Net work = change in KE.",
    "variables": [
      {
        "symbol": "W_net",
        "description": "Net work",
        "unit": "J"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "v",
        "description": "Final speed",
        "unit": "m/s"
      },
      {
        "symbol": "u",
        "description": "Initial speed",
        "unit": "m/s"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "Friction: W_f=-fd.",
    "mistakes": [
      "Using one force not net"
    ],
    "tags": [
      "work",
      "energy",
      "theorem"
    ],
    "synonyms": [
      "work energy theorem"
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
    "id": "phy-083",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Potential Energy",
    "name": "Gravitational PE",
    "expression": "U=mgh",
    "latex": "U=mgh",
    "description": "PE near surface.",
    "variables": [
      {
        "symbol": "U",
        "description": "PE",
        "unit": "J"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "g",
        "description": "Gravity",
        "unit": "m/s²"
      },
      {
        "symbol": "h",
        "description": "Height",
        "unit": "m"
      }
    ],
    "units": "J",
    "conditions": "Near surface.",
    "notes": "Only ΔU matters.",
    "mistakes": [
      "No reference defined"
    ],
    "tags": [
      "work",
      "energy",
      "potential energy"
    ],
    "synonyms": [
      "potential energy",
      "PE"
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
    "id": "phy-084",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Spring PE",
    "name": "Spring PE",
    "expression": "U=½kx²",
    "latex": "U=\\frac{1}{2}kx^2",
    "description": "Elastic PE in spring.",
    "variables": [
      {
        "symbol": "U",
        "description": "Spring PE",
        "unit": "J"
      },
      {
        "symbol": "k",
        "description": "Spring constant",
        "unit": "N/m"
      },
      {
        "symbol": "x",
        "description": "Displacement",
        "unit": "m"
      }
    ],
    "units": "J",
    "conditions": "Hooke's law.",
    "notes": "Always positive.",
    "mistakes": [
      "Using x not x²"
    ],
    "tags": [
      "work",
      "energy",
      "spring"
    ],
    "synonyms": [
      "elastic PE",
      "spring energy"
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
    "id": "phy-085",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Power",
    "name": "Power",
    "expression": "P=W/t=Fv",
    "latex": "P=\\frac{W}{t}=Fv",
    "description": "Rate of doing work.",
    "variables": [
      {
        "symbol": "P",
        "description": "Power",
        "unit": "W"
      },
      {
        "symbol": "W",
        "description": "Work",
        "unit": "J"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      },
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      }
    ],
    "units": "W",
    "conditions": "—",
    "notes": "1 hp = 746 W.",
    "mistakes": [
      "Wrong form for context"
    ],
    "tags": [
      "work",
      "energy",
      "power"
    ],
    "synonyms": [
      "power",
      "rate of work"
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
    "id": "phy-088",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Work Energy Power",
    "topic": "Restitution",
    "name": "Coefficient of Restitution",
    "expression": "e=(v₂-v₁)/(u₁-u₂)",
    "latex": "e=\\frac{v_2-v_1}{u_1-u_2}",
    "description": "Ratio of separation to approach.",
    "variables": [
      {
        "symbol": "e",
        "description": "COR"
      },
      {
        "symbol": "v₁,v₂",
        "description": "Final velocities"
      },
      {
        "symbol": "u₁,u₂",
        "description": "Initial velocities"
      }
    ],
    "units": "dimensionless",
    "conditions": "0≤e≤1.",
    "notes": "e=1 elastic, e=0 inelastic.",
    "mistakes": [
      "Reversing sep/approach"
    ],
    "tags": [
      "work",
      "energy",
      "collision",
      "restitution"
    ],
    "synonyms": [
      "restitution coefficient"
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
    "id": "phy-090",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Centre of Mass",
    "topic": "Center of Mass",
    "name": "Center of Mass",
    "expression": "x_cm=(Σmᵢxᵢ)/(Σmᵢ)",
    "latex": "x_{\\text{cm}}=\\frac{\\sum m_i x_i}{\\sum m_i}",
    "description": "Mass-weighted average position.",
    "variables": [
      {
        "symbol": "x_cm",
        "description": "COM position"
      },
      {
        "symbol": "mᵢ",
        "description": "Mass"
      },
      {
        "symbol": "xᵢ",
        "description": "Position"
      }
    ],
    "units": "m",
    "conditions": "—",
    "notes": "Symmetric: COM at center.",
    "mistakes": [
      "Forgetting total mass"
    ],
    "tags": [
      "center of mass",
      "COM"
    ],
    "synonyms": [
      "center of mass",
      "COM"
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
    "id": "phy-100",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Rotational Motion",
    "topic": "Torque",
    "name": "Torque",
    "expression": "τ=r×F",
    "latex": "\\vec{\\tau}=\\vec{r}\\times\\vec{F}",
    "description": "Rotational analogue of force.",
    "variables": [
      {
        "symbol": "τ",
        "description": "Torque",
        "unit": "N·m"
      },
      {
        "symbol": "r",
        "description": "Position",
        "unit": "m"
      },
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      }
    ],
    "units": "N·m",
    "conditions": "—",
    "notes": "Cross product, right-hand rule.",
    "mistakes": [
      "Using dot product"
    ],
    "tags": [
      "rotational motion",
      "torque"
    ],
    "synonyms": [
      "torque",
      "moment of force"
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
    "id": "phy-101",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Rotational Motion",
    "topic": "Moment of Inertia",
    "name": "Moment of Inertia",
    "expression": "I=Σmᵢrᵢ²",
    "latex": "I=\\sum m_i r_i^2",
    "description": "Rotational analogue of mass.",
    "variables": [
      {
        "symbol": "I",
        "description": "MOI",
        "unit": "kg·m²"
      },
      {
        "symbol": "mᵢ",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "rᵢ",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "kg·m²",
    "conditions": "Depends on axis.",
    "notes": "Memorize standard MOI.",
    "mistakes": [
      "Wrong axis"
    ],
    "tags": [
      "rotational motion",
      "moment of inertia"
    ],
    "synonyms": [
      "moment of inertia",
      "MOI"
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
    "id": "phy-102",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Rotational Motion",
    "topic": "Standard MOI",
    "name": "Standard MOI",
    "expression": "Rod:mL²/12,Disc:mR²/2,Ring:mR²,Solid:2mR²/5",
    "latex": "I_{\\text{rod}}=\\frac{mL^2}{12},I_{\\text{disc}}=\\frac{mR^2}{2},I_{\\text{ring}}=mR^2,I_{\\text{solid}}=\\frac{2mR^2}{5}",
    "description": "MOI of common bodies.",
    "variables": [
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      },
      {
        "symbol": "R",
        "description": "Radius",
        "unit": "m"
      }
    ],
    "units": "kg·m²",
    "conditions": "Specified axes.",
    "notes": "Rod center: mL²/12. Solid sphere: 2mR²/5.",
    "mistakes": [
      "Rod center for rod end"
    ],
    "tags": [
      "rotational motion",
      "moment of inertia",
      "standard"
    ],
    "synonyms": [
      "MOI standard"
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
    "id": "phy-103",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Rotational Motion",
    "topic": "Parallel Axis",
    "name": "Parallel Axis Theorem",
    "expression": "I=I_cm+Md²",
    "latex": "I=I_{\\text{cm}}+Md^2",
    "description": "MOI about parallel axis.",
    "variables": [
      {
        "symbol": "I",
        "description": "MOI"
      },
      {
        "symbol": "I_cm",
        "description": "COM MOI"
      },
      {
        "symbol": "M",
        "description": "Mass"
      },
      {
        "symbol": "d",
        "description": "Distance"
      }
    ],
    "units": "kg·m²",
    "conditions": "Axes parallel.",
    "notes": "Add Md² from COM.",
    "mistakes": [
      "Non-parallel axes"
    ],
    "tags": [
      "rotational motion",
      "parallel axis"
    ],
    "synonyms": [
      "parallel axis theorem"
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
    "id": "phy-105",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Rotational Motion",
    "topic": "Angular Momentum",
    "name": "Angular Momentum",
    "expression": "L=Iω=r×p",
    "latex": "L=I\\omega=\\vec{r}\\times\\vec{p}",
    "description": "Rotational analogue of momentum.",
    "variables": [
      {
        "symbol": "L",
        "description": "Angular momentum",
        "unit": "kg·m²/s"
      },
      {
        "symbol": "I",
        "description": "MOI",
        "unit": "kg·m²"
      },
      {
        "symbol": "ω",
        "description": "Angular vel",
        "unit": "rad/s"
      }
    ],
    "units": "kg·m²/s",
    "conditions": "—",
    "notes": "Conserved if net torque=0.",
    "mistakes": [
      "Confusing L=Iω with L=mvr"
    ],
    "tags": [
      "rotational motion",
      "angular momentum"
    ],
    "synonyms": [
      "angular momentum",
      "L"
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
    "id": "phy-106",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Rotational Motion",
    "topic": "Rotational KE",
    "name": "Rotational KE",
    "expression": "KE_rot=½Iω²",
    "latex": "KE_{\\text{rot}}=\\frac{1}{2}I\\omega^2",
    "description": "KE due to rotation.",
    "variables": [
      {
        "symbol": "KE_rot",
        "description": "Rotational KE",
        "unit": "J"
      },
      {
        "symbol": "I",
        "description": "MOI",
        "unit": "kg·m²"
      },
      {
        "symbol": "ω",
        "description": "Angular vel",
        "unit": "rad/s"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "Rolling KE=½mv²+½Iω².",
    "mistakes": [
      "Forgetting translational KE"
    ],
    "tags": [
      "rotational motion",
      "kinetic energy"
    ],
    "synonyms": [
      "rotational KE"
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
    "id": "phy-110",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Gravitation",
    "topic": "Newton's Law",
    "name": "Newton's Law of Gravitation",
    "expression": "F=Gm₁m₂/r²",
    "latex": "F=\\frac{Gm_1m_2}{r^2}",
    "description": "Force between point masses.",
    "variables": [
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "G",
        "description": "Gravitational const"
      },
      {
        "symbol": "m₁,m₂",
        "description": "Masses",
        "unit": "kg"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "N",
    "conditions": "Point masses.",
    "notes": "G=6.67×10⁻¹¹.",
    "mistakes": [
      "Using altitude not r from center"
    ],
    "tags": [
      "gravitation",
      "force"
    ],
    "synonyms": [
      "gravitation",
      "gravity force"
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
    "id": "phy-112",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Gravitation",
    "topic": "Gravitational PE",
    "name": "Gravitational PE",
    "expression": "U=-GMm/r",
    "latex": "U=-\\frac{GMm}{r}",
    "description": "PE with reference at infinity.",
    "variables": [
      {
        "symbol": "U",
        "description": "PE",
        "unit": "J"
      },
      {
        "symbol": "G",
        "description": "Const"
      },
      {
        "symbol": "M",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "J",
    "conditions": "Reference at infinity.",
    "notes": "Negative = bound. v_e=√(2GM/r).",
    "mistakes": [
      "Forgetting negative sign"
    ],
    "tags": [
      "gravitation",
      "potential energy"
    ],
    "synonyms": [
      "gravitational PE"
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
    "id": "phy-114",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Gravitation",
    "topic": "Escape Velocity",
    "name": "Escape Velocity",
    "expression": "v_e=√(2GM/R)",
    "latex": "v_e=\\sqrt{\\frac{2GM}{R}}",
    "description": "Min velocity to escape.",
    "variables": [
      {
        "symbol": "v_e",
        "description": "Escape velocity",
        "unit": "m/s"
      },
      {
        "symbol": "G",
        "description": "Const"
      },
      {
        "symbol": "M",
        "description": "Planet mass",
        "unit": "kg"
      },
      {
        "symbol": "R",
        "description": "Planet radius",
        "unit": "m"
      }
    ],
    "units": "m/s",
    "conditions": "From surface.",
    "notes": "Earth: 11.2 km/s. v_e=√2×v_o.",
    "mistakes": [
      "Using altitude"
    ],
    "tags": [
      "gravitation",
      "escape velocity"
    ],
    "synonyms": [
      "escape speed"
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
    "id": "phy-115",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Gravitation",
    "topic": "Orbital Velocity",
    "name": "Orbital Velocity",
    "expression": "v_o=√(GM/r)",
    "latex": "v_o=\\sqrt{\\frac{GM}{r}}",
    "description": "Velocity for circular orbit.",
    "variables": [
      {
        "symbol": "v_o",
        "description": "Orbital velocity",
        "unit": "m/s"
      },
      {
        "symbol": "G",
        "description": "Const"
      },
      {
        "symbol": "M",
        "description": "Central mass",
        "unit": "kg"
      },
      {
        "symbol": "r",
        "description": "Orbit radius",
        "unit": "m"
      }
    ],
    "units": "m/s",
    "conditions": "Circular orbit.",
    "notes": "v_o=v_e/√2. Near surface: 7.9 km/s.",
    "mistakes": [
      "Confusing with escape velocity"
    ],
    "tags": [
      "gravitation",
      "orbital velocity"
    ],
    "synonyms": [
      "orbital speed"
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
    "id": "phy-116",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Gravitation",
    "topic": "Kepler's Third Law",
    "name": "Kepler's Third Law",
    "expression": "T²=(4π²/GM)r³",
    "latex": "T^2=\\frac{4\\pi^2}{GM}r^3",
    "description": "T²∝r³.",
    "variables": [
      {
        "symbol": "T",
        "description": "Period",
        "unit": "s"
      },
      {
        "symbol": "G",
        "description": "Const"
      },
      {
        "symbol": "M",
        "description": "Central mass",
        "unit": "kg"
      },
      {
        "symbol": "r",
        "description": "Orbit radius",
        "unit": "m"
      }
    ],
    "units": "s²",
    "conditions": "Circular/elliptical.",
    "notes": "T²∝r³. Use ratio method.",
    "mistakes": [
      "Using r² not r³"
    ],
    "tags": [
      "gravitation",
      "kepler"
    ],
    "synonyms": [
      "kepler law",
      "orbital period"
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
    "id": "phy-120",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Properties of Matter",
    "topic": "Young's Modulus",
    "name": "Young's Modulus",
    "expression": "Y=FL/(AΔL)",
    "latex": "Y=\\frac{FL}{A\\Delta L}",
    "description": "Stiffness of solid.",
    "variables": [
      {
        "symbol": "Y",
        "description": "Young's modulus",
        "unit": "Pa"
      },
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      },
      {
        "symbol": "A",
        "description": "Area",
        "unit": "m²"
      },
      {
        "symbol": "ΔL",
        "description": "Change",
        "unit": "m"
      }
    ],
    "units": "Pa",
    "conditions": "Elastic limit.",
    "notes": "Y=Stress/Strain.",
    "mistakes": [
      "Using total length"
    ],
    "tags": [
      "properties of matter",
      "elasticity"
    ],
    "synonyms": [
      "young modulus"
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
    "id": "phy-130",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Fluid Mechanics",
    "topic": "Pressure",
    "name": "Pressure in Fluid",
    "expression": "P=ρgh",
    "latex": "P=\\rho g h",
    "description": "Pressure at depth h.",
    "variables": [
      {
        "symbol": "P",
        "description": "Pressure",
        "unit": "Pa"
      },
      {
        "symbol": "ρ",
        "description": "Density",
        "unit": "kg/m³"
      },
      {
        "symbol": "g",
        "description": "Gravity",
        "unit": "m/s²"
      },
      {
        "symbol": "h",
        "description": "Depth",
        "unit": "m"
      }
    ],
    "units": "Pa",
    "conditions": "Static fluid.",
    "notes": "1 atm=1.013×10⁵ Pa.",
    "mistakes": [
      "Height from bottom"
    ],
    "tags": [
      "fluid mechanics",
      "pressure"
    ],
    "synonyms": [
      "fluid pressure",
      "hydrostatic pressure"
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
    "id": "phy-131",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Fluid Mechanics",
    "topic": "Bernoulli's Theorem",
    "name": "Bernoulli's Equation",
    "expression": "P+½ρv²+ρgh=const",
    "latex": "P+\\frac{1}{2}\\rho v^2+\\rho gh=\\text{const}",
    "description": "Energy conservation for fluid.",
    "variables": [
      {
        "symbol": "P",
        "description": "Pressure",
        "unit": "Pa"
      },
      {
        "symbol": "ρ",
        "description": "Density",
        "unit": "kg/m³"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      },
      {
        "symbol": "g",
        "description": "Gravity",
        "unit": "m/s²"
      },
      {
        "symbol": "h",
        "description": "Height",
        "unit": "m"
      }
    ],
    "units": "Pa",
    "conditions": "Steady, incompressible.",
    "notes": "Higher velocity → lower pressure.",
    "mistakes": [
      "Applying to viscous flow"
    ],
    "tags": [
      "fluid mechanics",
      "bernoulli"
    ],
    "synonyms": [
      "bernoulli",
      "fluid flow"
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
    "id": "phy-132",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Fluid Mechanics",
    "topic": "Continuity",
    "name": "Equation of Continuity",
    "expression": "A₁v₁=A₂v₂",
    "latex": "A_1v_1=A_2v_2",
    "description": "Flow rate constant.",
    "variables": [
      {
        "symbol": "A",
        "description": "Area",
        "unit": "m²"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      }
    ],
    "units": "m³/s",
    "conditions": "Incompressible.",
    "notes": "Narrower → faster.",
    "mistakes": [
      "Forgetting area effect"
    ],
    "tags": [
      "fluid mechanics",
      "continuity"
    ],
    "synonyms": [
      "continuity equation",
      "flow rate"
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
    "id": "phy-140",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Oscillations",
    "topic": "SHM Equation",
    "name": "SHM Displacement",
    "expression": "x=Acos(ωt+φ)",
    "latex": "x=A\\cos(\\omega t+\\phi)",
    "description": "General SHM equation.",
    "variables": [
      {
        "symbol": "x",
        "description": "Displacement",
        "unit": "m"
      },
      {
        "symbol": "A",
        "description": "Amplitude",
        "unit": "m"
      },
      {
        "symbol": "ω",
        "description": "Angular freq",
        "unit": "rad/s"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      },
      {
        "symbol": "φ",
        "description": "Phase"
      }
    ],
    "units": "m",
    "conditions": "Restoring force ∝ displacement.",
    "notes": "ω=2π/T. Max v=Aω.",
    "mistakes": [
      "Confusing ω with f"
    ],
    "tags": [
      "shm",
      "oscillations"
    ],
    "synonyms": [
      "shm",
      "oscillation"
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
    "id": "phy-141",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Oscillations",
    "topic": "SHM Velocity",
    "name": "SHM Velocity",
    "expression": "v=ω√(A²-x²)",
    "latex": "v=\\omega\\sqrt{A^2-x^2}",
    "description": "Velocity at displacement x.",
    "variables": [
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      },
      {
        "symbol": "ω",
        "description": "Angular freq",
        "unit": "rad/s"
      },
      {
        "symbol": "A",
        "description": "Amplitude",
        "unit": "m"
      },
      {
        "symbol": "x",
        "description": "Displacement",
        "unit": "m"
      }
    ],
    "units": "m/s",
    "conditions": "—",
    "notes": "Max v=Aω at x=0.",
    "mistakes": [
      "Using v=ωx"
    ],
    "tags": [
      "shm",
      "oscillations",
      "velocity"
    ],
    "synonyms": [
      "shm velocity"
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
    "id": "phy-142",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Oscillations",
    "topic": "SHM Acceleration",
    "name": "SHM Acceleration",
    "expression": "a=-ω²x",
    "latex": "a=-\\omega^2 x",
    "description": "Acceleration towards mean.",
    "variables": [
      {
        "symbol": "a",
        "description": "Acceleration",
        "unit": "m/s²"
      },
      {
        "symbol": "ω",
        "description": "Angular freq",
        "unit": "rad/s"
      },
      {
        "symbol": "x",
        "description": "Displacement",
        "unit": "m"
      }
    ],
    "units": "m/s²",
    "conditions": "—",
    "notes": "Max a=Aω² at extremes.",
    "mistakes": [
      "Forgetting negative sign"
    ],
    "tags": [
      "shm",
      "oscillations",
      "acceleration"
    ],
    "synonyms": [
      "shm acceleration"
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
    "id": "phy-143",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Oscillations",
    "topic": "SHM Time Period",
    "name": "SHM Time Period (Spring)",
    "expression": "T=2π√(m/k)",
    "latex": "T=2\\pi\\sqrt{\\frac{m}{k}}",
    "description": "Time period of spring-mass.",
    "variables": [
      {
        "symbol": "T",
        "description": "Time period",
        "unit": "s"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "k",
        "description": "Spring constant",
        "unit": "N/m"
      }
    ],
    "units": "s",
    "conditions": "—",
    "notes": "T=2π√(m/k).",
    "mistakes": [
      "Using k/m"
    ],
    "tags": [
      "shm",
      "oscillations",
      "time period"
    ],
    "synonyms": [
      "shm period"
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
    "id": "phy-145",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Oscillations",
    "topic": "Simple Pendulum",
    "name": "Simple Pendulum Time Period",
    "expression": "T=2π√(L/g)",
    "latex": "T=2\\pi\\sqrt{\\frac{L}{g}}",
    "description": "Time period of pendulum.",
    "variables": [
      {
        "symbol": "T",
        "description": "Time period",
        "unit": "s"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      },
      {
        "symbol": "g",
        "description": "Gravity",
        "unit": "m/s²"
      }
    ],
    "units": "s",
    "conditions": "Small oscillations.",
    "notes": "Independent of mass/amplitude.",
    "mistakes": [
      "Using for large angles"
    ],
    "tags": [
      "shm",
      "oscillations",
      "pendulum"
    ],
    "synonyms": [
      "pendulum",
      "simple pendulum"
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
    "id": "phy-150",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "Wave Speed",
    "name": "Wave Speed",
    "expression": "v=fλ",
    "latex": "v=f\\lambda",
    "description": "Fundamental wave equation.",
    "variables": [
      {
        "symbol": "v",
        "description": "Wave speed",
        "unit": "m/s"
      },
      {
        "symbol": "f",
        "description": "Frequency",
        "unit": "Hz"
      },
      {
        "symbol": "λ",
        "description": "Wavelength",
        "unit": "m"
      }
    ],
    "units": "m/s",
    "conditions": "—",
    "notes": "Speed depends on medium.",
    "mistakes": [
      "Confusing f and ω"
    ],
    "tags": [
      "waves",
      "wave speed"
    ],
    "synonyms": [
      "wave speed",
      "wave equation"
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
    "id": "phy-151",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "Wave Equation",
    "name": "Travelling Wave",
    "expression": "y=Asin(ωt-kx)",
    "latex": "y=A\\sin(\\omega t-kx)",
    "description": "Displacement in wave.",
    "variables": [
      {
        "symbol": "y",
        "description": "Displacement",
        "unit": "m"
      },
      {
        "symbol": "A",
        "description": "Amplitude",
        "unit": "m"
      },
      {
        "symbol": "ω",
        "description": "Angular freq",
        "unit": "rad/s"
      },
      {
        "symbol": "k",
        "description": "Wave number",
        "unit": "rad/m"
      }
    ],
    "units": "m",
    "conditions": "—",
    "notes": "k=2π/λ, ω=2πf, v=ω/k.",
    "mistakes": [
      "Confusing k and ω"
    ],
    "tags": [
      "waves",
      "wave equation"
    ],
    "synonyms": [
      "wave equation",
      "plane wave"
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
    "id": "phy-152",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "String Wave",
    "name": "Speed on String",
    "expression": "v=√(T/μ)",
    "latex": "v=\\sqrt{\\frac{T}{\\mu}}",
    "description": "Wave speed on string.",
    "variables": [
      {
        "symbol": "v",
        "description": "Speed",
        "unit": "m/s"
      },
      {
        "symbol": "T",
        "description": "Tension",
        "unit": "N"
      },
      {
        "symbol": "μ",
        "description": "Linear density",
        "unit": "kg/m"
      }
    ],
    "units": "m/s",
    "conditions": "—",
    "notes": "Tension increases speed.",
    "mistakes": [
      "Using total mass"
    ],
    "tags": [
      "waves",
      "string"
    ],
    "synonyms": [
      "string wave speed"
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
    "id": "phy-154",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "Doppler Effect",
    "name": "Doppler Effect",
    "expression": "f'=f(v±v_o)/(v∓v_s)",
    "latex": "f'=f\\frac{v\\pm v_o}{v\\mp v_s}",
    "description": "Apparent frequency.",
    "variables": [
      {
        "symbol": "f'",
        "description": "Observed freq",
        "unit": "Hz"
      },
      {
        "symbol": "f",
        "description": "Source freq",
        "unit": "Hz"
      },
      {
        "symbol": "v",
        "description": "Sound speed",
        "unit": "m/s"
      },
      {
        "symbol": "v_o",
        "description": "Observer vel",
        "unit": "m/s"
      },
      {
        "symbol": "v_s",
        "description": "Source vel",
        "unit": "m/s"
      }
    ],
    "units": "Hz",
    "conditions": "Speeds<sound speed.",
    "notes": "Top sign when moving towards.",
    "mistakes": [
      "Wrong sign convention"
    ],
    "tags": [
      "waves",
      "doppler"
    ],
    "synonyms": [
      "doppler effect",
      "doppler shift"
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
    "id": "phy-155",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "Beats",
    "name": "Beat Frequency",
    "expression": "f_beat=|f₁-f₂|",
    "latex": "f_{\\text{beat}}=|f_1-f_2|",
    "description": "Beat frequency.",
    "variables": [
      {
        "symbol": "f_beat",
        "description": "Beat freq",
        "unit": "Hz"
      },
      {
        "symbol": "f₁,f₂",
        "description": "Frequencies",
        "unit": "Hz"
      }
    ],
    "units": "Hz",
    "conditions": "|f₁-f₂|<10 Hz.",
    "notes": "Beat freq=|f₁-f₂|.",
    "mistakes": [
      "Adding frequencies"
    ],
    "tags": [
      "waves",
      "beats"
    ],
    "synonyms": [
      "beats",
      "beat frequency"
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
    "id": "phy-156",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "Organ Pipe",
    "name": "Closed Organ Pipe",
    "expression": "f_n=(2n-1)v/(4L)",
    "latex": "f_n=\\frac{(2n-1)v}{4L}",
    "description": "Closed pipe frequencies.",
    "variables": [
      {
        "symbol": "f_n",
        "description": "Harmonic",
        "unit": "Hz"
      },
      {
        "symbol": "n",
        "description": "Harmonic number"
      },
      {
        "symbol": "v",
        "description": "Wave speed",
        "unit": "m/s"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      }
    ],
    "units": "Hz",
    "conditions": "One end closed.",
    "notes": "Only odd harmonics.",
    "mistakes": [
      "Using even harmonics"
    ],
    "tags": [
      "waves",
      "organ pipe"
    ],
    "synonyms": [
      "closed pipe",
      "organ pipe"
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
    "id": "phy-157",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Waves",
    "topic": "Organ Pipe",
    "name": "Open Organ Pipe",
    "expression": "f_n=nv/(2L)",
    "latex": "f_n=\\frac{nv}{2L}",
    "description": "Open pipe frequencies.",
    "variables": [
      {
        "symbol": "f_n",
        "description": "Harmonic",
        "unit": "Hz"
      },
      {
        "symbol": "n",
        "description": "Harmonic number"
      },
      {
        "symbol": "v",
        "description": "Wave speed",
        "unit": "m/s"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      }
    ],
    "units": "Hz",
    "conditions": "Both ends open.",
    "notes": "All harmonics. Fundamental=v/(2L).",
    "mistakes": [
      "Confusing with closed"
    ],
    "tags": [
      "waves",
      "organ pipe"
    ],
    "synonyms": [
      "open pipe",
      "organ pipe"
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
    "id": "phy-160",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "First Law",
    "name": "First Law of Thermodynamics",
    "expression": "ΔU=Q-W",
    "latex": "\\Delta U=Q-W",
    "description": "Energy conservation.",
    "variables": [
      {
        "symbol": "ΔU",
        "description": "Internal energy change",
        "unit": "J"
      },
      {
        "symbol": "Q",
        "description": "Heat added",
        "unit": "J"
      },
      {
        "symbol": "W",
        "description": "Work by system",
        "unit": "J"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "W positive when expands.",
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
    "id": "phy-161",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "Work Done",
    "name": "Work by Gas (Isobaric)",
    "expression": "W=PΔV",
    "latex": "W=P\\Delta V",
    "description": "Work at constant pressure.",
    "variables": [
      {
        "symbol": "W",
        "description": "Work",
        "unit": "J"
      },
      {
        "symbol": "P",
        "description": "Pressure",
        "unit": "Pa"
      },
      {
        "symbol": "ΔV",
        "description": "Volume change",
        "unit": "m³"
      }
    ],
    "units": "J",
    "conditions": "Constant pressure.",
    "notes": "W=nRΔT for isobaric.",
    "mistakes": [
      "Using for variable P"
    ],
    "tags": [
      "thermodynamics",
      "work",
      "isobaric"
    ],
    "synonyms": [
      "work done",
      "gas work"
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
    "id": "phy-162",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "Isothermal",
    "name": "Isothermal Work",
    "expression": "W=nRT ln(V₂/V₁)",
    "latex": "W=nRT\\ln\\frac{V_2}{V_1}",
    "description": "Work in isothermal process.",
    "variables": [
      {
        "symbol": "W",
        "description": "Work",
        "unit": "J"
      },
      {
        "symbol": "n",
        "description": "Moles"
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
        "symbol": "V₁,V₂",
        "description": "Volumes",
        "unit": "m³"
      }
    ],
    "units": "J",
    "conditions": "Constant T.",
    "notes": "ΔU=0, Q=W.",
    "mistakes": [
      "Using log not ln"
    ],
    "tags": [
      "thermodynamics",
      "isothermal",
      "work"
    ],
    "synonyms": [
      "isothermal work"
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
    "id": "phy-163",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "Adiabatic",
    "name": "Adiabatic Process",
    "expression": "PV^γ=const",
    "latex": "PV^\\gamma=\\text{const}",
    "description": "Adiabatic relation.",
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
        "symbol": "γ",
        "description": "Adiabatic index"
      }
    ],
    "units": "varies",
    "conditions": "Q=0.",
    "notes": "Q=0, ΔU=-W.",
    "mistakes": [
      "Using γ=1"
    ],
    "tags": [
      "thermodynamics",
      "adiabatic"
    ],
    "synonyms": [
      "adiabatic process"
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
    "id": "phy-165",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "Carnot Engine",
    "name": "Carnot Efficiency",
    "expression": "η=1-T₂/T₁",
    "latex": "\\eta=1-\\frac{T_2}{T_1}",
    "description": "Carnot engine efficiency.",
    "variables": [
      {
        "symbol": "η",
        "description": "Efficiency"
      },
      {
        "symbol": "T₁",
        "description": "Source temp",
        "unit": "K"
      },
      {
        "symbol": "T₂",
        "description": "Sink temp",
        "unit": "K"
      }
    ],
    "units": "dimensionless",
    "conditions": "Reversible; T in Kelvin.",
    "notes": "No engine 100% efficient.",
    "mistakes": [
      "Using Celsius"
    ],
    "tags": [
      "thermodynamics",
      "carnot",
      "efficiency"
    ],
    "synonyms": [
      "carnot efficiency",
      "heat engine"
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
    "id": "phy-166",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "COP",
    "name": "COP of Refrigerator",
    "expression": "COP=T₂/(T₁-T₂)",
    "latex": "\\text{COP}=\\frac{T_2}{T_1-T_2}",
    "description": "Coefficient of performance.",
    "variables": [
      {
        "symbol": "COP",
        "description": "COP"
      },
      {
        "symbol": "T₁",
        "description": "Hot reservoir",
        "unit": "K"
      },
      {
        "symbol": "T₂",
        "description": "Cold reservoir",
        "unit": "K"
      }
    ],
    "units": "dimensionless",
    "conditions": "Reversible; T in Kelvin.",
    "notes": "Heat pump COP=T₁/(T₁-T₂).",
    "mistakes": [
      "Confusing fridge/heat pump"
    ],
    "tags": [
      "thermodynamics",
      "cop",
      "refrigerator"
    ],
    "synonyms": [
      "cop",
      "refrigerator"
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
    "id": "phy-167",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Thermodynamics",
    "topic": "Heat Capacity",
    "name": "Molar Heat Capacity",
    "expression": "Cp-Cv=R, γ=Cp/Cv",
    "latex": "C_p-C_v=R,\\gamma=\\frac{C_p}{C_v}",
    "description": "Relation between heat capacities.",
    "variables": [
      {
        "symbol": "Cp",
        "description": "Molar heat cap const P"
      },
      {
        "symbol": "Cv",
        "description": "Molar heat cap const V"
      },
      {
        "symbol": "R",
        "description": "Gas const"
      },
      {
        "symbol": "γ",
        "description": "Adiabatic index"
      }
    ],
    "units": "J/(mol·K)",
    "conditions": "Ideal gas.",
    "notes": "Mono: γ=5/3. Dia: γ=7/5.",
    "mistakes": [
      "Using Cp+Cv=R"
    ],
    "tags": [
      "thermodynamics",
      "heat capacity"
    ],
    "synonyms": [
      "molar heat capacity"
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
    "id": "phy-170",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinetic Theory",
    "topic": "RMS Speed",
    "name": "RMS Speed",
    "expression": "v_rms=√(3RT/M)",
    "latex": "v_{\\text{rms}}=\\sqrt{\\frac{3RT}{M}}",
    "description": "RMS speed of gas molecules.",
    "variables": [
      {
        "symbol": "v_rms",
        "description": "RMS speed",
        "unit": "m/s"
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
        "symbol": "M",
        "description": "Molar mass",
        "unit": "kg/mol"
      }
    ],
    "units": "m/s",
    "conditions": "Ideal gas.",
    "notes": "v_rms:√(3RT/M). v_avg:√(8RT/πM). v_mps:√(2RT/M).",
    "mistakes": [
      "Confusing three speeds"
    ],
    "tags": [
      "kinetic theory",
      "rms speed"
    ],
    "synonyms": [
      "rms speed"
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
    "id": "phy-171",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Kinetic Theory",
    "topic": "Average KE",
    "name": "Average Kinetic Energy",
    "expression": "KE_avg=(3/2)kT",
    "latex": "\\bar{KE}=\\frac{3}{2}kT",
    "description": "Average KE per molecule.",
    "variables": [
      {
        "symbol": "KE_avg",
        "description": "Average KE",
        "unit": "J"
      },
      {
        "symbol": "k",
        "description": "Boltzmann const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "J",
    "conditions": "Ideal gas.",
    "notes": "Per mole: (3/2)RT.",
    "mistakes": [
      "Using k for molar"
    ],
    "tags": [
      "kinetic theory",
      "kinetic energy"
    ],
    "synonyms": [
      "average kinetic energy"
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
    "id": "phy-182",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Heat Transfer",
    "topic": "Radiation",
    "name": "Stefan-Boltzmann Law",
    "expression": "P=σAT⁴",
    "latex": "P=\\sigma A T^4",
    "description": "Power radiated by black body.",
    "variables": [
      {
        "symbol": "P",
        "description": "Power",
        "unit": "W"
      },
      {
        "symbol": "σ",
        "description": "Stefan const"
      },
      {
        "symbol": "A",
        "description": "Area",
        "unit": "m²"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "W",
    "conditions": "Black body; T in Kelvin.",
    "notes": "Net: P=εσA(T⁴-T_s⁴).",
    "mistakes": [
      "Using Celsius"
    ],
    "tags": [
      "heat transfer",
      "radiation",
      "stefan"
    ],
    "synonyms": [
      "stefan law",
      "black body radiation"
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
    "id": "phy-183",
    "subject": "Physics",
    "branch": "Class 11",
    "chapter": "Heat Transfer",
    "topic": "Radiation",
    "name": "Wien's Displacement Law",
    "expression": "λ_max·T=b",
    "latex": "\\lambda_{\\text{max}}T=b",
    "description": "Peak wavelength vs temperature.",
    "variables": [
      {
        "symbol": "λ_max",
        "description": "Peak wavelength",
        "unit": "m"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      },
      {
        "symbol": "b",
        "description": "Wien const"
      }
    ],
    "units": "m·K",
    "conditions": "Black body.",
    "notes": "b=2.9×10⁻³. Hotter→shorter λ.",
    "mistakes": [
      "Using Celsius"
    ],
    "tags": [
      "heat transfer",
      "radiation",
      "wien"
    ],
    "synonyms": [
      "wien law",
      "displacement law"
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
    "id": "phy-190",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Coulomb's Law",
    "name": "Coulomb's Law",
    "expression": "F=kq₁q₂/r²",
    "latex": "F=\\frac{kq_1q_2}{r^2}",
    "description": "Force between point charges.",
    "variables": [
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "k",
        "description": "Coulomb const"
      },
      {
        "symbol": "q₁,q₂",
        "description": "Charges",
        "unit": "C"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "N",
    "conditions": "Point charges.",
    "notes": "k=9×10⁹.",
    "mistakes": [
      "Using r not r²"
    ],
    "tags": [
      "electrostatics",
      "coulomb",
      "force"
    ],
    "synonyms": [
      "coulomb law",
      "electric force",
      "charge"
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
    "id": "phy-191",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Electric Field",
    "name": "Electric Field (Point Charge)",
    "expression": "E=kq/r²",
    "latex": "E=\\frac{kq}{r^2}",
    "description": "Field due to point charge.",
    "variables": [
      {
        "symbol": "E",
        "description": "Electric field",
        "unit": "V/m"
      },
      {
        "symbol": "k",
        "description": "Coulomb const"
      },
      {
        "symbol": "q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "V/m",
    "conditions": "Point charge.",
    "notes": "E is vector.",
    "mistakes": [
      "Treating E as scalar"
    ],
    "tags": [
      "electrostatics",
      "electric field"
    ],
    "synonyms": [
      "electric field",
      "E field"
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
    "id": "phy-192",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Electric Potential",
    "name": "Electric Potential",
    "expression": "V=kq/r",
    "latex": "V=\\frac{kq}{r}",
    "description": "Potential due to point charge.",
    "variables": [
      {
        "symbol": "V",
        "description": "Potential",
        "unit": "V"
      },
      {
        "symbol": "k",
        "description": "Coulomb const"
      },
      {
        "symbol": "q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "V",
    "conditions": "Reference at infinity.",
    "notes": "V is scalar, add algebraically.",
    "mistakes": [
      "Treating as vector"
    ],
    "tags": [
      "electrostatics",
      "potential"
    ],
    "synonyms": [
      "electric potential",
      "voltage"
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
    "id": "phy-193",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Field-Potential",
    "name": "Electric Field and Potential",
    "expression": "E=-dV/dr",
    "latex": "E=-\\frac{dV}{dr}",
    "description": "Field is negative gradient of V.",
    "variables": [
      {
        "symbol": "E",
        "description": "Field",
        "unit": "V/m"
      },
      {
        "symbol": "V",
        "description": "Potential",
        "unit": "V"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "V/m",
    "conditions": "—",
    "notes": "E points high to low V.",
    "mistakes": [
      "Forgetting negative sign"
    ],
    "tags": [
      "electrostatics",
      "field",
      "potential"
    ],
    "synonyms": [
      "field potential relation"
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
    "id": "phy-197",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Gauss Law",
    "name": "Gauss's Law",
    "expression": "∮E·dA=q/ε₀",
    "latex": "\\oint \\vec{E}\\cdot d\\vec{A}=\\frac{q}{\\varepsilon_0}",
    "description": "Flux = enclosed charge/ε₀.",
    "variables": [
      {
        "symbol": "E",
        "description": "Electric field"
      },
      {
        "symbol": "dA",
        "description": "Area element"
      },
      {
        "symbol": "q",
        "description": "Enclosed charge",
        "unit": "C"
      },
      {
        "symbol": "ε₀",
        "description": "Permittivity"
      }
    ],
    "units": "V·m",
    "conditions": "Closed surface.",
    "notes": "Flux depends on enclosed charge only.",
    "mistakes": [
      "Using external charge"
    ],
    "tags": [
      "electrostatics",
      "gauss law",
      "flux"
    ],
    "synonyms": [
      "gauss law",
      "electric flux"
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
    "id": "phy-198",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Capacitance",
    "name": "Capacitance",
    "expression": "C=Q/V",
    "latex": "C=\\frac{Q}{V}",
    "description": "Charge per unit potential.",
    "variables": [
      {
        "symbol": "C",
        "description": "Capacitance",
        "unit": "F"
      },
      {
        "symbol": "Q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "V",
        "description": "Potential",
        "unit": "V"
      }
    ],
    "units": "F",
    "conditions": "—",
    "notes": "Parallel plate: C=ε₀A/d.",
    "mistakes": [
      "Confusing C with charge"
    ],
    "tags": [
      "electrostatics",
      "capacitance"
    ],
    "synonyms": [
      "capacitance",
      "capacitor"
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
    "id": "phy-199",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Parallel Plate",
    "name": "Parallel Plate Capacitor",
    "expression": "C=ε₀A/d",
    "latex": "C=\\frac{\\varepsilon_0 A}{d}",
    "description": "Capacitance of parallel plate.",
    "variables": [
      {
        "symbol": "C",
        "description": "Capacitance",
        "unit": "F"
      },
      {
        "symbol": "ε₀",
        "description": "Permittivity"
      },
      {
        "symbol": "A",
        "description": "Area",
        "unit": "m²"
      },
      {
        "symbol": "d",
        "description": "Separation",
        "unit": "m"
      }
    ],
    "units": "F",
    "conditions": "—",
    "notes": "Dielectric: C=κε₀A/d.",
    "mistakes": [
      "Forgetting dielectric"
    ],
    "tags": [
      "electrostatics",
      "capacitance"
    ],
    "synonyms": [
      "parallel plate capacitor"
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
    "id": "phy-200",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Capacitor Energy",
    "name": "Energy in Capacitor",
    "expression": "U=½CV²=½QV",
    "latex": "U=\\frac{1}{2}CV^2",
    "description": "Energy stored in capacitor.",
    "variables": [
      {
        "symbol": "U",
        "description": "Energy",
        "unit": "J"
      },
      {
        "symbol": "C",
        "description": "Capacitance",
        "unit": "F"
      },
      {
        "symbol": "Q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "V",
        "description": "Voltage",
        "unit": "V"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "Three equivalent forms.",
    "mistakes": [
      "Using CV² not ½CV²"
    ],
    "tags": [
      "electrostatics",
      "capacitance",
      "energy"
    ],
    "synonyms": [
      "capacitor energy"
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
    "id": "phy-201",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Electrostatics",
    "topic": "Capacitor Combinations",
    "name": "Capacitors Series/Parallel",
    "expression": "Series:1/C=1/C₁+1/C₂, Parallel:C=C₁+C₂",
    "latex": "\\text{Series}:\\frac{1}{C}=\\frac{1}{C_1}+\\frac{1}{C_2},\\text{Parallel}:C=C_1+C_2",
    "description": "Equivalent capacitance.",
    "variables": [
      {
        "symbol": "C",
        "description": "Equivalent"
      },
      {
        "symbol": "C₁,C₂",
        "description": "Individual"
      }
    ],
    "units": "F",
    "conditions": "—",
    "notes": "Series: reciprocals add. Parallel: direct add.",
    "mistakes": [
      "Mixing series/parallel"
    ],
    "tags": [
      "electrostatics",
      "capacitance"
    ],
    "synonyms": [
      "capacitor combination"
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
    "id": "phy-210",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Current Electricity",
    "topic": "Ohm's Law",
    "name": "Ohm's Law",
    "expression": "V=IR",
    "latex": "V=IR",
    "description": "Voltage = current × resistance.",
    "variables": [
      {
        "symbol": "V",
        "description": "Voltage",
        "unit": "V"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "R",
        "description": "Resistance",
        "unit": "Ω"
      }
    ],
    "units": "V",
    "conditions": "Ohmic conductors.",
    "notes": "R=ρL/A.",
    "mistakes": [
      "Applying to non-ohmic"
    ],
    "tags": [
      "current electricity",
      "ohm"
    ],
    "synonyms": [
      "ohm law",
      "V=IR",
      "voltage",
      "current"
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
    "id": "phy-211",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Current Electricity",
    "topic": "Resistance",
    "name": "Resistance Formula",
    "expression": "R=ρL/A",
    "latex": "R=\\frac{\\rho L}{A}",
    "description": "Resistance in terms of resistivity.",
    "variables": [
      {
        "symbol": "R",
        "description": "Resistance",
        "unit": "Ω"
      },
      {
        "symbol": "ρ",
        "description": "Resistivity",
        "unit": "Ω·m"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      },
      {
        "symbol": "A",
        "description": "Area",
        "unit": "m²"
      }
    ],
    "units": "Ω",
    "conditions": "—",
    "notes": "R∝L, R∝1/A.",
    "mistakes": [
      "Confusing ρ with R"
    ],
    "tags": [
      "current electricity",
      "resistance"
    ],
    "synonyms": [
      "resistance formula"
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
    "id": "phy-212",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Current Electricity",
    "topic": "Power",
    "name": "Electrical Power",
    "expression": "P=I²R=V²/R=VI",
    "latex": "P=I^2R=\\frac{V^2}{R}=VI",
    "description": "Three forms of power.",
    "variables": [
      {
        "symbol": "P",
        "description": "Power",
        "unit": "W"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "R",
        "description": "Resistance",
        "unit": "Ω"
      },
      {
        "symbol": "V",
        "description": "Voltage",
        "unit": "V"
      }
    ],
    "units": "W",
    "conditions": "—",
    "notes": "Use P=I²R for series.",
    "mistakes": [
      "Wrong form for context"
    ],
    "tags": [
      "current electricity",
      "power"
    ],
    "synonyms": [
      "electrical power"
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
    "id": "phy-213",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Current Electricity",
    "topic": "Resistor Combinations",
    "name": "Resistors Series/Parallel",
    "expression": "Series:R=R₁+R₂, Parallel:1/R=1/R₁+1/R₂",
    "latex": "\\text{Series}:R=R_1+R_2,\\text{Parallel}:\\frac{1}{R}=\\frac{1}{R_1}+\\frac{1}{R_2}",
    "description": "Equivalent resistance.",
    "variables": [
      {
        "symbol": "R",
        "description": "Equivalent"
      },
      {
        "symbol": "R₁,R₂",
        "description": "Individual"
      }
    ],
    "units": "Ω",
    "conditions": "—",
    "notes": "2 parallel: R=R₁R₂/(R₁+R₂).",
    "mistakes": [
      "Adding parallel directly"
    ],
    "tags": [
      "current electricity",
      "resistance"
    ],
    "synonyms": [
      "resistor combination"
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
    "id": "phy-214",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Current Electricity",
    "topic": "Kirchhoff's Laws",
    "name": "Kirchhoff's Laws",
    "expression": "KCL:ΣI=0, KVL:ΣV=0",
    "latex": "\\text{KCL}:\\sum I=0,\\text{KVL}:\\sum V=0",
    "description": "Current and voltage laws.",
    "variables": [
      {
        "symbol": "I",
        "description": "Current"
      },
      {
        "symbol": "V",
        "description": "Voltage"
      }
    ],
    "units": "varies",
    "conditions": "—",
    "notes": "KCL at junctions, KVL around loops.",
    "mistakes": [
      "Wrong sign in KVL"
    ],
    "tags": [
      "current electricity",
      "kirchhoff"
    ],
    "synonyms": [
      "kirchhoff laws",
      "circuit laws"
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
    "id": "phy-216",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Current Electricity",
    "topic": "EMF",
    "name": "EMF and Internal Resistance",
    "expression": "V=E-Ir",
    "latex": "V=E-Ir",
    "description": "Terminal voltage of cell.",
    "variables": [
      {
        "symbol": "V",
        "description": "Terminal voltage",
        "unit": "V"
      },
      {
        "symbol": "E",
        "description": "EMF",
        "unit": "V"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "r",
        "description": "Internal resistance",
        "unit": "Ω"
      }
    ],
    "units": "V",
    "conditions": "—",
    "notes": "When I=0, V=E.",
    "mistakes": [
      "Forgetting internal resistance"
    ],
    "tags": [
      "current electricity",
      "emf"
    ],
    "synonyms": [
      "emf",
      "terminal voltage"
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
    "id": "phy-220",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Magnetism",
    "topic": "Lorentz Force",
    "name": "Lorentz Force",
    "expression": "F=q(E+v×B)",
    "latex": "F=q(\\vec{E}+\\vec{v}\\times\\vec{B})",
    "description": "Total EM force on charge.",
    "variables": [
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "E",
        "description": "Electric field",
        "unit": "V/m"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      },
      {
        "symbol": "B",
        "description": "Magnetic field",
        "unit": "T"
      }
    ],
    "units": "N",
    "conditions": "—",
    "notes": "Magnetic part does no work.",
    "mistakes": [
      "Using v·B not v×B"
    ],
    "tags": [
      "magnetism",
      "lorentz",
      "force"
    ],
    "synonyms": [
      "lorentz force",
      "electromagnetic force"
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
    "id": "phy-221",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Magnetism",
    "topic": "Magnetic Force",
    "name": "Magnetic Force on Charge",
    "expression": "F=qvBsinθ",
    "latex": "F=qvB\\sin\\theta",
    "description": "Force on moving charge.",
    "variables": [
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      },
      {
        "symbol": "B",
        "description": "Field",
        "unit": "T"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "N",
    "conditions": "—",
    "notes": "F=0 when v∥B.",
    "mistakes": [
      "Using dot product"
    ],
    "tags": [
      "magnetism",
      "force"
    ],
    "synonyms": [
      "magnetic force",
      "charge force"
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
    "id": "phy-222",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Magnetism",
    "topic": "Force on Wire",
    "name": "Force on Current Wire",
    "expression": "F=BILsinθ",
    "latex": "F=BIL\\sin\\theta",
    "description": "Force on current-carrying wire.",
    "variables": [
      {
        "symbol": "F",
        "description": "Force",
        "unit": "N"
      },
      {
        "symbol": "B",
        "description": "Field",
        "unit": "T"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "L",
        "description": "Length",
        "unit": "m"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "N",
    "conditions": "—",
    "notes": "Fleming's Left-Hand Rule.",
    "mistakes": [
      "Wrong direction"
    ],
    "tags": [
      "magnetism",
      "force",
      "wire"
    ],
    "synonyms": [
      "wire force",
      "current force"
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
    "id": "phy-224",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Magnetism",
    "topic": "Magnetic Field",
    "name": "Field due to Straight Wire",
    "expression": "B=μ₀I/(2πr)",
    "latex": "B=\\frac{\\mu_0 I}{2\\pi r}",
    "description": "Field near long wire.",
    "variables": [
      {
        "symbol": "B",
        "description": "Field",
        "unit": "T"
      },
      {
        "symbol": "μ₀",
        "description": "Permeability"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "r",
        "description": "Distance",
        "unit": "m"
      }
    ],
    "units": "T",
    "conditions": "Infinite wire.",
    "notes": "B∝I/r.",
    "mistakes": [
      "Using finite wire formula"
    ],
    "tags": [
      "magnetism",
      "field",
      "wire"
    ],
    "synonyms": [
      "straight wire field"
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
    "id": "phy-226",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Magnetism",
    "topic": "Solenoid",
    "name": "Field inside Solenoid",
    "expression": "B=μ₀nI",
    "latex": "B=\\mu_0 n I",
    "description": "Field inside solenoid.",
    "variables": [
      {
        "symbol": "B",
        "description": "Field",
        "unit": "T"
      },
      {
        "symbol": "μ₀",
        "description": "Permeability"
      },
      {
        "symbol": "n",
        "description": "Turns/length",
        "unit": "m⁻¹"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      }
    ],
    "units": "T",
    "conditions": "Long solenoid.",
    "notes": "Uniform inside.",
    "mistakes": [
      "Using total turns not turns/length"
    ],
    "tags": [
      "magnetism",
      "field",
      "solenoid"
    ],
    "synonyms": [
      "solenoid field"
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
    "id": "phy-227",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Magnetism",
    "topic": "Cyclotron",
    "name": "Cyclotron Radius and Period",
    "expression": "r=mv/(qB), T=2πm/(qB)",
    "latex": "r=\\frac{mv}{qB},T=\\frac{2\\pi m}{qB}",
    "description": "Radius and period in B field.",
    "variables": [
      {
        "symbol": "r",
        "description": "Radius",
        "unit": "m"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "v",
        "description": "Velocity",
        "unit": "m/s"
      },
      {
        "symbol": "q",
        "description": "Charge",
        "unit": "C"
      },
      {
        "symbol": "B",
        "description": "Field",
        "unit": "T"
      }
    ],
    "units": "m, s",
    "conditions": "⊥ to B.",
    "notes": "T independent of speed.",
    "mistakes": [
      "Including v in period"
    ],
    "tags": [
      "magnetism",
      "cyclotron"
    ],
    "synonyms": [
      "cyclotron"
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
    "id": "phy-230",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "EMI",
    "topic": "Faraday's Law",
    "name": "Faraday's Law of Induction",
    "expression": "ε=-dΦ/dt",
    "latex": "\\varepsilon=-\\frac{d\\Phi}{dt}",
    "description": "Induced EMF = rate of change of flux.",
    "variables": [
      {
        "symbol": "ε",
        "description": "Induced EMF",
        "unit": "V"
      },
      {
        "symbol": "Φ",
        "description": "Magnetic flux",
        "unit": "Wb"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "V",
    "conditions": "—",
    "notes": "Φ=BAcosθ. Negative=Lenz law.",
    "mistakes": [
      "Forgetting negative sign"
    ],
    "tags": [
      "emi",
      "faraday",
      "induction"
    ],
    "synonyms": [
      "faraday law",
      "induction",
      "emf"
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
    "id": "phy-231",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "EMI",
    "topic": "Magnetic Flux",
    "name": "Magnetic Flux",
    "expression": "Φ=BAcosθ",
    "latex": "\\Phi=BA\\cos\\theta",
    "description": "Magnetic flux through area.",
    "variables": [
      {
        "symbol": "Φ",
        "description": "Flux",
        "unit": "Wb"
      },
      {
        "symbol": "B",
        "description": "Field",
        "unit": "T"
      },
      {
        "symbol": "A",
        "description": "Area",
        "unit": "m²"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "Wb",
    "conditions": "—",
    "notes": "θ is angle with normal.",
    "mistakes": [
      "Using angle with plane"
    ],
    "tags": [
      "emi",
      "flux"
    ],
    "synonyms": [
      "magnetic flux"
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
    "id": "phy-232",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "EMI",
    "topic": "Self Inductance",
    "name": "Self Inductance",
    "expression": "ε=-L(dI/dt)",
    "latex": "\\varepsilon=-L\\frac{dI}{dt}",
    "description": "EMF due to changing current.",
    "variables": [
      {
        "symbol": "ε",
        "description": "EMF",
        "unit": "V"
      },
      {
        "symbol": "L",
        "description": "Self inductance",
        "unit": "H"
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
    "units": "V",
    "conditions": "—",
    "notes": "Inductor energy: U=½LI².",
    "mistakes": [
      "Forgetting negative sign"
    ],
    "tags": [
      "emi",
      "inductance"
    ],
    "synonyms": [
      "self inductance"
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
    "id": "phy-234",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "EMI",
    "topic": "Inductor Energy",
    "name": "Energy in Inductor",
    "expression": "U=½LI²",
    "latex": "U=\\frac{1}{2}LI^2",
    "description": "Energy in inductor.",
    "variables": [
      {
        "symbol": "U",
        "description": "Energy",
        "unit": "J"
      },
      {
        "symbol": "L",
        "description": "Inductance",
        "unit": "H"
      },
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "Analogous to ½CV².",
    "mistakes": [
      "Using LI² not ½LI²"
    ],
    "tags": [
      "emi",
      "inductor",
      "energy"
    ],
    "synonyms": [
      "inductor energy"
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
    "id": "phy-240",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Alternating Current",
    "topic": "AC Voltage",
    "name": "AC RMS Value",
    "expression": "V_rms=V₀/√2",
    "latex": "V_{\\text{rms}}=\\frac{V_0}{\\sqrt{2}}",
    "description": "RMS value of AC.",
    "variables": [
      {
        "symbol": "V_rms",
        "description": "RMS voltage",
        "unit": "V"
      },
      {
        "symbol": "V₀",
        "description": "Peak voltage",
        "unit": "V"
      }
    ],
    "units": "V",
    "conditions": "Sinusoidal AC.",
    "notes": "V_rms=V₀/√2, I_rms=I₀/√2.",
    "mistakes": [
      "Using V₀ directly"
    ],
    "tags": [
      "alternating current",
      "ac",
      "rms"
    ],
    "synonyms": [
      "ac rms",
      "rms value"
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
    "id": "phy-241",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Alternating Current",
    "topic": "AC Reactance",
    "name": "Inductive Reactance",
    "expression": "X_L=ωL",
    "latex": "X_L=\\omega L",
    "description": "Reactance of inductor.",
    "variables": [
      {
        "symbol": "X_L",
        "description": "Inductive reactance",
        "unit": "Ω"
      },
      {
        "symbol": "ω",
        "description": "Angular freq",
        "unit": "rad/s"
      },
      {
        "symbol": "L",
        "description": "Inductance",
        "unit": "H"
      }
    ],
    "units": "Ω",
    "conditions": "—",
    "notes": "Increases with frequency.",
    "mistakes": [
      "Confusing with capacitive"
    ],
    "tags": [
      "alternating current",
      "reactance"
    ],
    "synonyms": [
      "inductive reactance"
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
    "id": "phy-242",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Alternating Current",
    "topic": "AC Reactance",
    "name": "Capacitive Reactance",
    "expression": "X_C=1/(ωC)",
    "latex": "X_C=\\frac{1}{\\omega C}",
    "description": "Reactance of capacitor.",
    "variables": [
      {
        "symbol": "X_C",
        "description": "Capacitive reactance",
        "unit": "Ω"
      },
      {
        "symbol": "ω",
        "description": "Angular freq",
        "unit": "rad/s"
      },
      {
        "symbol": "C",
        "description": "Capacitance",
        "unit": "F"
      }
    ],
    "units": "Ω",
    "conditions": "—",
    "notes": "Decreases with frequency.",
    "mistakes": [
      "Confusing with inductive"
    ],
    "tags": [
      "alternating current",
      "reactance"
    ],
    "synonyms": [
      "capacitive reactance"
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
    "id": "phy-243",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Alternating Current",
    "topic": "AC Impedance",
    "name": "LCR Impedance",
    "expression": "Z=√(R²+(X_L-X_C)²)",
    "latex": "Z=\\sqrt{R^2+(X_L-X_C)^2}",
    "description": "Impedance of LCR circuit.",
    "variables": [
      {
        "symbol": "Z",
        "description": "Impedance",
        "unit": "Ω"
      },
      {
        "symbol": "R",
        "description": "Resistance",
        "unit": "Ω"
      },
      {
        "symbol": "X_L",
        "description": "Inductive reactance",
        "unit": "Ω"
      },
      {
        "symbol": "X_C",
        "description": "Capacitive reactance",
        "unit": "Ω"
      }
    ],
    "units": "Ω",
    "conditions": "—",
    "notes": "At resonance: Z=R.",
    "mistakes": [
      "Forgetting to square"
    ],
    "tags": [
      "alternating current",
      "impedance"
    ],
    "synonyms": [
      "lcr impedance"
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
    "id": "phy-244",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Alternating Current",
    "topic": "Resonance",
    "name": "Resonance Frequency",
    "expression": "f_r=1/(2π√(LC))",
    "latex": "f_r=\\frac{1}{2\\pi\\sqrt{LC}}",
    "description": "Resonance frequency of LCR.",
    "variables": [
      {
        "symbol": "f_r",
        "description": "Resonance freq",
        "unit": "Hz"
      },
      {
        "symbol": "L",
        "description": "Inductance",
        "unit": "H"
      },
      {
        "symbol": "C",
        "description": "Capacitance",
        "unit": "F"
      }
    ],
    "units": "Hz",
    "conditions": "—",
    "notes": "At resonance: Z=R, current max.",
    "mistakes": [
      "Wrong formula"
    ],
    "tags": [
      "alternating current",
      "resonance"
    ],
    "synonyms": [
      "resonance frequency"
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
    "id": "phy-250",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Ray Optics",
    "topic": "Lens Formula",
    "name": "Lens Formula",
    "expression": "1/v-1/u=1/f",
    "latex": "\\frac{1}{v}-\\frac{1}{u}=\\frac{1}{f}",
    "description": "Lens equation.",
    "variables": [
      {
        "symbol": "v",
        "description": "Image distance",
        "unit": "cm"
      },
      {
        "symbol": "u",
        "description": "Object distance",
        "unit": "cm"
      },
      {
        "symbol": "f",
        "description": "Focal length",
        "unit": "cm"
      }
    ],
    "units": "cm⁻¹",
    "conditions": "Sign convention.",
    "notes": "Convex f>0, concave f<0.",
    "mistakes": [
      "Wrong sign for virtual image"
    ],
    "tags": [
      "ray optics",
      "lens"
    ],
    "synonyms": [
      "lens formula",
      "lens"
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
    "id": "phy-251",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Ray Optics",
    "topic": "Magnification",
    "name": "Lens Magnification",
    "expression": "m=v/u=h'/h",
    "latex": "m=\\frac{v}{u}",
    "description": "Magnification by lens.",
    "variables": [
      {
        "symbol": "m",
        "description": "Magnification"
      },
      {
        "symbol": "v",
        "description": "Image distance"
      },
      {
        "symbol": "u",
        "description": "Object distance"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Power P=1/f (in meters).",
    "mistakes": [
      "Using f in cm for power"
    ],
    "tags": [
      "ray optics",
      "magnification"
    ],
    "synonyms": [
      "lens magnification"
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
    "id": "phy-252",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Ray Optics",
    "topic": "Mirror Formula",
    "name": "Mirror Formula",
    "expression": "1/v+1/u=1/f",
    "latex": "\\frac{1}{v}+\\frac{1}{u}=\\frac{1}{f}",
    "description": "Mirror equation.",
    "variables": [
      {
        "symbol": "v",
        "description": "Image distance"
      },
      {
        "symbol": "u",
        "description": "Object distance"
      },
      {
        "symbol": "f",
        "description": "Focal length"
      }
    ],
    "units": "cm⁻¹",
    "conditions": "Sign convention.",
    "notes": "Concave f<0, convex f>0.",
    "mistakes": [
      "Wrong sign convention"
    ],
    "tags": [
      "ray optics",
      "mirror"
    ],
    "synonyms": [
      "mirror formula"
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
    "id": "phy-253",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Ray Optics",
    "topic": "Snells Law",
    "name": "Snell's Law",
    "expression": "n₁sinθ₁=n₂sinθ₂",
    "latex": "n_1\\sin\\theta_1=n_2\\sin\\theta_2",
    "description": "Refraction law.",
    "variables": [
      {
        "symbol": "n₁,n₂",
        "description": "Refractive indices"
      },
      {
        "symbol": "θ₁,θ₂",
        "description": "Angles"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "n=sin i/sin r.",
    "mistakes": [
      "Wrong angle reference"
    ],
    "tags": [
      "ray optics",
      "refraction"
    ],
    "synonyms": [
      "snell law",
      "refraction"
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
    "id": "phy-254",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Ray Optics",
    "topic": "Critical Angle",
    "name": "Critical Angle",
    "expression": "sin C=1/n",
    "latex": "\\sin C=\\frac{1}{n}",
    "description": "Critical angle for TIR.",
    "variables": [
      {
        "symbol": "C",
        "description": "Critical angle"
      },
      {
        "symbol": "n",
        "description": "Refractive index"
      }
    ],
    "units": "rad",
    "conditions": "Denser to rarer medium.",
    "notes": "TIR when i>C.",
    "mistakes": [
      "Using n not 1/n"
    ],
    "tags": [
      "ray optics",
      "tir"
    ],
    "synonyms": [
      "critical angle",
      "total internal reflection"
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
    "id": "phy-255",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Ray Optics",
    "topic": "Prism",
    "name": "Prism Deviation",
    "expression": "δ=(μ-1)A",
    "latex": "\\delta=(\\mu-1)A",
    "description": "Small angle prism deviation.",
    "variables": [
      {
        "symbol": "δ",
        "description": "Deviation"
      },
      {
        "symbol": "μ",
        "description": "Refractive index"
      },
      {
        "symbol": "A",
        "description": "Prism angle"
      }
    ],
    "units": "rad",
    "conditions": "Small angle prism.",
    "notes": "For thin prism only.",
    "mistakes": [
      "Using for large angle"
    ],
    "tags": [
      "ray optics",
      "prism"
    ],
    "synonyms": [
      "prism deviation"
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
    "id": "phy-260",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Wave Optics",
    "topic": "Youngs Double Slit",
    "name": "Fringe Width",
    "expression": "β=λD/d",
    "latex": "\\beta=\\frac{\\lambda D}{d}",
    "description": "Fringe width in YDSE.",
    "variables": [
      {
        "symbol": "β",
        "description": "Fringe width",
        "unit": "m"
      },
      {
        "symbol": "λ",
        "description": "Wavelength",
        "unit": "m"
      },
      {
        "symbol": "D",
        "description": "Slit-screen distance",
        "unit": "m"
      },
      {
        "symbol": "d",
        "description": "Slit separation",
        "unit": "m"
      }
    ],
    "units": "m",
    "conditions": "—",
    "notes": "Dark fringe at (2n-1)λD/2d.",
    "mistakes": [
      "Using d/D"
    ],
    "tags": [
      "wave optics",
      "ydse"
    ],
    "synonyms": [
      "fringe width",
      "double slit"
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
    "id": "phy-261",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Wave Optics",
    "topic": "Path Difference",
    "name": "Path Difference and Phase",
    "expression": "Δφ=(2π/λ)·Δx",
    "latex": "\\Delta\\phi=\\frac{2\\pi}{\\lambda}\\Delta x",
    "description": "Phase from path difference.",
    "variables": [
      {
        "symbol": "Δφ",
        "description": "Phase difference"
      },
      {
        "symbol": "Δx",
        "description": "Path difference",
        "unit": "m"
      },
      {
        "symbol": "λ",
        "description": "Wavelength",
        "unit": "m"
      }
    ],
    "units": "rad",
    "conditions": "—",
    "notes": "Path diff λ → phase 2π.",
    "mistakes": [
      "Wrong factor"
    ],
    "tags": [
      "wave optics",
      "interference"
    ],
    "synonyms": [
      "phase difference",
      "path difference"
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
    "id": "phy-270",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Dual Nature",
    "topic": "Photoelectric Effect",
    "name": "Photoelectric Equation",
    "expression": "hν=φ+½mv²_max",
    "latex": "h\\nu=\\phi+\\frac{1}{2}mv_{\\max}^2",
    "description": "Einstein photoelectric equation.",
    "variables": [
      {
        "symbol": "hν",
        "description": "Photon energy",
        "unit": "J"
      },
      {
        "symbol": "φ",
        "description": "Work function",
        "unit": "J"
      },
      {
        "symbol": "v_max",
        "description": "Max velocity",
        "unit": "m/s"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "Threshold freq: ν₀=φ/h.",
    "mistakes": [
      "Forgetting work function"
    ],
    "tags": [
      "dual nature",
      "photoelectric"
    ],
    "synonyms": [
      "photoelectric effect",
      "einstein equation"
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
    "id": "phy-271",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Dual Nature",
    "topic": "de Broglie Wavelength",
    "name": "de Broglie Wavelength",
    "expression": "λ=h/p",
    "latex": "\\lambda=\\frac{h}{p}",
    "description": "de Broglie wavelength.",
    "variables": [
      {
        "symbol": "λ",
        "description": "Wavelength",
        "unit": "m"
      },
      {
        "symbol": "h",
        "description": "Planck const"
      },
      {
        "symbol": "p",
        "description": "Momentum",
        "unit": "kg·m/s"
      }
    ],
    "units": "m",
    "conditions": "—",
    "notes": "λ=h/mv. For electron: λ=12.27/√V Å.",
    "mistakes": [
      "Using mass not momentum"
    ],
    "tags": [
      "dual nature",
      "de broglie"
    ],
    "synonyms": [
      "de broglie wavelength"
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
    "id": "phy-280",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Atoms",
    "topic": "Bohr Model",
    "name": "Bohr Radius",
    "expression": "r_n=n²h²/(4π²mke²)",
    "latex": "r_n=\\frac{n^2 h^2}{4\\pi^2 m k e^2}",
    "description": "Bohr orbit radius.",
    "variables": [
      {
        "symbol": "r_n",
        "description": "Orbit radius",
        "unit": "m"
      },
      {
        "symbol": "n",
        "description": "Quantum number"
      },
      {
        "symbol": "h",
        "description": "Planck const"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "k",
        "description": "Coulomb const"
      },
      {
        "symbol": "e",
        "description": "Charge",
        "unit": "C"
      }
    ],
    "units": "m",
    "conditions": "Bohr model.",
    "notes": "r₁=0.529 Å. r_n=n²r₁.",
    "mistakes": [
      "Using n not n²"
    ],
    "tags": [
      "atoms",
      "bohr model"
    ],
    "synonyms": [
      "bohr radius",
      "bohr model"
    ],
    "importance": "high",
    "difficulty": "hard",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  },
  {
    "id": "phy-281",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Atoms",
    "topic": "Bohr Energy",
    "name": "Bohr Energy Levels",
    "expression": "E_n=-13.6/n² eV",
    "latex": "E_n=-\\frac{13.6}{n^2}\\text{ eV}",
    "description": "Energy of nth orbit.",
    "variables": [
      {
        "symbol": "E_n",
        "description": "Energy",
        "unit": "eV"
      },
      {
        "symbol": "n",
        "description": "Quantum number"
      }
    ],
    "units": "eV",
    "conditions": "Hydrogen atom.",
    "notes": "Ground state: -13.6 eV.",
    "mistakes": [
      "Using positive sign"
    ],
    "tags": [
      "atoms",
      "bohr model"
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
    "id": "phy-290",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Nuclei",
    "topic": "Mass-Energy",
    "name": "Mass-Energy Equivalence",
    "expression": "E=mc²",
    "latex": "E=mc^2",
    "description": "Einstein mass-energy.",
    "variables": [
      {
        "symbol": "E",
        "description": "Energy",
        "unit": "J"
      },
      {
        "symbol": "m",
        "description": "Mass",
        "unit": "kg"
      },
      {
        "symbol": "c",
        "description": "Speed of light",
        "unit": "m/s"
      }
    ],
    "units": "J",
    "conditions": "—",
    "notes": "1 amu = 931.5 MeV.",
    "mistakes": [
      "Wrong units"
    ],
    "tags": [
      "nuclei",
      "mass energy"
    ],
    "synonyms": [
      "mass energy",
      "einstein"
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
    "id": "phy-291",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Nuclei",
    "topic": "Radioactive Decay",
    "name": "Radioactive Decay Law",
    "expression": "N=N₀e^(-λt)",
    "latex": "N=N_0 e^{-\\lambda t}",
    "description": "Radioactive decay.",
    "variables": [
      {
        "symbol": "N",
        "description": "Remaining nuclei"
      },
      {
        "symbol": "N₀",
        "description": "Initial nuclei"
      },
      {
        "symbol": "λ",
        "description": "Decay constant",
        "unit": "s⁻¹"
      },
      {
        "symbol": "t",
        "description": "Time",
        "unit": "s"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Half life: T₁/₂=ln2/λ=0.693/λ.",
    "mistakes": [
      "Using linear decay"
    ],
    "tags": [
      "nuclei",
      "radioactivity"
    ],
    "synonyms": [
      "radioactive decay",
      "decay law"
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
    "id": "phy-292",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Nuclei",
    "topic": "Half Life",
    "name": "Half Life",
    "expression": "T₁/₂=0.693/λ",
    "latex": "T_{1/2}=\\frac{0.693}{\\lambda}",
    "description": "Half life of radioactive substance.",
    "variables": [
      {
        "symbol": "T₁/₂",
        "description": "Half life",
        "unit": "s"
      },
      {
        "symbol": "λ",
        "description": "Decay constant",
        "unit": "s⁻¹"
      }
    ],
    "units": "s",
    "conditions": "—",
    "notes": "Mean life: τ=1/λ=1.44×T₁/₂.",
    "mistakes": [
      "Using 1/λ for half life"
    ],
    "tags": [
      "nuclei",
      "radioactivity"
    ],
    "synonyms": [
      "half life",
      "radioactivity"
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
    "id": "phy-300",
    "subject": "Physics",
    "branch": "Class 12",
    "chapter": "Semiconductors",
    "topic": "PN Junction",
    "name": "Diode Current",
    "expression": "I=I₀(e^(eV/kT)-1)",
    "latex": "I=I_0(e^{eV/kT}-1)",
    "description": "Diode current equation.",
    "variables": [
      {
        "symbol": "I",
        "description": "Current",
        "unit": "A"
      },
      {
        "symbol": "I₀",
        "description": "Reverse saturation current",
        "unit": "A"
      },
      {
        "symbol": "V",
        "description": "Voltage",
        "unit": "V"
      },
      {
        "symbol": "k",
        "description": "Boltzmann const"
      },
      {
        "symbol": "T",
        "description": "Temperature",
        "unit": "K"
      }
    ],
    "units": "A",
    "conditions": "—",
    "notes": "Forward bias: I increases.",
    "mistakes": [
      "Wrong sign for reverse"
    ],
    "tags": [
      "semiconductors",
      "diode"
    ],
    "synonyms": [
      "diode current",
      "pn junction"
    ],
    "importance": "medium",
    "difficulty": "hard",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  }
];
