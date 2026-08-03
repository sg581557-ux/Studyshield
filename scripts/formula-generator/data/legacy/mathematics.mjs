// AUTO-CONVERTED from legacy tuple format by scripts/migrate-legacy.mjs — DO NOT EDIT MANUALLY.
// These seeds feed the new declarative formula generator.
export const seeds = [
  {
    "id": "mth-001",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Pythagorean Identities",
    "name": "Pythagorean Identities",
    "expression": "sin²θ+cos²θ=1, 1+tan²θ=sec²θ, 1+cot²θ=csc²θ",
    "latex": "\\sin^2\\theta+\\cos^2\\theta=1,1+\\tan^2\\theta=\\sec^2\\theta",
    "description": "Fundamental trig identities.",
    "variables": [
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Use to convert between trig functions.",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "trigonometry",
      "identities"
    ],
    "synonyms": [
      "pythagorean identity",
      "trig identity"
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
    "id": "mth-002",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Sum Formulas",
    "name": "Sum and Difference Formulas",
    "expression": "sin(A±B)=sinAcosB±cosAsinB",
    "latex": "\\sin(A\\pm B)=\\sin A\\cos B\\pm\\cos A\\sin B",
    "description": "Sum/difference for sin.",
    "variables": [
      {
        "symbol": "A,B",
        "description": "Angles"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "cos(A±B)=cosAcosB∓sinAsinB.",
    "mistakes": [
      "Wrong sign pattern"
    ],
    "tags": [
      "trigonometry",
      "sum formulas"
    ],
    "synonyms": [
      "sum formula",
      "addition formula"
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
    "id": "mth-003",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Double Angle",
    "name": "Double Angle Formulas",
    "expression": "sin2θ=2sinθcosθ, cos2θ=cos²θ-sin²θ",
    "latex": "\\sin2\\theta=2\\sin\\theta\\cos\\theta",
    "description": "Double angle formulas.",
    "variables": [
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "cos2θ=1-2sin²θ=2cos²θ-1. tan2θ=2tanθ/(1-tan²θ).",
    "mistakes": [
      "Wrong form of cos2θ"
    ],
    "tags": [
      "trigonometry",
      "double angle"
    ],
    "synonyms": [
      "double angle",
      "2θ"
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
    "id": "mth-004",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Triple Angle",
    "name": "Triple Angle Formulas",
    "expression": "sin3θ=3sinθ-4sin³θ, cos3θ=4cos³θ-3cosθ",
    "latex": "\\sin3\\theta=3\\sin\\theta-4\\sin^3\\theta",
    "description": "Triple angle formulas.",
    "variables": [
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "tan3θ=(3tanθ-tan³θ)/(1-3tan²θ).",
    "mistakes": [
      "Wrong coefficients"
    ],
    "tags": [
      "trigonometry",
      "triple angle"
    ],
    "synonyms": [
      "triple angle",
      "3θ"
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
    "id": "mth-005",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Half Angle",
    "name": "Half Angle Formulas",
    "expression": "sin(θ/2)=±√((1-cosθ)/2)",
    "latex": "\\sin\\frac{\\theta}{2}=\\pm\\sqrt{\\frac{1-\\cos\\theta}{2}}",
    "description": "Half angle formulas.",
    "variables": [
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "cos(θ/2)=±√((1+cosθ)/2). tan(θ/2)=(1-cosθ)/sinθ.",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "trigonometry",
      "half angle"
    ],
    "synonyms": [
      "half angle",
      "θ/2"
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
    "id": "mth-006",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Product to Sum",
    "name": "Product to Sum",
    "expression": "2sinAcosB=sin(A+B)+sin(A-B)",
    "latex": "2\\sin A\\cos B=\\sin(A+B)+\\sin(A-B)",
    "description": "Product to sum formulas.",
    "variables": [
      {
        "symbol": "A,B",
        "description": "Angles"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "2cosAsinB=sin(A+B)-sin(A-B). 2cosAcosB=cos(A+B)+cos(A-B).",
    "mistakes": [
      "Wrong combination"
    ],
    "tags": [
      "trigonometry",
      "product sum"
    ],
    "synonyms": [
      "product to sum"
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
    "id": "mth-007",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Sum to Product",
    "name": "Sum to Product",
    "expression": "sinA+sinB=2sin((A+B)/2)cos((A-B)/2)",
    "latex": "\\sin A+\\sin B=2\\sin\\frac{A+B}{2}\\cos\\frac{A-B}{2}",
    "description": "Sum to product formulas.",
    "variables": [
      {
        "symbol": "A,B",
        "description": "Angles"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "sinA-sinB=2cos((A+B)/2)sin((A-B)/2).",
    "mistakes": [
      "Wrong formula"
    ],
    "tags": [
      "trigonometry",
      "sum product"
    ],
    "synonyms": [
      "sum to product"
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
    "id": "mth-010",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Sine Rule",
    "name": "Sine Rule",
    "expression": "a/sinA=b/sinB=c/sinC=2R",
    "latex": "\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}=2R",
    "description": "Sine rule for triangles.",
    "variables": [
      {
        "symbol": "a,b,c",
        "description": "Sides"
      },
      {
        "symbol": "A,B,C",
        "description": "Angles"
      },
      {
        "symbol": "R",
        "description": "Circumradius"
      }
    ],
    "units": "dimensionless",
    "conditions": "Any triangle.",
    "notes": "R is circumradius.",
    "mistakes": [
      "Using for SAS"
    ],
    "tags": [
      "trigonometry",
      "sine rule"
    ],
    "synonyms": [
      "sine rule",
      "sine law"
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
    "id": "mth-011",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Cosine Rule",
    "name": "Cosine Rule",
    "expression": "c²=a²+b²-2abcosC",
    "latex": "c^2=a^2+b^2-2ab\\cos C",
    "description": "Cosine rule for triangles.",
    "variables": [
      {
        "symbol": "a,b,c",
        "description": "Sides"
      },
      {
        "symbol": "C",
        "description": "Angle"
      }
    ],
    "units": "dimensionless",
    "conditions": "Any triangle.",
    "notes": "Use for SAS or SSS.",
    "mistakes": [
      "Wrong angle"
    ],
    "tags": [
      "trigonometry",
      "cosine rule"
    ],
    "synonyms": [
      "cosine rule",
      "cosine law"
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
    "id": "mth-012",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Trigonometry",
    "topic": "Area of Triangle",
    "name": "Area of Triangle",
    "expression": "Area=½ab sinC",
    "latex": "\\text{Area}=\\frac{1}{2}ab\\sin C",
    "description": "Area using two sides and included angle.",
    "variables": [
      {
        "symbol": "a,b",
        "description": "Sides"
      },
      {
        "symbol": "C",
        "description": "Included angle"
      }
    ],
    "units": "unit²",
    "conditions": "—",
    "notes": "Also: Area=√(s(s-a)(s-b)(s-c)).",
    "mistakes": [
      "Using wrong angle"
    ],
    "tags": [
      "trigonometry",
      "area triangle"
    ],
    "synonyms": [
      "triangle area",
      "heron"
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
    "id": "mth-020",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Quadratic Equations",
    "topic": "Quadratic Formula",
    "name": "Quadratic Formula",
    "expression": "x=(-b±√(b²-4ac))/2a",
    "latex": "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
    "description": "Roots of ax²+bx+c=0.",
    "variables": [
      {
        "symbol": "x",
        "description": "Roots"
      },
      {
        "symbol": "a,b,c",
        "description": "Coefficients"
      }
    ],
    "units": "dimensionless",
    "conditions": "a≠0.",
    "notes": "D=b²-4ac. D>0:2 real, D=0:1, D<0:complex.",
    "mistakes": [
      "Forgetting 2a"
    ],
    "tags": [
      "quadratic equations",
      "roots"
    ],
    "synonyms": [
      "quadratic formula",
      "roots"
    ],
    "importance": "critical",
    "difficulty": "easy",
    "exams": [
      "jee-main",
      "jee-advanced",
      "cbse-10",
      "icse"
    ],
    "freq": true
  },
  {
    "id": "mth-021",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Quadratic Equations",
    "topic": "Discriminant",
    "name": "Discriminant",
    "expression": "D=b²-4ac",
    "latex": "D=b^2-4ac",
    "description": "Nature of roots.",
    "variables": [
      {
        "symbol": "D",
        "description": "Discriminant"
      },
      {
        "symbol": "a,b,c",
        "description": "Coefficients"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "D>0:2 distinct real, D=0:equal, D<0:complex.",
    "mistakes": [
      "Wrong sign of 4ac"
    ],
    "tags": [
      "quadratic equations",
      "discriminant"
    ],
    "synonyms": [
      "discriminant",
      "nature of roots"
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
    "id": "mth-022",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Quadratic Equations",
    "topic": "Sum and Product",
    "name": "Sum and Product of Roots",
    "expression": "α+β=-b/a, αβ=c/a",
    "latex": "\\alpha+\\beta=-\\frac{b}{a},\\alpha\\beta=\\frac{c}{a}",
    "description": "Vieta's formulas.",
    "variables": [
      {
        "symbol": "α,β",
        "description": "Roots"
      },
      {
        "symbol": "a,b,c",
        "description": "Coefficients"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Use for symmetric functions of roots.",
    "mistakes": [
      "Wrong signs"
    ],
    "tags": [
      "quadratic equations",
      "vieta"
    ],
    "synonyms": [
      "sum product roots",
      "vieta formulas"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced",
      "cbse-10",
      "icse"
    ],
    "freq": true
  },
  {
    "id": "mth-030",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sequence and Series",
    "topic": "AP nth Term",
    "name": "AP nth Term",
    "expression": "a_n=a+(n-1)d",
    "latex": "a_n=a+(n-1)d",
    "description": "nth term of AP.",
    "variables": [
      {
        "symbol": "a_n",
        "description": "nth term"
      },
      {
        "symbol": "a",
        "description": "First term"
      },
      {
        "symbol": "n",
        "description": "Term number"
      },
      {
        "symbol": "d",
        "description": "Common difference"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong n-1"
    ],
    "tags": [
      "sequence series",
      "ap"
    ],
    "synonyms": [
      "arithmetic progression",
      "ap"
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
    "id": "mth-031",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sequence and Series",
    "topic": "AP Sum",
    "name": "AP Sum",
    "expression": "S_n=n/2(a+a_n)=n/2(2a+(n-1)d)",
    "latex": "S_n=\\frac{n}{2}(2a+(n-1)d)",
    "description": "Sum of n terms of AP.",
    "variables": [
      {
        "symbol": "S_n",
        "description": "Sum"
      },
      {
        "symbol": "n",
        "description": "Number of terms"
      },
      {
        "symbol": "a",
        "description": "First term"
      },
      {
        "symbol": "d",
        "description": "Common difference"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong formula"
    ],
    "tags": [
      "sequence series",
      "ap sum"
    ],
    "synonyms": [
      "ap sum",
      "arithmetic series"
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
    "id": "mth-032",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sequence and Series",
    "topic": "GP nth Term",
    "name": "GP nth Term",
    "expression": "a_n=ar^(n-1)",
    "latex": "a_n=ar^{n-1}",
    "description": "nth term of GP.",
    "variables": [
      {
        "symbol": "a_n",
        "description": "nth term"
      },
      {
        "symbol": "a",
        "description": "First term"
      },
      {
        "symbol": "r",
        "description": "Common ratio"
      },
      {
        "symbol": "n",
        "description": "Term number"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong exponent"
    ],
    "tags": [
      "sequence series",
      "gp"
    ],
    "synonyms": [
      "geometric progression",
      "gp"
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
    "id": "mth-033",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sequence and Series",
    "topic": "GP Sum",
    "name": "GP Sum (finite)",
    "expression": "S_n=a(1-r^n)/(1-r)",
    "latex": "S_n=a\\frac{1-r^n}{1-r}",
    "description": "Sum of n terms of GP.",
    "variables": [
      {
        "symbol": "S_n",
        "description": "Sum"
      },
      {
        "symbol": "a",
        "description": "First term"
      },
      {
        "symbol": "r",
        "description": "Common ratio"
      },
      {
        "symbol": "n",
        "description": "Terms"
      }
    ],
    "units": "—",
    "conditions": "r≠1.",
    "notes": "r<1: use (1-r^n). r>1: use (r^n-1).",
    "mistakes": [
      "Wrong denominator sign"
    ],
    "tags": [
      "sequence series",
      "gp sum"
    ],
    "synonyms": [
      "gp sum",
      "geometric series"
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
    "id": "mth-034",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sequence and Series",
    "topic": "GP Infinite",
    "name": "GP Infinite Sum",
    "expression": "S=a/(1-r)",
    "latex": "S=\\frac{a}{1-r}",
    "description": "Sum of infinite GP.",
    "variables": [
      {
        "symbol": "S",
        "description": "Sum"
      },
      {
        "symbol": "a",
        "description": "First term"
      },
      {
        "symbol": "r",
        "description": "Common ratio"
      }
    ],
    "units": "—",
    "conditions": "|r|<1.",
    "notes": "Converges only if |r|<1.",
    "mistakes": [
      "Using for |r|≥1"
    ],
    "tags": [
      "sequence series",
      "gp infinite"
    ],
    "synonyms": [
      "infinite gp",
      "geometric series"
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
    "id": "mth-035",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sequence and Series",
    "topic": "AM GM HM",
    "name": "AM-GM-HM Relation",
    "expression": "AM≥GM≥HM",
    "latex": "AM\\geq GM\\geq HM",
    "description": "Inequality relation.",
    "variables": [
      {
        "symbol": "AM",
        "description": "Arithmetic mean"
      },
      {
        "symbol": "GM",
        "description": "Geometric mean"
      },
      {
        "symbol": "HM",
        "description": "Harmonic mean"
      }
    ],
    "units": "—",
    "conditions": "Positive numbers.",
    "notes": "AM×HM=GM².",
    "mistakes": [
      "Applying to negative numbers"
    ],
    "tags": [
      "sequence series",
      "am gm"
    ],
    "synonyms": [
      "am gm hm",
      "inequality"
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
    "id": "mth-040",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Binomial Theorem",
    "topic": "General Term",
    "name": "Binomial General Term",
    "expression": "T_(r+1)=nCr x^(n-r) a^r",
    "latex": "T_{r+1}=\\binom{n}{r}x^{n-r}a^r",
    "description": "General term of (x+a)^n.",
    "variables": [
      {
        "symbol": "T_(r+1)",
        "description": "(r+1)th term"
      },
      {
        "symbol": "n",
        "description": "Power"
      },
      {
        "symbol": "r",
        "description": "Term index"
      },
      {
        "symbol": "x,a",
        "description": "Terms"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong r value"
    ],
    "tags": [
      "binomial theorem",
      "general term"
    ],
    "synonyms": [
      "binomial term",
      "general term"
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
    "id": "mth-041",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Binomial Theorem",
    "topic": "Binomial Sum",
    "name": "Sum of Binomial Coefficients",
    "expression": "ΣnCr=2^n",
    "latex": "\\sum\\binom{n}{r}=2^n",
    "description": "Sum of all coefficients.",
    "variables": [
      {
        "symbol": "n",
        "description": "Power"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Set x=a=1 in (x+a)^n.",
    "mistakes": [
      "Using n not 2^n"
    ],
    "tags": [
      "binomial theorem",
      "sum"
    ],
    "synonyms": [
      "binomial sum",
      "coefficients"
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
    "id": "mth-050",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Permutation Combination",
    "topic": "Permutation",
    "name": "Permutation",
    "expression": "nPr=n!/(n-r)!",
    "latex": "^nP_r=\\frac{n!}{(n-r)!}",
    "description": "Arrangements.",
    "variables": [
      {
        "symbol": "n",
        "description": "Total items"
      },
      {
        "symbol": "r",
        "description": "Selected items"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Order matters.",
    "mistakes": [
      "Using nCr formula"
    ],
    "tags": [
      "permutation combination",
      "permutation"
    ],
    "synonyms": [
      "permutation",
      "arrangement"
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
    "id": "mth-051",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Permutation Combination",
    "topic": "Combination",
    "name": "Combination",
    "expression": "nCr=n!/((n-r)!r!)",
    "latex": "^nC_r=\\frac{n!}{(n-r)!r!}",
    "description": "Selections.",
    "variables": [
      {
        "symbol": "n",
        "description": "Total items"
      },
      {
        "symbol": "r",
        "description": "Selected items"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Order does not matter. nCr=nC(n-r).",
    "mistakes": [
      "Using nPr formula"
    ],
    "tags": [
      "permutation combination",
      "combination"
    ],
    "synonyms": [
      "combination",
      "selection"
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
    "id": "mth-052",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Permutation Combination",
    "topic": "Factorial",
    "name": "Factorial",
    "expression": "n!=n(n-1)(n-2)...1",
    "latex": "n!=n(n-1)(n-2)\\cdots1",
    "description": "Factorial.",
    "variables": [
      {
        "symbol": "n",
        "description": "Number"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "0!=1. n!=n×(n-1)!.",
    "mistakes": [
      "Using 0!=0"
    ],
    "tags": [
      "permutation combination",
      "factorial"
    ],
    "synonyms": [
      "factorial",
      "n factorial"
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
    "id": "mth-060",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Complex Numbers",
    "topic": "Modulus",
    "name": "Modulus of Complex Number",
    "expression": "|z|=√(a²+b²)",
    "latex": "|z|=\\sqrt{a^2+b^2}",
    "description": "Modulus of z=a+ib.",
    "variables": [
      {
        "symbol": "z",
        "description": "Complex number"
      },
      {
        "symbol": "a",
        "description": "Real part"
      },
      {
        "symbol": "b",
        "description": "Imaginary part"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "|z|²=z·z̄.",
    "mistakes": [
      "Forgetting sqrt"
    ],
    "tags": [
      "complex numbers",
      "modulus"
    ],
    "synonyms": [
      "modulus",
      "absolute value"
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
    "id": "mth-061",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Complex Numbers",
    "topic": "Euler Form",
    "name": "Euler Form",
    "expression": "e^(iθ)=cosθ+isinθ",
    "latex": "e^{i\\theta}=\\cos\\theta+i\\sin\\theta",
    "description": "Euler formula.",
    "variables": [
      {
        "symbol": "θ",
        "description": "Angle"
      },
      {
        "symbol": "i",
        "description": "√-1"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "z=re^(iθ) polar form.",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "complex numbers",
      "euler"
    ],
    "synonyms": [
      "euler formula",
      "polar form"
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
    "id": "mth-062",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Complex Numbers",
    "topic": "De Moivre",
    "name": "De Moivre Theorem",
    "expression": "(cosθ+isinθ)^n=cos(nθ)+isin(nθ)",
    "latex": "(\\cos\\theta+i\\sin\\theta)^n=\\cos n\\theta+i\\sin n\\theta",
    "description": "De Moivre theorem.",
    "variables": [
      {
        "symbol": "n",
        "description": "Power"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Used for powers of complex numbers.",
    "mistakes": [
      "Wrong nθ"
    ],
    "tags": [
      "complex numbers",
      "de moivre"
    ],
    "synonyms": [
      "de moivre theorem"
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
    "id": "mth-070",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Straight Line",
    "topic": "Distance",
    "name": "Distance Between Points",
    "expression": "d=√((x₂-x₁)²+(y₂-y₁)²)",
    "latex": "d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}",
    "description": "Distance between two points.",
    "variables": [
      {
        "symbol": "d",
        "description": "Distance"
      },
      {
        "symbol": "x₁,y₁",
        "description": "Point 1"
      },
      {
        "symbol": "x₂,y₂",
        "description": "Point 2"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "straight line",
      "distance"
    ],
    "synonyms": [
      "distance formula",
      "two points"
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
    "id": "mth-071",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Straight Line",
    "topic": "Section Formula",
    "name": "Section Formula",
    "expression": "P=((mx₂+nx₁)/(m+n),(my₂+ny₁)/(m+n))",
    "latex": "P=\\left(\\frac{mx_2+nx_1}{m+n},\\frac{my_2+ny_1}{m+n}\\right)",
    "description": "Internal division.",
    "variables": [
      {
        "symbol": "P",
        "description": "Point"
      },
      {
        "symbol": "m,n",
        "description": "Ratio"
      },
      {
        "symbol": "x₁,y₁",
        "description": "Point 1"
      },
      {
        "symbol": "x₂,y₂",
        "description": "Point 2"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Midpoint: m=n=1.",
    "mistakes": [
      "Wrong ratio order"
    ],
    "tags": [
      "straight line",
      "section"
    ],
    "synonyms": [
      "section formula",
      "division"
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
    "id": "mth-072",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Straight Line",
    "topic": "Slope",
    "name": "Slope of Line",
    "expression": "m=(y₂-y₁)/(x₂-x₁)",
    "latex": "m=\\frac{y_2-y_1}{x_2-x_1}",
    "description": "Slope between two points.",
    "variables": [
      {
        "symbol": "m",
        "description": "Slope"
      },
      {
        "symbol": "x₁,y₁",
        "description": "Point 1"
      },
      {
        "symbol": "x₂,y₂",
        "description": "Point 2"
      }
    ],
    "units": "—",
    "conditions": "x₁≠x₂.",
    "notes": "Parallel: m₁=m₂. Perpendicular: m₁m₂=-1.",
    "mistakes": [
      "Denominator zero"
    ],
    "tags": [
      "straight line",
      "slope"
    ],
    "synonyms": [
      "slope",
      "gradient"
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
    "id": "mth-073",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Straight Line",
    "topic": "Point-Slope Form",
    "name": "Point-Slope Form",
    "expression": "y-y₁=m(x-x₁)",
    "latex": "y-y_1=m(x-x_1)",
    "description": "Equation of line.",
    "variables": [
      {
        "symbol": "m",
        "description": "Slope"
      },
      {
        "symbol": "x₁,y₁",
        "description": "Point"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "straight line",
      "equation"
    ],
    "synonyms": [
      "point slope form",
      "line equation"
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
    "id": "mth-074",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Straight Line",
    "topic": "Two-Point Form",
    "name": "Two-Point Form",
    "expression": "(y-y₁)/(x-x₁)=(y₂-y₁)/(x₂-x₁)",
    "latex": "\\frac{y-y_1}{x-x_1}=\\frac{y_2-y_1}{x_2-x_1}",
    "description": "Line through two points.",
    "variables": [
      {
        "symbol": "x₁,y₁",
        "description": "Point 1"
      },
      {
        "symbol": "x₂,y₂",
        "description": "Point 2"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong points"
    ],
    "tags": [
      "straight line",
      "equation"
    ],
    "synonyms": [
      "two point form",
      "line equation"
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
    "id": "mth-075",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Straight Line",
    "topic": "Distance Point-Line",
    "name": "Distance from Point to Line",
    "expression": "d=|ax+by+c|/√(a²+b²)",
    "latex": "d=\\frac{|ax+by+c|}{\\sqrt{a^2+b^2}}",
    "description": "Distance from point to line.",
    "variables": [
      {
        "symbol": "d",
        "description": "Distance"
      },
      {
        "symbol": "a,b,c",
        "description": "Line coefficients"
      },
      {
        "symbol": "x,y",
        "description": "Point"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Line: ax+by+c=0.",
    "mistakes": [
      "Forgetting absolute value"
    ],
    "tags": [
      "straight line",
      "distance"
    ],
    "synonyms": [
      "point line distance",
      "perpendicular distance"
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
    "id": "mth-080",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Circle",
    "topic": "Circle Equation",
    "name": "Circle Equation",
    "expression": "(x-h)²+(y-k)²=r²",
    "latex": "(x-h)^2+(y-k)^2=r^2",
    "description": "Standard circle equation.",
    "variables": [
      {
        "symbol": "h,k",
        "description": "Center"
      },
      {
        "symbol": "r",
        "description": "Radius"
      },
      {
        "symbol": "x,y",
        "description": "Point"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Center (h,k), radius r.",
    "mistakes": [
      "Wrong center"
    ],
    "tags": [
      "circle",
      "equation"
    ],
    "synonyms": [
      "circle equation",
      "standard circle"
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
    "id": "mth-081",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Circle",
    "topic": "General Form",
    "name": "General Circle",
    "expression": "x²+y²+2gx+2fy+c=0",
    "latex": "x^2+y^2+2gx+2fy+c=0",
    "description": "General circle equation.",
    "variables": [
      {
        "symbol": "g,f,c",
        "description": "Coefficients"
      }
    ],
    "units": "—",
    "conditions": "g²+f²>c.",
    "notes": "Center: (-g,-f). Radius: √(g²+f²-c).",
    "mistakes": [
      "Wrong center sign"
    ],
    "tags": [
      "circle",
      "general"
    ],
    "synonyms": [
      "general circle",
      "circle equation"
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
    "id": "mth-090",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Conic Sections",
    "topic": "Parabola",
    "name": "Parabola Standard",
    "expression": "y²=4ax",
    "latex": "y^2=4ax",
    "description": "Standard parabola.",
    "variables": [
      {
        "symbol": "a",
        "description": "Focal length"
      },
      {
        "symbol": "x,y",
        "description": "Point"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Focus: (a,0). Directrix: x=-a.",
    "mistakes": [
      "Wrong focus"
    ],
    "tags": [
      "conic sections",
      "parabola"
    ],
    "synonyms": [
      "parabola",
      "conic"
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
    "id": "mth-091",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Conic Sections",
    "topic": "Ellipse",
    "name": "Ellipse Equation",
    "expression": "x²/a²+y²/b²=1",
    "latex": "\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1",
    "description": "Standard ellipse.",
    "variables": [
      {
        "symbol": "a",
        "description": "Semi-major"
      },
      {
        "symbol": "b",
        "description": "Semi-minor"
      }
    ],
    "units": "—",
    "conditions": "a>b.",
    "notes": "e=√(1-b²/a²). foci: (±ae,0).",
    "mistakes": [
      "Wrong eccentricity"
    ],
    "tags": [
      "conic sections",
      "ellipse"
    ],
    "synonyms": [
      "ellipse",
      "conic"
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
    "id": "mth-092",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Conic Sections",
    "topic": "Hyperbola",
    "name": "Hyperbola Equation",
    "expression": "x²/a²-y²/b²=1",
    "latex": "\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1",
    "description": "Standard hyperbola.",
    "variables": [
      {
        "symbol": "a",
        "description": "Semi-transverse"
      },
      {
        "symbol": "b",
        "description": "Semi-conjugate"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "e=√(1+b²/a²). Asymptotes: y=±(b/a)x.",
    "mistakes": [
      "Wrong sign"
    ],
    "tags": [
      "conic sections",
      "hyperbola"
    ],
    "synonyms": [
      "hyperbola",
      "conic"
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
    "id": "mth-093",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Conic Sections",
    "topic": "Eccentricity",
    "name": "Eccentricity",
    "expression": "e=c/a",
    "latex": "e=\\frac{c}{a}",
    "description": "Eccentricity of conic.",
    "variables": [
      {
        "symbol": "e",
        "description": "Eccentricity"
      },
      {
        "symbol": "c",
        "description": "Focal distance"
      },
      {
        "symbol": "a",
        "description": "Semi-major"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Circle: e=0. Parabola: e=1. Ellipse: 0<e<1. Hyperbola: e>1.",
    "mistakes": [
      "Wrong e range"
    ],
    "tags": [
      "conic sections",
      "eccentricity"
    ],
    "synonyms": [
      "eccentricity",
      "conic"
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
    "id": "mth-100",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Limits",
    "topic": "L Hopital",
    "name": "L'Hôpital Rule",
    "expression": "lim f/g = lim f'/g'",
    "latex": "\\lim\\frac{f}{g}=\\lim\\frac{f'}{g'}",
    "description": "For 0/0 or ∞/∞ forms.",
    "variables": [
      {
        "symbol": "f,g",
        "description": "Functions"
      }
    ],
    "units": "—",
    "conditions": "0/0 or ∞/∞.",
    "notes": "Differentiate numerator and denominator separately.",
    "mistakes": [
      "Using for non-indeterminate"
    ],
    "tags": [
      "limits",
      "l hopital"
    ],
    "synonyms": [
      "l hopital rule",
      "indeterminate"
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
    "id": "mth-101",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Limits",
    "topic": "Standard Limits",
    "name": "Standard Limits",
    "expression": "lim(sin x/x)=1 as x→0",
    "latex": "\\lim_{x\\to0}\\frac{\\sin x}{x}=1",
    "description": "Standard limit.",
    "variables": [
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "x→0.",
    "notes": "lim((1+x)^(1/x))=e as x→0. lim((1+1/n)^n)=e.",
    "mistakes": [
      "Wrong limit value"
    ],
    "tags": [
      "limits",
      "standard"
    ],
    "synonyms": [
      "standard limit",
      "sin x/x"
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
    "id": "mth-110",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differentiation",
    "topic": "Power Rule",
    "name": "Power Rule",
    "expression": "d/dx(x^n)=nx^(n-1)",
    "latex": "\\frac{d}{dx}x^n=nx^{n-1}",
    "description": "Derivative of power.",
    "variables": [
      {
        "symbol": "n",
        "description": "Exponent"
      },
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong exponent"
    ],
    "tags": [
      "differentiation",
      "power rule"
    ],
    "synonyms": [
      "power rule",
      "derivative"
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
    "id": "mth-111",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differentiation",
    "topic": "Product Rule",
    "name": "Product Rule",
    "expression": "(uv)'=u'v+uv'",
    "latex": "(uv)'=u'v+uv'",
    "description": "Derivative of product.",
    "variables": [
      {
        "symbol": "u,v",
        "description": "Functions"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong order"
    ],
    "tags": [
      "differentiation",
      "product rule"
    ],
    "synonyms": [
      "product rule",
      "derivative"
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
    "id": "mth-112",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differentiation",
    "topic": "Quotient Rule",
    "name": "Quotient Rule",
    "expression": "(u/v)'=(u'v-uv')/v²",
    "latex": "(u/v)'=\\frac{u'v-uv'}{v^2}",
    "description": "Derivative of quotient.",
    "variables": [
      {
        "symbol": "u,v",
        "description": "Functions"
      }
    ],
    "units": "—",
    "conditions": "v≠0.",
    "notes": "—",
    "mistakes": [
      "Wrong numerator sign"
    ],
    "tags": [
      "differentiation",
      "quotient rule"
    ],
    "synonyms": [
      "quotient rule",
      "derivative"
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
    "id": "mth-113",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differentiation",
    "topic": "Chain Rule",
    "name": "Chain Rule",
    "expression": "d/dx f(g(x))=f'(g(x))g'(x)",
    "latex": "\\frac{d}{dx}f(g(x))=f'(g(x))g'(x)",
    "description": "Derivative of composite.",
    "variables": [
      {
        "symbol": "f,g",
        "description": "Functions"
      },
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Forgetting inner derivative"
    ],
    "tags": [
      "differentiation",
      "chain rule"
    ],
    "synonyms": [
      "chain rule",
      "composite derivative"
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
    "id": "mth-114",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differentiation",
    "topic": "Trig Derivatives",
    "name": "Trigonometric Derivatives",
    "expression": "d/dx(sin x)=cos x, d/dx(cos x)=-sin x",
    "latex": "\\frac{d}{dx}\\sin x=\\cos x",
    "description": "Derivatives of trig functions.",
    "variables": [
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "d/dx(tan x)=sec²x. d/dx(sec x)=sec x tan x.",
    "mistakes": [
      "Wrong sign of cos derivative"
    ],
    "tags": [
      "differentiation",
      "trig derivatives"
    ],
    "synonyms": [
      "trig derivative",
      "sin derivative"
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
    "id": "mth-115",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differentiation",
    "topic": "Exponential Log",
    "name": "Exponential and Log Derivatives",
    "expression": "d/dx(e^x)=e^x, d/dx(ln x)=1/x",
    "latex": "\\frac{d}{dx}e^x=e^x,\\frac{d}{dx}\\ln x=\\frac{1}{x}",
    "description": "Derivatives of exp and log.",
    "variables": [
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "x>0 for ln.",
    "notes": "d/dx(a^x)=a^x ln a. d/dx(log_a x)=1/(x ln a).",
    "mistakes": [
      "Using e^x derivative for a^x"
    ],
    "tags": [
      "differentiation",
      "exponential"
    ],
    "synonyms": [
      "exponential derivative",
      "log derivative"
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
    "id": "mth-120",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Applications of Derivatives",
    "topic": "Tangent Slope",
    "name": "Slope of Tangent",
    "expression": "m=dy/dx at point",
    "latex": "m=\\frac{dy}{dx}",
    "description": "Slope of tangent.",
    "variables": [
      {
        "symbol": "m",
        "description": "Slope"
      },
      {
        "symbol": "dy/dx",
        "description": "Derivative"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Tangent: y-y₁=m(x-x₁). Normal: slope=-1/m.",
    "mistakes": [
      "Using normal slope for tangent"
    ],
    "tags": [
      "applications derivatives",
      "tangent"
    ],
    "synonyms": [
      "tangent slope",
      "derivative application"
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
    "id": "mth-121",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Applications of Derivatives",
    "topic": "Maxima Minima",
    "name": "Maxima and Minima",
    "expression": "f'(x)=0, f''(x)<0 max, f''(x)>0 min",
    "latex": "f'(x)=0,f''(x)<0\\text{ max}",
    "description": "Critical points.",
    "variables": [
      {
        "symbol": "f(x)",
        "description": "Function"
      },
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "First derivative test: sign change. Second: f'' sign.",
    "mistakes": [
      "Not checking f''"
    ],
    "tags": [
      "applications derivatives",
      "maxima minima"
    ],
    "synonyms": [
      "maxima minima",
      "optimization"
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
    "id": "mth-122",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Applications of Derivatives",
    "topic": "Rate of Change",
    "name": "Rate of Change",
    "expression": "dy/dt=(dy/dx)(dx/dt)",
    "latex": "\\frac{dy}{dt}=\\frac{dy}{dx}\\frac{dx}{dt}",
    "description": "Related rates.",
    "variables": [
      {
        "symbol": "y",
        "description": "Dependent"
      },
      {
        "symbol": "x",
        "description": "Independent"
      },
      {
        "symbol": "t",
        "description": "Time"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Chain rule for rates.",
    "mistakes": [
      "Missing chain rule"
    ],
    "tags": [
      "applications derivatives",
      "rate of change"
    ],
    "synonyms": [
      "rate of change",
      "related rates"
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
    "id": "mth-130",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Indefinite Integration",
    "topic": "Power Rule",
    "name": "Integration Power Rule",
    "expression": "∫x^n dx=x^(n+1)/(n+1)+C",
    "latex": "\\int x^n dx=\\frac{x^{n+1}}{n+1}+C",
    "description": "Integral of power.",
    "variables": [
      {
        "symbol": "n",
        "description": "Exponent"
      },
      {
        "symbol": "x",
        "description": "Variable"
      },
      {
        "symbol": "C",
        "description": "Constant"
      }
    ],
    "units": "—",
    "conditions": "n≠-1.",
    "notes": "∫x⁻¹ dx=ln|x|+C.",
    "mistakes": [
      "Using n not n+1"
    ],
    "tags": [
      "integration",
      "power rule"
    ],
    "synonyms": [
      "integration power rule",
      "integral"
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
    "id": "mth-131",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Indefinite Integration",
    "topic": "Trig Integrals",
    "name": "Trigonometric Integrals",
    "expression": "∫cos x dx=sin x+C, ∫sin x dx=-cos x+C",
    "latex": "\\int\\cos x\\,dx=\\sin x+C",
    "description": "Basic trig integrals.",
    "variables": [
      {
        "symbol": "x",
        "description": "Variable"
      },
      {
        "symbol": "C",
        "description": "Constant"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "∫sec²x dx=tan x+C. ∫csc²x dx=-cot x+C.",
    "mistakes": [
      "Wrong sign of sin integral"
    ],
    "tags": [
      "integration",
      "trig integrals"
    ],
    "synonyms": [
      "trig integral",
      "cos integral"
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
    "id": "mth-132",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Indefinite Integration",
    "topic": "Integration by Parts",
    "name": "Integration by Parts",
    "expression": "∫u dv=uv-∫v du",
    "latex": "\\int u\\,dv=uv-\\int v\\,du",
    "description": "Integration by parts.",
    "variables": [
      {
        "symbol": "u,v",
        "description": "Functions"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "LIATE: Log, Inverse trig, Algebraic, Trig, Exponential.",
    "mistakes": [
      "Wrong u selection"
    ],
    "tags": [
      "integration",
      "by parts"
    ],
    "synonyms": [
      "integration by parts",
      "liate"
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
    "id": "mth-133",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Indefinite Integration",
    "topic": "Partial Fractions",
    "name": "Partial Fractions",
    "expression": "—",
    "latex": "—",
    "description": "Decompose rational functions.",
    "variables": [],
    "units": "—",
    "conditions": "—",
    "notes": "Proper rational function.",
    "examTip": "Used for integrating rational functions.",
    "mistakes": [
      "Wrong decomposition"
    ],
    "tags": [
      "integration",
      "partial fractions"
    ],
    "synonyms": [
      "partial fractions",
      "rational integral"
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
    "id": "mth-140",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Definite Integration",
    "topic": "Fundamental Theorem",
    "name": "Fundamental Theorem",
    "expression": "∫_a^b f(x)dx=F(b)-F(a)",
    "latex": "\\int_a^b f(x)dx=F(b)-F(a)",
    "description": "FTC.",
    "variables": [
      {
        "symbol": "F",
        "description": "Antiderivative"
      },
      {
        "symbol": "a,b",
        "description": "Limits"
      },
      {
        "symbol": "f",
        "description": "Function"
      }
    ],
    "units": "—",
    "conditions": "F'=f.",
    "notes": "—",
    "mistakes": [
      "Wrong order of limits"
    ],
    "tags": [
      "definite integration",
      "ftc"
    ],
    "synonyms": [
      "fundamental theorem",
      "definite integral"
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
    "id": "mth-141",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Definite Integration",
    "topic": "Property",
    "name": "Definite Integral Property",
    "expression": "∫_a^b f(x)dx=∫_a^b f(a+b-x)dx",
    "latex": "\\int_a^b f(x)dx=\\int_a^b f(a+b-x)dx",
    "description": "Symmetry property.",
    "variables": [
      {
        "symbol": "a,b",
        "description": "Limits"
      },
      {
        "symbol": "f",
        "description": "Function"
      },
      {
        "symbol": "x",
        "description": "Variable"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Useful for simplifying integrals.",
    "mistakes": [
      "Wrong substitution"
    ],
    "tags": [
      "definite integration",
      "properties"
    ],
    "synonyms": [
      "integral property",
      "symmetry"
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
    "id": "mth-142",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Definite Integration",
    "topic": "King Property",
    "name": "King's Rule",
    "expression": "∫_0^a f(x)dx=∫_0^a f(a-x)dx",
    "latex": "\\int_0^a f(x)dx=\\int_0^a f(a-x)dx",
    "description": "King's property.",
    "variables": [
      {
        "symbol": "a",
        "description": "Upper limit"
      },
      {
        "symbol": "f",
        "description": "Function"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Very useful for 0 to a limits.",
    "mistakes": [
      "Wrong limit"
    ],
    "tags": [
      "definite integration",
      "king rule"
    ],
    "synonyms": [
      "king property",
      "integral property"
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
    "id": "mth-143",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Definite Integration",
    "topic": "Even Odd",
    "name": "Even Odd Function",
    "expression": "∫_{-a}^a f(x)dx=2∫_0^a f(x)dx if even, 0 if odd",
    "latex": "\\int_{-a}^a f(x)dx=2\\int_0^a f(x)dx",
    "description": "Even/odd function integral.",
    "variables": [
      {
        "symbol": "a",
        "description": "Limit"
      },
      {
        "symbol": "f",
        "description": "Function"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Even: f(-x)=f(x). Odd: f(-x)=-f(x).",
    "mistakes": [
      "Wrong even/odd classification"
    ],
    "tags": [
      "definite integration",
      "even odd"
    ],
    "synonyms": [
      "even odd integral",
      "symmetry"
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
    "id": "mth-150",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differential Equations",
    "topic": "First Order",
    "name": "First Order Linear",
    "expression": "dy/dx+P(x)y=Q(x)",
    "latex": "\\frac{dy}{dx}+P(x)y=Q(x)",
    "description": "Linear first order ODE.",
    "variables": [
      {
        "symbol": "y",
        "description": "Dependent"
      },
      {
        "symbol": "x",
        "description": "Independent"
      },
      {
        "symbol": "P,Q",
        "description": "Functions"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "IF=e^(∫P dx). Solution: y×IF=∫Q×IF dx.",
    "mistakes": [
      "Wrong IF"
    ],
    "tags": [
      "differential equations",
      "first order"
    ],
    "synonyms": [
      "first order ode",
      "linear ode"
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
    "id": "mth-151",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Differential Equations",
    "topic": "Separable",
    "name": "Separable Variables",
    "expression": "∫f(y)dy=∫g(x)dx",
    "latex": "\\int f(y)dy=\\int g(x)dx",
    "description": "Separable ODE.",
    "variables": [
      {
        "symbol": "x,y",
        "description": "Variables"
      },
      {
        "symbol": "f,g",
        "description": "Functions"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Separate variables then integrate.",
    "mistakes": [
      "Not separating properly"
    ],
    "tags": [
      "differential equations",
      "separable"
    ],
    "synonyms": [
      "separable ode",
      "variables separable"
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
    "id": "mth-160",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Probability",
    "topic": "Basic Probability",
    "name": "Probability of Event",
    "expression": "P(E)=n(E)/n(S)",
    "latex": "P(E)=\\frac{n(E)}{n(S)}",
    "description": "Basic probability.",
    "variables": [
      {
        "symbol": "P(E)",
        "description": "Probability"
      },
      {
        "symbol": "n(E)",
        "description": "Favorable outcomes"
      },
      {
        "symbol": "n(S)",
        "description": "Total outcomes"
      }
    ],
    "units": "dimensionless",
    "conditions": "Equally likely.",
    "notes": "0≤P(E)≤1.",
    "mistakes": [
      "Not counting all outcomes"
    ],
    "tags": [
      "probability",
      "basic"
    ],
    "synonyms": [
      "probability",
      "event"
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
    "id": "mth-161",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Probability",
    "topic": "Addition Theorem",
    "name": "Addition Theorem",
    "expression": "P(A∪B)=P(A)+P(B)-P(A∩B)",
    "latex": "P(A\\cup B)=P(A)+P(B)-P(A\\cap B)",
    "description": "Probability of union.",
    "variables": [
      {
        "symbol": "P(A),P(B)",
        "description": "Probabilities"
      },
      {
        "symbol": "P(A∩B)",
        "description": "Intersection"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "For mutually exclusive: P(A∩B)=0.",
    "mistakes": [
      "Forgetting intersection term"
    ],
    "tags": [
      "probability",
      "addition"
    ],
    "synonyms": [
      "addition theorem",
      "union probability"
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
    "id": "mth-162",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Probability",
    "topic": "Conditional",
    "name": "Conditional Probability",
    "expression": "P(A|B)=P(A∩B)/P(B)",
    "latex": "P(A|B)=\\frac{P(A\\cap B)}{P(B)}",
    "description": "Conditional probability.",
    "variables": [
      {
        "symbol": "P(A|B)",
        "description": "Conditional"
      },
      {
        "symbol": "P(B)",
        "description": "Condition",
        "unit": "≠0"
      }
    ],
    "units": "dimensionless",
    "conditions": "P(B)≠0.",
    "notes": "—",
    "mistakes": [
      "Dividing by wrong probability"
    ],
    "tags": [
      "probability",
      "conditional"
    ],
    "synonyms": [
      "conditional probability",
      "bayes"
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
    "id": "mth-163",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Probability",
    "topic": "Multiplication",
    "name": "Multiplication Theorem",
    "expression": "P(A∩B)=P(A)×P(B|A)",
    "latex": "P(A\\cap B)=P(A)\\times P(B|A)",
    "description": "Joint probability.",
    "variables": [
      {
        "symbol": "P(A∩B)",
        "description": "Joint"
      },
      {
        "symbol": "P(A)",
        "description": "Marginal"
      },
      {
        "symbol": "P(B|A)",
        "description": "Conditional"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Independent: P(A∩B)=P(A)×P(B).",
    "mistakes": [
      "Wrong conditional"
    ],
    "tags": [
      "probability",
      "multiplication"
    ],
    "synonyms": [
      "multiplication theorem",
      "joint probability"
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
    "id": "mth-164",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Probability",
    "topic": "Bayes Theorem",
    "name": "Bayes Theorem",
    "expression": "P(A|B)=P(B|A)P(A)/P(B)",
    "latex": "P(A|B)=\\frac{P(B|A)P(A)}{P(B)}",
    "description": "Bayes theorem.",
    "variables": [
      {
        "symbol": "P(A|B)",
        "description": "Posterior"
      },
      {
        "symbol": "P(B|A)",
        "description": "Likelihood"
      },
      {
        "symbol": "P(A)",
        "description": "Prior"
      },
      {
        "symbol": "P(B)",
        "description": "Evidence"
      }
    ],
    "units": "dimensionless",
    "conditions": "—",
    "notes": "Used for updating probabilities.",
    "mistakes": [
      "Wrong numerator"
    ],
    "tags": [
      "probability",
      "bayes"
    ],
    "synonyms": [
      "bayes theorem",
      "posterior"
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
    "id": "mth-170",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Statistics",
    "topic": "Mean",
    "name": "Mean",
    "expression": "x̄=(Σxᵢ)/n",
    "latex": "\\bar{x}=\\frac{\\sum x_i}{n}",
    "description": "Arithmetic mean.",
    "variables": [
      {
        "symbol": "x̄",
        "description": "Mean"
      },
      {
        "symbol": "xᵢ",
        "description": "Values"
      },
      {
        "symbol": "n",
        "description": "Count"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Wrong n"
    ],
    "tags": [
      "statistics",
      "mean"
    ],
    "synonyms": [
      "mean",
      "average"
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
    "id": "mth-171",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Statistics",
    "topic": "Variance",
    "name": "Variance",
    "expression": "σ²=(Σ(xᵢ-x̄)²)/n",
    "latex": "\\sigma^2=\\frac{\\sum(x_i-\\bar{x})^2}{n}",
    "description": "Variance.",
    "variables": [
      {
        "symbol": "σ²",
        "description": "Variance"
      },
      {
        "symbol": "xᵢ",
        "description": "Values"
      },
      {
        "symbol": "x̄",
        "description": "Mean"
      },
      {
        "symbol": "n",
        "description": "Count"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "SD=√(variance). σ²=E[X²]-(E[X])².",
    "mistakes": [
      "Forgetting to square"
    ],
    "tags": [
      "statistics",
      "variance"
    ],
    "synonyms": [
      "variance",
      "standard deviation"
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
    "id": "mth-172",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Statistics",
    "topic": "Standard Deviation",
    "name": "Standard Deviation",
    "expression": "σ=√(variance)",
    "latex": "\\sigma=\\sqrt{\\text{variance}}",
    "description": "Standard deviation.",
    "variables": [
      {
        "symbol": "σ",
        "description": "Standard deviation"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "σ=√(Σ(xᵢ-x̄)²/n).",
    "mistakes": [
      "Not taking sqrt"
    ],
    "tags": [
      "statistics",
      "standard deviation"
    ],
    "synonyms": [
      "standard deviation",
      "sd"
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
    "id": "mth-180",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Matrices",
    "topic": "Matrix Multiplication",
    "name": "Matrix Multiplication",
    "expression": "(AB)ᵢⱼ=Σaᵢₖbₖⱼ",
    "latex": "(AB)_{ij}=\\sum a_{ik}b_{kj}",
    "description": "Matrix product.",
    "variables": [
      {
        "symbol": "A,B",
        "description": "Matrices"
      },
      {
        "symbol": "i,j,k",
        "description": "Indices"
      }
    ],
    "units": "—",
    "conditions": "A: m×n, B: n×p.",
    "notes": "Result: m×p. Order matters: AB≠BA generally.",
    "mistakes": [
      "Wrong dimensions"
    ],
    "tags": [
      "matrices",
      "multiplication"
    ],
    "synonyms": [
      "matrix multiplication",
      "product"
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
    "id": "mth-181",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Determinants",
    "topic": "2x2 Determinant",
    "name": "2x2 Determinant",
    "expression": "|A|=ad-bc",
    "latex": "|A|=ad-bc",
    "description": "Determinant of 2×2.",
    "variables": [
      {
        "symbol": "a,b,c,d",
        "description": "Elements"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "A=[[a,b],[c,d]]. |A|=0: singular.",
    "mistakes": [
      "Wrong diagonal"
    ],
    "tags": [
      "determinants",
      "2x2"
    ],
    "synonyms": [
      "2x2 determinant",
      "matrix determinant"
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
    "id": "mth-182",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Determinants",
    "topic": "3x3 Determinant",
    "name": "3x3 Determinant",
    "expression": "|A|=a(ei-fh)-b(di-fg)+c(dh-eg)",
    "latex": "|A|=a(ei-fh)-b(di-fg)+c(dh-eg)",
    "description": "Determinant of 3×3.",
    "variables": [
      {
        "symbol": "a-i",
        "description": "Elements"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Expansion along first row.",
    "mistakes": [
      "Wrong signs"
    ],
    "tags": [
      "determinants",
      "3x3"
    ],
    "synonyms": [
      "3x3 determinant",
      "matrix determinant"
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
    "id": "mth-183",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Determinants",
    "topic": "Cramers Rule",
    "name": "Cramer's Rule",
    "expression": "x=|A_x|/|A|",
    "latex": "x=\\frac{|A_x|}{|A|}",
    "description": "Solve linear equations.",
    "variables": [
      {
        "symbol": "x",
        "description": "Solution"
      },
      {
        "symbol": "|A|",
        "description": "Coefficient det"
      },
      {
        "symbol": "|A_x|",
        "description": "Modified det"
      }
    ],
    "units": "—",
    "conditions": "|A|≠0.",
    "notes": "Replace column with constants.",
    "mistakes": [
      "|A|=0 case"
    ],
    "tags": [
      "determinants",
      "cramers rule"
    ],
    "synonyms": [
      "cramers rule",
      "linear equations"
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
    "id": "mth-190",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Vectors",
    "topic": "Dot Product",
    "name": "Vector Dot Product",
    "expression": "a·b=|a||b|cosθ=a₁b₁+a₂b₂+a₃b₃",
    "latex": "\\vec{a}\\cdot\\vec{b}=|a||b|\\cos\\theta",
    "description": "Dot product of vectors.",
    "variables": [
      {
        "symbol": "a,b",
        "description": "Vectors"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "a·b=0: perpendicular. a·a=|a|².",
    "mistakes": [
      "Confusing with cross product"
    ],
    "tags": [
      "vectors",
      "dot product"
    ],
    "synonyms": [
      "dot product",
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
    "id": "mth-191",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Vectors",
    "topic": "Cross Product",
    "name": "Vector Cross Product",
    "expression": "a×b=|a||b|sinθ n̂",
    "latex": "\\vec{a}\\times\\vec{b}=|a||b|\\sin\\theta\\hat{n}",
    "description": "Cross product of vectors.",
    "variables": [
      {
        "symbol": "a,b",
        "description": "Vectors"
      },
      {
        "symbol": "θ",
        "description": "Angle"
      },
      {
        "symbol": "n̂",
        "description": "Unit normal"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "a×b=0: parallel. |a×b|=area of parallelogram.",
    "mistakes": [
      "Wrong direction"
    ],
    "tags": [
      "vectors",
      "cross product"
    ],
    "synonyms": [
      "cross product",
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
    "id": "mth-192",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Vectors",
    "topic": "Scalar Triple",
    "name": "Scalar Triple Product",
    "expression": "[a b c]=a·(b×c)",
    "latex": "[abc]=\\vec{a}\\cdot(\\vec{b}\\times\\vec{c})",
    "description": "Box product.",
    "variables": [
      {
        "symbol": "a,b,c",
        "description": "Vectors"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Volume of parallelepiped. [abc]=0: coplanar.",
    "mistakes": [
      "Wrong order"
    ],
    "tags": [
      "vectors",
      "triple product"
    ],
    "synonyms": [
      "scalar triple product",
      "box product"
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
    "id": "mth-200",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "3D Geometry",
    "topic": "Distance",
    "name": "Distance in 3D",
    "expression": "d=√((x₂-x₁)²+(y₂-y₁)²+(z₂-z₁)²)",
    "latex": "d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}",
    "description": "3D distance formula.",
    "variables": [
      {
        "symbol": "d",
        "description": "Distance"
      },
      {
        "symbol": "x₁,y₁,z₁",
        "description": "Point 1"
      },
      {
        "symbol": "x₂,y₂,z₂",
        "description": "Point 2"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "—",
    "mistakes": [
      "Missing z term"
    ],
    "tags": [
      "3d geometry",
      "distance"
    ],
    "synonyms": [
      "3d distance",
      "distance formula"
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
    "id": "mth-201",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "3D Geometry",
    "topic": "Line Equation",
    "name": "Line in 3D",
    "expression": "r=a+λb",
    "latex": "\\vec{r}=\\vec{a}+\\lambda\\vec{b}",
    "description": "Vector form of line.",
    "variables": [
      {
        "symbol": "r",
        "description": "Position vector"
      },
      {
        "symbol": "a",
        "description": "Point on line"
      },
      {
        "symbol": "b",
        "description": "Direction"
      },
      {
        "symbol": "λ",
        "description": "Parameter"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Cartesian: (x-x₁)/l=(y-y₁)/m=(z-z₁)/n.",
    "mistakes": [
      "Wrong direction vector"
    ],
    "tags": [
      "3d geometry",
      "line"
    ],
    "synonyms": [
      "3d line",
      "line equation"
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
    "id": "mth-202",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "3D Geometry",
    "topic": "Plane Equation",
    "name": "Plane in 3D",
    "expression": "r·n=d",
    "latex": "\\vec{r}\\cdot\\vec{n}=d",
    "description": "Vector form of plane.",
    "variables": [
      {
        "symbol": "r",
        "description": "Position vector"
      },
      {
        "symbol": "n",
        "description": "Normal vector"
      },
      {
        "symbol": "d",
        "description": "Distance from origin"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Cartesian: ax+by+cz=d. n=(a,b,c).",
    "mistakes": [
      "Wrong normal"
    ],
    "tags": [
      "3d geometry",
      "plane"
    ],
    "synonyms": [
      "3d plane",
      "plane equation"
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
    "id": "mth-203",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "3D Geometry",
    "topic": "Distance Point-Plane",
    "name": "Distance Point to Plane",
    "expression": "d=|ax+by+cz-d|/√(a²+b²+c²)",
    "latex": "d=\\frac{|ax_0+by_0+cz_0-d|}{\\sqrt{a^2+b^2+c^2}}",
    "description": "Distance from point to plane.",
    "variables": [
      {
        "symbol": "d",
        "description": "Distance"
      },
      {
        "symbol": "a,b,c",
        "description": "Normal"
      },
      {
        "symbol": "x₀,y₀,z₀",
        "description": "Point"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Plane: ax+by+cz=d.",
    "mistakes": [
      "Forgetting absolute value"
    ],
    "tags": [
      "3d geometry",
      "distance"
    ],
    "synonyms": [
      "point plane distance",
      "3d distance"
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
    "id": "mth-210",
    "subject": "Mathematics",
    "branch": "Class 11",
    "chapter": "Sets",
    "topic": "De Morgan",
    "name": "De Morgan's Laws",
    "expression": "(A∪B)'=A'∩B', (A∩B)'=A'∪B'",
    "latex": "(A\\cup B)'=A'\\cap B'",
    "description": "De Morgan laws.",
    "variables": [
      {
        "symbol": "A,B",
        "description": "Sets"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Complement of union = intersection of complements.",
    "mistakes": [
      "Reversing operations"
    ],
    "tags": [
      "sets",
      "de morgan"
    ],
    "synonyms": [
      "de morgan laws",
      "set theory"
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
    "id": "mth-220",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Relations Functions",
    "topic": "Composition",
    "name": "Function Composition",
    "expression": "(f∘g)(x)=f(g(x))",
    "latex": "(f\\circ g)(x)=f(g(x))",
    "description": "Composite function.",
    "variables": [
      {
        "symbol": "f,g",
        "description": "Functions"
      },
      {
        "symbol": "x",
        "description": "Input"
      }
    ],
    "units": "—",
    "conditions": "—",
    "notes": "Order matters: (f∘g)≠(g∘f) generally.",
    "mistakes": [
      "Wrong order"
    ],
    "tags": [
      "relations functions",
      "composition"
    ],
    "synonyms": [
      "function composition",
      "composite"
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
    "id": "mth-221",
    "subject": "Mathematics",
    "branch": "Class 12",
    "chapter": "Relations Functions",
    "topic": "Inverse",
    "name": "Inverse Function",
    "expression": "f⁻¹(f(x))=x",
    "latex": "f^{-1}(f(x))=x",
    "description": "Inverse function.",
    "variables": [
      {
        "symbol": "f,f⁻¹",
        "description": "Functions"
      },
      {
        "symbol": "x",
        "description": "Input"
      }
    ],
    "units": "—",
    "conditions": "f must be bijective.",
    "notes": "f and f⁻¹ are reflections over y=x.",
    "mistakes": [
      "Not checking bijective"
    ],
    "tags": [
      "relations functions",
      "inverse"
    ],
    "synonyms": [
      "inverse function",
      "bijection"
    ],
    "importance": "high",
    "difficulty": "medium",
    "exams": [
      "jee-main",
      "jee-advanced"
    ],
    "freq": false
  }
];
