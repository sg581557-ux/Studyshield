# Formula Generator Rebuild — Task Tracker

## Goal
Rebuild `scripts/generate-formulas.mjs` into a modular, scalable, production-ready
formula generator that powers the Formula Vault with comprehensive multi-exam coverage.

## Steps

- [x] 1. Audit current generator, data flow, types, and Formula Vault consumers
- [x] 2. Confirm scope & plan with user
- [ ] 3. Create modular generator framework under `scripts/formula-generator/`
  - [x] 3.1 `lib/constants.mjs` — enums + exam registry (adds SRMJEEE, AP EAMCET, TS EAMCET, Olympiad, CBSE 11)
  - [x] 3.2 `lib/ids.mjs` — deterministic slug IDs + var/file name helpers
  - [x] 3.3 `lib/registry.mjs` — exam lookup + examRelevance mapping
  - [x] 3.4 `lib/formula.mjs` — declarative `f()` seed → Formula normalizer
  - [x] 3.5 `lib/validate.mjs` — schema/enum/latex/ref validators
  - [x] 3.6 `lib/dedupe.mjs` — canonical-key duplicate detection & ID collisions
  - [x] 3.7 `lib/logger.mjs` — structured logging
  - [x] 3.8 `lib/output.mjs` — chunked TS writers + JSON catalog builder
  - [x] 3.9 `index.mjs` — CLI orchestrator (flags, validation, dedupe, output)
- [x] 4. Migrate legacy ~175+ formulas to declarative data modules
  - [x] 4.1 `scripts/migrate-legacy.mjs` (extract + convert tuples)
  - [x] 4.2 Run migration → `scripts/formula-generator/data/legacy/*.mjs`
- [x] 5. Add new domain data modules
  - [x] 5.1 `data/biology.mjs` (NEET)
  - [x] 5.2 `data/quant.mjs` (SSC / Banking / Railway / CAT Quant)
  - [x] 5.3 `data/commerce.mjs` (CA Foundation)
  - [x] 5.4 `data/gate.mjs` (GATE Engineering Mathematics)
  - [x] 5.5 `data/upsc.mjs` (UPSC CSAT / Economy / Geography)
  - [x] 5.6 `data/olympiad.mjs`
  - [x] 5.7 `data/physics-extra.mjs`, `data/chemistry-extra.mjs`, `data/mathematics-extra.mjs`
  - [x] 5.8 `data/index.mjs` aggregation
- [ ] 6. Extend `src/types/index.ts` (branch, exams[], relatedFormulas, widened unions)
- [ ] 7. Update `src/data/exams.ts` (add new exam entries)
- [ ] 8. Regenerate `src/data/formulas/**` via new generator
- [ ] 9. Update Formula Vault UI (Branch filter, exam filter via exams[], subject options)
- [ ] 10. Add `scripts/verify-formulas.mjs` verifier
- [ ] 11. Run generator + verifier + `tsc --noEmit`; fix all issues
- [ ] 12. Final report (changes, improvements, limitations)

