/**
 * data/index.mjs
 * -----------------------------------------------------------------------------
 * Aggregates every formula seed module into a single flat list consumed by the
 * generator CLI. To add a new domain (e.g. "data/law.mjs"), create the module
 * exporting a `seeds` array and add it here — no other code changes needed.
 */

import { seeds as legacyPhysics } from './legacy/physics.mjs';
import { seeds as legacyChemistry } from './legacy/chemistry.mjs';
import { seeds as legacyMathematics } from './legacy/mathematics.mjs';
import { seeds as biology } from './biology.mjs';
import { seeds as quant } from './quant.mjs';
import { seeds as commerce } from './commerce.mjs';
import { seeds as gate } from './gate.mjs';
import { seeds as upsc } from './upsc.mjs';
import { seeds as olympiad } from './olympiad.mjs';
import { seeds as physicsExtra } from './physics-extra.mjs';
import { seeds as chemistryExtra } from './chemistry-extra.mjs';
import { seeds as mathematicsExtra } from './mathematics-extra.mjs';
import { seeds as school } from './school.mjs';

/**
 * @returns {object[]} flattened list of all declarative formula seeds
 */
export function buildAllSeeds() {
  return [
    ...legacyPhysics,
    ...legacyChemistry,
    ...legacyMathematics,
    ...biology,
    ...quant,
    ...commerce,
    ...gate,
    ...upsc,
    ...olympiad,
    ...physicsExtra,
    ...chemistryExtra,
    ...mathematicsExtra,
    ...school,
  ];
}

