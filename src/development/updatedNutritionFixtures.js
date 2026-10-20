// Local metadata overlay for the updated Nutri-Score research preview.
// Nutrition values and the original research profiles are never rewritten.
const published = require('./publishedNutritionFixtures');

const clone = value => JSON.parse(JSON.stringify(value));
const METHOD_SOURCE = Object.freeze({
  issuingOrganization: 'Sante publique France',
  documentTitle: 'Nutri-Score scientific and technical FAQ, version 11',
  url: 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf',
  edition: '2025-03-17',
  verifiedOn: '2026-10-20',
});
const syntheticSource = 'Trace synthetic control; no real product or manufacturer claim.';

function ingredientSource(profile) {
  return clone(profile.ingredients?.provenance || profile.plantContent?.source || profile.source);
}

function fvl(percent, basis, source) {
  return { percent, basis, source: clone(source), methodSource: METHOD_SOURCE };
}

function sweeteners(present, basis, source) {
  return { present, basis, source: clone(source), methodSource: METHOD_SOURCE };
}

function overlay(profile) {
  const result = clone(profile);
  result.updatedCategory = profile.methodCategory === 'added-fat' ? 'fats-nuts-seeds' : profile.methodCategory;
  result.updatedCategoryCandidates = null;
  result.updatedFvlContent = null;
  result.nonNutritiveSweeteners = null;
  result.updatedMethodNotes = [];
  result.updatedCategoryEvidence = {
    basis: 'Food presentation in the existing research observation; updated FAQ category definitions, pages 16-21.',
    source: clone(profile.source),
    methodSource: METHOD_SOURCE,
  };
  return result;
}

const compatibleZeroIds = new Set(['sugary-cereal-frosted-flakes', 'processed-meat',
  'whole-grain-cereal', 'regular-soda', 'diet-soda', 'unsweetened-tea', 'plain-yogurt']);

const OBSERVATIONS = published.OBSERVATIONS.map(profile => {
  const result = overlay(profile);
  if (compatibleZeroIds.has(profile.id)) {
    result.updatedFvlContent = fvl(0,
      'The previously reviewed complete ingredient list contains no qualifying fruits, vegetables or legumes; the updated definition preserves this zero.',
      ingredientSource(profile));
  }
  if (['fresh-apple', 'fresh-broccoli'].includes(profile.id)) {
    result.updatedFvlContent = fvl(100,
      'The USDA reference describes one raw fruit or vegetable, which remains fully qualifying under the updated FVL definition.',
      ingredientSource(profile));
  }
  if (profile.id === 'plain-almonds') {
    result.updatedCategory = 'fats-nuts-seeds';
    result.updatedFvlContent = fvl(0,
      'The manufacturer lists almonds as the sole ingredient. Nuts have their own updated category and no longer count toward FVL.',
      ingredientSource(profile));
    result.updatedMethodNotes.push('Single-ingredient almonds use the fats, nuts and seeds rules. Original qualifying plant content of 100% is retained separately; updated FVL is 0%.');
  }
  if (profile.id === 'olive-oil') {
    result.updatedCategory = 'fats-nuts-seeds';
    result.updatedFvlContent = fvl(100,
      'The manufacturer identifies standalone extra virgin olive oil. FAQ page 30, Table 8 footnote expressly counts olive oil in FVL within the fats, nuts and seeds category.',
      profile.plantContent.source);
    result.updatedMethodNotes.push('Olive oil remains 100% qualifying here because of the updated fats-category exception; this exception does not restore oil credit in general foods.');
  }
  if (profile.id === 'peanut-butter') {
    result.updatedCategory = null;
    result.updatedCategoryCandidates = ['general', 'fats-nuts-seeds'];
    result.updatedCategoryEvidence.basis = 'FAQ page 20 requires more than 50% nuts/seeds for processed products. The matching Jif ingredient list does not state peanut percentage; ingredient order does not establish it.';
    result.updatedCategoryEvidence.source = ingredientSource(profile);
    result.updatedMethodNotes.push('Nut proportion is unknown: retain general and fats/nuts/seeds category possibilities. No US legal-composition assumption is used.',
      'FVL remains unknown. The fats-category oil exception cannot be silently resolved from unspecified rapeseed/soybean oil proportions.');
  }
  if (profile.id === 'processed-meat') {
    result.updatedCategory = null;
    result.updatedCategoryCandidates = ['general', 'red-meat'];
    result.updatedCategoryEvidence.basis = 'FAQ page 19 applies the red-meat rule at 20% or more red meat in qualifying meat products. The manufacturer lists chicken, turkey and pork without their percentages.';
    result.updatedCategoryEvidence.source = ingredientSource(profile);
    result.updatedMethodNotes.push('Pork proportion is unknown: general and red-meat rules remain possible. The updated threshold is at least 20%, not 50%.');
  }
  if (['plain-yogurt', 'sweetened-yogurt'].includes(profile.id)) {
    result.updatedCategory = 'general';
    result.updatedMethodNotes.push('This is spoonable yogurt. The updated move of drinkable yogurt into beverages does not change this product presentation.');
  }
  if (['regular-soda', 'diet-soda', 'unsweetened-tea'].includes(profile.id)) {
    const present = profile.id === 'diet-soda';
    result.nonNutritiveSweeteners = sweeteners(present, present
      ? 'The complete same-edition Diet Pepsi ingredient list explicitly names aspartame and acesulfame potassium, non-nutritive sweeteners used by the updated beverage rule.'
      : 'The complete matched manufacturer ingredient list contains no non-nutritive sweetener. Refined sugars and citric acid are not classified as non-nutritive sweeteners.',
    ingredientSource(profile));
    result.updatedMethodNotes.push(present
      ? 'Aspartame and acesulfame potassium establish sweetener presence for the updated beverage calculation; no additive health-risk classification is assigned.'
      : 'The reviewed full ingredient list establishes absence of non-nutritive sweeteners for this calculation.');
  }
  return result;
});

function overlaySynthetic(profile) {
  const result = overlay(profile);
  if (profile.plantContent?.percent === 0) {
    result.updatedFvlContent = fvl(0, 'Explicit synthetic composition contains no qualifying FVL.', syntheticSource);
  }
  if (profile.id === 'nuts') {
    result.updatedCategory = 'fats-nuts-seeds';
    result.updatedFvlContent = fvl(0, 'Synthetic single-nut control; nuts are excluded from updated FVL.', syntheticSource);
  }
  if (profile.id === 'oil') {
    result.updatedFvlContent = fvl(100, 'Synthetic olive-oil control; updated fats-category FVL exception.', syntheticSource);
  }
  if (profile.id === 'milk-original-general-rule') {
    result.updatedCategory = 'beverage';
    result.updatedMethodNotes.push('Synthetic milk control: the original profile used general-food rules; updated rules classify milk as a beverage.');
  }
  if (['beverage', 'water'].includes(result.updatedCategory)) {
    result.nonNutritiveSweeteners = sweeteners(profile.id === 'diet-drink',
      profile.id === 'diet-drink' ? 'Explicit synthetic non-nutritive sweetener presence.'
        : 'Explicit synthetic absence of non-nutritive sweeteners.', syntheticSource);
  }
  return result;
}

function synthetic(id, category, values, extra = {}) {
  const originalCategory = category === 'fats-nuts-seeds' ? 'added-fat' : category === 'red-meat' ? 'general' : category;
  const result = overlaySynthetic(published.synthetic(id, originalCategory, values));
  result.updatedCategory = category;
  return { ...result, ...clone(extra) };
}

// Invented controls, not manufacturer observations. The bread pair differs only
// in dietary fiber; the existing same-nutrient grain pair is also preserved.
const bread = { calories: 250, saturatedFat: 0.5, totalSugar: 5, addedSugar: 3,
  sodium: 400, fiber: 2, protein: 9, fat: 3, carbohydrates: 44 };
const meat = { calories: 185, saturatedFat: 3, totalSugar: 0, addedSugar: 0,
  sodium: 100, fiber: 0, protein: 20, fat: 12, carbohydrates: 0 };
const SYNTHETIC = [
  ...published.SYNTHETIC.map(overlaySynthetic),
  synthetic('refined-bread-lower-fiber', 'general', bread, {
    grainEvidence: 'Synthetic refined-bread control; no extra grain-name penalty.',
    updatedMethodNotes: ['Invented bread profile with 2 g fiber per 100 g; all other values match the higher-fiber control.'],
  }),
  synthetic('whole-grain-bread-higher-fiber', 'general', { ...bread, fiber: 6 }, {
    grainEvidence: 'Synthetic whole-grain bread control; only the supplied fiber difference affects this comparison.',
    updatedMethodNotes: ['Invented bread profile with 6 g fiber per 100 g; all other values match the lower-fiber control.'],
  }),
  synthetic('red-meat-protein-rule', 'red-meat', meat, {
    updatedMethodNotes: ['Synthetic qualifying red-meat control; protein points use the published cap.'],
  }),
  synthetic('poultry-protein-control', 'general', meat, {
    updatedMethodNotes: ['Synthetic poultry control with the same nutrient vector as the red-meat control.'],
  }),
];

const PROFILES = [...OBSERVATIONS, ...SYNTHETIC];
module.exports = { METHOD_SOURCE, OBSERVATIONS, SYNTHETIC, PROFILES, synthetic };
